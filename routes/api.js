// routes/api.js

'use strict';

const axios = require('axios');
const mongoose = require('mongoose');

// =================================================================
// 📝 Modelo de Mongoose para Stocks
// =================================================================

const stockSchema = new mongoose.Schema({
  stock: { type: String, required: true, unique: true }, // Ticker (ej: 'GOOG')
  likes: [{ type: String }], // Array de IPs anonimizadas que dieron 'like'
});

// Exporta el modelo para evitar redefinición en entornos de prueba
const Stock = mongoose.models.Stock || mongoose.model('Stock', stockSchema);

// =================================================================
// 🔒 Función de Anonimización de IP (Privacidad)
// =================================================================

/**
 * Anonimiza la dirección IP truncando el último octeto a '0'.
 * @param {string} ip - Dirección IP del usuario.
 * @returns {string} IP anonimizada.
 */
const getAnonIp = (ip) => {
  if (!ip) return null;
  // Manejar caso de proxies que envían múltiples IPs (tomar la primera)
  const address = ip.split(',')[0].trim(); 
  
  // Truncar IPv4
  const parts = address.split('.');
  if (parts.length === 4) {
    parts[3] = '0'; // Anonimiza el último octeto
    return parts.join('.');
  }
  
  // Retornar la dirección para IPv6 o desconocidos (o se podría usar un hash)
  return address; 
};


module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(async (req, res) => {
      const { stock, like } = req.query;
      const stocksArray = Array.isArray(stock) ? stock : [stock];
      const anonIp = getAnonIp(req.ip);
      
      const BASE_URL = 'https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock';

      // =============================================================
      // 📈 Helper: Obtener Precio y Actualizar Likes
      // =============================================================
      
      const fetchStockData = async (ticker) => {
        const uppercaseTicker = ticker.toUpperCase();

        // 1. Obtener precio del proxy
        let latestPrice;
        try {
          const priceUrl = `${BASE_URL}/${uppercaseTicker}/quote`;
          const priceResponse = await axios.get(priceUrl);
          latestPrice = priceResponse.data.latestPrice;
        } catch (error) {
           // Si el stock no existe en el proxy, retorna un objeto incompleto
           return {
              stock: uppercaseTicker,
              price: null,
              likes: 0
           };
        }

        // 2. Gestionar 'like' en la DB
        let stockDoc = await Stock.findOne({ stock: uppercaseTicker });

        if (!stockDoc) {
          stockDoc = new Stock({ stock: uppercaseTicker, likes: [] });
        }

        let currentLikes = stockDoc.likes.length;
        
        // Si el usuario pide like y su IP anonimizada no está registrada, añadirla
        if (like === 'true' && anonIp && !stockDoc.likes.includes(anonIp)) {
          stockDoc.likes.push(anonIp);
          await stockDoc.save();
          currentLikes = stockDoc.likes.length; // Actualizar conteo
        } else if (like === 'true' && anonIp && stockDoc.likes.includes(anonIp)) {
          // No hace nada si ya dio like (solo se devuelve el conteo existente)
          currentLikes = stockDoc.likes.length;
        }


        return {
          stock: uppercaseTicker,
          price: latestPrice,
          likes: currentLikes,
        };
      };
      
      try {
        if (stocksArray.length === 1) {
          // =========================================
          // Caso 1: Un Solo Stock
          // =========================================
          const stockData = await fetchStockData(stocksArray[0]);
          if (!stockData.price) {
             return res.json({ stockData: 'No stock data found' });
          }
          res.json({ stockData });

        } else if (stocksArray.length === 2) {
          // =========================================
          // Caso 2: Dos Stocks (usar Promise.all)
          // =========================================
          
          const [data1, data2] = await Promise.all(stocksArray.map(fetchStockData));
          
          // Calcular likes relativos (rel_likes)
          const rel_likes_1 = data1.likes - data2.likes;
          const rel_likes_2 = data2.likes - data1.likes;
          
          // Formatear respuesta con likes relativos
          const responseData = [
            { stock: data1.stock, price: data1.price, rel_likes: rel_likes_1 },
            { stock: data2.stock, price: data2.price, rel_likes: rel_likes_2 },
          ];

          res.json({ stockData: responseData });
        }
      } catch (error) {
        console.error("Error al procesar la solicitud:", error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });
};
