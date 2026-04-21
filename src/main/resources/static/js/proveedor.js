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
    const itemsPerPage = 7;

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
    const cuitInput = document.getElementById('proveedorCuit');
    const generalMessage = document.getElementById('form-general-message-proveedor');



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
    const editCuitInput = document.getElementById('editProveedorCuit');
    const editGeneralMessage = document.getElementById('form-general-message-edit-proveedor');



    // ===============================
    // SELECTORES - MODAL DE DETALLES
    // ===============================
    const detailModal = document.getElementById('modal-detail-proveedor-overlay');
    const detailCloseBtn = document.getElementById('modal-detail-proveedor-close');
    const detailCloseBtnFooter = document.getElementById('modal-detail-proveedor-close-btn');

    // ===============================
    // RESTRICCIÓN DE CAMPO TELÉFONO
    // Solo permite dígitos y el signo +
    // ===============================
    function restrictTelefonoInput(input) {
        if (!input) return;
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9+ ]/g, '');
        });
        input.addEventListener('keydown', function (e) {
            // Permitir combinaciones con Ctrl/Cmd (copiar, pegar, seleccionar todo, etc.)
            if (e.ctrlKey || e.metaKey) return;
            const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', ' '];
            if (allowed.includes(e.key)) return;
            if (!/^[0-9+]$/.test(e.key)) e.preventDefault();
        });
        input.addEventListener('paste', function (e) {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData).getData('text');
            const sanitized = pasted.replace(/[^0-9+ ]/g, '');
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.slice(0, start) + sanitized + this.value.slice(end);
            this.selectionStart = this.selectionEnd = start + sanitized.length;
        });
    }

    restrictTelefonoInput(telefonoInput);
    restrictTelefonoInput(editTelefonoInput);

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
            const row = `
                <tr>
                    <td>${proveedor.nombre || 'N/A'}</td>
                    <td>${proveedor.cuit || 'N/A'}</td>
                    <td>${proveedor.telefono || 'N/A'}</td>
                    <td>${proveedor.email || 'N/A'}</td>
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

    // Función helper para capitalizar nombres (Title Case)
    function capitalizarNombre(nombre) {
        if (!nombre) return '';
        return nombre
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }


    // ==========================================================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ==========================================================
    if (proveedorForm) {
        // Selectores de error
        const nombreError = document.getElementById('errorNombre');
        const telefonoError = document.getElementById('errorTelefono');
        const emailError = document.getElementById('errorEmail');
        const direccionError = document.getElementById('errorDireccion');
        const cuitError = document.getElementById('errorCuit');


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
            const cuit = cuitInput.value.trim();
            const productosIds = [];

            if (!nombre) { nombreError.textContent = 'El nombre del proveedor es obligatorio'; isValid = false; }
            if (!telefono) { telefonoError.textContent = 'El teléfono del proveedor es obligatorio'; isValid = false; }
            else if (telefono.length < 6) { telefonoError.textContent = 'El teléfono debe tener al menos 6 caracteres'; isValid = false; }
            if (!email) { emailError.textContent = 'El email del proveedor es obligatorio'; isValid = false; }
            else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                emailError.textContent = 'El formato del email no es válido';
                isValid = false;
            }
            if (!direccion) { direccionError.textContent = 'La dirección del proveedor es obligatoria'; isValid = false; }
            if (!cuit) { cuitError.textContent = 'El CUIT es obligatorio'; isValid = false; }
            else if (!cuit.match(/^\d{2}-\d{8}-\d{1}$/)) {
                cuitError.textContent = 'El formato de CUIT debe ser XX-XXXXXXXX-X';
                isValid = false;
            }

            if (!isValid) {
                generalMessage.textContent = "Debe completar todos los campos obligatorios.";
                generalMessage.classList.add('error');
                return;
            }

            // Verificar nombre y email duplicados en el servidor
            try {
                const [nombreRes, emailRes] = await Promise.all([
                    fetch(`${API_PROVEEDORES_URL}/existe/nombre/${encodeURIComponent(nombre)}`),
                    fetch(`${API_PROVEEDORES_URL}/existe/email/${encodeURIComponent(email)}`)
                ]);
                const nombreExiste = await nombreRes.json();
                const emailExiste = await emailRes.json();

                if (nombreExiste) {
                    nombreError.textContent = 'Ya existe un proveedor con ese nombre';
                    isValid = false;
                }
                if (emailExiste) {
                    emailError.textContent = 'Ya existe un proveedor con ese email';
                    isValid = false;
                }
                if (!isValid) {
                    generalMessage.textContent = "Corrija los errores antes de continuar.";
                    generalMessage.classList.add('error');
                    return;
                }
            } catch (error) {
                console.error('Error al verificar duplicados:', error);
            }

            const proveedorDTO = { nombre, telefono, email, direccion, cuit, productosIds };

            showConfirmationModal("¿Estás seguro de que deseas registrar este proveedor?", async () => {
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

    // ==========================================================
    // EDIT MODAL: TABS, PRODUCT CATALOG & UNLINK
    // ==========================================================

    let editProductosProveedorActual = [];
    let editProductosSearchTerm = '';

    // --- Tab Switching ---
    document.querySelectorAll('.edit-prov-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            // Deactivate all tabs - pill style
            document.querySelectorAll('.edit-prov-tab').forEach(t => {
                t.classList.remove('active');
                t.style.color = '#64748b';
                t.style.background = 'transparent';
                t.style.border = '1px solid transparent';
                t.style.borderBottom = 'none';
            });
            // Activate clicked - pill style
            this.classList.add('active');
            this.style.color = '#1e293b';
            this.style.background = 'white';
            this.style.border = '1px solid #e2e8f0';
            this.style.borderBottom = '2px solid white';

            // Hide all tab contents
            document.querySelectorAll('.edit-prov-tab-content').forEach(c => c.style.display = 'none');
            // Show target
            const targetId = this.getAttribute('data-tab');
            const target = document.getElementById(targetId);
            if (target) target.style.display = 'block';

            // Toggle footers
            const footerInfo = document.getElementById('edit-prov-footer-info');
            const footerProductos = document.getElementById('edit-prov-footer-productos');
            if (targetId === 'edit-prov-tab-info') {
                if (footerInfo) footerInfo.style.display = '';
                if (footerProductos) footerProductos.style.display = 'none';
            } else {
                if (footerInfo) footerInfo.style.display = 'none';
                if (footerProductos) footerProductos.style.display = '';
            }
        });
    });

    // --- Render Edit Product Catalog ---
    function renderEditProductosCatalog() {
        const tbody = document.getElementById('edit-prov-productos-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Actualizar contadores
        const totalCount = (editProductosProveedorActual || []).length;
        const countBadge = document.getElementById('edit-prov-productos-count');
        const tabBadge = document.getElementById('edit-prov-tab-productos-badge');
        if (countBadge) countBadge.textContent = totalCount;
        if (tabBadge) tabBadge.textContent = totalCount;

        let filtered = editProductosProveedorActual || [];
        if (editProductosSearchTerm) {
            filtered = filtered.filter(p => {
                const nombre = normalizeText(p.nombreProducto || '');
                return nombre.includes(editProductosSearchTerm);
            });
        }

        if (filtered.length === 0) {
            const icon = editProductosSearchTerm ? 'fa-search' : 'fa-box-open';
            const msg = editProductosSearchTerm
                ? 'No hay coincidencias con tu búsqueda.'
                : 'No hay productos asociados a este proveedor.';
            const hint = editProductosSearchTerm
                ? 'Intentá con otro término de búsqueda.'
                : 'Usá el buscador de arriba para vincular productos.';
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 40px 20px;">
                <i class="fas ${icon}" style="font-size: 32px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                <div style="font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 4px;">${msg}</div>
                <div style="font-size: 12px; color: #94a3b8;">${hint}</div>
            </td></tr>`;
            return;
        }

        filtered.forEach((prod, index) => {
            const costoFormat = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(prod.ultimoCosto || 0);
            const bgColor = index % 2 === 0 ? 'white' : '#fafbfc';
            const row = `
                <tr style="background: ${bgColor}; transition: background 0.15s;" onmouseenter="this.style.background='#f0f9ff'" onmouseleave="this.style.background='${bgColor}'">
                    <td style="padding: 12px 20px; font-size: 14px; font-weight: 500; color: #1e293b; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: #f1f5f9; border-radius: 8px; flex-shrink: 0;">
                                <i class="fas fa-cube" style="color: #64748b; font-size: 13px;"></i>
                            </span>
                            ${prod.nombreProducto || 'N/A'}
                        </div>
                    </td>
                    <td style="padding: 12px 20px; text-align: right; border-bottom: 1px solid #f1f5f9;">
                        <span style="font-size: 14px; font-weight: 600; color: #059669; background: #f0fdf4; padding: 4px 10px; border-radius: 6px; border: 1px solid #bbf7d0;">${costoFormat}</span>
                    </td>
                    <td style="padding: 12px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                        <button class="btn-icon btn-unlink-producto" data-id="${prod.idProducto}" title="Desvincular producto"
                            style="color: #ef4444; font-size: 14px; padding: 6px 10px; border-radius: 8px; border: 1px solid #fecaca; background: #fef2f2; cursor: pointer; transition: all 0.2s;"
                            onmouseenter="this.style.background='#fee2e2'; this.style.borderColor='#f87171'"
                            onmouseleave="this.style.background='#fef2f2'; this.style.borderColor='#fecaca'">
                            <i class="fas fa-unlink"></i>
                        </button>
                    </td>
                </tr>`;
            tbody.innerHTML += row;
        });
    }

    // --- Add/Link Product: Autocomplete Search ---
    let allProductosDisponibles = [];
    const addProductoSearch = document.getElementById('edit-prov-add-producto-search');
    const addProductoDropdown = document.getElementById('edit-prov-add-producto-dropdown');
    let addProductoTimeout;

    async function fetchTodosProductos() {
        try {
            const res = await fetch(API_PRODUCTOS_URL);
            if (res.ok) {
                allProductosDisponibles = await res.json();
            }
        } catch (e) {
            console.error('Error fetching products:', e);
        }
    }

    function renderAddProductoDropdown(query) {
        if (!addProductoDropdown) return;
        addProductoDropdown.innerHTML = '';

        // IDs ya vinculados
        const linkedIds = new Set((editProductosProveedorActual || []).map(p => p.idProducto));

        // Filtrar: no vinculados + coincide con búsqueda (si hay query)
        let results = allProductosDisponibles.filter(p => {
            if (linkedIds.has(p.idProducto)) return false;
            if (query && query.length > 0) {
                const normalizedQuery = normalizeText(query);
                return normalizeText(p.nombreProducto || '').includes(normalizedQuery);
            }
            return true; // Sin query, mostrar todos los no vinculados
        });

        if (results.length === 0) {
            addProductoDropdown.innerHTML = '<div style="padding: 12px 16px; color: #94a3b8; font-size: 13px; text-align: center;"><i class="fas fa-check-circle" style="margin-right: 6px;"></i>Todos los productos ya están vinculados.</div>';
            addProductoDropdown.style.display = 'block';
            return;
        }

        results.forEach(prod => {
            const costoText = prod.ultimoCosto
                ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(prod.ultimoCosto)
                : 'Sin costo';
            const item = document.createElement('div');
            item.style.cssText = 'padding: 10px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;';
            item.innerHTML = `
                <span style="font-size: 14px; color: #334155;">${prod.nombreProducto}</span>
                <span style="font-size: 12px; color: #64748b;">${costoText}</span>
            `;
            item.addEventListener('mouseenter', () => item.style.background = '#eef2ff');
            item.addEventListener('mouseleave', () => item.style.background = 'white');
            item.addEventListener('click', () => linkProductoToProveedor(prod));
            addProductoDropdown.appendChild(item);
        });

        addProductoDropdown.style.display = 'block';
    }

    async function linkProductoToProveedor(producto) {
        const proveedorId = editIdInput.value;
        const msgEl = document.getElementById('edit-prov-productos-message');

        try {
            const dto = { productosAgregar: [producto.idProducto] };
            const response = await fetch(`${API_PROVEEDORES_URL}/${proveedorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al vincular');
            }

            // Agregar al array local y re-render
            editProductosProveedorActual.push({
                idProducto: producto.idProducto,
                nombreProducto: producto.nombreProducto,
                ultimoCosto: producto.ultimoCosto || 0
            });
            renderEditProductosCatalog();

            // Limpiar búsqueda y dropdown
            if (addProductoSearch) addProductoSearch.value = '';
            if (addProductoDropdown) addProductoDropdown.style.display = 'none';

            if (msgEl) {
                msgEl.textContent = `"${producto.nombreProducto}" vinculado exitosamente.`;
                msgEl.className = 'form-message success';
                setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'form-message'; }, 3000);
            }

            // Refrescar tabla principal
            loadProveedores();
            document.dispatchEvent(new Event('proveedoresActualizados'));

        } catch (error) {
            console.error('Error al vincular producto:', error);
            if (msgEl) {
                msgEl.textContent = `Error: ${error.message}`;
                msgEl.className = 'form-message error';
            }
        }
    }

    if (addProductoSearch) {
        addProductoSearch.addEventListener('input', (e) => {
            clearTimeout(addProductoTimeout);
            addProductoTimeout = setTimeout(() => {
                renderAddProductoDropdown(e.target.value.trim());
            }, 250);
        });
        addProductoSearch.addEventListener('focus', () => {
            // Mostrar todos los productos disponibles al hacer clic/focus
            renderAddProductoDropdown(addProductoSearch.value.trim());
        });
    }

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (addProductoDropdown && !addProductoDropdown.contains(e.target) && e.target !== addProductoSearch) {
            addProductoDropdown.style.display = 'none';
        }
    });

    // --- Search in Edit Product Catalog ---
    const editProvProductosSearch = document.getElementById('edit-prov-productos-search');
    let editProvSearchTimeout;
    if (editProvProductosSearch) {
        editProvProductosSearch.addEventListener('input', (e) => {
            clearTimeout(editProvSearchTimeout);
            editProvSearchTimeout = setTimeout(() => {
                editProductosSearchTerm = normalizeText(e.target.value.trim());
                renderEditProductosCatalog();
            }, 200);
        });
    }

    // --- Unlink Product Handler ---
    const editProvProductosBody = document.getElementById('edit-prov-productos-body');
    if (editProvProductosBody) {
        editProvProductosBody.addEventListener('click', async function (e) {
            const unlinkBtn = e.target.closest('.btn-unlink-producto');
            if (!unlinkBtn) return;

            const productoId = parseInt(unlinkBtn.dataset.id);
            const productoNombre = unlinkBtn.closest('tr').cells[0].textContent;
            const proveedorId = editIdInput.value;

            // Confirmation
            const deleteModal = document.getElementById('delete-confirm-modal');
            const deleteModalMessage = document.getElementById('delete-modal-message');
            const cancelBtn = document.getElementById('cancel-delete-btn');
            const confirmBtn = document.getElementById('confirm-delete-btn');

            deleteModalMessage.textContent = `¿Estás seguro de que deseas desvincular "${productoNombre}" de este proveedor?`;
            deleteModal.style.display = 'flex';

            const escHandler = (ev) => { if (ev.key === 'Escape') closeUnlinkModal(); };
            document.addEventListener('keydown', escHandler);

            function closeUnlinkModal() {
                deleteModal.style.display = 'none';
                cancelBtn.onclick = null;
                confirmBtn.onclick = null;
                document.removeEventListener('keydown', escHandler);
            }

            cancelBtn.onclick = closeUnlinkModal;

            confirmBtn.onclick = async () => {
                closeUnlinkModal();
                const msgEl = document.getElementById('edit-prov-productos-message');
                try {
                    const dto = { productosQuitar: [productoId] };
                    const response = await fetch(`${API_PROVEEDORES_URL}/${proveedorId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dto)
                    });
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || 'Error al desvincular');
                    }

                    // Remove from local array and re-render
                    editProductosProveedorActual = editProductosProveedorActual.filter(p => p.idProducto !== productoId);
                    renderEditProductosCatalog();

                    if (msgEl) {
                        msgEl.textContent = `"${productoNombre}" desvinculado exitosamente.`;
                        msgEl.className = 'form-message success';
                        setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'form-message'; }, 3000);
                    }

                    // Refresh main table
                    loadProveedores();
                    document.dispatchEvent(new Event('proveedoresActualizados'));

                } catch (error) {
                    console.error('Error al desvincular producto:', error);
                    if (msgEl) {
                        msgEl.textContent = `Error: ${error.message}`;
                        msgEl.className = 'form-message error';
                    }
                }
            };
        });
    }

    // --- Open Edit Modal (with tabs reset) ---
    function openEditModal(data) {
        proveedorActualEditando = data;
        editIdInput.value = data.id;
        editNombreInput.value = data.nombre;
        editTelefonoInput.value = data.telefono;
        editEmailInput.value = data.email;
        editDireccionInput.value = data.direccion;
        editCuitInput.value = data.cuit || '';

        // Mostrar nombre del proveedor en el header
        const headerName = document.getElementById('edit-prov-header-name');
        if (headerName) headerName.textContent = data.nombre || '';

        // Populate product catalog
        editProductosProveedorActual = data.productos || [];
        editProductosSearchTerm = '';
        if (editProvProductosSearch) editProvProductosSearch.value = '';
        if (addProductoSearch) addProductoSearch.value = '';
        if (addProductoDropdown) addProductoDropdown.style.display = 'none';
        renderEditProductosCatalog();
        fetchTodosProductos(); // Pre-cargar productos para el autocompletado

        // Reset to Tab 1
        document.querySelectorAll('.edit-prov-tab').forEach((t, i) => {
            t.classList.toggle('active', i === 0);
            t.style.color = i === 0 ? '#2563eb' : '#64748b';
            t.style.borderBottomColor = i === 0 ? '#2563eb' : 'transparent';
        });
        document.querySelectorAll('.edit-prov-tab-content').forEach((c, i) => {
            c.style.display = i === 0 ? 'block' : 'none';
        });
        const footerInfo = document.getElementById('edit-prov-footer-info');
        const footerProductos = document.getElementById('edit-prov-footer-productos');
        if (footerInfo) footerInfo.style.display = '';
        if (footerProductos) footerProductos.style.display = 'none';

        modalOverlay.style.display = 'block';
        window.addEventListener('keydown', handleEditEsc);
    }

    function closeEditModal() {
        modalOverlay.style.display = 'none';
        window.removeEventListener('keydown', handleEditEsc);
        proveedorActualEditando = null;
        editProductosProveedorActual = [];
        editProductosSearchTerm = '';

        // Limpiar todos los mensajes de error
        document.querySelectorAll('#edit-proveedor-form .error-message').forEach(el => el.textContent = '');
        editGeneralMessage.textContent = '';
        editGeneralMessage.className = 'form-message';
        const msgEl = document.getElementById('edit-prov-productos-message');
        if (msgEl) { msgEl.textContent = ''; msgEl.className = 'form-message'; }
    }

    // ==========================================================
    // FUNCIONES DEL MODAL DE DETALLES
    // ==========================================================
    const handleDetailEsc = (e) => { if (e.key === 'Escape') closeDetailModal(); };

    // Variable de búsqueda
    let modalProveedorSearchTerm = '';
    let productosProveedorActual = [];

    function normalizeText(text) {
        if (!text) return '';
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    function renderModalProductos() {
        const tbody = document.getElementById('modal-proveedor-productos-body');

        if (!tbody) return;

        // 1. Limpiamos la tabla
        tbody.innerHTML = '';

        // 2. Aplicar filtro ignorando mayúsculas, minúsculas y acentos
        let filteredProducts = productosProveedorActual || [];
        if (modalProveedorSearchTerm) {
            filteredProducts = filteredProducts.filter(prod => {
                const nombre = normalizeText(prod.nombreProducto || '');
                return nombre.includes(modalProveedorSearchTerm);
            });
        }

        // 3. Si no hay productos, mostramos el mensaje
        if (filteredProducts.length === 0) {
            const mensaje = modalProveedorSearchTerm 
                ? 'No hay coincidencias con tu búsqueda.' 
                : 'No hay productos asociados a este proveedor.';
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #64748b;">${mensaje}</td></tr>`;
            return;
        }

        // 4. Recorremos los productos filtrados y los agregamos a la tabla
        filteredProducts.forEach(prod => {
            const costoFormat = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(prod.ultimoCosto || 0);

            const row = `
            <tr>
                <td>${prod.nombreProducto || 'N/A'}</td>
                <td>${costoFormat}</td>
                <td>${prod.stock || 0}</td>
            </tr>
        `;
            tbody.innerHTML += row;
        });
    }

    // Configizar listener de búsqueda
    const modalSearchInput = document.getElementById('modal-proveedor-productos-search');
    let modalSearchTimeout;
    
    if (modalSearchInput) {
        modalSearchInput.addEventListener('input', (e) => {
            clearTimeout(modalSearchTimeout);
            
            const tbody = document.getElementById('modal-proveedor-productos-body');
            if (tbody) {
                tbody.classList.add('loading');
            }

            modalSearchTimeout = setTimeout(() => {
                modalProveedorSearchTerm = normalizeText(e.target.value.trim());
                renderModalProductos();
                
                if (tbody) {
                    requestAnimationFrame(() => {
                        tbody.classList.remove('loading');
                    });
                }
            }, 200); // 200ms para empatar con la transición CSS
        });
    }

    async function openDetailModal(id) {
        try {
            const response = await fetch(`${API_PROVEEDORES_URL}/${id}`);
            if (!response.ok) throw new Error('Error al cargar proveedor');
            const proveedor = await response.json();

            // Llenar datos estáticos
            document.getElementById('detail-proveedor-nombre').textContent = proveedor.nombre || 'N/A';
            document.getElementById('detail-proveedor-cuit').textContent = proveedor.cuit || 'N/A';
            document.getElementById('detail-proveedor-email').textContent = proveedor.email || 'N/A';
            document.getElementById('detail-proveedor-telefono').textContent = proveedor.telefono || 'N/A';
            document.getElementById('detail-proveedor-direccion').textContent = proveedor.direccion || 'N/A';

            // Productos Asociados
            productosProveedorActual = proveedor.productos || [];
            
            // Limpiar búsqueda al abrir
            modalProveedorSearchTerm = '';
            const mSearchInput = document.getElementById('modal-proveedor-productos-search');
            if (mSearchInput) mSearchInput.value = '';

            renderModalProductos();

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

                // Usar el mismo modal estilizado que productos
                const deleteModal = document.getElementById('delete-confirm-modal');
                const deleteModalMessage = document.getElementById('delete-modal-message');
                const cancelBtn = document.getElementById('cancel-delete-btn');
                const confirmBtn = document.getElementById('confirm-delete-btn');

                deleteModalMessage.textContent = `¿Estás seguro de que quieres eliminar al proveedor "${nombre}"?`;
                deleteModal.style.display = 'flex';

                // ESC para cerrar
                const escHandler = (e) => { if (e.key === 'Escape') closeProveedorDeleteModal(); };
                document.addEventListener('keydown', escHandler);

                function closeProveedorDeleteModal() {
                    deleteModal.style.display = 'none';
                    cancelBtn.onclick = null;
                    confirmBtn.onclick = null;
                    document.removeEventListener('keydown', escHandler);
                }

                cancelBtn.onclick = closeProveedorDeleteModal;

                confirmBtn.onclick = async () => {
                    closeProveedorDeleteModal();
                    try {
                        const response = await fetch(`${API_PROVEEDORES_URL}/${id}`, {
                            method: 'DELETE'
                        });
                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(errorText || 'No se pudo eliminar el proveedor');
                        }
                        loadProveedores();
                        document.dispatchEvent(new Event('proveedoresActualizados'));
                    } catch (error) {
                        alert('Error al eliminar: ' + error.message);
                    }
                };
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
            const cuit = editCuitInput.value.trim();

            // 3. Validar campos
            let isValid = true;

            if (!nombre) {
                document.getElementById('errorEditNombre').textContent = 'El nombre es obligatorio';
                isValid = false;
            }

            if (!telefono) {
                document.getElementById('errorEditTelefono').textContent = 'El teléfono es obligatorio';
                isValid = false;
            } else if (telefono.length < 6) {
                document.getElementById('errorEditTelefono').textContent = 'El teléfono debe tener al menos 6 caracteres';
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
            
            if (!cuit) {
                document.getElementById('errorEditCuit').textContent = 'El CUIT es obligatorio';
                isValid = false;
            } else if (!cuit.match(/^\d{2}-\d{8}-\d{1}$/)) {
                document.getElementById('errorEditCuit').textContent = 'El formato de CUIT debe ser XX-XXXXXXXX-X';
                isValid = false;
            }

            if (!isValid) {
                editGeneralMessage.textContent = 'Por favor complete todos los campos correctamente';
                editGeneralMessage.classList.add('error');
                return;
            }

            // 4. Construir DTO
            const dto = {
                nombre: nombre,
                telefono: telefono,
                email: email,
                direccion: direccion,
                cuit: cuit,
                productosAgregar: [],
                productosQuitar: []
            };

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

    // ==========================================================
    // VALIDACIONES EN TIEMPO REAL - FORMULARIO DE EDICIÓN
    // ==========================================================
    const emailRegexEdit = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Nombre: obligatorio + duplicado (excluyendo el actual)
    if (editNombreInput) {
        let editNombreTimeout;
        editNombreInput.addEventListener('blur', async function () {
            const errorEl = document.getElementById('errorEditNombre');
            const nombre = editNombreInput.value.trim();
            if (!nombre) {
                if (errorEl) errorEl.textContent = 'El nombre es obligatorio';
                return;
            }
            if (proveedorActualEditando && nombre === proveedorActualEditando.nombre) {
                if (errorEl) errorEl.textContent = '';
                return;
            }
            clearTimeout(editNombreTimeout);
            editNombreTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`${API_PROVEEDORES_URL}/existe/nombre/${encodeURIComponent(nombre)}`);
                    const existe = await response.json();
                    if (existe) {
                        if (errorEl) errorEl.textContent = 'Ya existe un proveedor con ese nombre';
                    } else {
                        if (errorEl) errorEl.textContent = '';
                    }
                } catch (error) {
                    console.error('Error al verificar nombre (edit):', error);
                }
            }, 500);
        });
        editNombreInput.addEventListener('input', function () {
            const errorEl = document.getElementById('errorEditNombre');
            if (!editNombreInput.value.trim()) {
                if (errorEl) errorEl.textContent = 'El nombre es obligatorio';
            } else if (errorEl && errorEl.textContent === 'El nombre es obligatorio') {
                errorEl.textContent = '';
            }
        });
    }

    // Teléfono: obligatorio + min length
    if (editTelefonoInput) {
        editTelefonoInput.addEventListener('blur', function () {
            const errorEl = document.getElementById('errorEditTelefono');
            const tel = editTelefonoInput.value.trim();
            if (!tel) {
                if (errorEl) errorEl.textContent = 'El teléfono es obligatorio';
            } else if (tel.length < 6) {
                if (errorEl) errorEl.textContent = 'El teléfono debe tener al menos 6 caracteres';
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        });
    }

    // Email: formato + duplicado (excluyendo el actual)
    if (editEmailInput) {
        let editEmailTimeout;
        editEmailInput.addEventListener('blur', async function () {
            const errorEl = document.getElementById('errorEditEmail');
            const email = editEmailInput.value.trim();
            if (!email) {
                if (errorEl) errorEl.textContent = 'El email es obligatorio';
                return;
            }
            if (!emailRegexEdit.test(email)) {
                if (errorEl) errorEl.textContent = 'El formato del email no es válido';
                return;
            }
            if (proveedorActualEditando && email === proveedorActualEditando.email) {
                if (errorEl) errorEl.textContent = '';
                return;
            }
            clearTimeout(editEmailTimeout);
            editEmailTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`${API_PROVEEDORES_URL}/existe/email/${encodeURIComponent(email)}`);
                    const existe = await response.json();
                    if (existe) {
                        if (errorEl) errorEl.textContent = 'Ya existe un proveedor con ese email';
                    } else {
                        if (errorEl) errorEl.textContent = '';
                    }
                } catch (error) {
                    console.error('Error al verificar email (edit):', error);
                }
            }, 500);
        });
        editEmailInput.addEventListener('input', function () {
            const errorEl = document.getElementById('errorEditEmail');
            const email = editEmailInput.value.trim();
            if (email && !emailRegexEdit.test(email)) {
                if (errorEl) errorEl.textContent = 'El formato del email no es válido';
            } else if (!email) {
                if (errorEl) errorEl.textContent = 'El email es obligatorio';
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        });
    }

    // Dirección: obligatorio
    if (editDireccionInput) {
        editDireccionInput.addEventListener('blur', function () {
            const errorEl = document.getElementById('errorEditDireccion');
            if (!editDireccionInput.value.trim()) {
                if (errorEl) errorEl.textContent = 'La dirección es obligatoria';
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        });
    }

    // CUIT: obligatorio + formato
    if (editCuitInput) {
        editCuitInput.addEventListener('blur', function () {
            const errorEl = document.getElementById('errorEditCuit');
            const cuit = editCuitInput.value.trim();
            if (!cuit) {
                if (errorEl) errorEl.textContent = 'El CUIT es obligatorio';
            } else if (!cuit.match(/^\d{2}-\d{8}-\d{1}$/)) {
                if (errorEl) errorEl.textContent = 'El formato de CUIT debe ser XX-XXXXXXXX-X';
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        });
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeEditModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeEditModal(); });



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
                if (proveedor.direccion?.toLowerCase().includes(query)) return true;
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

        loadProveedores();
    }
    inicializar();

    window.cargarDatosProveedores = async function () {
        allProducts = []; // Limpiar cache de productos
        await fetchAllProducts();

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
        // Limpiar todos los campos de texto
        if (nombreInput) nombreInput.value = '';
        if (telefonoInput) telefonoInput.value = '';
        if (emailInput) emailInput.value = '';
        if (direccionInput) direccionInput.value = '';
        if (cuitInput) cuitInput.value = '';

        // Limpiar todos los mensajes de error
        if (nombreError) nombreError.textContent = '';
        if (telefonoError) telefonoError.textContent = '';
        if (emailError) emailError.textContent = '';
        if (direccionError) direccionError.textContent = '';
        const cuitErrorEl = document.getElementById('errorCuit');
        if (cuitErrorEl) cuitErrorEl.textContent = '';
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

    });
});