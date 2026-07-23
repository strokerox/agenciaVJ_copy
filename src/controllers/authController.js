import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ exito: false, mensaje: 'Nombre, email y password son requeridos' });
        }

        const [existing] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ exito: false, mensaje: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.execute('INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)', [nombre, email, hashedPassword, 'agente']);
        
        const userId = result.insertId;
        const secret = process.env.JWT_SECRET || 'default_jwt_secret';
        
        const token = jwt.sign(
            { id: userId, nombre, email, rol: 'agente' }, 
            secret, 
            { expiresIn: '24h' }
        );

        res.status(201).json({ 
            exito: true, 
            mensaje: 'Usuario registrado correctamente',
            token,
            user: { id: userId, nombre, email, rol: 'agente' }
        });
    } catch (error) {
        console.error("ERROR EN REGISTRO:", error); // Log detallado
        res.status(500).json({ exito: false, mensaje: 'Error interno al registrar el usuario' });
    }
};

const loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ exito: false, mensaje: 'Email y password son requeridos' });
        }

        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ exito: false, mensaje: 'Credenciales invalidas' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ exito: false, mensaje: 'Credenciales invalidas' });
        }

        const secret = process.env.JWT_SECRET || 'default_jwt_secret';
        
        const userId = user.id_usuario || user.id; 
        
        const token = jwt.sign(
            { id: userId, nombre: user.nombre, email: user.email, rol: user.rol }, 
            secret, 
            { expiresIn: '24h' }
        );
        
        res.json({ 
            exito: true, 
            token, 
            user: { id: userId, nombre: user.nombre, email: user.email, rol: user.rol } 
        });
    } catch (error) {
        console.error("ERROR EN LOGIN:", error); 
        res.status(500).json({ exito: false, mensaje: 'Error interno al iniciar sesión' });
    }
};

// --- NUEVAS FUNCIONES PARA GESTIÓN DE USUARIOS ---

const obtenerUsuarios = async (req, res) => {
    try {
        // No devolvemos la contraseña por seguridad
        const [rows] = await db.query('SELECT id_usuario, nombre, email, rol, fecha_creacion FROM usuarios');
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener la lista de usuarios' });
    }
};

const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, rol } = req.body;

        await db.execute(
            'UPDATE usuarios SET nombre = ?, email = ?, rol = ? WHERE id_usuario = ?',
            [nombre, email, rol, id]
        );

        res.json({ exito: true, mensaje: 'Usuario actualizado correctamente' });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el usuario' });
    }
};

const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
        res.json({ exito: true, mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar el usuario' });
    }
};

export { registrarUsuario, loginUsuario, obtenerUsuarios, actualizarUsuario, eliminarUsuario };

