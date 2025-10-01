const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server.js'); // Ajusta la ruta según tu estructura
const { expect } = chai;

chai.use(chaiHttp);

suite('Pruebas Funcionales', () => {
    suite('GET /api/stock-prices', () => {
        test('1) Ver una acción', function(done) {
            chai.request(server)
                .get('/api/stock-prices')
                .query({ stock: 'GOOG' })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.property('stockData');
                    expect(res.body.stockData).to.have.property('stock', 'GOOG');
                    expect(res.body.stockData).to.have.property('price');
                    expect(res.body.stockData).to.have.property('likes');
                    done();
                });
        }).timeout(5000);

        test('2) Ver una acción y dar like', function(done) {
            chai.request(server)
                .get('/api/stock-prices')
                .query({ stock: 'AAPL', like: true })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.stockData.likes).to.be.at.least(1);
                    done();
                });
        }).timeout(5000);

        test('3) Ver la misma acción y dar like nuevamente', function(done) {
            // Primera solicitud con like
            chai.request(server)
                .get('/api/stock-prices')
                .query({ stock: 'MSFT', like: true })
                .end((err, res1) => {
                    const likesFirstTry = res1.body.stockData.likes;
                    
                    // Segunda solicitud con like desde la misma IP
                    chai.request(server)
                        .get('/api/stock-prices')
                        .query({ stock: 'MSFT', like: true })
                        .end((err, res2) => {
                            expect(res2.body.stockData.likes).to.equal(likesFirstTry);
                            done();
                        });
                });
        }).timeout(5000);

        test('4) Ver dos acciones', function(done) {
            chai.request(server)
                .get('/api/stock-prices')
                .query({ stock: ['AMZN', 'TSLA'] })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.stockData).to.be.an('array').with.lengthOf(2);
                    expect(res.body.stockData[0]).to.have.property('rel_likes');
                    expect(res.body.stockData[1]).to.have.property('rel_likes');
                    done();
                });
        }).timeout(5000);

        test('5) Ver dos acciones y dar likes', function(done) {
            chai.request(server)
                .get('/api/stock-prices')
                .query({ stock: ['NFLX', 'FB'], like: true })
                .end((err, res) => {
                    expect(res).to.have.status(200);
                    expect(res.body.stockData[0].rel_likes).to.be.a('number');
                    expect(res.body.stockData[1].rel_likes).to.be.a('number');
                    done();
                });
        }).timeout(5000);
    });
});
