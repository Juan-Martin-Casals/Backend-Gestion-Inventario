/**
 * Este archivo maneja toda la lógica para la sección de "Productos":
 * - Cargar la lista inicial de productos.
 * - Validar y enviar el formulario para registrar nuevos productos.
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

    // ===============================
    // URLs DE LA API
    // ===============================
    
    // URL para OBTENER y CREAR productos
    const API_PRODUCTOS_URL = '/api/productos'; 
    
    // ===============================
    // FUNCIÓN PARA CARGAR PRODUCTOS
    // ===============================
    async function loadProducts() {
        if (!productTableBody) return; 
        
        productTableBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
        
        try {
            const response = await fetch(API_PRODUCTOS_URL); // Llama a GET /api/productos
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            
            const products = await response.json(); // Recibe una LISTA
            renderProductTable(products);

        } catch (error) {
            console.error('Error al cargar los productos:', error);
            productTableBody.innerHTML = `<tr><td colspan="4">Error al cargar productos.</td></tr>`;
        }
    }

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA
    // ===============================
    function renderProductTable(products) {
        if (!productTableBody) return;
        
        productTableBody.innerHTML = '';
        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="4">No hay productos registrados.</td></tr>';
            return;
        }

        products.forEach(product => {
            let fechaFormateada = "N/A";
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

            // 1. Limpiar mensajes previos
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
            if (!nombre) {
                nameError.textContent = 'Complete este campo por favor'; isValid = false;
            }
            if (!categoria) {
                categoryError.textContent = 'Complete este campo por favor'; isValid = false;
            }
            if (!descripcion) {
                descriptionError.textContent = 'Complete este campo por favor'; isValid = false;
            }
            if (isNaN(stockMinimo) || stockMinimo < 0) {
                stockMinError.textContent = 'Debe ser un número positivo.'; isValid = false;
            }
            if (isNaN(stockMaximo) || stockMaximo <= 0) {
                stockMaxError.textContent = 'Debe ser un número mayor a 0.'; isValid = false;
            }
            if (isValid && stockMinimo >= stockMaximo) {
                stockMaxError.textContent = 'El máx. debe ser mayor que el mín.'; isValid = false;
            }

            if (!isValid) {
                generalMessage.textContent = "Debe completar todos los campos correctamente.";
                generalMessage.classList.add('error');
                return;
            }

            // 4. Construir DTO (ProductoRequestDTO)
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
                    throw new Error(errorText || `Error del servidor: ${response.status}`);
                }

                generalMessage.textContent = "¡Producto registrado con éxito!";
                generalMessage.classList.add('success');
                productForm.reset();
                loadProducts(); // Recargar la tabla

            } catch (error) {
                console.error('Error al registrar el producto:', error);
                generalMessage.textContent = `${error.message}`; 
                generalMessage.classList.add('error');
            }
        });
    }
    
    // ===============================
    // CARGA INICIAL
    // ===============================
    loadProducts();
});