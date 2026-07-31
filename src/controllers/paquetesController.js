import Paquete from '../models/paquete.js';
import PaqueteVendido from '../models/paqueteVendido.js';
import Reserva from '../models/Reserva.js';
import { getConnection } from '../config/db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../assets/logo.png');

export async function listarPaquetes(req, res) {
    try {
        const paquetes = await Paquete.obtenerActivos();
        res.status(200).json({ success: true, data: paquetes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener los paquetes', error: error.message });
    }
}

export async function listarTodosPaquetes(req, res) {
    try {
        const paquetes = await Paquete.obtenerTodos();
        res.status(200).json({ success: true, data: paquetes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener todos los paquetes', error: error.message });
    }
}

export async function cambiarEstadoPaquete(req, res) {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        if (!['Activo', 'Inactivo'].includes(estado)) {
            return res.status(400).json({ success: false, message: 'Estado inválido. Debe ser Activo o Inactivo.' });
        }
        const affected = await Paquete.actualizarEstado(id, estado);
        if (affected === 0) {
            return res.status(404).json({ success: false, message: 'Paquete no encontrado.' });
        }
        res.json({ success: true, message: `Paquete actualizado a ${estado}` });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar el estado', error: error.message });
    }
}

export async function crearPaquete(req, res) {
    try {
        const insertId = await Paquete.crear(req.body);
        res.status(201).json({ success: true, message: 'Paquete creado exitosamente', id: insertId });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear paquete', error: error.message });
    }
}

export async function ventasPaquetes(req, res) {
    try {
        const data = await dashboardModel.obtenerVentasPorPaquete();
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas de paquetes', error: error.message });
    }
}

export async function venderPaquete(req, res) {
    // Iniciamos una conexión dedicada para la transacción
    const connection = await getConnection(); 
    
    try {
        await connection.beginTransaction(); // Inicia la transacción

        const { paquete_id, localizador_id, cliente_id, fecha_viaje_inicio, fecha_viaje_fin, monto_venta_final, costo_base } = req.body;

        // 1. Calcular la utilidad
        const utilidad = parseFloat(monto_venta_final) - parseFloat(costo_base);

        // 2. Insertar el registro en la tabla paquetes_vendidos
        await PaqueteVendido.registrarVenta({
            paquete_id, localizador_id, cliente_id, fecha_viaje_inicio, fecha_viaje_fin, monto_venta_final, utilidad
        }, connection);

        // 3. Actualizar el monto_total en la tabla reservas
        await Reserva.actualizarMontoTotal(localizador_id, monto_venta_final, connection);

        await connection.commit(); // Confirma los cambios en la base de datos
        res.status(201).json({ success: true, message: 'Paquete vendido y reserva actualizada correctamente.' });

    } catch (error) {
        await connection.rollback(); // Si algo falla, revierte todos los cambios
        res.status(500).json({ success: false, message: 'Error en la transacción al vender paquete', error: error.message });
    } finally {
        connection.release(); // Libera la conexión de vuelta al pool
    }
}

export async function generarReportePaquetes(req, res) {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const paquetes = await Paquete.obtenerActivos();
        
        const conn = await getConnection();
        let query = `
            SELECT 
                pv.id_venta_paquete,
                pt.nombre_paquete,
                pt.destino_ruta,
                CONCAT(c.nombre, ' ', c.apellido) as cliente,
                c.cedula,
                pv.localizador_id,
                pv.fecha_viaje_inicio,
                pv.fecha_viaje_fin,
                pv.monto_venta_final,
                pv.utilidad,
                u.nombre as agente
            FROM paquetes_vendidos pv
            JOIN paquetes_turisticos pt ON pv.paquete_id = pt.id_paquete
            JOIN clientes c ON pv.cliente_id = c.id_cliente
            LEFT JOIN reservas r ON pv.localizador_id = r.localizador
            LEFT JOIN boletos b ON b.localizador_id = r.localizador
            LEFT JOIN usuarios u ON b.usuario_id = u.id_usuario
        `;
        
        const queryParams = [];
        if (fechaInicio) {
            query += " WHERE pv.fecha_viaje_inicio >= ?";
            queryParams.push(fechaInicio);
        }
        if (fechaFin) {
            query += (queryParams.length > 0 ? " AND" : " WHERE") + " pv.fecha_viaje_inicio <= ?";
            queryParams.push(fechaFin);
        }
        query += " ORDER BY pv.fecha_viaje_inicio DESC";

        const [ventas] = await conn.query(query, queryParams);
        conn.release();

        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_paquetes.pdf');
        doc.pipe(res);

        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 30, 30, { width: 50 });
        }

        doc.fontSize(20).text('Reporte de Paquetes Turísticos', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha de generación: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // SECCIÓN 1: CATÁLOGO DE PAQUETES
        doc.fontSize(16).fillColor('#2c3e50').text('Catálogo de Paquetes Activos');
        doc.moveDown(0.5);
        
        let tableTop = doc.y;
        const cols = {
            id: { x: 30, w: 30 },
            nom: { x: 70, w: 160 },
            des: { x: 240, w: 130 },
            dur: { x: 380, w: 60 },
            pre: { x: 450, w: 100 }
        };

        doc.fontSize(10).fillColor('#000000').font('Helvetica-Bold');
        doc.text('ID', cols.id.x, tableTop);
        doc.text('Paquete', cols.nom.x, tableTop);
        doc.text('Destino', cols.des.x, tableTop);
        doc.text('Duración', cols.dur.x, tableTop);
        doc.text('Precio Sugerido', cols.pre.x, tableTop);
        doc.moveTo(30, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        let currentTop = tableTop + 25;
        doc.font('Helvetica');
        const textOpts = (width) => ({ width: width, height: 15, ellipsis: true, lineBreak: false });

        paquetes.forEach(row => {
            if (currentTop > 750) {
                doc.addPage();
                currentTop = 50;
            }
            doc.text(row.id_paquete.toString(), cols.id.x, currentTop, textOpts(cols.id.w));
            doc.text(row.nombre_paquete || '-', cols.nom.x, currentTop, textOpts(cols.nom.w));
            doc.text(row.destino_ruta || '-', cols.des.x, currentTop, textOpts(cols.des.w));
            doc.text(`${row.dias}D / ${row.noches}N`, cols.dur.x, currentTop, textOpts(cols.dur.w));
            doc.text(`$${row.precio_venta_sugerido || 0}`, cols.pre.x, currentTop, textOpts(cols.pre.w));
            currentTop += 20;
        });

        // SECCIÓN 2: HISTORIAL DE VENTAS
        doc.addPage();
        
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 30, 30, { width: 50 });
        }
        doc.fontSize(20).text('Historial de Ventas de Paquetes', { align: 'center' });
        doc.moveDown(2);

        const vCols = {
            paq: { x: 30, w: 100 },
            cli: { x: 140, w: 100 },
            age: { x: 250, w: 80 },
            fec: { x: 340, w: 60 },
            loc: { x: 410, w: 60 },
            mnt: { x: 480, w: 80 }
        };

        tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Paquete', vCols.paq.x, tableTop);
        doc.text('Cliente', vCols.cli.x, tableTop);
        doc.text('Agente', vCols.age.x, tableTop);
        doc.text('Fechas', vCols.fec.x, tableTop);
        doc.text('Localizador', vCols.loc.x, tableTop);
        doc.text('Venta / Util.', vCols.mnt.x, tableTop);
        doc.moveTo(30, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        currentTop = tableTop + 25;
        doc.font('Helvetica');

        ventas.forEach(v => {
            if (currentTop > 750) {
                doc.addPage();
                currentTop = 50;
            }
            
            doc.text(v.nombre_paquete || '-', vCols.paq.x, currentTop, textOpts(vCols.paq.w));
            doc.text(v.cliente || '-', vCols.cli.x, currentTop, textOpts(vCols.cli.w));
            doc.text(v.agente || 'N/A', vCols.age.x, currentTop, textOpts(vCols.age.w));
            
            const fechaViaje = v.fecha_viaje_inicio ? new Date(v.fecha_viaje_inicio).toLocaleDateString() : '-';
            doc.text(fechaViaje, vCols.fec.x, currentTop, textOpts(vCols.fec.w));
            
            doc.text(v.localizador_id || '-', vCols.loc.x, currentTop, textOpts(vCols.loc.w));
            
            doc.text(`$${v.monto_venta_final || 0} / $${v.utilidad || 0}`, vCols.mnt.x, currentTop, textOpts(vCols.mnt.w));
            
            currentTop += 20;
        });

        doc.end();
    } catch (error) {
        console.error("Error generando reporte PDF de paquetes:", error);
        res.status(500).json({ success: false, message: 'Error al generar el reporte PDF' });
    }
}

export async function obtenerVentasPaquetes(req, res) {
    try {
        const conn = await getConnection();
        const [rows] = await conn.query(`
            SELECT 
                pv.id_venta_paquete,
                pt.nombre_paquete,
                pt.destino_ruta,
                CONCAT(c.nombre, ' ', c.apellido) as cliente,
                c.cedula,
                pv.localizador_id,
                pv.fecha_viaje_inicio,
                pv.fecha_viaje_fin,
                pv.monto_venta_final,
                pv.utilidad,
                u.nombre as agente
            FROM paquetes_vendidos pv
            JOIN paquetes_turisticos pt ON pv.paquete_id = pt.id_paquete
            JOIN clientes c ON pv.cliente_id = c.id_cliente
            LEFT JOIN reservas r ON pv.localizador_id = r.localizador
            LEFT JOIN boletos b ON b.localizador_id = r.localizador
            LEFT JOIN usuarios u ON b.usuario_id = u.id_usuario
            ORDER BY pv.fecha_viaje_inicio DESC
        `);
        conn.release();
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error obteniendo ventas de paquetes:', error);
        res.status(500).json({ success: false, message: 'Error al obtener ventas de paquetes', error: error.message });
    }
}
