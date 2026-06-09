const db = require('../config/db');

const crearVenta = async (req, res) => {
    try {
        const { localizador, boleto, nombre, apellido, ruta, aerolinea, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, fecha_venta } = req.body;

        await db.execute('INSERT IGNORE INTO aerolineas (nombre) VALUES (?)', [aerolinea]);
        const [aero] = await db.execute('SELECT id_aerolinea FROM aerolineas WHERE nombre = ?', [aerolinea]);

        const [cli] = await db.execute('INSERT INTO clientes (nombre, apellido) VALUES (?, ?)', [nombre, apellido]);
        const clienteId = cli.insertId;

        await db.execute('INSERT IGNORE INTO reservas (localizador, fecha_venta) VALUES (?, ?)', [localizador, fecha_venta]);

        const queryBoleto = `INSERT INTO boletos 
            (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.execute(queryBoleto, [
            boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision,
            aero[0].id_aerolinea, clienteId, localizador
        ]);

        res.status(201).json({ exito: true, mensaje: 'Venta registrada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al registrar la venta' });
    }
};

const obtenerVentas = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                b.id_transaccion,
                r.localizador,
                b.numero_boleto,
                CONCAT(c.nombre, ' ', c.apellido) as pasajero,
                a.nombre as aerolinea,
                b.ruta,
                b.fecha_ida,
                b.monto_venta,
                b.utilidad
            FROM boletos b
            JOIN clientes c ON b.cliente_id = c.id_cliente
            JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            JOIN reservas r ON b.localizador_id = r.localizador
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener las ventas' });
    }
};

const getVentasFiltradas = async (req, res) => {
    // 1. Extraemos los parámetros de búsqueda de la URL
    const { busqueda, fechaInicio, fechaFin } = req.query;
    
    // 2. Base de la consulta con todos los JOINs necesarios
    let sql = `
        SELECT 
            r.localizador,
            b.numero_boleto,
            c.nombre AS nombre_cliente,
            c.apellido AS apellido_cliente,
            a.nombre AS aerolinea,
            b.ruta,
            b.fecha_ida,
            b.monto_venta,
            b.utilidad
        FROM boletos b
        JOIN clientes c ON b.cliente_id = c.id_cliente
        JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
        JOIN reservas r ON b.localizador_id = r.localizador
        WHERE 1=1
    `;
    
    const params = [];

    // 3. Filtro de Texto (Nombre, Apellido, Localizador o Boleto)
    if (busqueda) {
        sql += ` AND (
            c.nombre LIKE ? OR 
            c.apellido LIKE ? OR 
            r.localizador LIKE ? OR 
            b.numero_boleto LIKE ?
        )`;
        const comodin = `%${busqueda}%`;
        params.push(comodin, comodin, comodin, comodin);
    }

    // 4. Filtro por Rango de Fechas (usando la fecha de ida del vuelo)
    if (fechaInicio && fechaFin) {
        sql += ` AND b.fecha_ida BETWEEN ? AND ?`;
        params.push(fechaInicio, fechaFin);
    }

    // 5. Ordenar para que los más recientes salgan primero
    sql += ` ORDER BY b.fecha_ida DESC`;

    try {
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { crearVenta, obtenerVentas, getVentasFiltradas };
