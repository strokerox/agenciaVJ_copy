import db from '../config/db.js';

// Registrar un nuevo pago
const registrarPago = async (req, res) => {
    try {
        const { localizador_id, metodo_pago, monto, referencia } = req.body;

        if (!localizador_id || !metodo_pago || !monto) {
            return res.status(400).json({ exito: false, mensaje: 'Localizador, método de pago y monto son obligatorios' });
        }

        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            return res.status(400).json({ exito: false, mensaje: 'El monto debe ser un número positivo' });
        }

        // Verificar que el localizador existe y obtener el monto total de la venta
        const [reservaRows] = await db.query('SELECT * FROM reservas WHERE localizador = ?', [localizador_id]);
        if (reservaRows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Localizador no encontrado' });
        }

        // Obtener el monto_venta del boleto asociado
        const [boletoRows] = await db.query('SELECT monto_venta, tipo FROM boletos WHERE localizador_id = ?', [localizador_id]);
        if (boletoRows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'No se encontró un boleto asociado a este localizador' });
        }

        const montoVenta = parseFloat(boletoRows[0].monto_venta);
        const tipoBoleto = boletoRows[0].tipo;

        // Obtener la suma de pagos ya registrados
        const [sumRows] = await db.query('SELECT COALESCE(SUM(monto), 0) AS total_pagado FROM pagos WHERE localizador_id = ?', [localizador_id]);
        const totalPagado = parseFloat(sumRows[0].total_pagado);

        // Verificar que no se exceda el monto total
        if (totalPagado + montoNum > montoVenta) {
            return res.status(400).json({ 
                exito: false, 
                mensaje: `El pago excede el monto total. Monto venta: $${montoVenta.toFixed(2)}, Ya pagado: $${totalPagado.toFixed(2)}, Máximo a pagar: $${(montoVenta - totalPagado).toFixed(2)}` 
            });
        }

        // Insertar el pago
        const [result] = await db.execute(
            'INSERT INTO pagos (localizador_id, metodo_pago, monto, referencia) VALUES (?, ?, ?, ?)',
            [localizador_id, metodo_pago, montoNum, referencia || null]
        );

        const nuevoTotalPagado = totalPagado + montoNum;

        // Actualizar estado_pago de la reserva según el porcentaje pagado
        let nuevoEstado = reservaRows[0].estado_pago;
        if (nuevoTotalPagado >= montoVenta) {
            nuevoEstado = 'Emitido';
        } else if (nuevoTotalPagado > 0) {
            nuevoEstado = 'Pendiente';
        }

        await db.execute('UPDATE reservas SET estado_pago = ? WHERE localizador = ?', [nuevoEstado, localizador_id]);

        res.status(201).json({
            exito: true,
            mensaje: 'Pago registrado correctamente',
            pago: {
                id_pago: result.insertId,
                localizador_id,
                metodo_pago,
                monto: montoNum,
                referencia
            },
            resumen: {
                monto_venta: montoVenta,
                total_pagado: nuevoTotalPagado,
                saldo_pendiente: montoVenta - nuevoTotalPagado,
                porcentaje_pagado: ((nuevoTotalPagado / montoVenta) * 100).toFixed(1),
                estado_pago: nuevoEstado
            }
        });
    } catch (error) {
        console.error('Error al registrar pago:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al registrar el pago' });
    }
};

// Obtener pagos por localizador
const obtenerPagosPorLocalizador = async (req, res) => {
    try {
        const { localizador } = req.params;

        // Obtener monto_venta del boleto
        const [boletoRows] = await db.query('SELECT monto_venta, tipo FROM boletos WHERE localizador_id = ?', [localizador]);
        const montoVenta = boletoRows.length > 0 ? parseFloat(boletoRows[0].monto_venta) : 0;

        // Obtener todos los pagos
        const [pagos] = await db.query(
            'SELECT * FROM pagos WHERE localizador_id = ? ORDER BY fecha_pago DESC',
            [localizador]
        );

        // Calcular resumen
        const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        const saldoPendiente = montoVenta - totalPagado;
        const porcentajePagado = montoVenta > 0 ? ((totalPagado / montoVenta) * 100) : 0;
        const minimoReserva = montoVenta * 0.30;

        res.json({
            pagos,
            resumen: {
                monto_venta: montoVenta,
                total_pagado: totalPagado,
                saldo_pendiente: saldoPendiente,
                porcentaje_pagado: porcentajePagado.toFixed(1),
                minimo_reserva: minimoReserva,
                cumple_minimo: totalPagado >= minimoReserva
            }
        });
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al obtener los pagos' });
    }
};

// Eliminar un pago (solo admin)
const eliminarPago = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener info del pago antes de eliminar
        const [pagoRows] = await db.query('SELECT * FROM pagos WHERE id_pago = ?', [id]);
        if (pagoRows.length === 0) {
            return res.status(404).json({ exito: false, mensaje: 'Pago no encontrado' });
        }

        const localizador_id = pagoRows[0].localizador_id;

        // Eliminar el pago
        await db.execute('DELETE FROM pagos WHERE id_pago = ?', [id]);

        // Recalcular estado de la reserva
        const [sumRows] = await db.query('SELECT COALESCE(SUM(monto), 0) AS total_pagado FROM pagos WHERE localizador_id = ?', [localizador_id]);
        const totalPagado = parseFloat(sumRows[0].total_pagado);

        const [boletoRows] = await db.query('SELECT monto_venta FROM boletos WHERE localizador_id = ?', [localizador_id]);
        const montoVenta = boletoRows.length > 0 ? parseFloat(boletoRows[0].monto_venta) : 0;

        let nuevoEstado = 'Pendiente';
        if (totalPagado >= montoVenta && montoVenta > 0) {
            nuevoEstado = 'Emitido';
        }

        await db.execute('UPDATE reservas SET estado_pago = ? WHERE localizador = ?', [nuevoEstado, localizador_id]);

        res.json({ exito: true, mensaje: 'Pago eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar pago:', error);
        res.status(500).json({ exito: false, mensaje: 'Error al eliminar el pago' });
    }
};

export { registrarPago, obtenerPagosPorLocalizador, eliminarPago };
