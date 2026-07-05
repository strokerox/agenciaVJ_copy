import db from '../config/db.js';

const obtenerAerolineas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM aerolineas');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las aerolíneas' });
    }
};

const crearAerolinea = async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) {
            return res.status(400).json({ exito: false, mensaje: 'El nombre de la aerolínea es requerido' });
        }
        const [result] = await db.execute('INSERT INTO aerolineas (nombre) VALUES (?)', [nombre]);
        res.status(201).json({ exito: true, mensaje: 'Aerolínea creada correctamente', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al crear la aerolínea' });
    }
};

const actualizarAerolinea = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        const [result] = await db.execute('UPDATE aerolineas SET nombre = ? WHERE id_aerolinea = ?', [nombre, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Aerolínea no encontrada' });
        }
        res.json({ exito: true, mensaje: 'Aerolínea actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar la aerolínea' });
    }
};

const eliminarAerolinea = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute('DELETE FROM aerolineas WHERE id_aerolinea = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Aerolínea no encontrada' });
        }
        res.json({ exito: true, mensaje: 'Aerolínea eliminada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar la aerolínea' });
    }
};

export { obtenerAerolineas, crearAerolinea, actualizarAerolinea, eliminarAerolinea };
