document.addEventListener('DOMContentLoaded', function () {

    // --- 1. URLs DE LA API ---
    // (Asegurate de que tu backend tenga estos endpoints)
    
    // Endpoint para las tarjetas de Ventas (El que ya tenías)
    const API_DASHBOARD_URL = '/api/informes/resumen'; 
    // Endpoint para las tarjetas de Stock (El que creamos)
    const API_STOCK_RESUMEN_URL = '/api/informes/resumen-stock';
    // Endpoint para la tabla de productos agotados (Nuevo)
    const API_LOW_STOCK_URL = '/api/informes/low-stock'; // (Asumimos este endpoint)

    // --- 2. CONSTANTES DEL DOM (Tarjetas del Mes) ---
    const ventasMesCount = document.getElementById('ventas-mes-count');
    const ventasHistoricasCount = document.getElementById('ventas-historicas-count');
    const productosMesCount = document.getElementById('productos-mes-count');
    const recaudacionMesAmount = document.getElementById('recaudacion-mes-amount');

    const lowStockPrevPageBtn = document.getElementById('low-stock-prev-page');
    const lowStockNextPageBtn = document.getElementById('low-stock-next-page');
    const lowStockPageInfo = document.getElementById('low-stock-page-info');

    let lowStockCurrentPage = 0; // Las páginas de Spring Boot empiezan en 0
    let lowStockTotalPages = 1;
    const itemsPerPage = 7;

    // --- 3. CONSTANTES DEL DOM (Tarjetas de Stock) ---
    // (Estos son los IDs que agregaste en el HTML)
    const totalProductosCount = document.getElementById('total-productos-count');
    const productosAgotadosCount = document.getElementById('productos-agotados-count');
    const stockBajoCount = document.getElementById('stock-bajo-count');

    // --- 4. CONSTANTES DEL DOM (Tabla de Stock Bajo) ---
    // (Tenés que agregar este ID a tu <tbody> en el HTML)
    // <tbody id="low-stock-table-body">
    const lowStockTableBody = document.querySelector('.low-stock-section .data-table tbody');


    // =================================================================
    // --- 5. FUNCIONES DE CARGA DE DATOS ---
    // =================================================================

    /**
     * Carga el resumen de ventas del mes (InformeDashboardDTO)
     */
    async function loadDashboardData() {
        try {
            const response = await fetch(API_DASHBOARD_URL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            
            const data = await response.json(); 

            // Rellenamos las tarjetas del mes
            if (ventasMesCount) ventasMesCount.textContent = data.ventasMes;
            if (ventasHistoricasCount) ventasHistoricasCount.textContent = data.ventasHistoricas;
            if (productosMesCount) productosMesCount.textContent = data.productoMes;
            if (recaudacionMesAmount) recaudacionMesAmount.textContent = `$${data.recaudacionMes.toFixed(2)}`;

        } catch (error) {
            console.error('Error al cargar datos del dashboard:', error);
        }
    }

    /**
     * Carga el resumen de stock (ResumenStockDTO)
     */
    async function loadStockData() {
        try {
            const response = await fetch(API_STOCK_RESUMEN_URL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const data = await response.json(); 
            
            // Rellenamos las tarjetas de stock
            if (totalProductosCount) totalProductosCount.textContent = data.totalProductos;
            if (productosAgotadosCount) productosAgotadosCount.textContent = data.productosAgotados;
            if (stockBajoCount) stockBajoCount.textContent = data.productosBajoStock;

        } catch (error) {
            console.error('Error al cargar resumen de stock:', error);
        }
    }

    /**
     * Carga la tabla de productos con stock bajo o agotado.
     * (Asume que la API devuelve un Array de StockTablaDTO)
     */
    async function loadLowStockTable() {
        if (!lowStockTableBody) return;
        lowStockTableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

        try {
            // --- ¡CAMBIO AQUÍ! ---
            // Le pasamos los parámetros de página y tamaño
            const url = `${API_LOW_STOCK_URL}?page=${lowStockCurrentPage}&size=${itemsPerPage}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            
            // La respuesta ahora es un objeto 'Page'
            const pageData = await response.json(); 
            
            // Guardamos el estado de la paginación
            lowStockTotalPages = pageData.totalPages;
            
            renderLowStockTable(pageData.content); // pageData.content es la lista de productos
            updatePaginationControls(); // Actualizamos botones

        } catch (error) {
            console.error('Error al cargar tabla de stock bajo:', error);
            lowStockTableBody.innerHTML = '<tr><td colspan="5">Error al cargar datos.</td></tr>';
        }
    }
    /**
     * Dibuja la tabla de productos con stock bajo.
     */
    function renderLowStockTable(productos) {
        if (!lowStockTableBody) return;
        lowStockTableBody.innerHTML = '';

        if (productos.length === 0) {
            lowStockTableBody.innerHTML = '<tr><td colspan="5">No hay productos con stock bajo o agotado.</td></tr>';
            return;
        }

        productos.forEach(producto => {
            
            // Lógica para el color del stock
            let stockClass = 'good';
            if (producto.stock <= 0) {
                stockClass = 'empty';
            } else if (producto.stock <= 5) {
                stockClass = 'low';
            }
            
            // --- ¡FILA CORREGIDA (5 CELDAS Y ORDENADAS)! ---
            const row = `
                <tr>
                    <td>${producto.nombre}</td>
                    <td>${producto.categoria}</td>
                    <td>${producto.descripcion}</td>
                    <td><span class="stock-badge ${stockClass}">${producto.stock}</span></td>
                    <td>$${producto.precio.toFixed(2)}</td>
                </tr>
            `;
            // --- FIN DE LA CORRECCIÓN ---

            lowStockTableBody.innerHTML += row;
        });
    }

    function updatePaginationControls() {
        if (!lowStockPageInfo) return;
        
        // Sumamos 1 a la página actual para mostrar (porque empieza en 0)
        lowStockPageInfo.textContent = `Página ${lowStockCurrentPage + 1} de ${lowStockTotalPages || 1}`;
        lowStockPrevPageBtn.disabled = (lowStockCurrentPage === 0);
        lowStockNextPageBtn.disabled = (lowStockCurrentPage + 1 >= lowStockTotalPages);
    }

    async function loadUserInfo() {
        const userNameEl = document.getElementById('header-user-name');
        const userRoleEl = document.getElementById('header-user-role');

        if (!userNameEl || !userRoleEl) return; // Salir si no estamos en el layout principal

        try {
            const response = await fetch('/api/auth/perfil');
            
            if (response.status === 401) {
                // Si la cookie no es válida o expiró, redirigir al login
                window.location.href = 'index.html'; // O tu página de login
                return;
            }
            
            if (!response.ok) {
                throw new Error('Error al cargar perfil');
            }

            const perfil = await response.json(); // { nombreCompleto, rol }

            userNameEl.textContent = perfil.nombreCompleto;
            userRoleEl.textContent = perfil.rol;

        } catch (error) {
            console.error(error);
            userNameEl.textContent = 'Error';
            userRoleEl.textContent = 'Error';
        }
    }


    // =================================================================
    // --- 6. EJECUCIÓN INICIAL ---
    // =================================================================
    
    // NOTA: Estas funciones deben ser llamadas por tu 'admin.js'
    // (o el script que maneja la navegación SPA) CADA VEZ
    // que el usuario hace clic en la sección "Principal".
    
    // Si este script SÓLO se carga en la página principal,
    // estas llamadas funcionarán bien aquí:
lowStockPrevPageBtn.addEventListener('click', (event) => { // <-- 1. Añadir (event)
        event.preventDefault(); // <-- 2. Añadir esta línea
        
        if (lowStockCurrentPage > 0) {
            lowStockCurrentPage--;
            loadLowStockTable();
        }
    });

lowStockNextPageBtn.addEventListener('click', (event) => { // <-- 1. Añadir (event)
        event.preventDefault(); // <-- 2. Añadir esta línea

        if (lowStockCurrentPage + 1 < lowStockTotalPages) {
            lowStockCurrentPage++;
            loadLowStockTable();
        }
    });

    
    loadDashboardData();
    loadStockData();
    loadLowStockTable();
    loadUserInfo();

});