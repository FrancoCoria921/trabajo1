// public/script.js
document.addEventListener('DOMContentLoaded', function() {
    const singleStockForm = document.getElementById('singleStockForm');
    const compareStocksForm = document.getElementById('compareStocksForm');
    const resultDiv = document.getElementById('result');

    // Formulario para una sola acción
    singleStockForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const stockSymbol = document.getElementById('stockInput').value.trim();
        const like = document.getElementById('likeCheckbox').checked;
        
        if (!stockSymbol) {
            showError('Por favor ingresa un símbolo de acción');
            return;
        }

        await fetchStockData([stockSymbol], like);
    });

    // Formulario para comparar dos acciones
    compareStocksForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const stock1 = document.getElementById('stock1Input').value.trim();
        const stock2 = document.getElementById('stock2Input').value.trim();
        const like = document.getElementById('compareLikeCheckbox').checked;
        
        if (!stock1 || !stock2) {
            showError('Por favor ingresa ambos símbolos de acciones');
            return;
        }

        await fetchStockData([stock1, stock2], like);
    });

    // Función principal para obtener datos de la API
    async function fetchStockData(stocks, like) {
        try {
            showLoading();
            
            // Construir parámetros de consulta :cite[3]
            const params = new URLSearchParams();
            stocks.forEach(stock => params.append('stock', stock));
            if (like) params.append('like', 'true');

            const response = await fetch(`/api/stock-prices?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error del servidor');
            }

            displayResults(data);
            
        } catch (error) {
            console.error('Error:', error);
            showError(`Error: ${error.message}`);
        }
    }

    // Mostrar resultados en la página
    function displayResults(data) {
        const stockData = data.stockData;
        
        if (Array.isArray(stockData)) {
            // Comparación de dos acciones
            resultDiv.innerHTML = `
                <h2>Resultados de la Comparación</h2>
                <div class="comparison">
                    ${stockData.map(stock => `
                        <div class="stock-result">
                            <h3>${stock.stock}</h3>
                            <p class="price">Precio: $${stock.price}</p>
                            <p class="likes">Likes Relativos: ${stock.rel_likes}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            // Una sola acción
            resultDiv.innerHTML = `
                <div class="stock-result">
                    <h3>${stockData.stock}</h3>
                    <p class="price">Precio: $${stockData.price}</p>
                    <p class="likes">Likes: ${stockData.likes}</p>
                </div>
            `;
        }
    }

    function showLoading() {
        resultDiv.innerHTML = '<p>Cargando...</p>';
    }

    function showError(message) {
        resultDiv.innerHTML = `<div class="error">${message}</div>`;
    }
});
