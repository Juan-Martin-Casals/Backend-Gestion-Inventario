/**
 * Este archivo maneja toda la lógica para la sección de "Productos":
 * - Cargar la lista inicial de productos desde el endpoint de Stock.
 * - Validar y enviar el formulario para registrar nuevos productos al endpoint de Productos.
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

    const generalMessage = document.getElementById('form-general-message-producto');

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_GET_URL = '/api/stock/productos'; // <-- CAMBIO: URL para OBTENER la lista con stock.
    const API_POST_URL = '/api/productos';      // <-- URL para CREAR un nuevo producto.


    // ===============================
    // FUNCIÓN PARA CARGAR PRODUCTOS
    // ===============================
    async function loadProducts() {
        try {
            // Llama a la URL correcta para obtener la tabla con stock
            const response = await fetch(API_GET_URL);
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            const products = await response.json();
            renderProductTable(products);
        } catch (error) {
            console.error('Error al cargar los productos:', error);
            productTableBody.innerHTML = `<tr><td colspan="5">Error al cargar productos. Verifique la consola.</td></tr>`;
        }
    }

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA
    // ===============================
    function renderProductTable(products) {
        productTableBody.innerHTML = '';
        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="5">No hay productos registrados.</td></tr>';
            return;
        }

        products.forEach(product => {
            // El DTO ahora tiene la propiedad 'stock'
            const row = `
                <tr>
                    <td>${product.nombre || 'N/A'}</td>
                    <td>${product.categoria || 'N/A'}</td>
                    <td>${product.descripcion || 'N/A'}</td>
                </tr>
            `;
            productTableBody.innerHTML += row;
        });
    }

    // ... (El resto del archivo, como el event listener del formulario, no necesita cambios
    // porque ya usa la URL correcta para el POST)

    // ===============================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ===============================
    if (productForm) {
        productForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Limpiar mensajes previos
            document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';
            let isValid = true;

            // ... (resto de la lógica de validación)
            const nombre = nameInput.value.trim();
            const categoria = categoryInput.value.trim();
            const descripcion = descriptionInput.value.trim();


            if (!nombre) {
                document.getElementById('name-error').textContent = 'Complete este campo por favor';
                isValid = false;
            }
            if (!categoria) {
                document.getElementById('category-error').textContent = 'Complete este campo por favor';
                isValid = false;
            }
            if (!descripcion) {
                document.getElementById('description-error').textContent = 'Complete este campo por favor';
                isValid = false;
            }

            if (!isValid) {
                generalMessage.textContent = "Debe completar todos los campos correctamente.";
                generalMessage.classList.add('error');
                return;
            }

            const productoDTO = {
                nombre: nombre,
                categoria: categoria,
                descripcion: descripcion,
            };

            try {
                // Llama a la URL correcta para crear el producto
                const response = await fetch(API_POST_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productoDTO)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Error del servidor: ${response.status}`);
                }

                generalMessage.textContent = "¡Producto registrado con éxito!";
                generalMessage.classList.add('success');
                productForm.reset();
                loadProducts(); // Recargar la tabla

            } catch (error) {
                console.error('Error al registrar el producto:', error);
                generalMessage.textContent = `No se pudo registrar el producto: ${error.message}`;
                generalMessage.classList.add('error');
            }
        });
    }

    // Carga inicial de datos
    loadProducts();
});

