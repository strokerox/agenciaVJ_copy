import { Router } from 'express';
const router = Router();
import { registrarUsuario, loginUsuario } from '../controllers/authController.js';
import { crearVenta, obtenerVentas } from '../controllers/ventaController.js';
import { obtenerClientes, obtenerClientePorId, crearCliente, actualizarCliente, eliminarCliente } from '../controllers/clientesController.js';
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
router.post('/ventas', crearVenta);
router.get('/ventas', obtenerVentas);

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
