import { Router } from 'express';
const router = Router();
import { listarPaquetes, crearPaquete, venderPaquete } from '../controllers/paquetesController.js';
import { registrarUsuario, loginUsuario } from '../controllers/authController.js';
import { crearVenta, obtenerVentas, statsVenta, recentVentas, generarReporteVentas, eliminarVenta } from '../controllers/ventaController.js';
import { obtenerClientes, obtenerClientePorId, crearCliente, actualizarCliente, eliminarCliente } from '../controllers/clientesController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import db from '../config/db.js';

// Ruta raíz de la API
router.get('/', (req, res) => {
    res.json({ message: 'API de la Agencia funcionando correctamente!' });
});

// Rutas de Clientes
router.get('/clientes', obtenerClientes);
router.get('/clientes/:id', obtenerClientePorId);
router.post('/clientes', crearCliente);
router.put('/clientes/:id', actualizarCliente);
router.delete('/clientes/:id', eliminarCliente);

// Rutas de Autenticacion
router.post('/auth/register', registrarUsuario);
router.post('/auth/login', loginUsuario);

// Rutas de Ventas
router.post('/ventas', authMiddleware, crearVenta);
router.get('/ventas', obtenerVentas);
router.get('/ventas/stats', statsVenta);
router.get('/ventas/recent', recentVentas);
router.get('/ventas/reporte', generarReporteVentas);
router.delete('/ventas/:id', authMiddleware, eliminarVenta);

// Rutas del catálogo
router.get('/paquetes', listarPaquetes);
router.post('/paquetes', crearPaquete);

// Ruta para la transacción de venta
router.post('/paquetes/vender', venderPaquete);


// Rutas Auxiliares
router.get('/aerolineas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM aerolineas');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
