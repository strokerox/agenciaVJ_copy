import db from '../config/db.js';

class Reserva {
    static async crear(localizador, fechaVenta = null) {
        const [result] = await db.execute('INSERT IGNORE INTO reservas (localizador, fecha_venta) VALUES (?, ?)', [localizador, fechaVenta]);
        return result;
    }

    static async buscarPorLocalizador(localizador) {
        const [rows] = await db.query('SELECT * FROM reservas WHERE localizador = ?', [localizador]);
        return rows[0] || null;
    }

    static async obtenerTodas() {
        const [rows] = await db.query('SELECT * FROM reservas');
        return rows;
    }

    //método para acumular el costo de los paquetes al total de la reserva
    static async actualizarMontoTotal(localizadorId, montoExtra, connection = null) {
        // Si se pasa una conexión (para una transacción), se usa esa; si no, se usa el pool global 'db'
        const conn = connection || db;
        const [result] = await conn.execute(
            'UPDATE reservas SET monto_total = monto_total + ? WHERE localizador = ?',
            [montoExtra, localizadorId]
        );
        return result.affectedRows;
    }
}

export default Reserva;
