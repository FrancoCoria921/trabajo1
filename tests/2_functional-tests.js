// tests/2_functional-tests.js

const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const mongoose = require('mongoose');

chai.use(chaiHttp);

suite('Functional Tests', function() {
    
  // =================================================================
  // 🧹 Limpieza de la Base de Datos (Opcional pero Recomendado)
  // =================================================================
  
  suiteSetup(async function() {
    // Asegurarse de que el modelo Stock esté cargado (si no lo está ya en api.js)
    if (mongoose.models.Stock) {
      await mongoose.models.Stock.deleteMany({ stock: { $in: ['AMZN', 'MSFT', 'TSLA', 'GOOG'] } });
      console.log('Stocks de prueba eliminados antes de las pruebas.');
    }
  });

  let likeCount = 0; 
  
  suite('GET /api/stock-prices => stockData object', function() {

    // 1. Visualización de un stock
    test('1. Visualización de un stock: solicitud GET a /api/stock-prices/', function(done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: 'GOOG' }) 
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body.stockData);
          assert.property(res.body.stockData, 'stock');
          assert.property(res.body.stockData, 'price');
          assert.property(res.body.stockData, 'likes');
          assert.equal(res.body.stockData.stock, 'GOOG');
          assert.isNumber(res.body.stockData.price);
          done();
        });
    });

    // 2. Viendo una acción y me gusta
    test('2. Viendo una acción y me gusta: solicitud GET para /api/stock-prices/', function(done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: 'AMZN', like: true }) 
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body.stockData);
          assert.equal(res.body.stockData.stock, 'AMZN');
          assert.isAbove(res.body.stockData.likes, 0, 'Debe registrar al menos 1 like.'); 
          likeCount = res.body.stockData.likes; // Guarda el conteo
          done();
        });
    });

    // 3. Viendo el mismo stock y me gustando nuevamente (el like no debe aumentar)
    test('3. Viendo el mismo stock y me gustando nuevamente: solicitud GET a /api/stock-prices/', function(done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: 'AMZN', like: true })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body.stockData);
          // Verificar que el conteo de likes no cambió desde la prueba anterior (misma IP)
          assert.equal(res.body.stockData.likes, likeCount, 'El conteo de likes no debe aumentar.');
          done();
        });
    });

    // 4. Visualización de dos acciones
    test('4. Visualización de dos acciones: solicitud GET a /api/stock-prices/', function(done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: ['MSFT', 'TSLA'] })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          assert.equal(res.body.stockData.length, 2);
          assert.property(res.body.stockData[0], 'rel_likes');
          assert.property(res.body.stockData[1], 'rel_likes');
          assert.notProperty(res.body.stockData[0], 'likes', 'No debe haber campo likes en múltiples stocks');
          assert.notProperty(res.body.stockData[1], 'likes');
          
          const relLikes1 = res.body.stockData[0].rel_likes;
          const relLikes2 = res.body.stockData[1].rel_likes;
          // La diferencia debe ser el negativo mutuo
          assert.equal(relLikes1, -relLikes2);
          done();
        });
    });

    // 5. Visualizando dos acciones y me gustan
    test('5. Visualizando dos acciones y me gustan: solicitud GET para /api/stock-prices/', function(done) {
      chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: ['MSFT', 'TSLA'], like: true })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body.stockData);
          assert.equal(res.body.stockData.length, 2);
          assert.property(res.body.stockData[0], 'rel_likes');
          assert.property(res.body.stockData[1], 'rel_likes');
          
          const relLikes1 = res.body.stockData[0].rel_likes;
          const relLikes2 = res.body.stockData[1].rel_likes;
          // Si ambas reciben el mismo like por la misma IP, rel_likes debería ser 0 y 0.
          assert.equal(relLikes1, 0, 'rel_likes debe ser 0 si ambas reciben un like de la misma IP');
          assert.equal(relLikes2, 0);
          done();
        });
    });
  });
});
