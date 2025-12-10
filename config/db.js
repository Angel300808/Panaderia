const mysql = require('mysql2');
require('dotenv').config(); // 1. Importante: Cargar librería para leer .env

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306 // Usa el puerto del .env o 3306 por defecto
});

connection.connect(error => {
    if (error) {
        console.error('Error de conexión a la BD:', error);
        return;
    }
    console.log('✅ Conectado exitosamente a la BD Panadería');
});

module.exports = connection;