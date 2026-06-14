const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db').default;

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
        
        await db.execute('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, hashedPassword]);

        res.status(201).json({ exito: true, mensaje: 'Usuario registrado correctamente' });
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
            { id: userId, nombre: user.nombre, email: user.email }, 
            secret, 
            { expiresIn: '24h' }
        );

        
        res.json({ 
            exito: true, 
            token, 
            user: { id: userId, nombre: user.nombre, email: user.email } 
        });
    } catch (error) {
        console.error("ERROR EN LOGIN:", error); 
        res.status(500).json({ exito: false, mensaje: 'Error interno al iniciar sesión' });
    }
};

module.exports = { registrarUsuario, loginUsuario };