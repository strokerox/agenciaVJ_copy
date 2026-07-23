import db from './src/config/db.js';

const updateDatabase = async () => {
    try {
        console.log("Adding estado_comision to boletos...");
        await db.query("ALTER TABLE boletos ADD COLUMN estado_comision VARCHAR(20) DEFAULT 'Pendiente'");
        console.log("Column added successfully.");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("Column already exists.");
        } else {
            console.error("Error modifying database:", error);
        }
    } finally {
        process.exit();
    }
};

updateDatabase();
