const db = require('../config/db');

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
}

module.exports = Reserva;
