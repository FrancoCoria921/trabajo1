// server.js

'use strict';
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet'); // Módulo de seguridad

const apiRoutes = require('./routes/api.js');
const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner');

const app = express();

// =================================================================
// 🛡️ Implementación de Seguridad con Helmet
// =================================================================

app.use(helmet({
  // 1. Deshabilitar o cambiar X-Powered-By
  poweredBy: { set: 'PHP 4.2.0' }, 
  // 2. Content Security Policy (CSP)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Necesario para que el test runner de FreeCodeCamp funcione
      frameAncestors: ["'self'", "https://stock-price-checker.freecodecamp.rocks"] 
    },
  },
  // 3. Proteger contra XSS y otras cabeceras
  noSniff: true,
  hidePoweredBy: true,
  xssFilter: true,
}));

// =================================================================
// 💾 Conexión a Base de Datos (Mongoose)
// =================================================================

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/stockpricechecker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', function() {
  console.log('Conexión exitosa a MongoDB');
});


// =================================================================
// ⚙️ Middlewares Estándar
// =================================================================

app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({ origin: '*' })); // Para pruebas de freecodecamp

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Archivo de vista (index)
app.route('/_api/server.js').get(function(req, res, next) {
  res.sendFile(process.cwd() + '/server.js');
});
app.route('/').get(function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Rutas de testing y de la API principal
fccTestingRoutes(app);
apiRoutes(app); // Carga la lógica en routes/api.js

// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404).type('text').send('Not Found');
});

// Inicio del servidor
const port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log('Listening on port ' + port);
  if (process.env.NODE_ENV === 'test') {
    console.log('Running Tests...');
    setTimeout(function() {
      try {
        runner.run();
      } catch (e) {
        let error = e;
        console.log('Tests are not set up:');
        console.log(error);
      }
    }, 1500);
  }
});

module.exports = app; // Necesario para las pruebas
