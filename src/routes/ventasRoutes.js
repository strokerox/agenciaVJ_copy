import { Router } from 'express';
const router = Router();
import { getVentasFiltradas, obtenerVentas, crearVenta } from '../controllers/ventaController.js';

// Ruta para obtener y filtrar ventas
router.get('/buscar', getVentasFiltradas);
router.get('/', obtenerVentas);
router.post('/', crearVenta);

export default router;
