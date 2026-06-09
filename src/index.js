const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api', apiRoutes);

// Servidor
const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => {
    res.send('API de la Agencia funcionando correctamente!');
});
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});