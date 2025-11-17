document.addEventListener('DOMContentLoaded', function () {

    // --- 1. CONSTANTES DE API ---
    const API_STOCK_URL = '/api/stock/productos';           
    const API_STOCK_EDIT_URL = '/api/stock/';               
    const API_PRODUCTOS_DELETE_URL = '/api/productos/';     

    // =================================================================
    // --- CONFIGURACIÓN DE FORMATO (NUEVO) ---
    // =================================================================
    // Definimos el formateador para moneda (es-AR usa punto para miles)
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    // --- 2. CONSTANTES DEL DOM (PÁGINA PRINCIPAL) ---
    const searchInput = document.getElementById('stock-search-input');
    const tableBody = document.getElementById('stock-table-body');
    
    const mainContent = document.querySelector('.main-content');
    const tableHeaders = document.querySelectorAll('#stock-section .data-table th[data-sort-by]');

    // --- 3. CONSTANTES DEL DOM (MODAL DE BORRADO) ---
    const deleteModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // --- 4. CONSTANTES DEL DOM (MODAL DE EDICIÓN) ---
    const editModal = document.getElementById('edit-product-modal');
    const editModalCloseBtn = document.getElementById('edit-modal-close-btn');
    const editProductForm = document.getElementById('edit-product-form');
    const editProductId = document.getElementById('edit-product-id');
    const editNombre = document.getElementById('edit-nombre');
    const editCategoria = document.getElementById('edit-categoria');
    const editDescripcion = document.getElementById('edit-descripcion');
    const editPrecio = document.getElementById('edit-precio');
    const editStockActual = document.getElementById('edit-stock-actual');
    const editCantidadAjuste = document.getElementById('edit-cantidad-ajuste');
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
    let todosLosProductos = []; 
    let idParaBorrar = null;   
    
    // Estado de la paginación
    let currentPage = 1;
    const itemsPerPage = 7; 
    let currentListForPagination = []; 

    // Estado de ordenamiento
    let sortField = 'stock'; 
    let sortDirection = 'asc'; 

    // =================================================================
    // --- 6. FUNCIONES DE LÓGICA (CARGA, RENDER, FILTRO, ETC.) ---
    // =================================================================

    /**
     * Carga todos los productos desde la API.
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

            todosLosProductos = productos; 
            
            filtrarStock(); 

        } catch (error) {
            console.error('Error al cargar el stock:', error);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6">Error al cargar el stock. ${error.message}</td></tr>`;
            }
        }
    }

    /**
     * Dibuja las filas de la tabla (paginadas) con animación.
     */
    async function renderStockTable() {
        if (!tableBody || !mainContent) return;
        
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        tableBody.classList.add('loading');
        
        await new Promise(resolve => setTimeout(resolve, 200));

        tableBody.innerHTML = ''; 
        
        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }
        if (currentPage < 1) {
            currentPage = 1;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = currentListForPagination.slice(startIndex, endIndex);

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
                        
                        <td>$${formatoMoneda.format(producto.precio)}</td>
                        
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

        pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        prevPageBtn.disabled = (currentPage === 1);
        nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);
        
        updateSortIndicators();

        requestAnimationFrame(() => {
            const isSearchActive = (document.activeElement === searchInput);
            if (!isSearchActive) {
                mainContent.focus();
            }
            window.scrollTo(0, scrollPosition);
            tableBody.classList.remove('loading');
        });
    }

    /**
     * Filtra, ORDENA y renderiza.
     */
    function filtrarStock() {
        const textoBusqueda = searchInput.value.toLowerCase();
        
        const productosFiltrados = todosLosProductos.filter(producto => {
            return producto.nombre.toLowerCase().includes(textoBusqueda);
        });
        
        currentListForPagination = productosFiltrados;
        clientSideSort();

        currentPage = 1; 
        renderStockTable(); 
    }

    function clientSideSort() {
        currentListForPagination.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }

            return (sortDirection === 'desc') ? (comparison * -1) : comparison;
        });
    }

    function handleSortClick(event) {
        event.preventDefault();
        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');

        if (!newSortField) return;

        if (sortField === newSortField) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = newSortField;
            sortDirection = 'asc';
        }

        filtrarStock();
    }

    function updateSortIndicators() {
        tableHeaders.forEach(th => {
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

    function removerFilaDelDOM(id) {
        const botonParaBorrar = tableBody.querySelector(`.btn-delete-producto[data-id="${id}"]`);
        
        if (botonParaBorrar) {
            const fila = botonParaBorrar.closest('tr');
            if (fila) {
                fila.remove(); 
            }
        }
        todosLosProductos = todosLosProductos.filter(p => p.id != id);
        currentListForPagination = currentListForPagination.filter(p => p.id != id);
        renderStockTable();
    }

    function openEditModal(id) {
        const producto = todosLosProductos.find(p => p.id == id);
        if (!producto) {
            alert('Error: Producto no encontrado en el inventario local.');
            return;
        }
        document.querySelectorAll('#edit-product-form .error-message').forEach(el => el.textContent = '');
        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';
        editProductId.value = producto.id;
        editNombre.value = producto.nombre;
        editCategoria.value = producto.categoria;
        editDescripcion.value = producto.descripcion;
        
        // Mantenemos toFixed(2) para el INPUT porque el navegador espera formato estándar para editar
        editPrecio.value = producto.precio.toFixed(2);
        
        editStockActual.value = producto.stock; 
        editCantidadAjuste.value = 0; 
        editModal.style.display = 'block';
    }

    async function handleEditSubmit(event) {
        event.preventDefault(); 
        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';
        const id = editProductId.value;
        const ajuste = parseInt(editCantidadAjuste.value) || 0; 
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
        const actualizarDTO = {
            nombre: editNombre.value.trim(),
            categoria: editCategoria.value.trim(),
            descripcion: editDescripcion.value.trim(),
            precio: parseFloat(editPrecio.value),
            cantidadExtraStock: ajuste
        };
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
            editModal.style.display = 'none';
            alert('¡Producto actualizado con éxito!');
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

    searchInput.addEventListener('input', filtrarStock);
    
    tableHeaders.forEach(th => {
        th.addEventListener('click', handleSortClick);
    });

    tableBody.addEventListener('click', (event) => {
        const target = event.target; 
        const deleteButton = target.closest('.btn-delete-producto');
        if (deleteButton) {
            idParaBorrar = deleteButton.dataset.id; 
            deleteModal.style.display = 'block';
        }
        const editButton = target.closest('.btn-edit-producto');
        if (editButton) {
            const id = editButton.dataset.id;
            openEditModal(id);
        }
    });

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
                removerFilaDelDOM(idParaBorrar); 
            } else {
                const errorTexto = await response.text();
                if (response.status === 400 && errorTexto.includes("INACTIVO")) {
                    removerFilaDelDOM(idParaBorrar);
                } else {
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

    editModalCloseBtn.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    editProductForm.addEventListener('submit', handleEditSubmit);

    prevPageBtn.addEventListener('click', async () => {
        if (currentPage > 1) {
            currentPage--;
            await renderStockTable(); 
        }
    });

    nextPageBtn.addEventListener('click', async () => {
        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            await renderStockTable(); 
        }
    });

    // =================================================================
    // --- 8. EJECUCIÓN INICIAL ---
    // =================================================================
    loadStock();

});