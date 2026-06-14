import { createPool } from 'mysql2';
import { resolve } from 'path';
require('dotenv').config({ path: resolve(__dirname, '../.env') });

const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'agencia_viajes',
    port: process.env.DB_PORT || 16249,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

export default pool.promise();
