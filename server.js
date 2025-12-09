const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'navidad_secreta_key', // [cite: 22] Validación de sesiones
    resave: false,
    saveUninitialized: false
}));

// Rutas
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});