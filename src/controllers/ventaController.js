import db from '../config/db.js';
import PDFDocument from 'pdfkit';

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
            fecha_venta,
            aerolinea_id,
            cliente_id
        } = req.body;

        // Validación y Recálculo en Servidor (Seguridad Financiera)
        const neto = parseFloat(monto_neto) || 0;
        const emision = parseFloat(fee_emision) || 0;
        const venta = parseFloat(monto_venta) || 0;

        const utilidad = venta - neto - emision;
        const fee_comision = utilidad * 0.20;

        const usuarioId = req.user.id;

        await db.execute(
            'INSERT IGNORE INTO reservas (localizador, fecha_venta) VALUES (?, ?)', 
            [localizador, fecha_venta]
        );

        const queryBoleto = `INSERT INTO boletos 
            (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id, usuario_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        await db.execute(queryBoleto, [
            numero_boleto, 
            ruta, 
            fecha_ida, 
            fecha_retorno, 
            neto, 
            emision, 
            venta, 
            utilidad, 
            fee_comision,
            aerolinea_id,
            cliente_id,
            localizador,
            usuarioId
        ]);

        res.status(201).json({ exito: true, mensaje: 'Venta registrada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al registrar la venta' });
    }
};

const actualizarEstadoVenta = async (req, res) => {
    try {
        const { localizador } = req.params;
        const { estado } = req.body; // Ej: 'Emitido', 'Pendiente', 'Cancelado'

        if (!estado) {
            return res.status(400).json({ exito: false, mensaje: 'El estado es requerido' });
        }

        const [result] = await db.execute('UPDATE reservas SET estado_pago = ? WHERE localizador = ?', [estado, localizador]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Reserva no encontrada con ese localizador' });
        }
        res.json({ exito: true, mensaje: 'Estado de la reserva actualizado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al actualizar el estado de la venta' });
    }
};

const eliminarVenta = async (req, res) => {
    try {
        const { id } = req.params;
        // Primero eliminamos el registro del boleto
        await db.execute('DELETE FROM boletos WHERE id_transaccion = ?', [id]);
        res.json({ exito: true, mensaje: 'Venta anulada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ exito: false, mensaje: 'Error al anular la venta' });
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
                b.tipo,
                r.estado_pago,
                r.fecha_venta
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
            b.utilidad,
            r.estado_pago,
            r.fecha_venta
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

const generarReporteVentas = async (req, res) => {
    try {
        // 1. EXTRAER PARÁMETROS DE FILTRADO
        const { fechaInicio, fechaFin, tipo, aerolinea } = req.query;

        // 2. CONSTRUIR LA CONSULTA SQL DINÁMICA
        let sqlQuery = `
            SELECT 
                r.localizador,
                b.numero_boleto,
                CONCAT(c.nombre, ' ', c.apellido) as pasajero,
                a.nombre as aerolinea,
                b.ruta,
                b.fecha_ida,
                b.monto_venta,
                b.utilidad,
                r.estado_pago,
                r.fecha_venta
            FROM boletos b
            JOIN clientes c ON b.cliente_id = c.id_cliente
            JOIN aerolineas a ON b.aerolinea_id = a.id_aerolinea
            JOIN reservas r ON b.localizador_id = r.localizador
            WHERE 1=1
        `;
        
        const queryParams = [];

        // Filtro por rango de fechas
        if (fechaInicio && fechaFin) {
            sqlQuery += ` AND b.fecha_ida BETWEEN ? AND ?`;
            queryParams.push(fechaInicio, fechaFin);
        }

        // Filtro por tipo 
        if (tipo) {
            sqlQuery += ` AND b.tipo = ?`; 
            queryParams.push(tipo);
        }

        // Filtro por aerolinea
        if (aerolinea) {
            sqlQuery += ` AND a.nombre = ?`;
            queryParams.push(aerolinea);
        }

        sqlQuery += ` ORDER BY b.fecha_ida DESC`;

        // Ejecutar consulta con parámetros seguros
        const [rows] = await db.query(sqlQuery, queryParams);

        // 3. GENERAR EL PDF
        const doc = new PDFDocument({ margin: 30 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_ventas.pdf');

        doc.pipe(res);

        // Encabezado
        doc.fontSize(20).text('Reporte de Ventas - Viajando juntos agencia', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha de generación: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();
       
        // Si hay filtros aplicados, mostrarlos en el PDF (Opcional pero recomendado)
        if (fechaInicio || tipo || aerolinea) {
            doc.fontSize(10).text(`Filtros: ${fechaInicio ? `Desde ${fechaInicio} Hasta ${fechaFin}` : ''} ${tipo ? `| Tipo: ${tipo}` : ''} ${aerolinea ? `| Aerolínea: ${aerolinea}` : ''}`, { align: 'center' });
        }
        doc.moveDown();

        // 4. CONFIGURACIÓN DE COLUMNAS (Posición X y Ancho Máximo)
        const tableTop = 140;
        const cols = {
            loc: { x: 30, w: 60 },
            pas: { x: 90, w: 130 },  // Más espacio para los nombres
            aer: { x: 230, w: 90 },
            rut: { x: 330, w: 90 },
            mon: { x: 430, w: 50 },
            uti: { x: 490, w: 60 }
        };

        // Encabezados de tabla
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Localizador', cols.loc.x, tableTop);
        doc.text('Pasajero', cols.pas.x, tableTop);
        doc.text('Aerolínea', cols.aer.x, tableTop);
        doc.text('Ruta', cols.rut.x, tableTop);
        doc.text('Monto', cols.mon.x, tableTop);
        doc.text('Utilidad', cols.uti.x, tableTop);

        doc.moveTo(30, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        let currentTop = tableTop + 25;
        doc.font('Helvetica');

        // Configuración para evitar que el texto se salga de la casilla
        const textOpts = (width) => ({ 
            width: width, 
            height: 15, 
            ellipsis: true, // Agrega "..." si es muy largo
            lineBreak: false // Evita que salte a la siguiente línea
        });

        rows.forEach(row => {
            if (currentTop > 700) {
                doc.addPage();
                currentTop = 50;
            }
            
            // Imprimir datos limitando el ancho para que no se superpongan
            doc.text(row.localizador || '-', cols.loc.x, currentTop, textOpts(cols.loc.w));
            doc.text(row.pasajero || '-', cols.pas.x, currentTop, textOpts(cols.pas.w));
            doc.text(row.aerolinea || '-', cols.aer.x, currentTop, textOpts(cols.aer.w));
            doc.text(row.ruta || '-', cols.rut.x, currentTop, textOpts(cols.rut.w));
            doc.text(`$${row.monto_venta || 0}`, cols.mon.x, currentTop, textOpts(cols.mon.w));
            doc.text(`$${row.utilidad || 0}`, cols.uti.x, currentTop, textOpts(cols.uti.w));
            
            currentTop += 20;
        });

        doc.end();

    } catch (error) {
        console.error("Error generando reporte PDF:", error);
        res.status(500).json({ 
            exito: false, 
            mensaje: 'Error al generar el reporte PDF' 
        });
    }
};

export { crearVenta, obtenerVentas, getVentasFiltradas, statsVenta, recentVentas, generarReporteVentas, eliminarVenta, actualizarEstadoVenta };