import db from '../config/db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../assets/logo.png');

const crearVenta = async (req, res) => {
    try {
        const { 
            localizador, 
            numero_boleto,
            ruta, 
            fecha_ida, 
            fecha_retorno, 
            monto_neto, 
            fee_emision, 
            monto_venta, 
            fecha_venta,
            aerolinea_id,
            cliente_id,
            tipo = 'BOLETO'
        } = req.body;

        // Validación y Recálculo en Servidor (Seguridad Financiera)
        const neto = parseFloat(monto_neto) || 0;
        const emision = parseFloat(fee_emision) || 0;
        const venta = parseFloat(monto_venta) || 0;

        const utilidad = venta - neto - emision;
        const fee_comision = utilidad * 0.20;

        const usuarioId = req.user.id;

        await db.execute(
            'INSERT IGNORE INTO reservas (localizador, fecha_venta) VALUES (?, ?)', 
            [localizador, fecha_venta]
        );

        const queryBoleto = `INSERT INTO boletos 
            (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id, usuario_id, tipo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.execute(queryBoleto, [
            numero_boleto, 
            ruta, 
            fecha_ida, 
            fecha_retorno, 
            neto, 
            emision, 
            venta, 
            utilidad, 
            fee_comision,
            aerolinea_id,
            cliente_id,
            localizador,
            usuarioId,
            tipo
        ]);

        res.status(201).json({ exito: true, mensaje: 'Venta registrada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al registrar la venta' });
    }
};

const actualizarEstadoVenta = async (req, res) => {
    try {
        const { localizador } = req.params;
        const { estado } = req.body; // Ej: 'Emitido', 'Pendiente', 'Cancelado'

        if (!estado) {
            return res.status(400).json({ exito: false, mensaje: 'El estado es requerido' });
        }

        const [result] = await db.execute('UPDATE reservas SET estado_pago = ? WHERE localizador = ?', [estado, localizador]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Reserva no encontrada con ese localizador' });
        }
        res.json({ exito: true, mensaje: 'Estado de la reserva actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el estado de la venta' });
    }
};

const eliminarVenta = async (req, res) => {
    try {
        const { id } = req.params;
        // Primero eliminamos el registro del boleto
        await db.execute('DELETE FROM boletos WHERE id_transaccion = ?', [id]);
        res.json({ exito: true, mensaje: 'Venta anulada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al anular la venta' });
    }
};

const obtenerVentas = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                b.id_transaccion,
                r.localizador,
                b.numero_boleto,
                CONCAT(c.nombre, ' ', c.apellido) as pasajero,
                a.nombre as aerolinea,
                b.ruta,
                b.fecha_ida,
                b.monto_venta,
                b.utilidad,
                b.fee_comision,
                b.tipo,
                r.estado_pago,
                r.fecha_venta
            FROM boletos b
            JOIN clientes c ON b.cliente_id = c.id_cliente
            JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            JOIN reservas r ON b.localizador_id = r.localizador
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las ventas' });
    }
};

const getVentasFiltradas = async (req, res) => {
    // 1. Extraemos los parámetros de búsqueda de la URL
    const { busqueda, fechaInicio, fechaFin } = req.query;
    
    // 2. Base de la consulta con todos los JOINs necesarios
    let sql = `
        SELECT 
            r.localizador,
            b.numero_boleto,
            c.nombre AS nombre_cliente,
            c.apellido AS apellido_cliente,
            a.nombre AS aerolinea,
            b.ruta,
            b.fecha_ida,
            b.monto_venta,
            b.utilidad,
            r.estado_pago,
            r.fecha_venta
        FROM boletos b
        JOIN clientes c ON b.cliente_id = c.id_cliente
        JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
        JOIN reservas r ON b.localizador_id = r.localizador
        WHERE 1=1
    `;
    
    const params = [];

    // 3. Filtro de Texto (Nombre, Apellido, Localizador o Boleto)
    if (busqueda) {
        sql += ` AND (
            c.nombre LIKE ? OR 
            c.apellido LIKE ? OR 
            r.localizador LIKE ? OR 
            b.numero_boleto LIKE ?
        )`;
        const comodin = `%${busqueda}%`;
        params.push(comodin, comodin, comodin, comodin);
    }

    // 4. Filtro por Rango de Fechas (usando la fecha de ida del vuelo)
    if (fechaInicio && fechaFin) {
        sql += ` AND b.fecha_ida BETWEEN ? AND ?`;
        params.push(fechaInicio, fechaFin);
    }

    // 5. Ordenar para que los más recientes salgan primero
    sql += ` ORDER BY b.fecha_ida DESC`;

    try {
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

const statsVenta = async (req, res) => {
    try {
        const hoy = new Date();
        const añoActual = hoy.getFullYear();
        const mesActual = String(hoy.getMonth() + 1).padStart(2, '0');
        const filtroMes = `${añoActual}-${mesActual}%`;

        const queryGlobal = `
            SELECT 
                COALESCE(SUM(monto_venta), 0) AS totalVentas,
                COALESCE(SUM(utilidad), 0) AS totalUtilidad,
                COALESCE(SUM(fee_comision), 0) AS totalComisiones
            FROM boletos
        `;

        const queryMes = `
            SELECT COUNT(b.numero_boleto) AS ventasMes
            FROM boletos b
            INNER JOIN reservas r ON b.localizador_id = r.localizador
            WHERE r.fecha_venta LIKE ?
        `;

        const [[resGlobal], [resMes]] = await Promise.all([
            db.execute(queryGlobal),
            db.execute(queryMes, [filtroMes])
        ]);

        const estadisticas = {
            totalVentas: Number(resGlobal[0].totalVentas),
            totalUtilidad: Number(resGlobal[0].totalUtilidad),
            totalComisiones: Number(resGlobal[0].totalComisiones),
            ventasMes: Number(resMes[0].ventasMes)
        };

        res.status(200).json(estadisticas);

    } catch (error) {
        console.error("Error en statsVenta:", error);
        res.status(500).json({ 
            exito: false, 
            mensaje: 'Error al obtener las estadísticas de ventas' 
        });
    }
};

const recentVentas = async (req, res) => {
    try {
        //const limite = 10;

        const queryRecientes = `
            SELECT 
                b.id_transaccion,
                b.numero_boleto,
                CONCAT(c.nombre, ' ', c.apellido) AS pasajero,
                b.ruta,
                a.nombre AS aerolinea,
                b.monto_venta,
                b.utilidad
            FROM boletos b
            INNER JOIN clientes c ON b.cliente_id = c.id_cliente
            INNER JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            INNER JOIN reservas r ON b.localizador_id = r.localizador
            ORDER BY r.fecha_venta DESC, b.numero_boleto DESC
            LIMIT 10
        `;

        const [rows] = await db.execute(queryRecientes);//, [limite]

        res.status(200).json(rows);

    } catch (error) {
        console.error("Error en recentVentas:", error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error al obtener las ventas recientes'
        });
    }
};

const generarReporteVentas = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, tipo, aerolinea } = req.query;

        let sqlQuery = `
            SELECT 
                r.localizador,
                b.numero_boleto,
                c.nombre,
                c.apellido,
                c.cedula,
                c.telefono,
                c.email,
                a.nombre as aerolinea,
                b.ruta,
                b.fecha_ida,
                b.fecha_retorno,
                b.monto_neto,
                b.fee_emision,
                b.monto_venta,
                b.fee_comision,
                b.utilidad,
                b.tipo,
                r.estado_pago as estado,
                r.fecha_venta
            FROM boletos b
            JOIN clientes c ON b.cliente_id = c.id_cliente
            JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            JOIN reservas r ON b.localizador_id = r.localizador
            WHERE 1=1
        `;
        
        const queryParams = [];

        if (fechaInicio && fechaFin) {
            sqlQuery += ` AND b.fecha_ida BETWEEN ? AND ?`;
            queryParams.push(fechaInicio, fechaFin);
        }

        if (tipo) {
            sqlQuery += ` AND b.tipo = ?`; 
            queryParams.push(tipo);
        }

        if (aerolinea) {
            sqlQuery += ` AND a.nombre = ?`;
            queryParams.push(aerolinea);
        }

        sqlQuery += ` ORDER BY r.fecha_venta DESC`;

        const [rows] = await db.query(sqlQuery, queryParams);

        const doc = new PDFDocument({ margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_ventas_detallado.pdf');

        doc.pipe(res);

        // Logo
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 40, { width: 50 });
        }

        doc.fontSize(20).text('Reporte Detallado de Ventas', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha de generación: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
       
        if (fechaInicio || tipo || aerolinea) {
            doc.fontSize(10).fillColor('#666666').text(`Filtros aplicados: ${fechaInicio ? `Desde ${fechaInicio} Hasta ${fechaFin}` : ''} ${tipo ? `| Tipo: ${tipo}` : ''} ${aerolinea ? `| Aerolínea: ${aerolinea}` : ''}`, { align: 'center' });
        }
        doc.moveDown(2);

        // Diseño Bloque / Ficha por Cliente
        rows.forEach((row, index) => {
            // Verificar si hay espacio suficiente en la página actual
            if (doc.y > 600) {
                doc.addPage();
            }

            // Encabezado de la Ficha
            doc.rect(40, doc.y, 530, 20).fill('#3b82f6');
            doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold');
            doc.text(`Localizador: ${row.localizador} | Venta: ${new Date(row.fecha_venta).toLocaleDateString()}`, 50, doc.y + 5);
            doc.moveDown(1.5);
            
            // Sección Cliente
            doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold');
            doc.text('DATOS DEL CLIENTE', 50, doc.y);
            doc.font('Helvetica');
            doc.text(`Nombre: ${row.nombre} ${row.apellido}`, 50, doc.y + 5);
            doc.text(`Documento: ${row.cedula}`, 250, doc.y - 12);
            doc.text(`Teléfono: ${row.telefono}`, 400, doc.y - 12);
            doc.text(`Correo: ${row.email}`, 50, doc.y + 5);
            doc.moveDown(1);
            
            // Sección Vuelo
            doc.font('Helvetica-Bold').text('DATOS DEL VUELO', 50, doc.y);
            doc.font('Helvetica');
            doc.text(`Boleto Nro: ${row.numero_boleto}`, 50, doc.y + 5);
            doc.text(`Aerolínea: ${row.aerolinea}`, 250, doc.y - 12);
            doc.text(`Estado: ${row.estado}`, 400, doc.y - 12);
            doc.text(`Ruta: ${row.ruta}`, 50, doc.y + 5);
            doc.text(`Fecha Ida: ${new Date(row.fecha_ida).toLocaleDateString()}`, 250, doc.y - 12);
            if (row.fecha_retorno) {
                doc.text(`Fecha Retorno: ${new Date(row.fecha_retorno).toLocaleDateString()}`, 400, doc.y - 12);
            }
            doc.moveDown(1);
            
            // Sección Finanzas
            doc.font('Helvetica-Bold').text('DESGLOSE FINANCIERO', 50, doc.y);
            doc.font('Helvetica');
            doc.text(`Monto Neto: $${row.monto_neto}`, 50, doc.y + 5);
            doc.text(`Fee Emisión: $${row.fee_emision}`, 180, doc.y - 12);
            doc.text(`Utilidad: $${row.utilidad}`, 310, doc.y - 12);
            doc.font('Helvetica-Bold');
            doc.text(`MONTO VENTA: $${row.monto_venta}`, 440, doc.y - 12);
            
            doc.moveDown(1);
            doc.font('Helvetica');
            doc.text(`Comisión Generada: $${row.fee_comision}`, 50, doc.y);
            
            // Separador
            doc.moveDown(1);
            doc.moveTo(40, doc.y).lineTo(570, doc.y).strokeColor('#dddddd').stroke();
            doc.moveDown(1);
        });

        if (rows.length === 0) {
            doc.fontSize(12).fillColor('#333333').text('No se encontraron ventas para los filtros seleccionados.', { align: 'center' });
        }

        doc.end();

    } catch (error) {
        console.error("Error generando reporte PDF detallado:", error);
        res.status(500).json({ 
            exito: false, 
            mensaje: 'Error al generar el reporte PDF' 
        });
    }
};

export { crearVenta, obtenerVentas, getVentasFiltradas, statsVenta, recentVentas, generarReporteVentas, eliminarVenta, actualizarEstadoVenta };