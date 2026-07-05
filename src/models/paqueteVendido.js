import db from '../config/db.js';

const PaqueteVendido = {
    registrarVenta: async (ventaData, connection) => {
        // Usamos la conexión de la transacción si se provee, de lo contrario usamos el pool normal
        const conn = connection || db; 
        const { paquete_id, localizador_id, cliente_id, fecha_viaje_inicio, fecha_viaje_fin, monto_venta_final, utilidad } = ventaData;
        
        const [result] = await conn.query(
            `INSERT INTO paquetes_vendidos 
            (paquete_id, localizador_id, cliente_id, fecha_viaje_inicio, fecha_viaje_fin, monto_venta_final, utilidad) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [paquete_id, localizador_id, cliente_id, fecha_viaje_inicio, fecha_viaje_fin, monto_venta_final, utilidad]
        );
        return result.insertId;
    }
};

export default PaqueteVendido;
