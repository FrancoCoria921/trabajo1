
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// ✅ CONFIGURACIÓN DE SEGURIDAD CON HELMET
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "https://stock-price-checker-proxy.freecodecamp.rocks"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stockpricechecker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error de conexión a MongoDB:', err));

// Esquema para stocks
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  likes: { type: [String], default: [] }
});

const Stock = mongoose.model('Stock', stockSchema);

// Función para hashear IPs (cumple con GDPR)
function hashIP(ip) {
  const cleanIP = ip.replace('::ffff:', '');
  return crypto.createHash('sha256').update(cleanIP).digest('hex');
}

// Ruta principal de la API
app.get('/api/stock-prices', async (req, res) => {
  try {
    const { stock, like } = req.query;
    const userIP = hashIP(req.ip || req.connection.remoteAddress);
    
    if (!stock) {
      return res.status(400).json({ error: 'Se requiere el parámetro "stock"' });
    }

    const stocks = Array.isArray(stock) ? stock : [stock];
    const likeBool = like === 'true';

    const stockDataPromises = stocks.map(async (stockSymbol) => {
      const stockUpper = stockSymbol.toUpperCase();
      
      // Obtener datos del precio desde el proxy
      const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockUpper}/quote`);
      const priceData = await response.json();
      
      if (!priceData || !priceData.latestPrice) {
        throw new Error(`No se pudo obtener el precio para ${stockUpper}`);
      }

      // Buscar o crear el stock en la base de datos
      let stockDoc = await Stock.findOne({ symbol: stockUpper });
      if (!stockDoc) {
        stockDoc = new Stock({ symbol: stockUpper, likes: [] });
      }

      // Manejar el "like" si está solicitado
      if (likeBool && !stockDoc.likes.includes(userIP)) {
        stockDoc.likes.push(userIP);
        await stockDoc.save();
      }

      return {
        stock: stockUpper,
        price: priceData.latestPrice,
        likes: stockDoc.likes.length
      };
    });

    const stockData = await Promise.all(stockDataPromises);

    // Formatear respuesta para uno o dos stocks
    let responseData;
    if (stockData.length === 1) {
      responseData = { stockData: stockData[0] };
    } else {
      const rel_likes = stockData[0].likes - stockData[1].likes;
      responseData = {
        stockData: [
          { ...stockData[0], rel_likes },
          { ...stockData[1], rel_likes: -rel_likes }
        ]
      };
    }

    res.json(responseData);
    
  } catch (error) {
    console.error('Error en /api/stock-prices:', error);
    res.status(500).json({ error: 'Error del servidor al obtener datos de acciones' });
  }
});

// Rutas para testing de freeCodeCamp
app.get('/_api/routes.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'server.js'));
});

app.get('/_api/auth.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth.js'));
});

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
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

module.exports = app;
