const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- RUTAS PÚBLICAS (Cualquiera puede ver) ---

// Obtener Productos (Inventario)
router.get('/productos', (req, res) => {
    // Ordenamos por ID para que los nuevos salgan al final
    db.query('SELECT * FROM productos ORDER BY id ASC', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Obtener Sucursales (Mapa)
router.get('/sucursales', (req, res) => {
    db.query('SELECT * FROM sucursales', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// --- RUTAS DE USUARIO (Requieren Login) ---

// Agregar Fondos
router.post('/fondos', (req, res) => {
    if (!req.session.userId) return res.status(401).send("No autorizado");

    const { monto } = req.body;
    // Validación Back-end: montos lógicos
    if (!monto || monto <= 0 || monto > 999999999999) {
        return res.status(400).send("Monto inválido");
    }

    const query = 'UPDATE clientes SET saldo = saldo + ? WHERE id_usuario = ?';
    db.query(query, [monto, req.session.userId], (err, result) => {
        if (err) return res.status(500).send(err);
        res.send("Fondos agregados");
    });
});

// PROCESAR COMPRA (Transacción Compleja)
router.post('/comprar', (req, res) => {
    if (!req.session.userId) return res.status(401).send("Inicia sesión");

    const { carrito, total } = req.body;

    const totalPiezas = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    if (totalPiezas > 100) {
        return res.status(400).send("Límite excedido: No puedes comprar más de 100 piezas por pedido.");
    }

    // 1. Verificar saldo del usuario
    db.query('SELECT saldo FROM clientes WHERE id_usuario = ?', [req.session.userId], (err, users) => {
        if (err) return res.status(500).send(err);
        if (users[0].saldo < total) return res.status(400).send("Saldo insuficiente");

        // 2. Crear Pedido (Ticket Header)
        db.query('INSERT INTO pedidos (id_cliente, total, estado) VALUES (?, ?, "completado")',
            [req.session.userId, total], (err, result) => {
                if (err) return res.status(500).send(err);
                const pedidoId = result.insertId;

                // 3. Insertar detalles y actualizar stock
                carrito.forEach(prod => {
                    db.query('INSERT INTO detalle_pedidos VALUES (?, ?, ?, ?)',
                        [pedidoId, prod.id, prod.cantidad, prod.precio]);

                    // Restar del inventario
                    db.query('UPDATE productos SET stock = stock - ? WHERE id = ?',
                        [prod.cantidad, prod.id]);
                });

                // 4. Restar saldo al usuario
                db.query('UPDATE clientes SET saldo = saldo - ? WHERE id_usuario = ?',
                    [total, req.session.userId]);

                // Retorna info para el ticket
                res.json({ mensaje: "Compra exitosa", num_venta: pedidoId });
            });
    });
});

// --- RUTAS DE ADMINISTRADOR (CRUD PROTEGIDO) ---
router.get('/historial', (req, res) => {
    if (req.session.rol !== 'admin') return res.status(403).send("Acceso denegado");

    // Traemos fecha, nombre del cliente y total
    const sql = `
        SELECT p.id, c.nombre, p.fecha, p.total 
        FROM pedidos p 
        JOIN clientes c ON p.id_cliente = c.id_usuario 
        ORDER BY p.fecha DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 1. CREAR Producto
router.post('/productos', (req, res) => {
    // Verificamos si es admin en la sesión
    if (req.session.rol !== 'admin') return res.status(403).send("Acceso denegado: Solo el dueño hornea.");

    const { nombre, descripcion, precio, imagen_url } = req.body;
    const sql = 'INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url, id_categoria) VALUES (?, ?, ?, 10, ?, 2)';

    db.query(sql, [nombre, descripcion, precio, imagen_url], (err, result) => {
        if (err) return res.status(500).send(err.message);
        res.json({ mensaje: "Producto horneado con éxito 🍞" });
    });
});

// 2. ACTUALIZAR Producto
router.put('/productos/:id', (req, res) => {
    if (req.session.rol !== 'admin') return res.status(403).send("Acceso denegado");

    const { nombre, descripcion, precio, imagen_url } = req.body;
    const sql = 'UPDATE productos SET nombre=?, descripcion=?, precio=?, imagen_url=? WHERE id=?';

    db.query(sql, [nombre, descripcion, precio, imagen_url, req.params.id], (err, result) => {
        if (err) return res.status(500).send(err.message);
        res.json({ mensaje: "Producto actualizado" });
    });
});

// 3. ELIMINAR Producto
router.delete('/productos/:id', (req, res) => {
    if (req.session.rol !== 'admin') return res.status(403).send("Acceso denegado");

    // Borramos detalles antiguos primero (integridad referencial)
    db.query('DELETE FROM detalle_pedidos WHERE id_producto = ?', [req.params.id], (err) => {
        if (err) console.log("Advertencia: " + err.message);

        db.query('DELETE FROM productos WHERE id = ?', [req.params.id], (err, result) => {
            if (err) return res.status(500).send("No se puede borrar: " + err.message);
            res.json({ mensaje: "Producto eliminado del mostrador 🗑️" });
        });
    });
});

module.exports = router;