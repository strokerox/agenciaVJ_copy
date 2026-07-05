import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

// Función para registrar nuevos usuarios en el sistema
const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        // Validación básica de campos obligatorios
        if (!nombre || !email || !password) {
            return res.status(400).json({ exito: false, mensaje: 'Nombre, email y password son requeridos' });
        }

        // Verificación de que el email no esté duplicado en la base de datos
        const [existing] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ exito: false, mensaje: 'El usuario ya existe' });
        }

        // Encriptación de la contraseña utilizando bcrypt con un factor de costo de 10
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.execute('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', [nombre, email, hashedPassword]);

        res.status(201).json({ exito: true, mensaje: 'Usuario registrado correctamente' });
    } catch (error) {
        console.error("ERROR EN REGISTRO:", error);
        res.status(500).json({ exito: false, mensaje: 'Error interno al registrar el usuario' });
    }
};

// Función para autenticar usuarios y generar un token de sesión (JWT)
const loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ exito: false, mensaje: 'Email y password son requeridos' });
        }

        // Búsqueda del usuario por email
        const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ exito: false, mensaje: 'Credenciales invalidas' });
        }

        const user = users[0];
        // Comparación de la contraseña ingresada con la versión encriptada de la DB
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ exito: false, mensaje: 'Credenciales invalidas' });
        }

        const secret = process.env.JWT_SECRET || 'default_jwt_secret';
        const userId = user.id_usuario || user.id; 
        
        // Generación del token JWT que contiene la identidad del usuario y expira en 24 horas
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

export { registrarUsuario, loginUsuario };
