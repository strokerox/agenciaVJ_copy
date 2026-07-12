import db from '../config/db.js';

const obtenerAerolineas = async (req, res) => {
    try {
        // Al hacer SELECT *, automáticamente traerá las nuevas columnas (rif, direccion, telefono, representante)
        const [rows] = await db.query('SELECT * FROM aerolineas');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las aerolíneas' });
    }
};

const crearAerolinea = async (req, res) => {
    try {
        // Extraemos todos los campos actualizados del cuerpo de la petición
        const { nombre, rif, direccion, telefono, representante } = req.body;
        
        if (!nombre) {
            return res.status(400).json({ exito: false, mensaje: 'El nombre de la aerolínea es requerido' });
        }

        // Se insertan los datos; si alguno viene vacío desde el frontend, se guarda como NULL
        const [result] = await db.execute(
            'INSERT INTO aerolineas (nombre, rif, direccion, telefono, representante) VALUES (?, ?, ?, ?, ?)', 
            [nombre, rif || null, direccion || null, telefono || null, representante || null]
        );
        
        res.status(201).json({ exito: true, mensaje: 'Aerolínea creada correctamente', id: result.insertId });
    } catch (error) {
        // Manejo del error de restricción UNIQUE (para el nombre o el RIF)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'El nombre o el RIF ingresado ya se encuentra registrado en otra aerolínea.' });
        }
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al crear la aerolínea' });
    }
};

const actualizarAerolinea = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, rif, direccion, telefono, representante } = req.body;
        
        if (!nombre) {
            return res.status(400).json({ exito: false, mensaje: 'El nombre de la aerolínea es requerido' });
        }

        const [result] = await db.execute(
            'UPDATE aerolineas SET nombre = ?, rif = ?, direccion = ?, telefono = ?, representante = ? WHERE id_aerolinea = ?', 
            [nombre, rif || null, direccion || null, telefono || null, representante || null, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Aerolínea no encontrada' });
        }
        res.json({ exito: true, mensaje: 'Aerolínea actualizada correctamente' });
    } catch (error) {
        // Manejo del error UNIQUE también en la edición por si intentan poner un RIF de otra aerolínea
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ exito: false, mensaje: 'El nombre o el RIF ingresado pertenece a otra aerolínea registrada.' });
        }
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