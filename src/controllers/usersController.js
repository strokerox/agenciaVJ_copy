import db from '../config/db.js';

const obtenerUsuarios = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id_usuario, nombre, email, rol FROM usuarios');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener los usuarios' });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, rol } = req.body;
        const [result] = await db.execute(
            'UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id_usuario = ?', 
            [nombre, email, rol, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
        }
        res.json({ exito: true, mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el usuario' });
    }
};

const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
        }
        res.json({ exito: true, mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar el usuario' });
    }
};

export { obtenerUsuarios, actualizarUsuario, eliminarUsuario };
