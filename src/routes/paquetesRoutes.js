import { Router } from 'express';
const router = Router();
import { listarPaquetes, crearPaquete, venderPaquete } from '../controllers/paquetesController.js';

// Rutas del catálogo
router.get('/', listarPaquetes);
router.post('/', crearPaquete);

// Ruta para la transacción de venta
router.post('/vender', venderPaquete);

export default router;