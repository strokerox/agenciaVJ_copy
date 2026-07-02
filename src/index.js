import express, { json } from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Configuración de Middlewares Globales
app.use(cors()); // Permite peticiones desde diferentes orígenes (Frontend)
app.use(json()); // Permite que la API interprete el cuerpo de las peticiones en formato JSON

// Endpoint de prueba para verificar que el servidor está activo
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('API de la Agencia funcionando correctamente!');
});

// Prefijo '/api' para todas las rutas definidas en el módulo apiRoutes
app.use('/api', apiRoutes);

// Inicio del servidor en el puerto configurado
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
