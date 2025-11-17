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
    const searchInput = document.getElementById('stock-search-input');
    const tableBody = document.getElementById('stock-table-body');
    
    const mainContent = document.querySelector('.main-content');
    const tableHeaders = document.querySelectorAll('#stock-section .data-table th[data-sort-by]');

    // --- 3. DETECCIÓN DE MODO (EMPLEADO VS ADMIN) ---
    // Intentamos obtener los modales. Si no existen, asumimos modo "Solo Lectura".
    const editModal = document.getElementById('edit-product-modal');
    const deleteModal = document.getElementById('delete-confirm-modal');
    const isReadOnly = !editModal; // Si no hay modal de edición, es solo lectura

    // --- 4. CONSTANTES DEL DOM (ACCIONES) - Solo si NO es solo lectura ---
    let confirmDeleteBtn, cancelDeleteBtn;
    let editModalCloseBtn, editProductForm, editProductId, editNombre, editCategoria, editDescripcion, editPrecio, editStockActual, editCantidadAjuste, editFormGeneralMessage;
    let errorEditNombre, errorEditCategoria, errorEditPrecio, errorEditAjuste;

    if (!isReadOnly) {
        // Modal Borrado
        confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        cancelDeleteBtn = document.getElementById('cancel-delete-btn');

        // Modal Edición
        editModalCloseBtn = document.getElementById('edit-modal-close-btn');
        editProductForm = document.getElementById('edit-product-form');
        editProductId = document.getElementById('edit-product-id');
        editNombre = document.getElementById('edit-nombre');
        editCategoria = document.getElementById('edit-categoria');
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

    // =================================================================
    // --- 6. FUNCIONES DE LÓGICA ---
    // =================================================================

    async function loadStock() {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
        try {
            const response = await fetch(API_STOCK_URL); 
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            todosLosProductos = await response.json();
            filtrarStock(); 
        } catch (error) {
            console.error('Error al cargar el stock:', error);
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="6">Error: ${error.message}</td></tr>`;
        }
    }

    async function renderStockTable() {
        if (!tableBody || !mainContent) return;
        
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
            // Ajustamos el colspan dependiendo de si hay acciones o no
            const colSpan = isReadOnly ? 5 : 6;
            tableBody.innerHTML = `<tr><td colspan="${colSpan}">No se encontraron productos.</td></tr>`;
        } else {
            paginatedItems.forEach(producto => {
                let stockClass = 'good';
                if (producto.stock <= 0) stockClass = 'empty';
                else if (producto.stock <= 5) stockClass = 'low';

                // Lógica para mostrar u ocultar botones
                let accionesHtml = '';
                if (!isReadOnly) {
                    accionesHtml = `
                        <td>
                            <button class="btn-icon btn-edit-producto" data-id="${producto.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon btn-delete-producto" data-id="${producto.id}"><i class="fas fa-trash"></i></button>
                        </td>`;
                }
                // Si es ReadOnly, simplemente no agregamos la columna de acciones

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
        if(!searchInput) return;
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
        filtrarStock();
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
    // --- FUNCIONES DE EDICIÓN/BORRADO (SOLO SI NO ES READ ONLY) ---
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
    }

    function openEditModal(id) {
        if (isReadOnly) return; 
        const producto = todosLosProductos.find(p => p.id == id);
        if (!producto) return;

        document.querySelectorAll('#edit-product-form .error-message').forEach(el => el.textContent = '');
        if(editFormGeneralMessage) {
             editFormGeneralMessage.textContent = '';
             editFormGeneralMessage.className = 'form-message';
        }
        
        editProductId.value = producto.id;
        editNombre.value = producto.nombre;
        editCategoria.value = producto.categoria;
        editDescripcion.value = producto.descripcion;
        // Mantenemos toFixed(2) para el input (necesita formato estándar 1234.56)
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
        
        let isValid = true;
        if (editNombre.value.trim() === "") { errorEditNombre.textContent = 'Campo obligatorio'; isValid = false; }
        if (editCategoria.value.trim() === "") { errorEditCategoria.textContent = 'Campo obligatorio'; isValid = false; }
        if (editPrecio.value <= 0 || isNaN(parseFloat(editPrecio.value))) { errorEditPrecio.textContent = 'Precio inválido'; isValid = false; }
        if (isNaN(ajuste)) { errorEditAjuste.textContent = 'Número inválido'; isValid = false; }
        
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
            console.error('Error al actualizar:', error);
            editFormGeneralMessage.textContent = `Error: ${error.message}`;
            editFormGeneralMessage.classList.add('error');
        }
    }

    // =================================================================
    // --- 7. LISTENERS ---
    // =================================================================

    if (searchInput) searchInput.addEventListener('input', filtrarStock);
    tableHeaders.forEach(th => th.addEventListener('click', handleSortClick));

    if (tableBody) {
        tableBody.addEventListener('click', (event) => {
            if (isReadOnly) return; // Salir si es empleado

            const target = event.target; 
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

    // Handlers de ESC para modales (solo si existen)
    if (!isReadOnly) {
        const handleEditEsc = (e) => { if (e.key === 'Escape' && editModal.style.display === 'block') editModal.style.display = 'none'; };
        const handleDeleteEsc = (e) => { if (e.key === 'Escape' && deleteModal.style.display === 'block') { deleteModal.style.display = 'none'; idParaBorrar = null; }};
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
    // --- 8. EJECUCIÓN INICIAL ---
    // =================================================================
    loadStock();
});