import mysqldump from 'mysqldump';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

export const backupBD = async (req, res) => {
  try {
    const backupFileName = `backup_${Date.now()}.sql`;
    const backupFilePath = path.join(process.cwd(), backupFileName);

    await mysqldump({
      connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 16249,
        ssl: process.env.SSL ? { rejectUnauthorized: false } : undefined
      },
      dumpToFile: backupFilePath,
    });

    res.download(backupFilePath, backupFileName, (err) => {
      if (err) {
        console.error('Error al enviar el archivo de backup:', err);
      }
      // Eliminar el archivo después de descargarlo
      fs.unlink(backupFilePath, (unlinkErr) => {
        if (unlinkErr) console.error('Error al eliminar archivo local de backup:', unlinkErr);
      });
    });

  } catch (error) {
    console.error('Error durante el respaldo:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al generar el respaldo de la base de datos' });
  }
};

export const restoreBD = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ exito: false, mensaje: 'No se ha subido ningún archivo SQL.' });
  }

  const sqlFilePath = req.file.path;
  let connection;

  try {
    // Leemos el archivo SQL
    const sqlContent = await fs.promises.readFile(sqlFilePath, 'utf8');

    // Creamos una conexión temporal con multipleStatements habilitado
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 16249,
      multipleStatements: true,
      ssl: process.env.SSL ? { rejectUnauthorized: false } : undefined
    });

    // Ejecutamos todo el script SQL
    await connection.query(sqlContent);
    
    res.json({ exito: true, mensaje: 'Base de datos restaurada correctamente.' });
  } catch (error) {
    console.error('Error durante la restauración:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al restaurar la base de datos', error: error.message });
  } finally {
    if (connection) {
      await connection.end();
    }
    // Limpiamos el archivo subido
    try {
      await fs.promises.unlink(sqlFilePath);
    } catch (e) {
      console.error('Error eliminando el archivo SQL subido:', e);
    }
  }
};
