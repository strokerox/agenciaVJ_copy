const db = require('../config/db');

const obtenerClientes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM clientes');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener los clientes' });
    }
};

const obtenerClientePorId = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener el cliente' });
    }
};

const crearCliente = async (req, res) => {
    try {
        const { nombre, apellido } = req.body;
        if (!nombre || !apellido) {
            return res.status(400).json({ exito: false, mensaje: 'Nombre y apellido son requeridos' });
        }
        const [result] = await db.execute('INSERT INTO clientes (nombre, apellido) VALUES (?, ?)', [nombre, apellido]);
        res.status(201).json({ exito: true, mensaje: 'Cliente creado correctamente', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al crear el cliente' });
    }
};

const actualizarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido } = req.body;
        const [result] = await db.execute('UPDATE clientes SET nombre = ?, apellido = ? WHERE id_cliente = ?', [nombre, apellido, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
        res.json({ exito: true, mensaje: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el cliente' });
    }
};

const eliminarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.execute('DELETE FROM clientes WHERE id_cliente = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Cliente no encontrado' });
        }
        res.json({ exito: true, mensaje: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar el cliente' });
    }
};

module.exports = { obtenerClientes, obtenerClientePorId, crearCliente, actualizarCliente, eliminarCliente };
