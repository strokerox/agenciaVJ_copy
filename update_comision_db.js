import db from './src/config/db.js';

const updateDatabase = async () => {
    try {
        console.log("Adding porcentaje_comision to usuarios...");
        await db.query("ALTER TABLE usuarios ADD COLUMN porcentaje_comision DECIMAL(5,2) DEFAULT 20.00");
        console.log("Column 'porcentaje_comision' added successfully with default value 20.");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("Column 'porcentaje_comision' already exists.");
        } else {
            console.error("Error modifying database:", error);
        }
    } finally {
        process.exit();
    }
};

updateDatabase();
