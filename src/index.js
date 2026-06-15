import express, { json } from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(json());

// Servidor
const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => {
    res.send('API de la Agencia funcionando correctamente!');
});

// Rutas
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});