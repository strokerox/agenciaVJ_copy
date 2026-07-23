import db from '../config/db.js';

const isAdmin = async (req, res, next) => {
  try {
    // req.user viene de authMiddleware
    if (!req.user || !req.user.id) {
      return res.status(401).json({ exito: false, mensaje: 'No autorizado. Token inválido.' });
    }

    const [rows] = await db.query('SELECT rol FROM usuarios WHERE id_usuario = ?', [req.user.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado.' });
    }

    const userRol = rows[0].rol;

    if (userRol !== 'admin') {
      return res.status(403).json({ exito: false, mensaje: 'Acceso denegado. Se requieren permisos de Administrador.' });
    }

    // El usuario es administrador, puede continuar
    next();
  } catch (error) {
    console.error('Error en middleware isAdmin:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al verificar permisos del usuario.' });
  }
};

export { isAdmin };
