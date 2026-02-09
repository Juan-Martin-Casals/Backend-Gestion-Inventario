document.addEventListener('DOMContentLoaded', function () {

    // --- 1. CONSTANTES DE API ---
    const API_STOCK_URL = '/api/stock/productos';
    const API_STOCK_EDIT_URL = '/api/stock/';
    const API_PRODUCTOS_DELETE_URL = '/api/productos/';

    // --- CONFIGURACIÓN DE FORMATO ---
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    // --- 2. CONSTANTES DEL DOM (PÁGINA PRINCIPAL) ---
    // La subsección "Gestión Stock" dentro de Productos usa 'product-search-input'
    // La sección independiente Stock usa 'stock-search-input'
    const searchInput = document.getElementById('product-search-input') || document.getElementById('stock-search-input');
    const tableBody = document.getElementById('stock-table-body') || document.getElementById('product-table-body');

    // Constantes para búsqueda de categorías en modal de edición
    const editCategoriaSearchInput = document.getElementById('edit-categoria-search');
    const editCategoriaHiddenInput = document.getElementById('edit-categoria-id-hidden');
    const editCategoriaResultsContainer = document.getElementById('edit-categoria-results');
    const btnAddCategoriaEdit = document.getElementById('btn-add-categoria-edit');

    const mainContent = document.querySelector('.main-content');
    const tableHeaders = document.querySelectorAll('#stock-section .data-table th[data-sort-by]');

    // Selectores para las tarjetas de Resumen (Dashboard)
    const countTotalProductos = document.getElementById('total-productos-count');
    const countProductosAgotados = document.getElementById('productos-agotados-count');
    const countStockBajo = document.getElementById('stock-bajo-count');

    // --- 3. DETECCIÓN DE MODO (EMPLEADO VS ADMIN) ---
    const editModal = document.getElementById('edit-product-modal');
    const deleteModal = document.getElementById('delete-confirm-modal');
    const isReadOnly = !editModal;

    // --- 4. CONSTANTES DEL DOM (ACCIONES) ---
    let confirmDeleteBtn, cancelDeleteBtn;
    let editModalCloseBtn, editProductForm, editProductId, editNombre, editDescripcion, editPrecio, editStockActual, editCantidadAjuste, editFormGeneralMessage;
    let errorEditNombre, errorEditCategoria, errorEditPrecio, errorEditAjuste;

    if (!isReadOnly) {
        confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        cancelDeleteBtn = document.getElementById('cancel-delete-btn');

        editModalCloseBtn = document.getElementById('edit-modal-close-btn');
        editProductForm = document.getElementById('edit-product-form');
        editProductId = document.getElementById('edit-product-id');
        editNombre = document.getElementById('edit-nombre');
        editDescripcion = document.getElementById('edit-descripcion');
        editPrecio = document.getElementById('edit-precio');
        editStockActual = document.getElementById('edit-stock-actual');
        editCantidadAjuste = document.getElementById('edit-cantidad-ajuste');
        editFormGeneralMessage = document.getElementById('edit-form-general-message');

        errorEditNombre = document.getElementById('error-edit-nombre');
        errorEditCategoria = document.getElementById('error-edit-categoria');
        errorEditPrecio = document.getElementById('error-edit-precio');
        errorEditAjuste = document.getElementById('error-edit-ajuste');
    }

    // Constantes de paginación
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    // --- 5. VARIABLES DE ESTADO ---
    let todosLosProductos = [];
    let idParaBorrar = null;
    let currentPage = 1;
    const itemsPerPage = 7;
    let currentListForPagination = [];
    let sortField = 'stock';
    let sortDirection = 'asc';

    // Estado de categorías para el modal de edición
    let todasLasCategoriasEdicion = [];

    // =================================================================
    // --- 6. FUNCIONES DE LÓGICA ---
    // =================================================================

    async function loadStock() {
        if (tableBody)
            try {
                const response = await fetch(API_STOCK_URL);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

                // Guardamos todos los datos
                todosLosProductos = await response.json();

                // 1. Calcular resumen localmente (sin llamar a otra API)
                actualizarResumenDashboard(todosLosProductos);

                // 2. Filtrar y mostrar tabla
                filtrarStock();

            } catch (error) {
                console.error('Error al cargar el stock:', error);
                if (tableBody) tableBody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
            }
    }

    function actualizarResumenDashboard(productos) {
        if (!productos) return;

        const total = productos.length;
        const agotados = productos.filter(p => p.stock <= 0).length;
        const bajoStock = productos.filter(p => p.stock > 0 && p.stock <= 5).length;

        if (countTotalProductos) countTotalProductos.textContent = total;
        if (countProductosAgotados) countProductosAgotados.textContent = agotados;
        if (countStockBajo) countStockBajo.textContent = bajoStock;
    }

    async function renderStockTable() {
        if (!tableBody || !mainContent) {
            return;
        }

        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        tableBody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));
        tableBody.innerHTML = '';

        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = currentListForPagination.slice(startIndex, endIndex);

        if (paginatedItems.length === 0) {
            const colSpan = isReadOnly ? 5 : 6;
            tableBody.innerHTML = `<tr><td colspan="${colSpan}">No se encontraron productos.</td></tr>`;
        } else {
            paginatedItems.forEach(producto => {
                let stockClass = 'good';
                if (producto.stock <= 0) stockClass = 'empty';
                else if (producto.stock <= 5) stockClass = 'low';

                let accionesHtml = '';
                if (!isReadOnly) {
                    accionesHtml = `
                        <td>
                            <button class="btn-icon btn-edit-producto" data-id="${producto.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon btn-delete-producto" data-id="${producto.id}"><i class="fas fa-trash"></i></button>
                        </td>`;
                }

                const row = `
                    <tr>
                        <td>${producto.nombre}</td>
                        <td>${producto.categoria}</td>
                        <td>${producto.descripcion}</td>
                        <td>$${formatoMoneda.format(producto.precio)}</td>
                        <td><span class="stock-badge ${stockClass}">${producto.stock}</span></td>
                        ${accionesHtml} 
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        }

        if (pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages || 1}`;
        if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
        if (nextPageBtn) nextPageBtn.disabled = (currentPage === totalPages || totalPages === 0);

        updateSortIndicators();

        requestAnimationFrame(() => {
            const isSearchActive = (document.activeElement === searchInput);
            if (!isSearchActive) mainContent.focus();
            window.scrollTo(0, scrollPosition);
            tableBody.classList.remove('loading');
        });
    }

    function filtrarStock() {
        // Validar que tengamos datos cargados
        if (todosLosProductos.length === 0) {
            currentListForPagination = [];
            currentPage = 1;
            renderStockTable();
            return;
        }

        if (!searchInput || !searchInput.value.trim()) {
            currentListForPagination = todosLosProductos;
        } else {
            const textoBusqueda = searchInput.value.toLowerCase().trim();
            currentListForPagination = todosLosProductos.filter(producto => {
                // Buscar en nombre, categoría y descripción
                return producto.nombre.toLowerCase().includes(textoBusqueda) ||
                    producto.categoria.toLowerCase().includes(textoBusqueda) ||
                    producto.descripcion.toLowerCase().includes(textoBusqueda);
            });
        }
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
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
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
        filtrarStock(); // Reordenar y renderizar
    }

    function updateSortIndicators() {
        tableHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'sort-icon fas fa-sort';

            if (th.getAttribute('data-sort-by') === sortField) {
                th.classList.add(`sort-${sortDirection}`);
                if (icon) icon.className = `sort-icon fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });
    }

    // =================================================================
    // --- FUNCIONES DE CATEGORÍAS PARA EDICIÓN ---
    // =================================================================

    const API_CATEGORIAS_URL = '/api/categorias';

    async function loadCategoriasParaEdicion() {
        if (!editCategoriaSearchInput) return;
        try {
            const response = await fetch(`${API_CATEGORIAS_URL}/select`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            todasLasCategoriasEdicion = await response.json();
        } catch (error) {
            console.error(error);
            if (editCategoriaSearchInput) {
                editCategoriaSearchInput.placeholder = "Error al cargar categorías";
            }
        }
    }

    function filtrarCategoriasEdicion() {
        if (!editCategoriaSearchInput || !editCategoriaResultsContainer) return;
        const query = editCategoriaSearchInput.value.toLowerCase();
        const categoriasFiltradas = todasLasCategoriasEdicion.filter(c =>
            c.nombre.toLowerCase().includes(query)
        );
        renderResultadosCategoriasEdicion(categoriasFiltradas);
    }

    function renderResultadosCategoriasEdicion(categorias) {
        if (!editCategoriaResultsContainer) return;
        if (categorias.length === 0) {
            editCategoriaResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron categorías</div>';
        } else {
            editCategoriaResultsContainer.innerHTML = categorias.map(c =>
                `<div class="product-result-item" data-id="${c.id}">${c.nombre}</div>`
            ).join('');
        }
        editCategoriaResultsContainer.style.display = 'block';
    }

    function seleccionarCategoriaEdicion(event) {
        if (!editCategoriaSearchInput || !editCategoriaHiddenInput || !editCategoriaResultsContainer) return;
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const categoriaId = parseInt(target.dataset.id, 10);
        const categoria = todasLasCategoriasEdicion.find(c => c.id === categoriaId);

        if (categoria) {
            editCategoriaSearchInput.value = categoria.nombre;
            editCategoriaHiddenInput.value = categoria.id;
            editCategoriaResultsContainer.style.display = 'none';
            if (errorEditCategoria) errorEditCategoria.textContent = '';
        }
    }

    // =================================================================
    // --- FUNCIONES DE EDICIÓN/BORRADO ---
    // =================================================================

    function removerFilaDelDOM(id) {
        const botonParaBorrar = tableBody.querySelector(`.btn-delete-producto[data-id="${id}"]`);
        if (botonParaBorrar) {
            const fila = botonParaBorrar.closest('tr');
            if (fila) fila.remove();
        }
        todosLosProductos = todosLosProductos.filter(p => p.id != id);
        currentListForPagination = currentListForPagination.filter(p => p.id != id);
        renderStockTable();
        // Actualizamos resumen al borrar
        actualizarResumenDashboard(todosLosProductos);
    }

    function openEditModal(id) {
        if (isReadOnly) return;
        const producto = todosLosProductos.find(p => p.id == id);
        if (!producto) return;

        document.querySelectorAll('#edit-product-form .error-message').forEach(el => el.textContent = '');
        if (editFormGeneralMessage) {
            editFormGeneralMessage.textContent = '';
            editFormGeneralMessage.className = 'form-message';
        }

        editProductId.value = producto.id;
        editNombre.value = producto.nombre;

        // Configurar categoría con búsqueda autocompletable
        if (editCategoriaSearchInput && editCategoriaHiddenInput) {
            editCategoriaSearchInput.value = producto.categoria;
            editCategoriaHiddenInput.value = producto.idCategoria || '';
        }

        editDescripcion.value = producto.descripcion;
        editPrecio.value = producto.precio.toFixed(2);
        editStockActual.value = producto.stock;
        editCantidadAjuste.value = 0;

        if (editModal) editModal.style.display = 'block';
    }

    async function handleEditSubmit(event) {
        event.preventDefault();
        if (isReadOnly) return;

        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';

        const id = editProductId.value;
        const ajuste = parseInt(editCantidadAjuste.value) || 0;

        // Validación de categoría
        const idCategoria = editCategoriaHiddenInput ? parseInt(editCategoriaHiddenInput.value, 10) : null;

        let isValid = true;
        if (editNombre.value.trim() === "") { errorEditNombre.textContent = 'Campo obligatorio'; isValid = false; }
        if (!idCategoria) { errorEditCategoria.textContent = 'Debe seleccionar una categoría'; isValid = false; }
        if (parseFloat(editPrecio.value) < 0 || isNaN(parseFloat(editPrecio.value)) || editPrecio.value.trim() === "") { errorEditPrecio.textContent = 'Precio inválido'; isValid = false; }
        if (isNaN(ajuste)) { errorEditAjuste.textContent = 'Número inválido'; isValid = false; }

        if (!isValid) return;

        const actualizarDTO = {
            nombre: editNombre.value.trim(),
            idCategoria: idCategoria,
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

            // Recargamos todo para ver los cambios reflejados
            loadStock();
            document.dispatchEvent(new Event('productosActualizados')); // Avisar a otros módulos

        } catch (error) {
            console.error('Error al actualizar:', error);
            editFormGeneralMessage.textContent = `Error: ${error.message}`;
            editFormGeneralMessage.classList.add('error');
        }
    }

    // =================================================================
    // --- 7. LISTENERS ---
    // =================================================================

    if (searchInput) {
        searchInput.addEventListener('input', filtrarStock);
    }
    tableHeaders.forEach(th => th.addEventListener('click', handleSortClick));

    // Listeners para búsqueda de categorías en modal de edición
    if (editCategoriaSearchInput) {
        editCategoriaSearchInput.addEventListener('input', filtrarCategoriasEdicion);
        editCategoriaSearchInput.addEventListener('focus', filtrarCategoriasEdicion);
    }

    if (editCategoriaResultsContainer) {
        editCategoriaResultsContainer.addEventListener('click', seleccionarCategoriaEdicion);
    }

    if (btnAddCategoriaEdit) {
        btnAddCategoriaEdit.addEventListener('click', function () {
            // Abrir el modal de crear categoría existente
            const addCategoriaModal = document.getElementById('modal-add-categoria-overlay');
            if (addCategoriaModal) {
                addCategoriaModal.style.display = 'flex';
                const addCategoriaNombre = document.getElementById('addCategoriaNombre');
                if (addCategoriaNombre) addCategoriaNombre.focus();
            }
        });
    }

    // Ocultar resultados al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (editCategoriaSearchInput && editCategoriaResultsContainer) {
            if (!editCategoriaSearchInput.contains(e.target) && !editCategoriaResultsContainer.contains(e.target)) {
                editCategoriaResultsContainer.style.display = 'none';
            }
        }
    });

    if (tableBody) {
        tableBody.addEventListener('click', (event) => {
            if (isReadOnly) return;

            const target = event.target;
            // Usamos .closest para atrapar clicks en el ícono <i> o en el botón
            const deleteButton = target.closest('.btn-delete-producto');
            if (deleteButton && deleteModal) {
                idParaBorrar = deleteButton.dataset.id;
                deleteModal.style.display = 'block';
            }
            const editButton = target.closest('.btn-edit-producto');
            if (editButton && editModal) {
                openEditModal(editButton.dataset.id);
            }
        });
    }

    if (!isReadOnly) {
        const handleEditEsc = (e) => { if (e.key === 'Escape' && editModal.style.display === 'block') editModal.style.display = 'none'; };
        const handleDeleteEsc = (e) => { if (e.key === 'Escape' && deleteModal.style.display === 'block') { deleteModal.style.display = 'none'; idParaBorrar = null; } };
        window.addEventListener('keydown', handleEditEsc);
        window.addEventListener('keydown', handleDeleteEsc);

        if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => { deleteModal.style.display = 'none'; idParaBorrar = null; });
        if (editModalCloseBtn) editModalCloseBtn.addEventListener('click', () => { editModal.style.display = 'none'; });
        if (editProductForm) editProductForm.addEventListener('submit', handleEditSubmit);

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                if (!idParaBorrar) return;
                try {
                    const response = await fetch(API_PRODUCTOS_DELETE_URL + idParaBorrar, { method: 'DELETE' });
                    if (response.ok) {
                        removerFilaDelDOM(idParaBorrar);
                        document.dispatchEvent(new Event('productosActualizados'));
                    } else {
                        const errorTexto = await response.text();
                        // Manejo especial para "Soft Delete" si el backend responde 400 pero lo desactiva
                        if (response.status === 400 && errorTexto.includes("INACTIVO")) {
                            removerFilaDelDOM(idParaBorrar);
                        } else {
                            throw new Error(errorTexto || `Error HTTP: ${response.status}`);
                        }
                    }
                } catch (error) {
                    console.error('Error al eliminar:', error.message);
                    if (!error.message.includes("INACTIVO")) alert(`Error: ${error.message}`);
                } finally {
                    deleteModal.style.display = 'none';
                    idParaBorrar = null;
                }
            });
        }
    }

    if (prevPageBtn) prevPageBtn.addEventListener('click', async () => { if (currentPage > 1) { currentPage--; await renderStockTable(); } });
    if (nextPageBtn) nextPageBtn.addEventListener('click', async () => {
        const totalPages = Math.ceil(currentListForPagination.length / itemsPerPage);
        if (currentPage < totalPages) { currentPage++; await renderStockTable(); }
    });

    // =================================================================
    // --- 8. CARGA INICIAL Y EVENTOS GLOBALES ---
    // =================================================================

    loadStock();
    loadCategoriasParaEdicion();

    // EXPOSICIÓN GLOBAL: Para que admin.js pueda llamar a esta función
    window.cargarDatosStock = function () {
        todosLosProductos = []; // Forzamos vaciar para recargar de la API
        loadStock();
    };

    // ESCUCHA DE EVENTOS: Para recargar si se crea/edita producto en otra pestaña
    document.addEventListener('productosActualizados', function () {
        console.log('Stock.js: Detectado cambio en inventario. Recargando...');
        todosLosProductos = [];
        loadStock();
    });
});