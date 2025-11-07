require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');


const app = express();
const port = process.env.PORT;

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

app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT
};


const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Acceso no autorizado. Inicia sesión.' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Acceso no autorizado.' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso prohibido. Ruta solo para administradores.' });
  }
  next();
};

const requireCliente = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Acceso no autorizado.' });
  }
  if (req.session.role === 'admin') {
    return res.status(403).json({ error: 'Acceso prohibido. Los administradores no pueden comprar.' });
  }
  next();
};


app.post('/register', async (req, res) => {
  const { username, password, nombre, email, telefono } = req.body;
  
  if (!username || !password || !nombre || !email) {
    return res.status(400).json({ error: 'Nombre, Email, Usuario y Contraseña son requeridos.' });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    const hash = await bcrypt.hash(password, 10);

    const [userResult] = await connection.execute(
      'INSERT INTO Usuarios (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );
    
    const newUserId = userResult.insertId;

    await connection.execute(
      'INSERT INTO Clientes (id_usuario, nombre, email, telefono) VALUES (?, ?, ?, ?)',
      [newUserId, nombre, email, telefono || null]
    );

    await connection.commit();
    
    res.status(201).json({ message: 'Usuario y perfil creados correctamente.' });

  } catch (err) {
    if (connection) await connection.rollback();
    
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('email')) { 
        return res.status(400).json({ error: 'El email ya está registrado.' });
      }
      return res.status(400).json({ error: 'El nombre de usuario ya existe.' });
    }
    res.status(500).json({ error: 'Error interno del servidor.' });
  } finally {
    if (connection) await connection.end();
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos.' });

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const query = `
      SELECT 
        u.id, 
        u.username, 
        u.password_hash, 
        c.nombre 
      FROM Usuarios u
      LEFT JOIN Clientes c ON u.id = c.id_usuario
      WHERE u.username = ?
    `;
    const [rows] = await connection.execute(query, [username]);
    
    if (rows.length === 0)
      return res.status(401).json({ error: 'Credenciales inválidas.' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ error: 'Credenciales inválidas.' });

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.nombre = user.nombre || user.username; 
    req.session.role = (user.username === 'admin') ? 'admin' : 'cliente'; 

    res.json({ 
      message: 'Inicio de sesión exitoso.', 
      username: req.session.username,
      nombre: req.session.nombre,
      role: req.session.role
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
      nombre: req.session.nombre,
      role: req.session.role || 'cliente'
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


app.get('/api/productos', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT id, nombre, descripcion, precio, stock, id_categoria, imagen_url FROM productos'
    );
    res.json(rows);
  } catch (err) {
    console.error(" ERROR EN GET /api/productos:", err.message);
    res.status(500).json({ 
      error: 'Error al obtener productos.',
      detalles: err.message
    });
  } finally {
    if (connection) await connection.end();
  }
});

app.post('/api/productos', requireAdmin, async (req, res) => {
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

app.put('/api/productos/:id', requireAdmin, async (req, res) => {
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

app.delete('/api/productos/:id', requireAdmin, async (req, res) => {
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


app.post('/api/pedidos', requireCliente, async (req, res) => {
  
  const carritoSession = req.session.carrito || [];
  const id_cliente = req.session.userId;

  if (carritoSession.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío.' });
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    const ids = carritoSession.map(item => item.id_producto);
    const placeholders = ids.map(() => '?').join(',');
    
    const [rows] = await connection.execute(
      `SELECT id, nombre, precio, stock FROM Productos WHERE id IN (${placeholders})`,
      ids
    );

    const productosMap = new Map();
    rows.forEach(p => productosMap.set(p.id, p));

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

    const [pedidoResult] = await connection.execute(
      'INSERT INTO Pedidos (id_cliente, total, estado) VALUES (?, ?, ?)',
      [id_cliente, total, 'completado'] 
    );
    const id_pedido = pedidoResult.insertId;

    for (const detalle of detallesPedido) {
      await connection.execute(
        'INSERT INTO Detalle_Pedidos (id_pedido, id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [id_pedido, detalle.id_producto, detalle.cantidad, detalle.precio_unitario]
      );
      
      await connection.execute(
        'UPDATE Productos SET stock = stock - ? WHERE id = ?',
        [detalle.cantidad, detalle.id_producto]
      );
    }

    await connection.commit();
    req.session.carrito = [];
    res.status(201).json({ message: 'Pedido realizado con éxito.', id_pedido: id_pedido });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Error al procesar pedido:", err.message);
    res.status(400).json({ error: err.message || 'Error interno al procesar el pedido.' });
  } finally {
    if (connection) await connection.end();
  }
});


app.post('/api/carrito', requireCliente, (req, res) => {
  const { id_producto, cantidad } = req.body;
  if (!id_producto || !cantidad || cantidad <= 0)
    return res.status(400).json({ error: 'Datos inválidos para el carrito.' });

  if (!req.session.carrito) req.session.carrito = [];
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

app.get('/api/carrito', requireCliente, async (req, res) => {
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

app.delete('/api/carrito/:id_producto', requireCliente, (req, res) => {
  const id_producto = parseInt(req.params.id_producto, 10);
  if (!req.session.carrito) return res.json({ carrito: [] });
  req.session.carrito = req.session.carrito.filter(i => i.id_producto !== id_producto);
  res.json({ carrito: req.session.carrito });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


(async () => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT * FROM Usuarios WHERE username = ?', ['admin']);
    
    if (rows.length === 0) {
      await connection.beginTransaction();
      
      const hash = await bcrypt.hash('1234', 10); // Contraseña por defecto es 1234
      const [userResult] = await connection.execute(
        'INSERT INTO Usuarios (username, password_hash) VALUES (?, ?)', 
        ['admin', hash]
      );
      const adminId = userResult.insertId;
      
      await connection.execute(
        'INSERT INTO Clientes (id_usuario, nombre, email, telefono) VALUES (?, ?, ?, ?)',
        [adminId, 'Administrador', 'admin@panaderia.com', 'N/A']
      );
      
      await connection.commit();
      console.log('✅ Usuario "admin" y su perfil creados (contraseña: 1234)');
    }
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('⚠️ Error verificando/creando usuario admin:', err.message);
  } finally {
    if (connection) await connection.end();
  }
})();

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});