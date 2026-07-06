import { Router } from 'express';
const router = Router();
import { listarPaquetes, crearPaquete, venderPaquete } from '../controllers/paquetesController.js';
import { registrarUsuario, loginUsuario } from '../controllers/authController.js';
import { crearVenta, obtenerVentas, statsVenta, recentVentas, generarReporteVentas, eliminarVenta, actualizarEstadoVenta } from '../controllers/ventaController.js';
import { obtenerClientes, obtenerClientePorId, crearCliente, actualizarCliente, eliminarCliente } from '../controllers/clientesController.js';
import { obtenerAerolineas, crearAerolinea, actualizarAerolinea, eliminarAerolinea } from '../controllers/aerolineasController.js';
import { obtenerUsuarios, actualizarUsuario, eliminarUsuario } from '../controllers/usersController.js';
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

// Rutas de Usuarios (Administración)
router.get('/usuarios', authMiddleware, obtenerUsuarios);
router.put('/usuarios/:id', authMiddleware, actualizarUsuario);
router.delete('/usuarios/:id', authMiddleware, eliminarUsuario);

// Rutas de Ventas
router.post('/ventas', authMiddleware, crearVenta);
router.get('/ventas', obtenerVentas);
router.get('/ventas/stats', statsVenta);
router.get('/ventas/recent', recentVentas);
router.get('/ventas/reporte', generarReporteVentas);
router.delete('/ventas/:id', authMiddleware, eliminarVenta);
router.put('/ventas/estado/:localizador', authMiddleware, actualizarEstadoVenta);

// Rutas del catálogo
router.get('/paquetes', listarPaquetes);
router.post('/paquetes', crearPaquete);

// Rutas Auxiliares
router.get('/aerolineas', obtenerAerolineas);
router.post('/aerolineas', authMiddleware, crearAerolinea);
router.put('/aerolineas/:id', authMiddleware, actualizarAerolinea);
router.delete('/aerolineas/:id', authMiddleware, eliminarAerolinea);

router.get('/usuarios', authMiddleware, obtenerUsuarios);
router.put('/usuarios/:id', authMiddleware, actualizarUsuario);
router.delete('/usuarios/:id', authMiddleware, eliminarUsuario);

export default router;
