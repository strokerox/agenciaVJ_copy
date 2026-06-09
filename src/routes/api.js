const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const ventasController = require('../controllers/ventaController');
const clientesController = require('../controllers/clientesController');
const db = require('../config/db');

// Rutas de Clientes
router.get('/clientes', clientesController.obtenerClientes);
router.get('/clientes/:id', clientesController.obtenerClientePorId);
router.post('/clientes', clientesController.crearCliente);
router.put('/clientes/:id', clientesController.actualizarCliente);
router.delete('/clientes/:id', clientesController.eliminarCliente);

// Rutas de Autenticacion
router.post('/auth/register', authController.registrarUsuario);
router.post('/auth/login', authController.loginUsuario);

// Rutas de Ventas
router.post('/ventas', ventasController.crearVenta);
router.get('/ventas', ventasController.obtenerVentas);

// Rutas Auxiliares
router.get('/aerolineas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM aerolineas');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;


