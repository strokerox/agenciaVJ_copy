import { createPool } from 'mysql2';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuración de rutas para cargar el archivo .env correctamente en entornos ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Creación de un Pool de conexiones para mejorar la eficiencia y manejo de múltiples peticiones simultáneas
const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'agencia_viajes',
    port: process.env.DB_PORT || 16249,
    waitForConnections: true,
    connectionLimit: 10, // Máximo de conexiones abiertas simultáneamente
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false // Configuración necesaria para algunas conexiones remotas/nubes
    }
});

// Convertimos el pool a una versión basada en promesas para usar async/await en los controladores
const poolPromise = pool.promise();

// Funciones utilitarias simplificadas para ejecutar consultas en toda la aplicación
export const query = (...args) => poolPromise.query(...args);
export const execute = (...args) => poolPromise.execute(...args);
export const getConnection = () => poolPromise.getConnection();

export default poolPromise;
