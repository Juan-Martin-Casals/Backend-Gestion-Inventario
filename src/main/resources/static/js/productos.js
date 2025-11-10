/**
 * Este archivo maneja toda la lógica para la sección de "Productos":
 * - Cargar la lista INICIAL de productos (paginada).
 * - Validar y enviar el formulario para registrar nuevos productos.
 * - Controlar la paginación de la tabla.
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

    // --- ¡NUEVO! Selectores de Paginación ---
    const prevPageBtn = document.getElementById('product-prev-page');
    const nextPageBtn = document.getElementById('product-next-page');
    const pageInfo = document.getElementById('product-page-info');

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_PRODUCTOS_URL = '/api/productos'; 
    
    // --- ¡NUEVO! Estado de Paginación ---
    let currentPage = 0; // Las páginas de Spring Boot empiezan en 0
    let totalPages = 1;
    const itemsPerPage = 7; // O el número que prefieras

    // ===============================
    // FUNCIÓN PARA CARGAR PRODUCTOS (MODIFICADA)
    // ===============================
    async function loadProducts() {
        if (!productTableBody) return; 
        
        productTableBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
        
        try {
            // --- ¡CAMBIO AQUÍ! ---
            // Le pasamos los parámetros de página y tamaño
            const url = `${API_PRODUCTOS_URL}?page=${currentPage}&size=${itemsPerPage}&sort=fechaCreacion,desc`;
            const response = await fetch(url); // Llama a GET /api/productos?page=...

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            
            // La respuesta ahora es un objeto 'Page'
            const pageData = await response.json(); 
            
            // Guardamos el estado de la paginación
            totalPages = pageData.totalPages;
            
            renderProductTable(pageData.content); // pageData.content es la lista
            updatePaginationControls(); // Actualizamos botones

        } catch (error) {
            console.error('Error al cargar los productos:', error);
            productTableBody.innerHTML = `<tr><td colspan="6">Error al cargar productos.</td></tr>`;
        }
    }

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA (SIN CAMBIOS)
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
            // (Esta es la lógica que corregimos antes)
            if (product.fechaCreacion) { 
                const parts = product.fechaCreacion.split('-');
                fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`; 
            }

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
    // LÓGICA DEL FORMULARIO DE REGISTRO (Modificada)
    // ===============================
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // ... (Toda tu lógica de validación de campos va aquí - sin cambios)
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
                const response = await fetch(API_PRODUCTOS_URL, { // POST a /api/productos
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
                
                // --- ¡CAMBIO AQUÍ! ---
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
    // ¡NUEVO! FUNCIONES DE PAGINACIÓN
    // (Copiadas de principal.js y adaptadas)
    // ===============================
    function updatePaginationControls() {
        if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
        
        pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages || 1}`;
        prevPageBtn.disabled = (currentPage === 0);
        nextPageBtn.disabled = (currentPage + 1 >= totalPages);
    }

if (prevPageBtn) {
        prevPageBtn.addEventListener('click', (event) => { // <-- 1. Añadir (event)
            event.preventDefault(); // <-- 2. Añadir esta línea
            
            if (currentPage > 0) {
                currentPage--;
                loadProducts();
            }
        });
    }

if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (event) => { // <-- 1. Añadir (event)
            event.preventDefault(); // <-- 2. Añadir esta línea
            
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadProducts();
            }
        });
    }
    // ===============================
    // CARGA INICIAL
    // ===============================
    loadProducts(); // Carga la primera página (página 0) al entrar
});