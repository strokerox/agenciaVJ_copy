const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventaController');

// Ruta para obtener y filtrar ventas
router.get('/buscar', ventaController.getVentasFiltradas);
router.get('/', ventasController.obtenerVentas);
router.post('/', ventasController.crearVenta);

module.exports = router;
