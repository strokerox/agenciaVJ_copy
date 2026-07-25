import express from 'express';
import multer from 'multer';
import { backupBD, restoreBD } from '../controllers/mantenimientoController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

import os from 'os';

// Configuración de multer para subir los archivos .sql en la carpeta temporal del sistema (necesario para Vercel)
const upload = multer({ dest: os.tmpdir() });

// Ambas rutas protegidas para que solo Administradores puedan acceder
router.get('/backup', authMiddleware, isAdmin, backupBD);
router.post('/restore', authMiddleware, isAdmin, upload.single('archivoSql'), restoreBD);

export default router;
