document.addEventListener('DOMContentLoaded', function () {

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
    let todosLosProveedores = [];

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

    // ===============================
    // VARIABLES DE BÚSQUEDA
    // ===============================
    const searchInput = document.getElementById('proveedor-search-input');
    const clearSearchBtn = document.getElementById('proveedor-clear-search');
    let proveedoresFiltrados = null; // Para guardar resultados filtrados
    let searchCurrentPage = 0; // Página actual en búsqueda
    let searchTotalPages = 1; // Total de páginas en búsqueda

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
    // SELECTORES - MODAL DE DETALLES
    // ===============================
    const detailModal = document.getElementById('modal-detail-proveedor-overlay');
    const detailCloseBtn = document.getElementById('modal-detail-proveedor-close');
    const detailCloseBtnFooter = document.getElementById('modal-detail-proveedor-close-btn');

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
            // Primero, cargar TODOS los proveedores para búsqueda global (sin paginación)
            const allUrl = `${API_PROVEEDORES_URL}?page=0&size=9999`;
            const allResponse = await fetch(allUrl);
            if (allResponse.ok) {
                const allData = await allResponse.json();
                todosLosProveedores = allData.content;
            }

            // Luego, cargar la página actual para mostrar
            const sortParam = sortField ? `&sort=${sortField},${sortDirection}` : '';
            const url = `${API_PROVEEDORES_URL}?page=${currentPage}&size=${itemsPerPage}${sortParam}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

            const data = await response.json();
            currentPage = data.number;
            totalPages = data.totalPages;

            // Reaplicar búsqueda si existe
            if (searchInput && searchInput.value.trim() !== '') {
                filtrarProveedores();
            } else {
                renderProveedoresTabla(data.content);
            }

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

        const MAX_PRODUCTOS_TABLA = 3;

        proveedores.forEach(proveedor => {
            // Truncar lista de productos si hay más de MAX_PRODUCTOS_TABLA
            let productosDisplay = 'Sin productos asignados';

            if (proveedor.productos && proveedor.productos.length > 0) {
                // Función para truncar nombres largos
                const truncarNombre = (nombre, maxLength = 50) => {
                    if (nombre.length > maxLength) {
                        return nombre.substring(0, maxLength) + '...';
                    }
                    return nombre;
                };

                const nombresProductos = proveedor.productos.map(p => truncarNombre(p.nombreProducto));

                if (nombresProductos.length <= MAX_PRODUCTOS_TABLA) {
                    productosDisplay = nombresProductos.join(', ');
                } else {
                    const primeros = nombresProductos.slice(0, MAX_PRODUCTOS_TABLA).join(', ');
                    const restantes = nombresProductos.length - MAX_PRODUCTOS_TABLA;
                    productosDisplay = `${primeros} <span style="color: #666; font-style: italic;">y ${restantes} más...</span>`;
                }
            }

            const row = `
                <tr>
                    <td>${proveedor.nombre || 'N/A'}</td>
                    <td>${proveedor.email || 'N/A'}</td>
                    <td>${proveedor.telefono || 'N/A'}</td>
                    <td>${productosDisplay}</td>
                    <td>${proveedor.direccion || 'N/A'}</td>
                    <td>
                        <button class="btn-icon btn-view-proveedor" data-id="${proveedor.id}" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
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

        // Resetear estilos que pueden haber sido aplicados durante búsqueda
        prevPageBtn.style.opacity = '';
        prevPageBtn.style.cursor = '';
        nextPageBtn.style.opacity = '';
        nextPageBtn.style.cursor = '';
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            // Si hay búsqueda activa, usar paginación de búsqueda
            if (proveedoresFiltrados) {
                if (searchCurrentPage > 0) {
                    filtrarProveedores(searchCurrentPage - 1);
                }
            } else {
                // Si no hay búsqueda, paginación normal
                if (currentPage > 0) {
                    currentPage--;
                    loadProveedores();
                }
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            // Si hay búsqueda activa, usar paginación de búsqueda
            if (proveedoresFiltrados) {
                if (searchCurrentPage < searchTotalPages - 1) {
                    filtrarProveedores(searchCurrentPage + 1);
                }
            } else {
                // Si no hay búsqueda, paginación normal
                if (currentPage + 1 < totalPages) {
                    currentPage++;
                    loadProveedores();
                }
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
        // Selectores de error
        const nombreError = document.getElementById('errorNombre');
        const telefonoError = document.getElementById('errorTelefono');
        const emailError = document.getElementById('errorEmail');
        const direccionError = document.getElementById('errorDireccion');

        // Validación en tiempo real para nombre duplicado
        let nombreTimeout;
        if (nombreInput && nombreError) {
            nombreInput.addEventListener('blur', async function () {
                const nombre = nombreInput.value.trim();
                if (nombre) {
                    clearTimeout(nombreTimeout);
                    nombreTimeout = setTimeout(async () => {
                        try {
                            const response = await fetch(`${API_PROVEEDORES_URL}/existe/nombre/${encodeURIComponent(nombre)}`);
                            const existe = await response.json();
                            if (existe) {
                                nombreError.textContent = 'Ya existe un proveedor con ese nombre';
                            } else {
                                nombreError.textContent = '';
                            }
                        } catch (error) {
                            console.error('Error al verificar nombre:', error);
                        }
                    }, 500);
                } else {
                    nombreError.textContent = '';
                }
            });
        }

        // Validación en tiempo real para email duplicado
        let emailTimeout;
        if (emailInput && emailError) {
            emailInput.addEventListener('blur', async function () {
                const email = emailInput.value.trim();
                if (email) {
                    clearTimeout(emailTimeout);
                    emailTimeout = setTimeout(async () => {
                        try {
                            const response = await fetch(`${API_PROVEEDORES_URL}/existe/email/${encodeURIComponent(email)}`);
                            const existe = await response.json();
                            if (existe) {
                                emailError.textContent = 'Ya existe un proveedor con ese email';
                            } else {
                                emailError.textContent = '';
                            }
                        } catch (error) {
                            console.error('Error al verificar email:', error);
                        }
                    }, 500);
                } else {
                    emailError.textContent = '';
                }
            });
        }

        proveedorForm.addEventListener('submit', async function (event) {
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

            if (!nombre) { nombreError.textContent = 'El nombre del proveedor es obligatorio'; isValid = false; }
            if (!telefono) { telefonoError.textContent = 'El telefono del proveedor es obligatorio'; isValid = false; }
            if (!email) { emailError.textContent = 'El email del proveedor es obligatorio'; isValid = false; }
            else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                emailError.textContent = 'El formato del email no es válido';
                isValid = false;
            }
            if (!direccion) { direccionError.textContent = 'La direccion del proveedor es obligatoria'; isValid = false; }
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

                // Ocultar mensaje después de 4 segundos
                setTimeout(() => {
                    generalMessage.textContent = '';
                    generalMessage.classList.remove('success');
                }, 4000);

                proveedorForm.reset();
                setupMultiSelect(registerSelect, []);

                currentPage = 0;
                sortField = 'nombre';
                sortDirection = 'asc';
                loadProveedores();

                // Mantener en la subsección actual (Registrar Proveedor)
                // showSubsection('proveedores-list'); // Comentado para no cambiar de vista

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
        if (deleteConfirmModal) {
            deleteConfirmModal.style.display = 'block';
            window.addEventListener('keydown', handleDeleteEsc);
        }
    }

    function closeDeleteModal() {
        currentDeleteProviderId = null;
        if (deleteConfirmModal) {
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

        // Limpiar todos los mensajes de error
        document.querySelectorAll('#edit-proveedor-form .error-message').forEach(el => el.textContent = '');
        editGeneralMessage.textContent = '';
        editGeneralMessage.className = 'form-message';
    }

    // ==========================================================
    // FUNCIONES DEL MODAL DE DETALLES
    // ==========================================================
    const handleDetailEsc = (e) => { if (e.key === 'Escape') closeDetailModal(); };

    async function openDetailModal(id) {
        try {
            const response = await fetch(`${API_PROVEEDORES_URL}/${id}`);
            if (!response.ok) throw new Error('Error al cargar proveedor');
            const proveedor = await response.json();

            // Llenar información general
            document.getElementById('detail-proveedor-nombre').textContent = proveedor.nombre || 'N/A';
            document.getElementById('detail-proveedor-email').textContent = proveedor.email || 'N/A';
            document.getElementById('detail-proveedor-telefono').textContent = proveedor.telefono || 'N/A';
            document.getElementById('detail-proveedor-direccion').textContent = proveedor.direccion
            // Mostrar productos como tags ordenados alfabéticamente
            const productosContainer = document.getElementById('detail-proveedor-productos');
            if (proveedor.productos && proveedor.productos.length > 0) {
                // Ordenar productos alfabéticamente por nombre
                const productosOrdenados = proveedor.productos
                    .map(p => p.nombreProducto)
                    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

                productosContainer.innerHTML = productosOrdenados
                    .map(nombre => `<span class="product-tag" style="background: #007bff; color: white; padding: 4px 10px; border-radius: 15px; font-size: 14px; margin: 4px; display: inline-block; font-weight: 500;">${nombre}</span>`)
                    .join('');
            } else {
                productosContainer.innerHTML = '<p style="color: #666; margin: 0;">Sin productos asignados</p>';
            }

            detailModal.style.display = 'flex';
            window.addEventListener('keydown', handleDetailEsc);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al cargar detalles del proveedor');
        }
    }

    function closeDetailModal() {
        if (detailModal) {
            detailModal.style.display = 'none';
            window.removeEventListener('keydown', handleDetailEsc);
        }
    }

    // Event listeners para modal de detalles
    if (detailCloseBtn) detailCloseBtn.addEventListener('click', closeDetailModal);
    if (detailCloseBtnFooter) detailCloseBtnFooter.addEventListener('click', closeDetailModal);
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) closeDetailModal();
        });
    }

    // ==========================================================
    // EVENT LISTENERS DE LA TABLA
    // ==========================================================

    if (proveedorTabla) {
        proveedorTabla.addEventListener('click', async function (e) {
            const viewButton = e.target.closest('.btn-view-proveedor');
            const editButton = e.target.closest('.btn-edit-proveedor');
            const deleteButton = e.target.closest('.btn-delete-proveedor');

            // Botón Ver Detalles
            if (viewButton) {
                const id = viewButton.dataset.id;
                openDetailModal(id);
            }

            // Botón Editar
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

            // Botón Eliminar
            if (deleteButton) {
                const id = deleteButton.dataset.id;
                const nombre = deleteButton.closest('tr').cells[0].textContent;
                openDeleteModal(id, nombre);
            }
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. Limpiar mensajes de error previos
            document.querySelectorAll('#edit-proveedor-form .error-message').forEach(el => el.textContent = '');
            editGeneralMessage.textContent = '';
            editGeneralMessage.className = 'form-message';

            // 2. Obtener valores
            const id = editIdInput.value;
            const nombre = editNombreInput.value.trim();
            const telefono = editTelefonoInput.value.trim();
            const email = editEmailInput.value.trim();
            const direccion = editDireccionInput.value.trim();
            const productosSeleccionados = Array.from(editSelect.hiddenSelect.selectedOptions);

            // 3. Validar campos
            let isValid = true;

            if (!nombre) {
                document.getElementById('errorEditNombre').textContent = 'El nombre es obligatorio';
                isValid = false;
            }

            if (!telefono) {
                document.getElementById('errorEditTelefono').textContent = 'El teléfono es obligatorio';
                isValid = false;
            }

            if (!email) {
                document.getElementById('errorEditEmail').textContent = 'El email es obligatorio';
                isValid = false;
            } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                document.getElementById('errorEditEmail').textContent = 'El formato del email no es válido';
                isValid = false;
            }

            if (!direccion) {
                document.getElementById('errorEditDireccion').textContent = 'La dirección es obligatoria';
                isValid = false;
            }

            if (productosSeleccionados.length === 0) {
                editSelect.errorDiv.textContent = 'Debes seleccionar al menos un producto';
                isValid = false;
            }

            if (!isValid) {
                editGeneralMessage.textContent = 'Por favor, completa todos los campos correctamente';
                editGeneralMessage.classList.add('error');
                return;
            }

            // 4. Construir DTO
            const dto = {
                nombre: nombre,
                telefono: telefono,
                email: email,
                direccion: direccion,
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
    // FUNCIÓN DE BÚSQUEDA/FILTRADO
    // ==========================================================
    let searchTimeout;

    async function filtrarProveedores(page = 0) {
        if (!searchInput) {
            loadProveedores();
            return;
        }

        const query = searchInput.value.trim().toLowerCase();

        if (query === '') {
            proveedoresFiltrados = null;
            searchCurrentPage = 0;
            loadProveedores();
            return;
        }

        // Añadir animación de loading
        if (proveedorTabla) {
            proveedorTabla.classList.add('loading');
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Filtrar solo cuando es búsqueda nueva (page === 0)
        if (page === 0 || !proveedoresFiltrados) {
            proveedoresFiltrados = todosLosProveedores.filter(proveedor => {
                if (proveedor.nombre?.toLowerCase().includes(query)) return true;
                if (proveedor.email?.toLowerCase().includes(query)) return true;
                if (proveedor.telefono?.toLowerCase().includes(query)) return true;
                if (proveedor.productos && proveedor.productos.some(p =>
                    p.nombreProducto?.toLowerCase().includes(query)
                )) return true;
                return false;
            });
        }

        // Calcular paginación
        searchCurrentPage = page;
        searchTotalPages = Math.ceil(proveedoresFiltrados.length / itemsPerPage);

        // Obtener items de la página actual
        const startIndex = searchCurrentPage * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedResults = proveedoresFiltrados.slice(startIndex, endIndex);

        renderProveedoresTabla(paginatedResults);
        updateSearchPaginationControls();

        if (proveedorTabla) {
            proveedorTabla.classList.remove('loading');
        }
    }

    function updateSearchPaginationControls() {
        if (pageInfo) {
            pageInfo.textContent = `Página ${searchCurrentPage + 1} de ${searchTotalPages}`;
        }

        if (prevPageBtn) {
            prevPageBtn.disabled = searchCurrentPage === 0;
            prevPageBtn.style.opacity = searchCurrentPage === 0 ? '0.5' : '1';
        }

        if (nextPageBtn) {
            nextPageBtn.disabled = searchCurrentPage >= searchTotalPages - 1;
            nextPageBtn.style.opacity = searchCurrentPage >= searchTotalPages - 1 ? '0.5' : '1';
        }
    }

    // ==========================================================
    // EVENT LISTENERS DE BÚSQUEDA
    // ==========================================================
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            filtrarProveedores(0); // Siempre empezar desde página 0 en nueva búsqueda
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', async () => {
            // Añadir animación de loading
            if (proveedorTabla) {
                proveedorTabla.classList.add('loading');
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            searchInput.value = '';
            proveedoresFiltrados = null;

            // Recargar la página actual con paginación
            loadProveedores();
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

    window.cargarDatosProveedores = async function () {
        allProducts = []; // Limpiar cache de productos
        await fetchAllProducts();
        setupMultiSelect(registerSelect, []);
        currentPage = 0;
        loadProveedores();
    };

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores
        subsectionContainers.forEach(container => {
            // Solo ocultar los que son hijos directos de la sección de proveedores o genéricos si se comparten clases
            // Para evitar conflictos, mejor filtramos por ID si es posible, o asumimos que la clase es única por vista activa
            // Dado que admin.js oculta las secciones principales (spa-section), aquí solo nos preocupamos por los contenedores internos
            if (container.id.startsWith('proveedores-')) {
                container.style.display = 'none';
            }
        });

        // 2. Mostrar contenedor seleccionado
        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
    }

    // Exponer globalmente
    window.showProveedorSubsection = showSubsection;

    // ==========================================================
    // LIMPIAR FORMULARIO DE PROVEEDOR
    // ==========================================================

    const btnLimpiarProveedor = document.getElementById('btn-limpiar-proveedor');

    function limpiarFormularioProveedor() {
        // Limpiar campos de texto
        if (nombreInput) nombreInput.value = '';
        if (telefonoInput) telefonoInput.value = '';
        if (emailInput) emailInput.value = '';
        if (direccionInput) direccionInput.value = '';

        // Limpiar multi-select
        setupMultiSelect(registerSelect, []);

        // Limpiar mensajes de error
        if (nombreError) nombreError.textContent = '';
        if (telefonoError) telefonoError.textContent = '';
        if (emailError) emailError.textContent = '';
        if (direccionError) direccionError.textContent = '';
        if (registerSelect.errorDiv) registerSelect.errorDiv.textContent = '';
        if (generalMessage) {
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';
        }
    }

    // Event listener para el botón de limpiar
    if (btnLimpiarProveedor) {
        btnLimpiarProveedor.addEventListener('click', limpiarFormularioProveedor);
    }

    // Escuchar si se agregan productos para actualizar el multi-select
    document.addEventListener('productosActualizados', async function () {
        console.log('Proveedor.js: Detectada actualización de productos. Recargando lista...');
        allProducts = [];
        await fetchAllProducts();
        setupMultiSelect(registerSelect, []);
    });
});