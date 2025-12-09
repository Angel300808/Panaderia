const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Asegúrate de tenerlo: npm install bcrypt
const db = require('../config/db');

// REGISTRO DE USUARIO
router.post('/register', async (req, res) => {
    const { username, password, nombre, email, telefono } = req.body;

    // 1. Validaciones básicas
    if (!username || !password || !email) {
        return res.status(400).send("Faltan datos obligatorios");
    }

    try {
        // 2. Encriptar contraseña (Seguridad [cite: 25])
        const hash = await bcrypt.hash(password, 10);

        // 3. Insertar en tabla USUARIOS
        db.query('INSERT INTO usuarios (username, password_hash) VALUES (?, ?)',
            [username, hash], (err, resultUser) => {
                if (err) {
                    // Manejo de error si el usuario ya existe
                    if (err.code === 'ER_DUP_ENTRY') return res.status(400).send("El usuario ya existe");
                    return res.status(500).send(err);
                }

                const userId = resultUser.insertId;

                // 4. Insertar en tabla CLIENTES (Vinculado por ID)
                db.query('INSERT INTO clientes (nombre, email, telefono, id_usuario, saldo) VALUES (?, ?, ?, ?, 0)',
                    [nombre, email, telefono, userId], (err, resultClient) => {
                        if (err) return res.status(500).send("Error al registrar datos de cliente: " + err.message);

                        res.status(201).send("Usuario registrado con éxito");
                    });
            });
    } catch (error) {
        res.status(500).send("Error en el servidor");
    }
});

// LOGIN DE USUARIO
// EN routes/auth.js

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // AHORA PEDIMOS TAMBIÉN EL ROL
    db.query('SELECT * FROM usuarios WHERE username = ?', [username], async (err, users) => {
        if (err) return res.status(500).send(err);
        if (users.length === 0) return res.status(401).send("Usuario no encontrado");

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).send("Contraseña incorrecta");

        // GUARDAMOS EL ROL EN LA SESIÓN
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.rol = user.rol; // <--- NUEVO: Guardamos el poder

        // Obtenemos datos del cliente
        db.query('SELECT nombre, saldo FROM clientes WHERE id_usuario = ?', [user.id], (err, clientes) => {
            const datosCliente = clientes[0];

            res.json({
                mensaje: "Login exitoso",
                usuario: user.username,
                rol: user.rol, // <--- NUEVO: Le avisamos al frontend quién entró
                nombre: datosCliente ? datosCliente.nombre : "Admin",
                saldo: datosCliente ? datosCliente.saldo : 0
            });
        });
    });
});
// CERRAR SESIÓN
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.send("Sesión cerrada");
});

module.exports = router; // <--- ESTA LÍNEA ES CRUCIAL PARA EVITAR TU ERROR