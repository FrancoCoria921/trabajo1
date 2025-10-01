const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');

// Esquema para almacenar stocks y likes
const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  likes: { type: [String], default: [] } // Almacena IPs hasheadas
});

const Stock = mongoose.model('Stock', stockSchema);

// Función para hashear IP (cumple con GDPR)
function hashIP(ip) {
  // Manejar IPs con prefijo ::ffff: de IPv6
  const cleanIP = ip.replace('::ffff:', '');
  return crypto.createHash('sha256').update(cleanIP).digest('hex');
}

// Función para obtener datos de la acción desde el proxy
async function getStockPrice(stockSymbol) {
  try {
    const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stockSymbol}/quote`);
    
    if (!response.ok) {
      throw new Error(`Error API: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      stock: data.symbol,
      price: data.latestPrice
    };
  } catch (error) {
    console.error('Error obteniendo precio:', error);
    throw new Error('No se pudo obtener el precio de la acción');
  }
}

// Ruta principal para obtener datos de acciones
router.get('/stock-prices', async (req, res) => {
  try {
    const { stock, like } = req.query;
    const userIP = hashIP(req.ip || req.connection.remoteAddress);
    
    if (!stock) {
      return res.status(400).json({ error: 'Se requiere el parámetro "stock"' });
    }

    const stocks = Array.isArray(stock) ? stock : [stock];
    const likeBool = like === 'true';

    // Procesar cada stock
    const stockDataPromises = stocks.map(async (stockSymbol) => {
      const stockUpper = stockSymbol.toUpperCase();
      
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

      // Obtener el precio actual
      const priceInfo = await getStockPrice(stockUpper);
      
      return {
        stock: stockUpper,
        price: priceInfo.price,
        likes: stockDoc.likes.length
      };
    });

    const stockData = await Promise.all(stockDataPromises);

    // Formatear respuesta para uno o dos stocks
    let responseData;
    if (stockData.length === 1) {
      responseData = { stockData: stockData[0] };
    } else {
      // Calcular likes relativos para comparación de dos stocks
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

module.exports = router;
