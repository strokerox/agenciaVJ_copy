import db from '../config/db.js';

// Para un Agente: Ver solo sus propias comisiones
const misComisiones = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        
        const [rows] = await db.query(`
            SELECT 
                b.id_transaccion,
                r.localizador,
                b.numero_boleto,
                b.fecha_ida,
                b.monto_venta,
                b.utilidad,
                b.fee_comision,
                b.estado_comision,
                a.nombre as aerolinea
            FROM boletos b
            JOIN reservas r ON b.localizador_id = r.localizador
            JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            WHERE b.usuario_id = ?
            ORDER BY b.fecha_ida DESC
        `, [usuarioId]);
        
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las comisiones del agente' });
    }
};

// Para un Administrador: Ver todas las comisiones de todos los agentes
const todasLasComisiones = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                b.id_transaccion,
                r.localizador,
                b.numero_boleto,
                b.fecha_ida,
                b.monto_venta,
                b.utilidad,
                b.fee_comision,
                b.estado_comision,
                a.nombre as aerolinea,
                u.nombre as agente,
                u.id_usuario as agente_id
            FROM boletos b
            JOIN reservas r ON b.localizador_id = r.localizador
            JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            LEFT JOIN usuarios u ON b.usuario_id = u.id_usuario
            ORDER BY b.fecha_ida DESC
        `);
        
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener todas las comisiones' });
    }
};

// Para un Administrador: Marcar una comisión como pagada
const pagarComision = async (req, res) => {
    try {
        const { id_transaccion } = req.params;
        
        const [result] = await db.execute(
            'UPDATE boletos SET estado_comision = ? WHERE id_transaccion = ?',
            ['Pagada', id_transaccion]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Transacción no encontrada' });
        }
        
        res.json({ exito: true, mensaje: 'Comisión marcada como Pagada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el estado de la comisión' });
    }
};

export { misComisiones, todasLasComisiones, pagarComision };
