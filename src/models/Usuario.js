import db from '../config/db.js';

class Usuario {
    static async crear(nombre, email, passwordHash) {
        const [result] = await db.execute('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, passwordHash]);
        return result.insertId;
    }

    static async buscarPorEmail(email) {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        return rows[0] || null;
    }

    static async buscarPorId(id) {
        const [rows] = await db.query('SELECT id_usuario, nombre, email, ativo FROM usuarios WHERE id_usuario = ?', [id]);
        return rows[0] || null;
    }
}

export default Usuario;
