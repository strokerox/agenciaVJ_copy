import db from '../config/db.js';

class Boleto {
    static async obtenerTodos() {
        const query = `
            SELECT 
                b.id_transaccion,
                r.localizador,
                b.numero_boleto,
                CONCAT(c.nombre, ' ', c.apellido) as pasajero,
                a.nombre as aerolinea,
                b.ruta,
                b.fecha_ida,
                b.monto_venta,
                b.utilidad
            FROM boletos b
            JOIN clientes c ON b.cliente_id = c.id_cliente
            JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            JOIN reservas r ON b.localizador_id = r.localizador
        `;
        
        const [rows] = await db.execute(query);
        return rows;
    }

    static async buscarPorId(id) {
        const [rows] = await db.query('SELECT * FROM boletos WHERE id_transaccion = ?', [id]);
        return rows[0] || null;
    }
}

export default Boleto;
