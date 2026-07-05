import Paquete from '../models/paquete.js';
import PaqueteVendido from '../models/paqueteVendido.js';
import Reserva from '../models/Reserva.js';
import { getConnection } from '../config/db.js';

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

