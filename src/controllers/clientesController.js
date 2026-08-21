import db from '../config/db.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { put } from "@vercel/blob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../assets/logo.png');

// Recupera la lista completa de clientes registrados
const obtenerClientes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM clientes');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener los clientes' });
    }
};

// Obtiene los detalles de un cliente específico mediante su ID
const obtenerClientePorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener el cliente' });
    }
};

// Registra un nuevo cliente en la base de datos
const crearCliente = async (req, res) => {
    const { nombre, apellido, cedula, telefono, email, nacionalidad } = req.body;

    try {
        const archivo = req.file;
        let foto_url = null;

        if (archivo) {
            const blob = await put(archivo.originalname, archivo.buffer, {
                access: 'public',
                contentType: archivo.mimetype,
                addRandomSuffix: true,
            });
            foto_url = blob.url;
        }

        // --- 1. VALIDACIÓN DE CÉDULA Y NACIONALIDAD ---
        // Exige que empiece por V-, E- o P- seguido de 6 a 10 dígitos.
        const formatoCedulaRegex = /^(V|E|P)-\d{6,10}$/i;
        
        if (!formatoCedulaRegex.test(cedula)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Formato de documento inválido. Debe usar V-XXXX, E-XXXX o P-XXXX.' 
            });
        }

        // Validación lógica cruzada: Si es venezolano, debe usar V-
        const prefijo = cedula.toUpperCase().charAt(0);
        const nacNormalizada = nacionalidad.toLowerCase();

        if (nacNormalizada === 'venezolana' && prefijo !== 'V') {
            return res.status(400).json({ 
                success: false, 
                message: 'Incongruencia: Un cliente de nacionalidad venezolana debe tener una cédula que inicie con V-.' 
            });
        }
        if (nacNormalizada === 'extranjera' && prefijo !== 'E' && prefijo !== 'P') {
            return res.status(400).json({ 
                success: false, 
                message: 'Incongruencia: Documento no coincide con la nacionalidad extranjera.' 
            });
        }

        // --- 2. VALIDACIÓN DEL TELÉFONO ---
        const phoneNumber = parsePhoneNumberFromString(telefono);

        if (!phoneNumber || !phoneNumber.isValid()) {
            return res.status(400).json({ 
                success: false, 
                message: 'El número de teléfono proporcionado no es válido para su localidad.' 
            });
        }
        
        const telefonoInternacional = phoneNumber.number; // Guarda en formato +58...

        // --- 3. INSERCIÓN EN MYSQL ---
        // Convertimos la cédula a mayúsculas para mantener uniformidad en la base de datos
        await db.execute(
            'INSERT INTO clientes (nombre, apellido, cedula, telefono, email, nacionalidad, foto_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, apellido, cedula.toUpperCase(), telefonoInternacional, email, nacionalidad, foto_url]
        );
        
        res.status(201).json({ success: true, message: 'Cliente registrado con éxito.' });

    } catch (error) {
        // Si el motor MySQL detecta que la cédula (única) ya existe, arrojará ER_DUP_ENTRY
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'La cédula o el correo ya se encuentran registrados en el sistema.' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor', error: error.message });
    }
};

// Actualiza la información de un cliente existente
const actualizarCliente = async (req, res) => {
    try {
        const archivo = req.file;
        let foto_url = null;

        if (archivo) {
            const blob = await put(archivo.originalname, archivo.buffer, {
                access: 'public',
                contentType: archivo.mimetype,
                addRandomSuffix: true,
            });
            foto_url = blob.url;
        }
        const { id } = req.params;
        const { nombre, apellido, cedula, telefono, email, nacionalidad } = req.body;

        let result;
        if(foto_url === null)
        {
            [result] = await db.execute('UPDATE clientes SET nombre = ?, apellido = ?, cedula = ?, telefono = ?, email = ?, nacionalidad = ? WHERE id_cliente = ?', [nombre, apellido, cedula, telefono, email, nacionalidad, id]);
        }
        else
        {
            [result] = await db.execute('UPDATE clientes SET nombre = ?, apellido = ?, cedula = ?, telefono = ?, email = ?, nacionalidad = ?, foto_url = ? WHERE id_cliente = ?', [nombre, apellido, cedula, telefono, email, nacionalidad, foto_url, id]);
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
        res.json({ exito: true, mensaje: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el cliente' });
    }
};

// Elimina la ficha de un cliente del sistema
const eliminarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute('DELETE FROM clientes WHERE id_cliente = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
        res.json({ exito: true, mensaje: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar el cliente' });
    }
};

// Genera un PDF detallado de clientes y sus compras
const generarReporteClientes = async (req, res) => {
    try {
        const { nombre } = req.query;
        let query = `
            SELECT 
                c.id_cliente, c.nombre, c.apellido, c.cedula, c.telefono, c.email,
                b.numero_boleto, b.ruta, b.fecha_ida, b.fecha_retorno, b.monto_neto, b.fee_emision, b.monto_venta, b.utilidad,
                r.localizador, r.estado_pago, r.fecha_venta,
                a.nombre as aerolinea,
                u.nombre as agente
            FROM clientes c
            LEFT JOIN boletos b ON c.id_cliente = b.cliente_id
            LEFT JOIN reservas r ON b.localizador_id = r.localizador
            LEFT JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            LEFT JOIN usuarios u ON b.usuario_id = u.id_usuario
        `;
        
        const queryParams = [];

        if (nombre) {
            query += " WHERE c.nombre LIKE ? OR c.apellido LIKE ?";
            const searchTerm = `%${nombre}%`;
            queryParams.push(searchTerm, searchTerm);
        }
        query += " ORDER BY c.nombre ASC, c.apellido ASC, r.fecha_venta DESC";

        const [rows] = await db.query(query, queryParams);

        // Agrupar por cliente
        const clientesAgrupados = {};
        rows.forEach(row => {
            if (!clientesAgrupados[row.id_cliente]) {
                clientesAgrupados[row.id_cliente] = {
                    datos: {
                        nombre: row.nombre,
                        apellido: row.apellido,
                        cedula: row.cedula,
                        telefono: row.telefono,
                        email: row.email
                    },
                    compras: []
                };
            }
            if (row.numero_boleto || row.localizador) {
                clientesAgrupados[row.id_cliente].compras.push(row);
            }
        });
        
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_clientes_detallado.pdf');
        doc.pipe(res);

        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 40, { width: 50 });
        }

        doc.fontSize(20).text('Reporte Detallado de Clientes y Compras', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha de generación: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        if (Object.keys(clientesAgrupados).length === 0) {
            doc.fontSize(12).fillColor('#333333').text('No se encontraron clientes.', { align: 'center' });
        } else {
            for (const [id_cliente, cliente] of Object.entries(clientesAgrupados)) {
                if (doc.y > 650) doc.addPage();
                
                // --- ENCABEZADO DEL CLIENTE ---
                doc.rect(40, doc.y, 530, 25).fill('#1e293b'); // Dark blue/slate
                doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold');
                doc.text(`CLIENTE: ${cliente.datos.nombre} ${cliente.datos.apellido}`, 50, doc.y + 7);
                doc.moveDown(1.5);
                
                doc.fillColor('#333333').fontSize(10).font('Helvetica');
                doc.text(`Documento: ${cliente.datos.cedula || 'N/A'}`, 50, doc.y);
                doc.text(`Teléfono: ${cliente.datos.telefono || 'N/A'}`, 250, doc.y - 12);
                doc.text(`Correo: ${cliente.datos.email || 'N/A'}`, 400, doc.y - 12);
                doc.moveDown(1);
                
                // --- COMPRAS DEL CLIENTE ---
                if (cliente.compras.length === 0) {
                    doc.font('Helvetica-Oblique').fillColor('#666666').text('Sin compras registradas.', 50, doc.y);
                    doc.moveDown(1.5);
                } else {
                    cliente.compras.forEach(compra => {
                        if (doc.y > 650) doc.addPage();
                        
                        // Ficha de Venta (Estilo Reporte Ventas)
                        doc.rect(50, doc.y, 510, 20).fill('#3b82f6');
                        doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
                        const fechaVenta = compra.fecha_venta ? new Date(compra.fecha_venta).toLocaleDateString() : 'N/A';
                        doc.text(`Localizador: ${compra.localizador || 'N/A'} | Venta: ${fechaVenta}`, 60, doc.y + 5);
                        doc.moveDown(1.5);
                        
                        doc.fillColor('#333333').fontSize(10);
                        
                        // Agente
                        doc.font('Helvetica-Bold').text('AGENTE DE VENTAS', 60, doc.y);
                        doc.font('Helvetica');
                        doc.text(`Vendido por: ${compra.agente || 'Sistema'}`, 60, doc.y + 5);
                        doc.moveDown(1);
                        
                        // Datos Vuelo
                        doc.font('Helvetica-Bold').text('DATOS DEL VUELO', 60, doc.y);
                        doc.font('Helvetica');
                        doc.text(`Boleto Nro: ${compra.numero_boleto || 'N/A'}`, 60, doc.y + 5);
                        doc.text(`Aerolínea: ${compra.aerolinea || 'N/A'}`, 250, doc.y - 12);
                        doc.text(`Estado: ${compra.estado_pago || 'Pendiente'}`, 400, doc.y - 12);
                        doc.text(`Ruta: ${compra.ruta || 'N/A'}`, 60, doc.y + 5);
                        const fechaIda = compra.fecha_ida ? new Date(compra.fecha_ida).toLocaleDateString() : 'N/A';
                        doc.text(`Fecha Ida: ${fechaIda}`, 250, doc.y - 12);
                        if (compra.fecha_retorno) {
                            doc.text(`Fecha Retorno: ${new Date(compra.fecha_retorno).toLocaleDateString()}`, 400, doc.y - 12);
                        }
                        doc.moveDown(1);
                        
                        // Desglose Financiero
                        doc.font('Helvetica-Bold').text('DESGLOSE FINANCIERO', 60, doc.y);
                        doc.font('Helvetica');
                        doc.text(`Monto Neto: $${compra.monto_neto || 0}`, 60, doc.y + 5);
                        doc.text(`Fee Emisión: $${compra.fee_emision || 0}`, 200, doc.y - 12);
                        doc.text(`Utilidad: $${compra.utilidad || 0}`, 340, doc.y - 12);
                        doc.font('Helvetica-Bold');
                        doc.text(`TOTAL VENTA: $${compra.monto_venta || 0}`, 60, doc.y + 10);
                        
                        doc.moveDown(1.5);
                    });
                }
                
                doc.moveTo(40, doc.y).lineTo(570, doc.y).strokeColor('#aaaaaa').stroke();
                doc.moveDown(1.5);
            }
        }

        doc.end();
    } catch (error) {
        console.error("Error generando reporte PDF de clientes:", error);
        res.status(500).json({ success: false, message: 'Error al generar el reporte PDF' });
    }
};

export { obtenerClientes, obtenerClientePorId, crearCliente, actualizarCliente, eliminarCliente, generarReporteClientes };
