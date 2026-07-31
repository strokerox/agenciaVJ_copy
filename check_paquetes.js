import db from './src/config/db.js';

async function test() {
    try {
        const [paquetes] = await db.query('DESCRIBE paquetes_turisticos');
        console.log('paquetes_turisticos:', paquetes.map(c => `${c.Field} (${c.Type})`));
        const [vendidos] = await db.query('DESCRIBE paquetes_vendidos');
        console.log('paquetes_vendidos:', vendidos.map(c => `${c.Field} (${c.Type})`));
    } catch (e) {
        console.error(e.message);
    }
    process.exit();
}
test();
