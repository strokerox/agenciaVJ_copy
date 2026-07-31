import db from './src/config/db.js';

async function runTest() {
    try {
        console.log("1. Buscando un paquete turístico activo y un cliente y aerolinea...");
        const [paquetes] = await db.query("SELECT * FROM paquetes_turisticos WHERE estado = 'Activo' LIMIT 1");
        const [clientes] = await db.query("SELECT * FROM clientes LIMIT 1");
        const [aerolineas] = await db.query("SELECT * FROM aerolineas LIMIT 1");
        const [usuarios] = await db.query("SELECT * FROM usuarios LIMIT 1");

        if (paquetes.length === 0 || clientes.length === 0 || aerolineas.length === 0 || usuarios.length === 0) {
            console.log("Faltan datos para la prueba (paquete, cliente, aerolinea o usuario).");
            process.exit(1);
        }

        const paquete = paquetes[0];
        const cliente = clientes[0];
        const aerolinea = aerolineas[0];
        const usuario = usuarios[0];

        const localizador = "TEST" + Math.floor(Math.random() * 1000);
        const numero_boleto = "TK" + Math.floor(Math.random() * 1000000000);
        const fecha_ida = "2026-08-01";
        const fecha_retorno = "2026-08-10";
        const monto_neto = paquete.costo_base;
        const monto_venta = paquete.precio_venta_sugerido;
        const utilidad = parseFloat(monto_venta) - parseFloat(monto_neto);
        const fee_comision = utilidad * 0.20;

        console.log(`2. Registrando venta con paquete_id: ${paquete.id_paquete} y localizador: ${localizador}`);

        // Simular lo que hace crearVenta
        await db.execute('INSERT IGNORE INTO reservas (localizador, fecha_venta) VALUES (?, ?)', [localizador, new Date()]);

        await db.execute(`INSERT INTO boletos 
            (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id, usuario_id, tipo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [numero_boleto, paquete.destino_ruta, fecha_ida, fecha_retorno, monto_neto, 0, monto_venta, utilidad, fee_comision, aerolinea.id_aerolinea, cliente.id_cliente, localizador, usuario.id_usuario, 'RESERVA']
        );

        // Registro en paquetes_vendidos
        await db.execute(`INSERT INTO paquetes_vendidos 
            (paquete_id, localizador_id, cliente_id, fecha_viaje_inicio, fecha_viaje_fin, monto_venta_final, utilidad) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [paquete.id_paquete, localizador, cliente.id_cliente, fecha_ida, fecha_retorno, monto_venta, utilidad]
        );

        console.log("✅ Venta registrada correctamente en boletos y paquetes_vendidos.");

        console.log("\n3. Verificando historial de ventas de paquetes...");
        const [ventas] = await db.query(`
            SELECT 
                pv.id_venta_paquete,
                pt.nombre_paquete,
                c.nombre as cliente,
                pv.localizador_id,
                pv.monto_venta_final,
                pv.utilidad
            FROM paquetes_vendidos pv
            JOIN paquetes_turisticos pt ON pv.paquete_id = pt.id_paquete
            JOIN clientes c ON pv.cliente_id = c.id_cliente
            ORDER BY pv.id_venta_paquete DESC
            LIMIT 1
        `);

        if (ventas.length > 0) {
            console.log("✅ Resultado en el historial:");
            console.log(ventas[0]);
            if (ventas[0].localizador_id === localizador) {
                console.log("¡Prueba exitosa! El paquete vendido aparece en el historial.");
            } else {
                console.log("Error: El localizador no coincide.");
            }
        } else {
            console.log("Error: No se encontró la venta en el historial.");
        }

    } catch (error) {
        console.error("Error durante la prueba:", error.message);
    }
    process.exit(0);
}

runTest();
