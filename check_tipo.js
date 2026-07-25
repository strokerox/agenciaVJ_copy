import db from './src/config/db.js';

async function test() {
    try {
        const [rows] = await db.query('SELECT DISTINCT tipo FROM boletos');
        console.log(rows);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
test();
