import db from './src/config/db.js';

async function test() {
    try {
        const [rows] = await db.query(`
            SELECT 
                r.localizador,
                b.numero_boleto,
                c.nombre,
                c.apellido,
                c.cedula,
                c.telefono,
                c.email,
                a.nombre as aerolinea,
                b.ruta,
                b.fecha_ida,
                b.fecha_retorno,
                b.monto_neto,
                b.fee_emision,
                b.monto_venta,
                b.fee_comision,
                b.utilidad,
                b.tipo,
                r.estado,
                r.fecha_venta
            FROM boletos b
            JOIN clientes c ON b.cliente_id = c.id_cliente
            JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            JOIN reservas r ON b.localizador_id = r.localizador
            LIMIT 1
        `);
        console.log(rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
test();
