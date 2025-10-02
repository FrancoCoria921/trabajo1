const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ✅ CONFIGURACIÓN MANUAL DE CSP (SIN HELMET)
app.use((req, res, next) => {
  // Generar nonce único para cada solicitud :cite[1]:cite[8]
  const nonce = crypto.randomBytes(16).toString('base64');
  
  // Definir la Política de Seguridad de Contenido
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data:;
    connect-src 'self' https://stock-price-checker-proxy.freecodecamp.rocks;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  // Establecer la cabecera CSP :cite[1]:cite[4]
  res.setHeader('Content-Security-Policy', cspHeader);
  
  // Pasar el nonce a las vistas
  res.locals.nonce = nonce;
  next();
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stockpricechecker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Esquema para stocks
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  likes: { type: [String], default: [] } // IPs hasheadas
});

const Stock = mongoose.model('Stock', stockSchema);

// Función para hashear IPs (cumple con GDPR) :cite[8]
function hashIP(ip) {
  const cleanIP = ip.replace('::ffff:', '');
  return crypto.createHash('sha256').update(cleanIP).digest('hex');
}

// Importar rutas de la API
const apiRoutes = require('./routes/api.js');
app.use('/api', apiRoutes);

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  // En un proyecto real, usarías un motor de plantillas para pasar el nonce
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor!' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Tu aplicación está escuchando en el puerto ${PORT}`);
});

// Exportar para testing
module.exports = { app, server };
