/**
 * Este archivo maneja toda la lógica para la sección de "Productos":
 * - Cargar la lista de productos (paginada y ordenada).
 * - Validar y enviar el formulario para registrar nuevos productos.
 * - Controlar la paginación y ordenamiento de la tabla.
 */
document.addEventListener('DOMContentLoaded', function() {

    // ===============================
    // SELECTORES DE ELEMENTOS DEL DOM
    // ===============================
    const productForm = document.getElementById('product-form');
    const productTableBody = document.getElementById('product-table-body');
    const nameInput = document.getElementById('product-name');
    const categoryInput = document.getElementById('product-category');
    const descriptionInput = document.getElementById('product-description');
    const stockMinInput = document.getElementById('product-stock-min');
    const stockMaxInput = document.getElementById('product-stock-max');
    const generalMessage = document.getElementById('form-general-message-producto');
    
    // Selectores de error
    const nameError = document.getElementById('name-error');
    const categoryError = document.getElementById('category-error');
    const descriptionError = document.getElementById('description-error');
    const stockMinError = document.getElementById('stock-min-error');
    const stockMaxError = document.getElementById('stock-max-error');

    // --- Selectores de Paginación y Estabilidad ---
    const prevPageBtn = document.getElementById('product-prev-page');
    const nextPageBtn = document.getElementById('product-next-page');
    const pageInfo = document.getElementById('product-page-info');
    
    // CORRECCIÓN: Para el control de scroll y foco
    const mainContent = document.querySelector('.main-content'); 

    // ===============================
    // URLs DE LA API Y ESTADO
    // ===============================
    const API_PRODUCTOS_URL = '/api/productos'; 
    
    // --- Estado de Paginación y Ordenamiento ---
    let currentPage = 0; 
    let totalPages = 1;
    const itemsPerPage = 10;
    let sortField = 'fechaCreacion'; // Campo de ordenamiento inicial
    let sortDirection = 'desc'; // Dirección inicial (más nuevo primero)


    // ===============================
    // FUNCIÓN PARA CARGAR PRODUCTOS (FINAL)
    // ===============================
    async function loadProducts() {
        if (!productTableBody || !mainContent) return; 
        
        // 1. GUARDAR scroll y preparar animación (Fade Out)
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        productTableBody.classList.add('loading');
        
        // Esperar fade-out
        await new Promise(resolve => setTimeout(resolve, 200)); 
        
        try {
            // 2. Añadir parámetros de ordenamiento
            const sortParam = sortField ? `&sort=${sortField},${sortDirection}` : '';
            const url = `${API_PRODUCTOS_URL}?page=${currentPage}&size=${itemsPerPage}${sortParam}`;
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            
            const pageData = await response.json(); 
            totalPages = pageData.totalPages;
            
            // 3. Renderizar y finalizar animación
            renderProductTable(pageData.content); 
            updatePaginationControls(); 
            updateSortIndicators(); 
            
            requestAnimationFrame(() => {
                // Restaurar scroll y forzar foco para estabilidad
                mainContent.focus(); 
                window.scrollTo(0, scrollPosition);
                // INICIAR FADE-IN
                productTableBody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar los productos:', error);
            productTableBody.innerHTML = `<tr><td colspan="6">Error al cargar productos.</td></tr>`;
            productTableBody.classList.remove('loading'); 
        }
    }

    // ===============================
    // FUNCIONES DE ORDENAMIENTO
    // ===============================
    function handleSortClick(event) {
        event.preventDefault();
        event.currentTarget.blur(); // Evita que el encabezado mantenga el foco
        
        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');

        if (!newSortField) return;

        if (sortField === newSortField) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = newSortField;
            sortDirection = 'asc';
        }

        currentPage = 0; 
        loadProducts();
    }
    
    function updateSortIndicators() {
        const headers = document.querySelectorAll('#productos-section .data-table th[data-sort-by]');
        headers.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            
            const icon = th.querySelector('.sort-icon');
            if (icon) {
                icon.className = 'sort-icon fas fa-sort';
            }
            
            if (th.getAttribute('data-sort-by') === sortField) {
                th.classList.add(`sort-${sortDirection}`);
                
                if (icon) {
                    icon.className = `sort-icon fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
                }
            }
        });
    }

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA
    // ===============================
    function renderProductTable(products) {
        if (!productTableBody) return;
        
        productTableBody.innerHTML = '';
        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="6">No hay productos registrados.</td></tr>';
            return;
        }

        products.forEach(product => {
            let fechaFormateada = "N/A";
            if (product.fechaCreacion) { 
                const parts = product.fechaCreacion.split('-');
                fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`; 
            }

            // NOTA: Se asume que el backend devuelve stockMinimo y stockMaximo correctamente en ProductoResponseDTO
            const row = `
                <tr>
                    <td>${product.nombre || 'N/A'}</td>
                    <td>${product.categoria || 'N/A'}</td>
                    <td>${product.descripcion || 'N/A'}</td>
                    <td>${fechaFormateada}</td>
                    <td>${product.stockMinimo}</td>
                    <td>${product.stockMaximo}</td>
                </tr>
            `;
            productTableBody.innerHTML += row;
        });
    }

    // ===============================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ===============================
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // 1. Limpiar mensajes
            document.querySelectorAll('#product-form .error-message').forEach(el => el.textContent = '');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';
            
            // 2. Obtener valores
            const nombre = nameInput.value.trim();
            const categoria = categoryInput.value.trim();
            const descripcion = descriptionInput.value.trim();
            const stockMinimo = parseInt(stockMinInput.value, 10);
            const stockMaximo = parseInt(stockMaxInput.value, 10);

            // 3. Validaciones
            let isValid = true;
            if (!nombre) { nameError.textContent = 'Complete este campo'; isValid = false; }
            if (!categoria) { categoryError.textContent = 'Complete este campo'; isValid = false; }
            if (!descripcion) { descriptionError.textContent = 'Complete este campo'; isValid = false; }
            if (isNaN(stockMinimo) || stockMinimo < 0) { stockMinError.textContent = 'Debe ser un número positivo.'; isValid = false; }
            if (isNaN(stockMaximo) || stockMaximo <= 0) { stockMaxError.textContent = 'Debe ser un número mayor a 0.'; isValid = false; }
            if (isValid && stockMinimo >= stockMaximo) { stockMaxError.textContent = 'El máx. debe ser mayor que el mín.'; isValid = false; }
            if (!isValid) { generalMessage.textContent = "Complete los campos."; generalMessage.classList.add('error'); return; }

            // 4. Construir DTO
            const productoDTO = {
                nombre: nombre,
                categoria: categoria,
                descripcion: descripcion,
                stockMinimo: stockMinimo, 
                stockMaximo: stockMaximo
            };

            // 5. Enviar
            try {
                const response = await fetch(API_PRODUCTOS_URL, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productoDTO)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Error: ${response.status}`);
                }

                generalMessage.textContent = "¡Producto registrado con éxito!";
                generalMessage.classList.add('success');
                productForm.reset();
                
                // Reseteamos a la página 0 y recargamos la tabla
                currentPage = 0; 
                loadProducts(); 

            } catch (error) {
                console.error('Error al registrar el producto:', error);
                generalMessage.textContent = `${error.message}`; 
                generalMessage.classList.add('error');
            }
        });
    }

    // ===============================
    // FUNCIONES DE PAGINACIÓN
    // ===============================
    function updatePaginationControls() {
        if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
        
        pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages || 1}`;
        prevPageBtn.disabled = (currentPage === 0);
        nextPageBtn.disabled = (currentPage + 1 >= totalPages);
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', (event) => { 
            event.preventDefault(); 
            if (currentPage > 0) {
                currentPage--;
                loadProducts();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (event) => { 
            event.preventDefault(); 
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadProducts();
            }
        });
    }
    
    // ===============================
    // LISTENERS Y EJECUCIÓN INICIAL
    // ===============================
    
    // LISTENERS DE ORDENAMIENTO
    const sortableHeaders = document.querySelectorAll('#productos-section .data-table th[data-sort-by]');
    sortableHeaders.forEach(th => {
        th.addEventListener('click', handleSortClick);
    });
    
    // CARGA INICIAL
    loadProducts(); 
});