import db from '../config/db.js';

const crearVenta = async (req, res) => {
    try {
        const { 
            localizador, 
            numero_boleto,
            ruta, 
            fecha_ida, 
            fecha_retorno, 
            monto_neto, 
            fee_emision, 
            monto_venta, 
            utilidad, 
            fee_comision, 
            fecha_venta,
            aerolinea_id,
            cliente_id
        } = req.body;

        await db.execute(
            'INSERT IGNORE INTO reservas (localizador, fecha_venta) VALUES (?, ?)', 
            [localizador, fecha_venta]
        );

        const queryBoleto = `INSERT INTO boletos 
            (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.execute(queryBoleto, [
            numero_boleto, 
            ruta, 
            fecha_ida, 
            fecha_retorno, 
            monto_neto, 
            fee_emision, 
            monto_venta, 
            utilidad, 
            fee_comision,
            aerolinea_id,
            cliente_id,
            localizador
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
                b.utilidad,
                b.fee_comision,
                b.tipo
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

const statsVenta = async (req, res) => {
    try {
        const hoy = new Date();
        const añoActual = hoy.getFullYear();
        const mesActual = String(hoy.getMonth() + 1).padStart(2, '0');
        const filtroMes = `${añoActual}-${mesActual}%`;

        const queryGlobal = `
            SELECT 
                COALESCE(SUM(monto_venta), 0) AS totalVentas,
                COALESCE(SUM(utilidad), 0) AS totalUtilidad,
                COALESCE(SUM(fee_comision), 0) AS totalComisiones
            FROM boletos
        `;

        const queryMes = `
            SELECT COUNT(b.numero_boleto) AS ventasMes
            FROM boletos b
            INNER JOIN reservas r ON b.localizador_id = r.localizador
            WHERE r.fecha_venta LIKE ?
        `;

        const [[resGlobal], [resMes]] = await Promise.all([
            db.execute(queryGlobal),
            db.execute(queryMes, [filtroMes])
        ]);

        const estadisticas = {
            totalVentas: Number(resGlobal[0].totalVentas),
            totalUtilidad: Number(resGlobal[0].totalUtilidad),
            totalComisiones: Number(resGlobal[0].totalComisiones),
            ventasMes: Number(resMes[0].ventasMes)
        };

        res.status(200).json(estadisticas);

    } catch (error) {
        console.error("Error en statsVenta:", error);
        res.status(500).json({ 
            exito: false, 
            mensaje: 'Error al obtener las estadísticas de ventas' 
        });
    }
};

const recentVentas = async (req, res) => {
    try {
        //const limite = 10;

        const queryRecientes = `
            SELECT 
                b.id_transaccion,
                b.numero_boleto,
                CONCAT(c.nombre, ' ', c.apellido) AS pasajero,
                b.ruta,
                a.nombre AS aerolinea,
                b.monto_venta,
                b.utilidad
            FROM boletos b
            INNER JOIN clientes c ON b.cliente_id = c.id_cliente
            INNER JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            INNER JOIN reservas r ON b.localizador_id = r.localizador
            ORDER BY r.fecha_venta DESC, b.numero_boleto DESC
            LIMIT 10
        `;

        const [rows] = await db.execute(queryRecientes);//, [limite]

        res.status(200).json(rows);

    } catch (error) {
        console.error("Error en recentVentas:", error);
        res.status(500).json({
            exito: false,
            mensaje: 'Error al obtener las ventas recientes'
        });
    }
};

export { crearVenta, obtenerVentas, getVentasFiltradas , statsVenta, recentVentas};
