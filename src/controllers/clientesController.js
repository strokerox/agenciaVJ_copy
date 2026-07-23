import db from '../config/db.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import PDFDocument from 'pdfkit';

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
            'INSERT INTO clientes (nombre, apellido, cedula, telefono, email, nacionalidad) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, apellido, cedula.toUpperCase(), telefonoInternacional, email, nacionalidad]
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
        const { id } = req.params;
        const { nombre, apellido, cedula, telefono, email, nacionalidad } = req.body;
        const [result] = await db.execute('UPDATE clientes SET nombre = ?, apellido = ?, cedula = ?, telefono = ?, email = ?, nacionalidad = ? WHERE id_cliente = ?', [nombre, apellido, cedula, telefono, email, nacionalidad, id]);
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

// Genera un PDF de todos los clientes
const generarReporteClientes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM clientes ORDER BY nombre ASC');
        
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_clientes.pdf');
        doc.pipe(res);

        doc.fontSize(20).text('Reporte de Clientes - AgenciaVJ', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha de generación: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        const tableTop = 140;
        const cols = {
            id: { x: 30, w: 40 },
            ced: { x: 80, w: 70 },
            nom: { x: 160, w: 120 },
            tel: { x: 290, w: 90 },
            ema: { x: 390, w: 160 }
        };

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('ID', cols.id.x, tableTop);
        doc.text('Cédula', cols.ced.x, tableTop);
        doc.text('Cliente', cols.nom.x, tableTop);
        doc.text('Teléfono', cols.tel.x, tableTop);
        doc.text('Correo', cols.ema.x, tableTop);
        doc.moveTo(30, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        let currentTop = tableTop + 25;
        doc.font('Helvetica');
        const textOpts = (width) => ({ width: width, height: 15, ellipsis: true, lineBreak: false });

        rows.forEach(row => {
            if (currentTop > 700) {
                doc.addPage();
                currentTop = 50;
            }
            doc.text(row.id_cliente.toString(), cols.id.x, currentTop, textOpts(cols.id.w));
            doc.text(row.cedula || '-', cols.ced.x, currentTop, textOpts(cols.ced.w));
            doc.text(`${row.nombre} ${row.apellido}`, cols.nom.x, currentTop, textOpts(cols.nom.w));
            doc.text(row.telefono || '-', cols.tel.x, currentTop, textOpts(cols.tel.w));
            doc.text(row.email || '-', cols.ema.x, currentTop, textOpts(cols.ema.w));
            currentTop += 20;
        });

        doc.end();
    } catch (error) {
        console.error("Error generando reporte PDF de clientes:", error);
        res.status(500).json({ exito: false, mensaje: 'Error al generar el reporte PDF' });
    }
};

export { obtenerClientes, obtenerClientePorId, crearCliente, actualizarCliente, eliminarCliente, generarReporteClientes };
