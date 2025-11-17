document.addEventListener('DOMContentLoaded', function() {
    
    // ===============================
    // URLs DE LA API
    // ===============================
    const API_PROVEEDORES_URL = '/api/proveedores';
    const API_PRODUCTOS_URL = '/api/productos/select'; 

    // ===============================
    // ESTADO GLOBAL
    // ===============================
    let allProducts = []; 
    let proveedorActualEditando = null; 
    let currentDeleteProviderId = null;

    // ===============================
    // SELECTORES - TABLA Y PAGINACIÓN
    // ===============================
    const proveedorTabla = document.getElementById('proveedor-tabla');
    const prevPageBtn = document.getElementById('proveedor-prev-page');
    const nextPageBtn = document.getElementById('proveedor-next-page');
    const pageInfo = document.getElementById('proveedor-page-info');

    const nombreError = document.getElementById('errorNombre');
    const telefonoError = document.getElementById('errorTelefono');
    const emailError = document.getElementById('errorEmail');
    const direccionError = document.getElementById('errorDireccion');
    
    const mainContent = document.querySelector('.main-content');
    
    let currentPage = 0;
    let totalPages = 1;
    const itemsPerPage = 10;

    // ===============================
    // ESTADO DE ORDENAMIENTO
    // ===============================
    let sortField = 'nombre'; 
    let sortDirection = 'asc'; 

    // ===============================
    // SELECTORES DE ORDENAMIENTO
    // ===============================
    const tableHeaders = document.querySelectorAll('#proveedores-section .data-table th[data-sort-by]');

    // ===============================
    // SELECTORES - FORMULARIO DE REGISTRO
    // ===============================
    const proveedorForm = document.getElementById('proveedor-form');
    const nombreInput = document.getElementById('proveedorNombre');
    const telefonoInput = document.getElementById('proveedorTelefono');
    const emailInput = document.getElementById('proveedorEmail');
    const direccionInput = document.getElementById('proveedorDireccion');
    const generalMessage = document.getElementById('form-general-message-proveedor');
    
    // Multi-select de Registro
    const registerSelect = {
        container: document.getElementById('productos-multi-select-container'),
        tags: document.getElementById('tags-container'),
        options: document.getElementById('productos-options-container'),
        hiddenSelect: document.getElementById('proveedorProductosSelect'),
        input: document.getElementById('productos-select-input'),
        errorDiv: document.getElementById('proveedorProductosError')
    };

    // ===============================
    // SELECTORES - MODAL DE EDICIÓN
    // ===============================
    const modalOverlay = document.getElementById('modal-edit-proveedor-overlay');
    const modalCloseBtn = document.getElementById('modal-edit-proveedor-close');
    const editForm = document.getElementById('edit-proveedor-form');
    const editIdInput = document.getElementById('editProveedorId');
    const editNombreInput = document.getElementById('editProveedorNombre');
    const editTelefonoInput = document.getElementById('editProveedorTelefono');
    const editEmailInput = document.getElementById('editProveedorEmail');
    const editDireccionInput = document.getElementById('editProveedorDireccion');
    const editGeneralMessage = document.getElementById('form-general-message-edit-proveedor');
    
    // Multi-select de Edición
    const editSelect = {
        container: document.getElementById('edit-productos-multi-select-container'),
        tags: document.getElementById('edit-tags-container'),
        options: document.getElementById('edit-productos-options-container'),
        hiddenSelect: document.getElementById('editProveedorProductosSelect'),
        input: document.getElementById('edit-productos-select-input'),
        errorDiv: document.getElementById('editProveedorProductosError')
    };

    // ===============================
    // SELECTORES - MODAL DE BORRADO
    // ===============================
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteModalMessage = document.getElementById('delete-modal-message');


    // ==========================================================
    // LÓGICA DE CARGA DE DATOS (TABLA Y PAGINACIÓN)
    // ==========================================================

    async function loadProveedores() {
        if (!proveedorTabla || !mainContent) return;

        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        proveedorTabla.classList.add('loading'); 

        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const sortParam = sortField ? `&sort=${sortField},${sortDirection}` : '';
            const url = `${API_PROVEEDORES_URL}?page=${currentPage}&size=${itemsPerPage}${sortParam}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            
            const pageData = await response.json(); 
            totalPages = pageData.totalPages;
            
            renderProveedoresTabla(pageData.content); 
            updatePaginationControls();
            updateSortIndicators(); 

            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                proveedorTabla.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar los proveedores:', error);
            proveedorTabla.innerHTML = `<tr><td colspan="6">Error al cargar proveedores.</td></tr>`;
            proveedorTabla.classList.remove('loading');
        }
    }

    function renderProveedoresTabla(proveedores) {
        proveedorTabla.innerHTML = '';
        if (proveedores.length === 0) {
            proveedorTabla.innerHTML = '<tr><td colspan="6">No hay proveedores registrados.</td></tr>';
            return;
        }

        proveedores.forEach(proveedor => {
            const productosNombres = proveedor.productos && proveedor.productos.length > 0
                ? proveedor.productos.map(p => p.nombreProducto).join(', ') 
                : 'Sin productos asignados';

            const row = `
                <tr>
                    <td>${proveedor.nombre || 'N/A'}</td>
                    <td>${proveedor.email|| 'N/A'}</td>
                    <td>${proveedor.telefono || 'N/A'}</td>
                    <td>${productosNombres}</td>
                    <td>${proveedor.direccion || 'N/A'}</td>
                    <td>
                        <button class="btn-icon btn-edit-proveedor" data-id="${proveedor.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete-proveedor" data-id="${proveedor.id}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            proveedorTabla.innerHTML += row;
        });
    }

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
                loadProveedores();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadProveedores();
            }
        });
    }

    function handleSortClick(event) {
        event.preventDefault();
        event.currentTarget.blur();
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
        loadProveedores();
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

    tableHeaders.forEach(header => {
        header.addEventListener('click', handleSortClick);
    });

    // ==========================================================
    // LÓGICA DEL MULTI-SELECT
    // ==========================================================
    
    async function fetchAllProducts() {
        // Si ya hay datos, los devolvemos, pero la función 'inicializar' y los eventos pueden limpiar este array para forzar recarga
        if (allProducts.length > 0) return allProducts; 
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error('No se pudieron cargar los productos');
            allProducts = await response.json();
            return allProducts;
        } catch (error) {
            console.error("Error fatal al cargar lista de productos:", error);
            return []; 
        }
    }

    function setupMultiSelect(selectUI, productosPreSeleccionados = []) {
        if (!selectUI.options || !selectUI.hiddenSelect || !selectUI.tags) return;

        selectUI.options.innerHTML = '';
        selectUI.hiddenSelect.innerHTML = '';
        selectUI.tags.innerHTML = '';

        const preSeleccionadosSet = new Set(productosPreSeleccionados.map(p => p.idProducto));

        allProducts.forEach(producto => {
            const realOption = document.createElement('option');
            realOption.value = producto.idProducto;
            realOption.textContent = producto.nombreProducto;
            selectUI.hiddenSelect.appendChild(realOption);

            const visualOption = document.createElement('div');
            visualOption.classList.add('option');
            visualOption.textContent = producto.nombreProducto;
            visualOption.dataset.value = producto.idProducto;
            
            visualOption.addEventListener('click', () => {
                seleccionarProducto(visualOption, realOption, selectUI);
            });
            
            selectUI.options.appendChild(visualOption);

            if (preSeleccionadosSet.has(producto.idProducto)) {
                seleccionarProducto(visualOption, realOption, selectUI);
            }
        });
        setupMultiSelectUIEvents(selectUI);
    }

    function seleccionarProducto(visualOption, realOption, selectUI) {
        realOption.selected = true;
        // Agregamos la clase 'selected-option' para saber que está elegido
        visualOption.classList.add('selected-option'); 
        
        crearTag(visualOption.textContent, visualOption.dataset.value, visualOption, realOption, selectUI);
        
        // Lo ocultamos visualmente de la lista
        visualOption.style.display = 'none';
        
        selectUI.options.style.display = 'none';
        selectUI.input.value = '';
        selectUI.input.placeholder = '';
    }

    function crearTag(texto, valor, visualOption, realOption, selectUI) {
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.textContent = texto;

        const closeBtn = document.createElement('span');
        closeBtn.classList.add('tag-close');
        closeBtn.innerHTML = '&times;';
        
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            realOption.selected = false;
            
            // Quitamos la marca de seleccionado
            visualOption.classList.remove('selected-option');
            
            selectUI.tags.removeChild(tag);
            
            // Volvemos a mostrarlo en la lista
            visualOption.style.display = 'block';

            if (selectUI.tags.children.length === 0) {
                selectUI.input.placeholder = 'Buscar y seleccionar productos...';
            }
        });

        tag.appendChild(closeBtn);
        selectUI.tags.appendChild(tag);
    }


    function setupMultiSelectUIEvents(selectUI) {
        if (selectUI.container) {
            selectUI.container.addEventListener('click', () => {
                selectUI.options.style.display = 'block';
                selectUI.input.focus();
            });
        }
        if (selectUI.input) {
            selectUI.input.addEventListener('input', () => {
                const filtro = selectUI.input.value.toLowerCase();
                
                selectUI.options.querySelectorAll('.option').forEach(opcion => {
                    const textoOpcion = opcion.textContent.toLowerCase();
                    const isSelected = opcion.classList.contains('selected-option');

                    // LÓGICA CORREGIDA:
                    // Mostrar SI: (coincide con filtro) Y (NO está seleccionado ya)
                    if (textoOpcion.includes(filtro) && !isSelected) {
                        opcion.style.display = 'block';
                    } else {
                        opcion.style.display = 'none';
                    }
                });
            });
        }
    }
    
    document.addEventListener('click', (e) => {
        if (registerSelect.container && !registerSelect.container.contains(e.target) && !registerSelect.options.contains(e.target)) {
            registerSelect.options.style.display = 'none';
        }
        if (editSelect.container && !editSelect.container.contains(e.target) && !editSelect.options.contains(e.target)) {
            editSelect.options.style.display = 'none';
        }
    });

    // ==========================================================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ==========================================================
    if (proveedorForm) {
        proveedorForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            document.querySelectorAll('#proveedor-form .error-message').forEach(el => el.textContent = '');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';

            let isValid = true;
            const nombre = nombreInput.value.trim();
            const telefono = telefonoInput.value.trim();
            const email = emailInput.value.trim();
            const direccion = direccionInput.value.trim();
            const productosIds = Array.from(registerSelect.hiddenSelect.selectedOptions).map(option => option.value);

            if (!nombre) { nombreError.textContent = 'Debe rellenar este campo'; isValid = false; }
            if (!telefono) { telefonoError.textContent = 'Debe rellenar este campo'; isValid = false; }
            if (!email) { emailError.textContent = 'Debe rellenar este campo'; isValid = false; }
            else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { 
                emailError.textContent = 'El formato del email no es válido';
                isValid = false;
            }
            if (!direccion) { direccionError.textContent = 'Debe rellenar este campo'; isValid = false; }
            if (productosIds.length === 0) {
                 registerSelect.errorDiv.textContent = 'Debes seleccionar al menos un producto.';
                 isValid = false;
            }

            if (!isValid) {
                 generalMessage.textContent = "Debe completar todos los campos obligatorios.";
                 generalMessage.classList.add('error');
                 return;
            }

            const proveedorDTO = { nombre, telefono, email, direccion, productosIds };

            try {
                const response = await fetch(API_PROVEEDORES_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(proveedorDTO)
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Error: ${response.status}`);
                }

                generalMessage.textContent = "¡Proveedor registrado exitosamente!";
                generalMessage.classList.add('success');
                proveedorForm.reset();
                setupMultiSelect(registerSelect, []);
                
                currentPage = 0;
                sortField = 'nombre';
                sortDirection = 'asc';
                loadProveedores();
                
                // --- AVISO CRUCIAL: Informar a Compras.js y otros ---
                document.dispatchEvent(new Event('proveedoresActualizados'));

            } catch (error) {
                console.error('Error al registrar el proveedor:', error);
                generalMessage.textContent = `Error: ${error.message}`;
                generalMessage.classList.add('error');
            }
        });
    }
    
    const handleEditEsc = (e) => { if (e.key === 'Escape') closeEditModal(); };
    const handleDeleteEsc = (e) => { if (e.key === 'Escape') closeDeleteModal(); };

    function openDeleteModal(id, nombre) {
        currentDeleteProviderId = id; 
        deleteModalMessage.textContent = `¿Estás seguro de que quieres eliminar al proveedor "${nombre}"?`;
        if(deleteConfirmModal) {
            deleteConfirmModal.style.display = 'block';
            window.addEventListener('keydown', handleDeleteEsc);
        }
    }

    function closeDeleteModal() {
        currentDeleteProviderId = null;
        if(deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
            window.removeEventListener('keydown', handleDeleteEsc); 
        }
    }

    function openEditModal(data) {
        proveedorActualEditando = data; 
        editIdInput.value = data.id;
        editNombreInput.value = data.nombre;
        editTelefonoInput.value = data.telefono;
        editEmailInput.value = data.email;
        editDireccionInput.value = data.direccion;
        setupMultiSelect(editSelect, data.productos); 
        modalOverlay.style.display = 'block';
        window.addEventListener('keydown', handleEditEsc);
    }

    function closeEditModal() {
        modalOverlay.style.display = 'none';
        window.removeEventListener('keydown', handleEditEsc);
        proveedorActualEditando = null;
        editGeneralMessage.textContent = '';
        editGeneralMessage.className = 'form-message';
    }

    if (proveedorTabla) {
        proveedorTabla.addEventListener('click', async function(e) {
            const editButton = e.target.closest('.btn-edit-proveedor');
            const deleteButton = e.target.closest('.btn-delete-proveedor');

            if (editButton) {
                const id = editButton.dataset.id;
                try {
                    const response = await fetch(`${API_PROVEEDORES_URL}/${id}`);
                    if (!response.ok) throw new Error('No se pudo cargar el proveedor');
                    const data = await response.json();
                    openEditModal(data);
                } catch (error) {
                    console.error('Error al abrir el modal:', error);
                    alert('Error: ' + error.message);
                }
            }

            if (deleteButton) {
                const id = deleteButton.dataset.id;
                const nombre = deleteButton.closest('tr').cells[0].textContent;
                openDeleteModal(id, nombre);
            }
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = editIdInput.value;
            const dto = {
                nombre: editNombreInput.value.trim(),
                telefono: editTelefonoInput.value.trim(),
                email: editEmailInput.value.trim(),
                direccion: editDireccionInput.value.trim(),
                productosAgregar: [],
                productosQuitar: []
            };

            const originalIDs = new Set(proveedorActualEditando.productos.map(p => p.idProducto));
            const newIDs = new Set(
                Array.from(editSelect.hiddenSelect.selectedOptions).map(opt => parseInt(opt.value))
            );

            dto.productosAgregar = [...newIDs].filter(id => !originalIDs.has(id));
            dto.productosQuitar = [...originalIDs].filter(id => !newIDs.has(id));
            
            try {
                const response = await fetch(`${API_PROVEEDORES_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dto)
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Error: ${response.status}`);
                }
                editGeneralMessage.textContent = "Proveedor actualizado con éxito.";
                editGeneralMessage.classList.add('success');
                setTimeout(() => {
                    closeEditModal();
                    loadProveedores(); 
                    // También avisamos al editar
                    document.dispatchEvent(new Event('proveedoresActualizados'));
                }, 1000);

            } catch (error) {
                console.error('Error al actualizar proveedor:', error);
                editGeneralMessage.textContent = `Error: ${error.message}`;
                editGeneralMessage.classList.add('error');
            }
        });
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeEditModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeEditModal(); });
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    if (deleteConfirmModal) deleteConfirmModal.addEventListener('click', (e) => { if (e.target === deleteConfirmModal) closeDeleteModal(); });

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!currentDeleteProviderId) return;
            try {
                const response = await fetch(`${API_PROVEEDORES_URL}/${currentDeleteProviderId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'No se pudo eliminar el proveedor');
                }
                loadProveedores(); 
                // También avisamos al eliminar
                document.dispatchEvent(new Event('proveedoresActualizados'));
            } catch (error) {
                alert('Error al eliminar: ' + error.message);
            } finally {
                closeDeleteModal(); 
            }
        });
    }

    // ==========================================================
    // CARGA INICIAL Y EXPOSICIÓN
    // ==========================================================
    
    async function inicializar() {
        await fetchAllProducts();
        setupMultiSelect(registerSelect, []); 
        loadProveedores(); 
    }
    inicializar();

    window.cargarDatosProveedores = async function() {
        allProducts = []; // Limpiar cache de productos
        await fetchAllProducts();
        setupMultiSelect(registerSelect, []);
        currentPage = 0;
        loadProveedores(); 
    };

    // Escuchar si se agregan productos para actualizar el multi-select
    document.addEventListener('productosActualizados', async function() {
        console.log('Proveedor.js: Detectada actualización de productos. Recargando lista...');
        allProducts = []; 
        await fetchAllProducts();
        setupMultiSelect(registerSelect, []);
    });
});