document.addEventListener('DOMContentLoaded', function () {

    // --- 1. CONSTANTES DE API ---
    const API_STOCK_URL = '/api/stock/productos';           // GET para la tabla
    const API_STOCK_EDIT_URL = '/api/stock/';               // PUT para editar (ej: /api/stock/1)
    const API_PRODUCTOS_DELETE_URL = '/api/productos/';     // DELETE para borrar (ej: /api/productos/1)

    // --- 2. CONSTANTES DEL DOM (PÁGINA PRINCIPAL) ---
    const searchInput = document.getElementById('stock-search-input');
    const tableBody = document.getElementById('stock-table-body');

    // --- 3. CONSTANTES DEL DOM (MODAL DE BORRADO) ---
    const deleteModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // --- 4. CONSTANTES DEL DOM (MODAL DE EDICIÓN) ---
    const editModal = document.getElementById('edit-product-modal');
    const editModalCloseBtn = document.getElementById('edit-modal-close-btn');
    const editProductForm = document.getElementById('edit-product-form');
    
    // Inputs del formulario de edición
    const editProductId = document.getElementById('edit-product-id');
    const editNombre = document.getElementById('edit-nombre');
    const editCategoria = document.getElementById('edit-categoria');
    const editDescripcion = document.getElementById('edit-descripcion');
    const editPrecio = document.getElementById('edit-precio');
    const editStockActual = document.getElementById('edit-stock-actual');
    const editCantidadAjuste = document.getElementById('edit-cantidad-ajuste');
    
    // Mensajes de error del formulario de edición
    const errorEditNombre = document.getElementById('error-edit-nombre');
    const errorEditCategoria = document.getElementById('error-edit-categoria');
    const errorEditDescripcion = document.getElementById('error-edit-descripcion');
    const errorEditPrecio = document.getElementById('error-edit-precio');
    const errorEditAjuste = document.getElementById('error-edit-ajuste');
    const editFormGeneralMessage = document.getElementById('edit-form-general-message');

    // Constantes de paginación
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    // --- 5. VARIABLES DE ESTADO ---
    let todosLosProductos = []; // Guarda la lista completa de productos
    let idParaBorrar = null;   // Guarda el ID del producto a borrar
    
    // Estado de la paginación
    let currentPage = 1;
    const itemsPerPage = 7; // Productos por página
    let currentListForPagination = []; // Lista (filtrada o completa) que se está paginando

    // =================================================================
    // --- 6. FUNCIONES DE LÓGICA (CARGA, RENDER, FILTRO, ETC.) ---
    // =================================================================

    /**
     * Carga todos los productos desde la API, los ordena y renderiza.
     */
    async function loadStock() {
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
        }
        
        try {
            const response = await fetch(API_STOCK_URL); 
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const productos = await response.json();

            // Ordena por ID descendente (el más nuevo primero)
            productos.sort((a, b) => b.id - a.id);

            todosLosProductos = productos; 
            currentListForPagination = productos;
            currentPage = 1; // Resetea a la página 1
            renderStockTable(); // Llama sin parámetros

        } catch (error) {
            console.error('Error al cargar el stock:', error);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6">Error al cargar el stock. ${error.message}</td></tr>`;
            }
        }
    }

    /**
     * Dibuja las filas de la tabla (paginadas).
     */
    function renderStockTable() {
        if (!tableBody) return;
        tableBody.innerHTML = ''; 
        
        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        
        // Corregir página actual si está fuera de rango (ej. después de filtrar)
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }
        if (currentPage < 1) {
            currentPage = 1;
        }

        // Corta la lista a solo 7 items
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = currentListForPagination.slice(startIndex, endIndex);

        // Renderiza las filas
        if (paginatedItems.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No se encontraron productos.</td></tr>';
        } else {
            paginatedItems.forEach(producto => {
                let stockClass = 'good';
                if (producto.stock <= 0) stockClass = 'empty';
                else if (producto.stock <= 5) stockClass = 'low';

                const row = `
                    <tr>
                        <td>${producto.nombre}</td>
                        <td>${producto.categoria}</td>
                        <td>${producto.descripcion}</td>
                        <td>$${producto.precio.toFixed(2)}</td>
                        <td><span class="stock-badge ${stockClass}">${producto.stock}</span></td>
                        <td>
                            <button class="btn-icon btn-edit-producto" data-id="${producto.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon btn-delete-producto" data-id="${producto.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }

        // Actualiza los controles de paginación
        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevPageBtn.disabled = (currentPage === 1);
        nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
    }

    /**
     * Filtra la tabla basado en el buscador.
     */
    function filtrarStock() {
        const textoBusqueda = searchInput.value.toLowerCase();
        const productosFiltrados = todosLosProductos.filter(producto => {
            return producto.nombre.toLowerCase().includes(textoBusqueda);
        });
        
        currentListForPagination = productosFiltrados; // Actualiza la lista a paginar
        currentPage = 1; // Resetea a la página 1
        renderStockTable(); // Vuelve a dibujar
    }

    /**
     * Borra la fila de la tabla instantáneamente (sin recargar).
     */
    function removerFilaDelDOM(id) {
        const botonParaBorrar = tableBody.querySelector(`.btn-delete-producto[data-id="${id}"]`);
        
        if (botonParaBorrar) {
            const fila = botonParaBorrar.closest('tr');
            if (fila) {
                fila.remove(); 
            }
        }
        // Actualiza las listas globales para que el filtro y paginación
        // no cuenten el producto eliminado.
        todosLosProductos = todosLosProductos.filter(p => p.id != id);
        currentListForPagination = currentListForPagination.filter(p => p.id != id);
        
        // Vuelve a renderizar la página actual (importante si la página quedó vacía)
        renderStockTable();
    }

    /**
     * Abre el modal de edición y carga los datos.
     */
    function openEditModal(id) {
        const producto = todosLosProductos.find(p => p.id == id);
        if (!producto) {
            alert('Error: Producto no encontrado en el inventario local.');
            return;
        }

        // Limpia errores
        document.querySelectorAll('#edit-product-form .error-message').forEach(el => el.textContent = '');
        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';
        
        // Rellena el formulario
        editProductId.value = producto.id;
        editNombre.value = producto.nombre;
        editCategoria.value = producto.categoria;
        editDescripcion.value = producto.descripcion;
        editPrecio.value = producto.precio.toFixed(2);
        editStockActual.value = producto.stock; 
        editCantidadAjuste.value = 0; 

        editModal.style.display = 'block';
    }

    /**
     * Maneja el envío del formulario de edición (PUT).
     */
    async function handleEditSubmit(event) {
        event.preventDefault(); 
        
        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';

        const id = editProductId.value;
        const ajuste = parseInt(editCantidadAjuste.value) || 0; 
        
        // 1. Validaciones
        let isValid = true;
        if (editNombre.value.trim() === "") {
             errorEditNombre.textContent = 'El nombre es obligatorio.'; isValid = false;
        }
        if (editCategoria.value.trim() === "") {
             errorEditCategoria.textContent = 'La categoría es obligatoria.'; isValid = false;
        }
        if (editPrecio.value <= 0 || isNaN(parseFloat(editPrecio.value))) {
            errorEditPrecio.textContent = 'El precio debe ser un valor numérico positivo.'; isValid = false;
        }
        if (isNaN(ajuste)) {
            errorEditAjuste.textContent = 'El ajuste debe ser un número (o 0).'; isValid = false;
        } else if (ajuste < 0) {
             errorEditAjuste.textContent = 'La cantidad a añadir no puede ser negativa.'; isValid = false;
        }
        
        if (!isValid) return; 

        // 2. Construir el DTO
        const actualizarDTO = {
            nombre: editNombre.value.trim(),
            categoria: editCategoria.value.trim(),
            descripcion: editDescripcion.value.trim(),
            precio: parseFloat(editPrecio.value),
            cantidadExtraStock: ajuste
        };

        // 3. Llamar al backend (PUT a /api/stock/{id})
        try {
            const response = await fetch(API_STOCK_EDIT_URL + id, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actualizarDTO)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Error HTTP: ${response.status}`);
            }

            // 4. Éxito
            editModal.style.display = 'none';
            alert('¡Producto actualizado con éxito!');
            // Recargamos todo para ver el cambio de stock y precio
            loadStock(); 

        } catch (error) {
            console.error('Error al actualizar producto:', error);
            editFormGeneralMessage.textContent = `Error: ${error.message}`;
            editFormGeneralMessage.classList.add('error');
        }
    }

    // =================================================================
    // --- 7. LISTENERS (Conexión de eventos) ---
    // =================================================================

    // Buscador
    searchInput.addEventListener('input', filtrarStock);

    // Botones de la tabla (Editar y Borrar)
    tableBody.addEventListener('click', (event) => {
        const target = event.target; 

        // Lógica de borrar (abre modal)
        const deleteButton = target.closest('.btn-delete-producto');
        if (deleteButton) {
            idParaBorrar = deleteButton.dataset.id; 
            deleteModal.style.display = 'block';
        }

        // Lógica de editar (abre modal)
        const editButton = target.closest('.btn-edit-producto');
        if (editButton) {
            const id = editButton.dataset.id;
            openEditModal(id);
        }
    });

    // Botones del Modal de Borrado
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        idParaBorrar = null;
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        if (!idParaBorrar) return;

        try {
            const response = await fetch(API_PRODUCTOS_DELETE_URL + idParaBorrar, {
                method: 'DELETE'
            });

            if (response.ok) {
                // ÉXITO (Status 200 o 204)
                // Borramos la fila sin alertar al usuario
                removerFilaDelDOM(idParaBorrar); 
            } else {
                // ERROR (Status 400, 403, 500, etc.)
                const errorTexto = await response.text();
                
                if (response.status === 400 && errorTexto.includes("INACTIVO")) {
                    // ÉXITO LÓGICO (400 Bad Request)
                    // Borramos la fila sin alertar al usuario
                    removerFilaDelDOM(idParaBorrar);
                } else {
                    // Error real
                    throw new Error(errorTexto || `Error HTTP: ${response.status}`);
                }
            }
        } catch (error) {
            console.error('Error al eliminar:', error.message);
            if (!error.message.includes("INACTIVO")) {
                alert(`Error inesperado: ${error.message}`);
            }
        } finally {
            deleteModal.style.display = 'none';
            idParaBorrar = null;
        }
    });

    // Botones del Modal de Edición
    editModalCloseBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    editProductForm.addEventListener('submit', handleEditSubmit);

    // Botones de Paginación
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderStockTable();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderStockTable();
        }
    });

    // =================================================================
    // --- 8. EJECUCIÓN INICIAL ---
    // =================================================================
    loadStock();

});