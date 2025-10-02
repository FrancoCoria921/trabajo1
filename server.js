const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api.js');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

const app = express();

// Middlewares esenciales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar crypto para generar nonces (ya viene con Node.js)
const crypto = require('crypto');

// Middleware para aplicar CSP a todas las rutas
app.use((req, res, next) => {
  // Generar un nonce único para cada solicitud :cite[1]
  const nonce = crypto.randomBytes(16).toString('base64');
  
  // Definir la Política de Seguridad de Contenido :cite[1]:cite[5]:cite[9]
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'nonce-${nonce}';
    connect-src 'self' https://stock-price-checker-proxy.freecodecamp.rocks;
    img-src 'self' data:;
    object-src 'none';
    base-uri 'self';
  `.replace(/\s{2,}/g, ' ').trim(); // Limpiar espacios extra

  // Establecer la cabecera CSP
  res.setHeader("Content-Security-Policy", csp);
  
  // Pasar el nonce a las vistas para usarlo en los templates
  res.locals.nonce = nonce;
  next();
});

// Ruta principal que sirve tu index.html
app.get('/', (req, res) => {
  // Renderizar tu vista y pasarle el nonce
  res.render('index', { 
    nonce: res.locals.nonce  // Pasar el nonce al template
  });
});

// Servir archivos estáticos (frontend)
app.use(express.static('public'));

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Rutas de la API
app.use('/api', apiRoutes);

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor!' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const listener = app.listen(PORT, () => {
  console.log('Tu aplicación está escuchando en el puerto ' + listener.address().port);
});

module.exports = app; // Para testing

