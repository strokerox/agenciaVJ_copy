import { query } from '../config/db.js';

const Paquete = {
    obtenerActivos: async () => {
        const [rows] = await query("SELECT * FROM paquetes_turisticos WHERE estado = 'Activo'");
        return rows;
    },

    obtenerTodos: async () => {
        const [rows] = await query("SELECT * FROM paquetes_turisticos ORDER BY estado ASC, nombre_paquete ASC");
        return rows;
    },

    actualizarEstado: async (id, estado) => {
        const [result] = await query(
            'UPDATE paquetes_turisticos SET estado = ? WHERE id_paquete = ?',
            [estado, id]
        );
        return result.affectedRows;
    },

    crear: async (paqueteData) => {
        const { nombre_paquete, destino_ruta, descripcion_incluye, dias, noches, costo_base, precio_venta_sugerido } = paqueteData;
        const [result] = await query(
            `INSERT INTO paquetes_turisticos 
            (nombre_paquete, destino_ruta, descripcion_incluye, dias, noches, costo_base, precio_venta_sugerido) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nombre_paquete, destino_ruta, descripcion_incluye, dias, noches, costo_base, precio_venta_sugerido]
        );
        return result.insertId;
    }
};

export default Paquete;
