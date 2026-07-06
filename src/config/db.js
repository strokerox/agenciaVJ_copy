import { createPool } from 'mysql2';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Creación de un Pool de conexiones para mejorar la eficiencia y manejo de múltiples peticiones simultáneas
const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'agencia_viajes',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 16249,
    waitForConnections: true,
    connectionLimit: 10, // Máximo de conexiones abiertas simultáneamente
    queueLimit: 0,
    ssl: process.env.SSL
        ? {
              rejectUnauthorized: false // Configuración necesaria para algunas conexiones remotas/nubes
          }
        : undefined
});

// Convertimos el pool a una versión basada en promesas para usar async/await en los controladores
const poolPromise = pool.promise();

// Funciones utilitarias simplificadas para ejecutar consultas en toda la aplicación
export const query = (...args) => poolPromise.query(...args);
export const execute = (...args) => poolPromise.execute(...args);
export const getConnection = () => poolPromise.getConnection();

export default poolPromise;
