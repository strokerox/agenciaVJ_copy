import db from './src/config/db.js';

async function test() {
    try {
        const [boletos] = await db.query('DESCRIBE boletos');
        console.log('Boletos:', boletos.map(c => c.Field));
        const [reservas] = await db.query('DESCRIBE reservas');
        console.log('Reservas:', reservas.map(c => c.Field));
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
test();
