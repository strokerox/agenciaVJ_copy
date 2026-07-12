import jwt from 'jsonwebtoken';

const verificarRolAdmin = (req, res, next) => {
    
    const usuarioLogueado = req.usuario;

    if (!usuarioLogueado) {
        return res.status(401).json({ exito: false, mensaje: 'No autenticado' });
    }

    if (usuarioLogueado.rol !== 'admin') {
        return res.status(403).json({ 
            exito: false, 
            mensaje: 'Acceso denegado. Esta acción requiere privilegios de Administrador.' 
        });
    }

    // Si es admin, dejamos que la petición continúe hacia el controlador
    next();
};

export { verificarRolAdmin };