import Paquete from '../models/paquete.js';
import PaqueteVendido from '../models/paqueteVendido.js';
import Reserva from '../models/Reserva.js';
import { getConnection } from '../config/db.js';
import PDFDocument from 'pdfkit';

export async function listarPaquetes(req, res) {
    try {
        const paquetes = await Paquete.obtenerActivos();
        res.status(200).json({ success: true, data: paquetes });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener los paquetes', error: error.message });
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
        const paquetes = await Paquete.obtenerActivos();
        
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_paquetes.pdf');
        doc.pipe(res);

        doc.fontSize(20).text('Catálogo de Paquetes - AgenciaVJ', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha de generación: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        const tableTop = 140;
        const cols = {
            id: { x: 30, w: 40 },
            nom: { x: 80, w: 150 },
            des: { x: 240, w: 120 },
            dur: { x: 370, w: 60 },
            pre: { x: 440, w: 110 }
        };

        doc.fontSize(10).font('Helvetica-Bold');
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
            if (currentTop > 700) {
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

        doc.end();
    } catch (error) {
        console.error("Error generando reporte PDF de paquetes:", error);
        res.status(500).json({ success: false, message: 'Error al generar el reporte PDF' });
    }
}

