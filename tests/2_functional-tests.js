const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server');
const { expect } = chai;

chai.use(chaiHttp);

suite('Pruebas Funcionales del Comprobador de Precios de Acciones', function() {
  
  // Test 1: Visualización de un stock
  test('1) Visualización de un stock: GET request a /api/stock-prices/', function(done) {
    this.timeout(10000);
    
    chai.request(server)
      .keepOpen()
      .get('/api/stock-prices/')
      .query({ stock: 'GOOG' })
      .end(function(err, res) {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('stockData');
        expect(res.body.stockData).to.have.property('stock', 'GOOG');
        expect(res.body.stockData).to.have.property('price');
        expect(res.body.stockData.price).to.be.a('number');
        expect(res.body.stockData).to.have.property('likes');
        expect(res.body.stockData.likes).to.be.a('number');
        done();
      });
  });

  // Test 2: Ver una acción y dar "me gusta"
  test('2) Viendo una acción y me gusta: GET request para /api/stock-prices/', function(done) {
    this.timeout(10000);
    
    chai.request(server)
      .keepOpen()
      .get('/api/stock-prices/')
      .query({ stock: 'AAPL', like: true })
      .end(function(err, res) {
        expect(res).to.have.status(200);
        expect(res.body.stockData.likes).to.be.at.least(1);
        done();
      });
  });

  // Test 3: Ver el mismo stock y dar like nuevamente
  test('3) Viendo el mismo stock y me gustando nuevamente: GET request a /api/stock-prices/', function(done) {
    this.timeout(10000);
    
    chai.request(server)
      .keepOpen()
      .get('/api/stock-prices/')
      .query({ stock: 'MSFT', like: true })
      .end(function(err, res1) {
        expect(res1).to.have.status(200);
        const likesFirstTry = res1.body.stockData.likes;

        chai.request(server)
          .keepOpen()
          .get('/api/stock-prices/')
          .query({ stock: 'MSFT', like: true })
          .end(function(err, res2) {
            expect(res2).to.have.status(200);
            expect(res2.body.stockData.likes).to.equal(likesFirstTry);
            done();
          });
      });
  });

  // Test 4: Visualización de dos acciones
  test('4) Visualización de dos acciones: GET request a /api/stock-prices/', function(done) {
    this.timeout(10000);
    
    chai.request(server)
      .keepOpen()
      .get('/api/stock-prices/')
      .query({ stock: ['AMZN', 'TSLA'] })
      .end(function(err, res) {
        expect(res).to.have.status(200);
        expect(res.body.stockData).to.be.an('array').with.lengthOf(2);
        
        expect(res.body.stockData[0]).to.have.property('stock', 'AMZN');
        expect(res.body.stockData[0]).to.have.property('price');
        expect(res.body.stockData[0]).to.have.property('rel_likes');
        
        expect(res.body.stockData[1]).to.have.property('stock', 'TSLA');
        expect(res.body.stockData[1]).to.have.property('price');
        expect(res.body.stockData[1]).to.have.property('rel_likes');
        
        done();
      });
  });

  // Test 5: Visualizar dos acciones y dar likes
  test('5) Visualizando dos acciones y me gustan: GET request para /api/stock-prices/', function(done) {
    this.timeout(10000);
    
    chai.request(server)
      .keepOpen()
      .get('/api/stock-prices/')
      .query({ stock: ['NFLX', 'META'], like: true })
      .end(function(err, res) {
        expect(res).to.have.status(200);
        expect(res.body.stockData).to.be.an('array').with.lengthOf(2);
        
        expect(res.body.stockData[0].rel_likes).to.be.a('number');
        expect(res.body.stockData[1].rel_likes).to.be.a('number');
        
        const sum = res.body.stockData[0].rel_likes + res.body.stockData[1].rel_likes;
        expect(sum).to.equal(0);
        
        done();
      });
  });
});
