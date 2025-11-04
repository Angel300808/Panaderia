// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const DB_HOST = 'localhost';
const DB_USER = 'root';
const DB_PASSWORD = 'n0m3l0';
const DB_DATABASE = 'panaderia_la_desesperanza';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(session({
  secret: 'tu-secreto-muy-secreto-para-panaderia',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// --- Archivos estáticos ---
// Sirve la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

  const dbConfig = {
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE
};


// --- Middleware autenticación (protege rutas de admin) ---
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión.' });
  }
  // Opcional: Podrías chequear req.session.role === 'admin' aquí
  next();
};

// -------------------- AUTENTICACIÓN (CORREGIDO) --------------------
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const conn = await mysql.createConnection(dbConfig);
    await conn.execute('INSERT INTO Usuarios (username, password_hash) VALUES (?, ?)', [username, hash]);
    await conn.end();
    res.status(201).json({ message: 'Usuario creado correctamente.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ error: 'El usuario ya existe.' });
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM Usuarios WHERE username = ?', [username]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Credenciales inválidas.' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ error: 'Credenciales inválidas.' });

    // --- ¡ESTO ES LO IMPORTANTE! ---
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = (user.username === 'admin') ? 'admin' : 'cliente'; // Asigna rol

    res.json({ 
      message: 'Inicio de sesión exitoso.', 
      username: user.username,
      role: req.session.role // Envía el rol
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    if (connection) await connection.end();
  }
});
app.get('/session', (req, res) => {
  if (req.session.userId) {
    res.json({ 
      loggedIn: true, 
      username: req.session.username,
      role: req.session.role || 'cliente' // ¡ESTO ES LO IMPORTANTE!
    });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err)
      return res.status(500).json({ error: 'No se pudo cerrar sesión.' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesión cerrada correctamente.' });
  });
});



// REEMPLAZA ESTA RUTA COMPLETA EN server.js

/// READ (Público) - VERSIÓN CON MEJOR DEBUGGING
app.get('/api/productos', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Primero probemos si la tabla existe
    const [rows] = await connection.execute(
      'SELECT id, nombre, descripcion, precio, stock, id_categoria, imagen_url FROM productos'
    );
    
    console.log('✅ Productos obtenidos:', rows.length); // Para debug
    res.json(rows);
  } catch (err) {
    console.error("❌ ERROR EN GET /api/productos:", err.message);
    console.error("Detalles completos:", err);
    res.status(500).json({ 
      error: 'Error al obtener productos.',
      detalles: err.message // Solo para desarrollo
    });
  } finally {
    if (connection) await connection.end();
  }
});

// CREATE (Protegido)
app.post('/api/productos', requireAuth, async (req, res) => {
  const { nombre, descripcion, precio, stock, id_categoria, imagen_url } = req.body;
  if (!nombre || !precio || precio <= 0 || stock == null || stock < 0 || !id_categoria)
    return res.status(400).json({ error: 'Datos inválidos.' });

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'INSERT INTO Productos (nombre, descripcion, precio, stock, id_categoria, imagen_url) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, precio, stock, id_categoria, imagen_url]
    );
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    if (connection) await connection.end();
  }
});

// UPDATE (Protegido)
app.put('/api/productos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, id_categoria, imagen_url } = req.body;
  if (!nombre || !precio || precio <= 0 || stock == null || stock < 0 || !id_categoria)
    return res.status(400).json({ error: 'Datos inválidos.' });

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'UPDATE Productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, id_categoria = ?, imagen_url = ? WHERE id = ?',
      [nombre, descripcion, precio, stock, id_categoria, imagen_url, id]
    );
    res.json({ message: 'Producto actualizado correctamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    if (connection) await connection.end();
  }
});

// DELETE (Protegido)
app.delete('/api/productos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute('DELETE FROM Productos WHERE id = ?', [id]);
    res.json({ message: 'Producto eliminado correctamente.' });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2')
      return res.status(400).json({ error: 'El producto está asociado a un pedido.' });
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    if (connection) await connection.end();
  }
});

// AÑADE ESTA RUTA COMPLETA en server.js

// -------------------- PEDIDOS (NUEVO) --------------------
// Esta ruta crea un pedido a partir del carrito de la sesión
app.post('/api/pedidos', requireAuth, async (req, res) => {
  
  const carritoSession = req.session.carrito || [];
  const id_cliente = req.session.userId;

  // 1. Validar que el carrito no esté vacío
  if (carritoSession.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío.' });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    // ¡Iniciamos una transacción!
    await connection.beginTransaction();

    // 2. Obtener los precios REALES de la BD (nunca confiar en la sesión para $)
    const ids = carritoSession.map(item => item.id_producto);
    const placeholders = ids.map(() => '?').join(',');
    
    const [rows] = await connection.execute(
      `SELECT id, precio, stock FROM Productos WHERE id IN (${placeholders})`,
      ids
    );

    const productosMap = new Map();
    rows.forEach(p => productosMap.set(p.id, p));

    // 3. Calcular el total y verificar stock
    let total = 0;
    const detallesPedido = [];

    for (const item of carritoSession) {
      const producto = productosMap.get(item.id_producto);
      
      if (!producto) {
        throw new Error(`El producto ID ${item.id_producto} ya no existe.`);
      }
      
      if (producto.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para ${producto.nombre}. Solo quedan ${producto.stock}.`);
      }
      
      const precioUnitario = parseFloat(producto.precio);
      total += precioUnitario * item.cantidad;
      
      detallesPedido.push({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: precioUnitario
      });
    }

    // 4. Insertar en la tabla 'Pedidos'
    const [pedidoResult] = await connection.execute(
      'INSERT INTO Pedidos (id_cliente, total, estado) VALUES (?, ?, ?)',
      [id_cliente, total, 'completado'] // Asumimos 'completado' de inmediato
    );
    const id_pedido = pedidoResult.insertId;

    // 5. Insertar en 'Detalle_Pedidos' y actualizar stock
    for (const detalle of detallesPedido) {
      // Insertar el detalle
      await connection.execute(
        'INSERT INTO Detalle_Pedidos (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [id_pedido, detalle.id_producto, detalle.cantidad, detalle.precio_unitario]
      );
      
      // Actualizar el stock
      await connection.execute(
        'UPDATE Productos SET stock = stock - ? WHERE id = ?',
        [detalle.cantidad, detalle.id_producto]
      );
    }

    // 6. ¡Todo salió bien! Confirmamos la transacción
    await connection.commit();

    // 7. Limpiamos el carrito de la sesión
    req.session.carrito = [];

    res.status(201).json({ message: 'Pedido realizado con éxito.', id_pedido: id_pedido });

  } catch (err) {
    // 8. ¡Algo salió mal! Revertimos la transacción
    if (connection) await connection.rollback();
    
    console.error("Error al procesar pedido:", err.message);
    // Devolvemos el error específico (ej. "Stock insuficiente...")
    res.status(400).json({ error: err.message || 'Error interno al procesar el pedido.' });
  
  } finally {
    if (connection) await connection.end();
  }
});


// -------------------- CARRITO (CORREGIDO) --------------------

app.post('/api/carrito', (req, res) => {
  const { id_producto, cantidad } = req.body;
  if (!id_producto || !cantidad || cantidad <= 0)
    return res.status(400).json({ error: 'Datos inválidos para el carrito.' });

  if (!req.session.carrito) req.session.carrito = [];

  // Asegurarse de que todo se maneje como NÚMEROS
  const idNum = parseInt(id_producto, 10);
  const cantNum = parseInt(cantidad, 10);

  const idx = req.session.carrito.findIndex(i => i.id_producto === idNum);
  
  if (idx >= 0) {
    req.session.carrito[idx].cantidad += cantNum;
  } else {
    req.session.carrito.push({ id_producto: idNum, cantidad: cantNum });
  }
  res.json({ carrito: req.session.carrito });
});


app.get('/api/carrito', async (req, res) => {
  const carritoSession = req.session.carrito || [];
  if (carritoSession.length === 0) {
    return res.json({ carrito: [] });
  }

  let connection;
  try {
    const ids = carritoSession.map(item => parseInt(item.id_producto, 10));
    const placeholders = ids.map(() => '?').join(','); 

    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      `SELECT id, nombre, precio FROM Productos WHERE id IN (${placeholders})`,
      ids
    );

    const productosMap = new Map();
    rows.forEach(p => productosMap.set(p.id, p));

    const carritoDetallado = carritoSession.map(item => {
      const idNum = parseInt(item.id_producto, 10);
      const producto = productosMap.get(idNum);
      return {
        id_producto: idNum,
        cantidad: parseInt(item.cantidad, 10),
        nombre: producto ? producto.nombre : 'Producto no encontrado',
        precio: producto ? parseFloat(producto.precio) : 0
      };
    }).filter(item => item.nombre !== 'Producto no encontrado'); 

    res.json({ carrito: carritoDetallado });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el carrito.' });
  } finally {
    if (connection) await connection.end();
  }
});


app.delete('/api/carrito/:id_producto', (req, res) => {
  const id_producto = parseInt(req.params.id_producto, 10);
  if (!req.session.carrito) return res.json({ carrito: [] });
  req.session.carrito = req.session.carrito.filter(i => i.id_producto !== id_producto);
  res.json({ carrito: req.session.carrito });
});


// -------------------- RUTA FINAL (SPA / frontend) --------------------
// Captura cualquier otra ruta y envía el index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// -------------------- USUARIO ADMIN POR DEFECTO --------------------
// -------------------- USUARIO ADMIN POR DEFECTO --------------------
(async () => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT * FROM Usuarios WHERE username = ?', ['admin']);
    if (rows.length === 0) {
      const hash = await bcrypt.hash('1234', 10); // Contraseña por defecto es 1234
      await conn.execute('INSERT INTO Usuarios (username, password_hash) VALUES (?, ?)', ['admin', hash]);
      console.log('👤 Usuario "admin" creado automáticamente (contraseña: 1234)');
    }
    await conn.end();
  } catch (err) {
    console.error('⚠️ Error verificando/creando usuario admin:', err.message);
  }
})();

// -------------------- INICIAR SERVIDOR --------------------
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${port}`);
});
