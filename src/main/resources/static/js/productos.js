/**
 * Este archivo maneja toda la lógica para la sección de "Productos":
 * - Cargar la lista de productos (paginada y ordenada).
 * - Validar y enviar el formulario para registrar nuevos productos.
 * - Controlar la paginación y ordenamiento de la tabla.
 */
document.addEventListener('DOMContentLoaded', function () {

    // ===============================
    // SELECTORES DE ELEMENTOS DEL DOM
    // ===============================
    const productForm = document.getElementById('product-form');
    const productTableBody = document.getElementById('product-table-body');
    const nameInput = document.getElementById('product-name');
    const categorySearchInput = document.getElementById('product-category-search');
    const categoryHiddenInput = document.getElementById('product-category-id-hidden');
    const categoryResultsContainer = document.getElementById('product-category-results');
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

    // Selectores del modal de categoría
    const addCategoriaModal = document.getElementById('modal-add-categoria-overlay');
    const addCategoriaBtn = document.getElementById('btn-add-categoria');
    const addCategoriaCloseBtn = document.getElementById('modal-add-categoria-close');
    const addCategoriaForm = document.getElementById('add-categoria-form');
    const addCategoriaMessage = document.getElementById('form-general-message-add-categoria');

    // --- Selectores de Paginación y Estabilidad ---
    const prevPageBtn = document.getElementById('product-prev-page');
    const nextPageBtn = document.getElementById('product-next-page');
    const pageInfo = document.getElementById('product-page-info');

    // CORRECCIÓN: Para el control de scroll y foco
    const mainContent = document.querySelector('.main-content');

    // --- Selectores de Búsqueda ---
    const productSearchInputElement = document.getElementById('product-search-input');
    const productBtnBuscar = document.getElementById('product-btn-buscar');
    const productBtnLimpiar = document.getElementById('product-btn-limpiar-busqueda');
    const productSearchError = document.getElementById('product-search-error');

    // --- Selectores de Modal de Edición ---
    const editModal = document.getElementById('product-edit-modal');
    const editForm = document.getElementById('product-edit-form');
    const editCloseBtn = document.getElementById('product-edit-close');
    const editCancelBtn = document.getElementById('product-edit-cancel');
    const editSaveBtn = document.getElementById('product-edit-save');
    const editProductId = document.getElementById('edit-product-id');
    const editNameInput = document.getElementById('edit-product-name');
    const editCategorySearchInput = document.getElementById('edit-product-category-search');
    const editCategoryHiddenInput = document.getElementById('edit-product-category-id-hidden');
    const editCategoryResultsContainer = document.getElementById('edit-product-category-results');
    const editDescriptionInput = document.getElementById('edit-product-description');
    const editPriceInput = document.getElementById('edit-product-price');
    const editStockMinInput = document.getElementById('edit-product-stock-min');
    const editStockMaxInput = document.getElementById('edit-product-stock-max');
    const editFormMessage = document.getElementById('edit-form-message');

    // --- Selectores de Modal de Eliminación (modal genérico) ---
    const deleteModal = document.getElementById('delete-confirm-modal');
    const deleteModalMessage = document.getElementById('delete-modal-message');
    const deleteCancelBtn = document.getElementById('cancel-delete-btn');
    const deleteConfirmBtn = document.getElementById('confirm-delete-btn');
    let deleteProductId = null;  // Variable para guardar el ID del producto a eliminar

    // ===============================
    // URLs DE LA API Y ESTADO
    // ===============================
    const API_PRODUCTOS_URL = '/api/productos';
    const API_CATEGORIAS_URL = '/api/categorias';

    // --- Estado de Paginación y Ordenamiento ---
    let currentPage = 0;
    let totalPages = 1;
    const itemsPerPage = 10;
    let sortField = 'fechaCreacion'; // Campo de ordenamiento inicial
    let sortDirection = 'desc'; // Dirección inicial (más nuevo primero)

    // --- Estado de Categorías ---
    let todasLasCategorias = [];

    // --- Estado de Búsqueda ---
    let todosLosProductos = []; // Cache de todos los productos
    let productosBuscados = null; // Productos filtrados por búsqueda
    let searchTimeout = null; // Timer para búsqueda con debounce


    // ===============================
    // FUNCIÓN PARA CARGAR PRODUCTOS (FINAL)
    // ===============================
    async function loadProducts() {
        if (!productTableBody || !mainContent) return;

        // 1. GUARDAR scroll y preparar animación (Fade Out)
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        productTableBody.classList.add('loading');

        // Esperar fade-out
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // 2. Añadir parámetros de ordenamiento
            const sortParam = sortField ? `&sort=${sortField},${sortDirection}` : '';
            // CAMBIO: Usar endpoint de inventario en lugar de productos
            const url = `${API_PRODUCTOS_URL}/inventario?page=${currentPage}&size=${itemsPerPage}${sortParam}`;

            const response = await fetch(url, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const pageData = await response.json();
            totalPages = pageData.totalPages;
            todosLosProductos = pageData.content; // Guardar todos los productos

            // Si hay una búsqueda activa, reaplicarla con los nuevos datos
            if (productSearchInputElement && productSearchInputElement.value.trim() !== '') {
                const textoBusqueda = removeAccents(productSearchInputElement.value.toLowerCase().trim());
                productosBuscados = todosLosProductos.filter(producto => {
                    const coincideNombre = producto.nombre &&
                        removeAccents(producto.nombre.toLowerCase()).includes(textoBusqueda);
                    const coincideCategoria = producto.categoria &&
                        removeAccents(producto.categoria.toLowerCase()).includes(textoBusqueda);
                    const coincideDescripcion = producto.descripcion &&
                        removeAccents(producto.descripcion.toLowerCase()).includes(textoBusqueda);
                    return coincideNombre || coincideCategoria || coincideDescripcion;
                });
            }

            // 3. Aplicar filtros y renderizar
            const productosAMostrar = aplicarFiltros();
            renderProductTable(productosAMostrar);
            updatePaginationControls();
            updateSortIndicators();

            requestAnimationFrame(() => {
                // Restaurar scroll y forzar foco para estabilidad
                mainContent.focus();
                window.scrollTo(0, scrollPosition);
                // INICIAR FADE-IN
                productTableBody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar los productos:', error);
            productTableBody.innerHTML = `<tr><td colspan="5">Error al cargar productos.</td></tr>`;
            productTableBody.classList.remove('loading');
        }
    }

    window.loadProducts = loadProducts;

    // ===============================
    // FUNCIONES DE ORDENAMIENTO
    // ===============================
    function handleSortClick(event) {
        event.preventDefault();
        event.currentTarget.blur(); // Evita que el encabezado mantenga el foco

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
        loadProducts();
    }

    function updateSortIndicators() {
        const headers = document.querySelectorAll('#productos-section .data-table th[data-sort-by]');
        headers.forEach(th => {
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

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA
    // ===============================

    // ==========================================================
    // LÓGICA DE CATEGORÍAS
    // ==========================================================

    async function loadCategoriasParaProductos() {
        if (!categorySearchInput) return;
        try {
            const response = await fetch(`${API_CATEGORIAS_URL}/select`);
            if (!response.ok) throw new Error('Error al cargar categorías');
            todasLasCategorias = await response.json();
        } catch (error) {
            console.error(error);
            categorySearchInput.placeholder = "Error al cargar categorías";
        }
    }

    // Función auxiliar para eliminar acentos (búsqueda insensible a acentos)
    function removeAccents(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function filtrarCategorias() {
        const query = removeAccents(categorySearchInput.value.toLowerCase());
        const categoriasFiltradas = todasLasCategorias.filter(c =>
            removeAccents(c.nombre.toLowerCase()).includes(query)
        );
        renderResultadosCategorias(categoriasFiltradas);
    }

    function renderResultadosCategorias(categorias) {
        if (categorias.length === 0) {
            categoryResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron categorías</div>';
        } else {
            categoryResultsContainer.innerHTML = categorias.map(c =>
                `<div class="product-result-item" data-id="${c.id}">${c.nombre}</div>`
            ).join('');
        }
        categoryResultsContainer.style.display = 'block';
    }

    function seleccionarCategoria(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const categoriaId = parseInt(target.dataset.id, 10);
        const categoria = todasLasCategorias.find(c => c.id === categoriaId);

        if (categoria) {
            categorySearchInput.value = categoria.nombre;
            categoryHiddenInput.value = categoria.id;
            categoryResultsContainer.style.display = 'none';
            if (categoryError) categoryError.textContent = '';
        }
    }

    // Modal de categoría
    const handleAddCategoriaEsc = (e) => {
        if (e.key === 'Escape') closeAddCategoriaModal();
    };

    function resetAddCategoriaModal() {
        if (addCategoriaForm) addCategoriaForm.reset();
        if (addCategoriaMessage) {
            addCategoriaMessage.textContent = '';
            addCategoriaMessage.className = 'form-message';
        }
        document.getElementById('errorAddCategoriaNombre').textContent = '';
    }

    function openAddCategoriaModal() {
        if (!addCategoriaModal) return;
        resetAddCategoriaModal();
        addCategoriaModal.style.display = 'flex';
        document.getElementById('addCategoriaNombre').focus();
        window.addEventListener('keydown', handleAddCategoriaEsc);
    }

    function closeAddCategoriaModal() {
        if (!addCategoriaModal) return;
        addCategoriaModal.style.display = 'none';
        window.removeEventListener('keydown', handleAddCategoriaEsc);
    }

    async function handleAddCategoriaSubmit(event) {
        event.preventDefault();

        document.getElementById('errorAddCategoriaNombre').textContent = '';
        if (addCategoriaMessage) {
            addCategoriaMessage.textContent = '';
            addCategoriaMessage.classList.remove('error', 'success');
        }

        const nombre = document.getElementById('addCategoriaNombre').value.trim();

        if (!nombre) {
            document.getElementById('errorAddCategoriaNombre').textContent = 'El nombre es obligatorio.';
            return;
        }

        const categoriaRequestDTO = { nombre: nombre };

        try {
            const response = await fetch(API_CATEGORIAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoriaRequestDTO)
            });

            if (!response.ok) {
                // Leer como texto primero para evitar consumir el stream dos veces
                const errorText = await response.text();
                let errorMessage;

                try {
                    // Intentar parsear como JSON
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorText;
                } catch {
                    // Si no es JSON válido, usar el texto tal cual
                    errorMessage = errorText;
                }

                throw new Error(errorMessage);
            }

            const nuevaCategoria = await response.json();
            closeAddCategoriaModal();

            categorySearchInput.value = nuevaCategoria.nombre;
            categoryHiddenInput.value = nuevaCategoria.idCategoria;
            if (categoryError) categoryError.textContent = '';

            loadCategoriasParaProductos();

        } catch (error) {
            console.error('Error al crear categoría:', error);
            if (addCategoriaMessage) {
                addCategoriaMessage.textContent = error.message;
                addCategoriaMessage.classList.add('error');
            }
        }
    }

    // Listeners de categorías
    if (categorySearchInput) {
        categorySearchInput.addEventListener('input', function () {
            filtrarCategorias();
            // Limpiar el campo oculto si el usuario borra el texto
            if (categorySearchInput.value.trim() === '') {
                categoryHiddenInput.value = '';
            }
        });
        categorySearchInput.addEventListener('focus', filtrarCategorias);
    }

    if (categoryResultsContainer) {
        categoryResultsContainer.addEventListener('click', seleccionarCategoria);
    }

    if (addCategoriaBtn) {
        addCategoriaBtn.addEventListener('click', openAddCategoriaModal);
    }

    if (addCategoriaCloseBtn) {
        addCategoriaCloseBtn.addEventListener('click', closeAddCategoriaModal);
    }

    if (addCategoriaModal) {
        addCategoriaModal.addEventListener('click', function (e) {
            if (e.target === addCategoriaModal) closeAddCategoriaModal();
        });
    }

    if (addCategoriaForm) {
        addCategoriaForm.addEventListener('submit', handleAddCategoriaSubmit);
    }

    // Ocultar resultados al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (!categorySearchInput.contains(e.target) && !categoryResultsContainer.contains(e.target)) {
            categoryResultsContainer.style.display = 'none';
        }
        // Para el modal de edición
        if (editCategorySearchInput && !editCategorySearchInput.contains(e.target) &&
            editCategoryResultsContainer && !editCategoryResultsContainer.contains(e.target)) {
            editCategoryResultsContainer.style.display = 'none';
        }
    });

    // ===========================================================

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA
    // ===============================
    /**
     * Genera el HTML del badge de stock según el estado
     */
    function getStockBadge(stockActual, estadoStock) {
        let badgeClass = '';

        switch (estadoStock) {
            case 'BUENO':
                badgeClass = 'good';
                break;
            case 'BAJO':
                badgeClass = 'low';
                break;
            case 'AGOTADO':
                badgeClass = 'empty';
                break;
            default:
                badgeClass = 'good';
        }

        // Retorna solo el número con el badge de color, sin texto ni icono
        return `<span class="stock-badge ${badgeClass}">${stockActual}</span>`;
    }

    /**
     * Renderiza la tabla de productos con información de inventario
     */
    function renderProductTable(products) {
        if (!productTableBody) return;

        productTableBody.innerHTML = '';
        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="5">No hay productos registrados.</td></tr>';
            return;
        }

        products.forEach(product => {
            const stockBadge = getStockBadge(product.stockActual, product.estadoStock);

            const row = `
                <tr>
                    <td>${product.nombre || 'N/A'}</td>
                    <td>${product.categoria || 'N/A'}</td>
                    <td>${product.descripcion || 'N/A'}</td>
                    <td>${stockBadge}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-action view" title="Ver detalles" data-id="${product.idProducto}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action edit" title="Editar" data-id="${product.idProducto}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action delete" title="Eliminar" data-id="${product.idProducto}" data-name="${product.nombre}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            productTableBody.innerHTML += row;
        });

        // Agregar event listeners para los botones de acción
        attachActionListeners();
    }

    /**
     * Adjunta event listeners a los botones de acción
     */
    function attachActionListeners() {
        // Botones "Ver detalles"
        document.querySelectorAll('.btn-action.view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                openDetailModal(productId);
            });
        });

        // Botones "Editar"
        document.querySelectorAll('.btn-action.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                openEditModal(productId);
            });
        });

        // Botones "Eliminar"
        document.querySelectorAll('.btn-action.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-id');
                const productName = e.currentTarget.getAttribute('data-name');
                openDeleteModal(productId, productName);
            });
        });
    }

    // ===============================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ===============================
    if (productForm) {
        productForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. Limpiar mensajes
            document.querySelectorAll('#product-form .error-message').forEach(el => el.textContent = '');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';

            // 2. Obtener valores
            const nombre = nameInput.value.trim();
            const idCategoria = categoryHiddenInput.value ? parseInt(categoryHiddenInput.value, 10) : null;
            const descripcion = descriptionInput.value.trim();
            const stockMinimo = parseInt(stockMinInput.value, 10);
            const stockMaximo = parseInt(stockMaxInput.value, 10);

            // 3. Validaciones
            let isValid = true;
            if (!nombre) { nameError.textContent = 'Complete este campo'; isValid = false; }
            if (!idCategoria) { categoryError.textContent = 'Debe seleccionar una categoría'; isValid = false; }
            if (!descripcion) { descriptionError.textContent = 'Complete este campo'; isValid = false; }
            if (isNaN(stockMinimo) || stockMinimo < 0) { stockMinError.textContent = 'Debe ser un número positivo.'; isValid = false; }
            if (isNaN(stockMaximo) || stockMaximo <= 0) { stockMaxError.textContent = 'Debe ser un número mayor a 0.'; isValid = false; }
            // Validar relación entre stock mínimo y máximo (solo si ambos son números válidos)
            if (!isNaN(stockMinimo) && !isNaN(stockMaximo) && stockMinimo >= stockMaximo) {
                stockMaxError.textContent = 'El máx. debe ser mayor que el mín.';
                isValid = false;
            }
            if (!isValid) { generalMessage.textContent = "Complete los campos."; generalMessage.classList.add('error'); return; }

            // 4. Construir DTO
            const productoDTO = {
                nombre: nombre,
                idCategoria: idCategoria,
                descripcion: descripcion,
                stockMinimo: stockMinimo,
                stockMaximo: stockMaximo
            };

            // 5. Enviar
            try {
                const response = await fetch(API_PRODUCTOS_URL, {
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
                categoryHiddenInput.value = '';

                // Reseteamos a la página 0 y recargamos la tabla
                currentPage = 0;
                loadProducts();

                // El usuario se queda en el formulario para seguir creando productos
                // El mensaje desaparece automáticamente después de 4 segundos
                setTimeout(() => {
                    generalMessage.textContent = '';
                    generalMessage.classList.remove('success');
                }, 4000);

                document.dispatchEvent(new Event('productosActualizados'));

            } catch (error) {
                console.error('Error al registrar el producto:', error);
                generalMessage.textContent = `${error.message}`;
                generalMessage.classList.add('error');
            }
        });
    }

    // ===============================
    // FUNCIONES DE PAGINACIÓN
    // ===============================
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
                loadProducts();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadProducts();
            }
        });
    }

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores
        subsectionContainers.forEach(container => {
            container.style.display = 'none';
        });

        // 2. Mostrar contenedor seleccionado
        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
    }

    // Exponer globalmente para ser llamado desde admin.js
    window.showProductSubsection = showSubsection;

    // ===============================
    // MODAL DE DETALLES
    // ===============================
    const detailModal = document.getElementById('product-detail-modal');
    const detailCloseBtn = document.getElementById('product-detail-close');
    const detailCloseBtnFooter = document.getElementById('product-detail-close-btn');

    /**
     * Abre el modal y carga los detalles del producto
     */
    async function openDetailModal(productId) {
        try {
            // Cargar datos del producto desde el endpoint de inventario
            // Cargar datos del producto desde el endpoint de inventario
            const response = await fetch(`${API_PRODUCTOS_URL}/inventario?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Error al cargar datos del producto');

            const pageData = await response.json();
            const product = pageData.content.find(p => p.idProducto == productId);

            if (!product) {
                alert('Producto no encontrado');
                return;
            }

            // Llenar el modal con los datos
            document.getElementById('detail-nombre').textContent = product.nombre || 'N/A';
            document.getElementById('detail-categoria').textContent = product.categoria || 'N/A';
            document.getElementById('detail-descripcion').textContent = product.descripcion || 'N/A';
            document.getElementById('detail-precio').textContent = product.precio > 0 ? `$${product.precio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'No establecido';

            // Fecha formateada
            let fechaFormateada = "N/A";
            if (product.fechaCreacion) {
                const parts = product.fechaCreacion.split('-');
                fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            document.getElementById('detail-fecha').textContent = fechaFormateada;

            // Información de stock
            document.getElementById('detail-stock-actual').textContent = product.stockActual;
            document.getElementById('detail-stock-min').textContent = product.stockMinimo;
            document.getElementById('detail-stock-max').textContent = product.stockMaximo;

            // Mostrar estado como texto con badge
            let estadoTexto = 'N/A';
            let estadoClase = '';

            if (product.estadoStock === 'AGOTADO' || product.stockActual === 0) {
                estadoTexto = 'Agotado';
                estadoClase = 'empty';
            } else if (product.estadoStock === 'BAJO' || product.stockActual < product.stockMinimo) {
                estadoTexto = 'Bajo';
                estadoClase = 'low';
            } else {
                estadoTexto = 'Óptimo';
                estadoClase = 'good';
            }

            const estadoBadge = `<span class="stock-badge ${estadoClase}" style="padding-left: 6px; padding-right: 8px;">${estadoTexto}</span>`;
            document.getElementById('detail-stock-estado').innerHTML = estadoBadge;

            // Mostrar modal
            detailModal.style.display = 'flex';

            // Cerrar modal con ESC
            const handleEscKey = (e) => {
                if (e.key === 'Escape') {
                    closeDetailModal();
                }
            };

            document.addEventListener('keydown', handleEscKey);
            detailModal._escHandler = handleEscKey;
        } catch (error) {
            console.error('Error al abrir modal de detalles:', error);
            alert('Error al cargar los detalles del producto');
        }
    }

    /**
     * Cierra el modal de detalles
     */
    function closeDetailModal() {
        detailModal.style.display = 'none';

        // Remover listener de ESC
        if (detailModal._escHandler) {
            document.removeEventListener('keydown', detailModal._escHandler);
            detailModal._escHandler = null;
        }
    }

    // Event listeners del modal
    if (detailCloseBtn) {
        detailCloseBtn.addEventListener('click', closeDetailModal);
    }
    if (detailCloseBtnFooter) {
        detailCloseBtnFooter.addEventListener('click', closeDetailModal);
    }

    // Cerrar modal al hacer clic fuera
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) {
                closeDetailModal();
            }
        });
    }

    // Botón editar removido del modal

    // ===============================
    // FILTROS DE STOCK
    // ===============================
    let currentFilter = 'all'; // Filtro activo
    let allProducts = []; // Cache de todos los productos

    /**
     * Aplica filtro de stock
     */
    async function applyStockFilter(filter) {
        currentFilter = filter;

        try {
            // Cargar TODOS los productos (sin paginación para filtros)
            const response = await fetch(`${API_PRODUCTOS_URL}/inventario?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Error al cargar productos');

            const pageData = await response.json();
            allProducts = pageData.content;

            // Filtrar según el criterio
            let filteredProducts = allProducts;

            switch (filter) {
                case 'low':
                    filteredProducts = allProducts.filter(p => p.estadoStock === 'BAJO');
                    break;
                case 'empty':
                    filteredProducts = allProducts.filter(p => p.estadoStock === 'AGOTADO');
                    break;
                case 'all':
                default:
                    filteredProducts = allProducts;
            }

            // Renderizar productos filtrados
            renderProductTable(filteredProducts);

            // Actualizar botones activos
            document.querySelectorAll('.btn-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`.btn-filter[data-filter="${filter}"]`).classList.add('active');

        } catch (error) {
            console.error('Error al aplicar filtro:', error);
            productTableBody.innerHTML = `<tr><td colspan="5">Error al filtrar productos.</td></tr>`;
        }
    }

    // Event listeners para filtros
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            applyStockFilter(filter);
        });
    });

    // ==========================================================
    // FUNCIONALIDAD DE MODAL DE EDICIÓN
    // ==========================================================

    // Autocomplete de categoría para el modal de edición
    if (editCategorySearchInput) {
        editCategorySearchInput.addEventListener('input', () => {
            const query = removeAccents(editCategorySearchInput.value.toLowerCase());
            const categoriasFiltradas = todasLasCategorias.filter(c =>
                removeAccents(c.nombre.toLowerCase()).includes(query)
            );
            renderEditCategoryResults(categoriasFiltradas);
            if (editCategorySearchInput.value.trim() === '') {
                editCategoryHiddenInput.value = '';
            }
        });
        editCategorySearchInput.addEventListener('focus', () => {
            const query = removeAccents(editCategorySearchInput.value.toLowerCase());
            const categoriasFiltradas = todasLasCategorias.filter(c =>
                removeAccents(c.nombre.toLowerCase()).includes(query)
            );
            renderEditCategoryResults(categoriasFiltradas);
        });
    }

    function renderEditCategoryResults(categorias) {
        if (!editCategoryResultsContainer) return;
        if (categorias.length === 0) {
            editCategoryResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron categorías</div>';
        } else {
            editCategoryResultsContainer.innerHTML = categorias.map(c =>
                `<div class="product-result-item" data-id="${c.id}">${c.nombre}</div>`
            ).join('');
        }
        editCategoryResultsContainer.style.display = 'block';
    }

    if (editCategoryResultsContainer) {
        editCategoryResultsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.product-result-item');
            if (!target || !target.dataset.id) return;
            const categoriaId = parseInt(target.dataset.id, 10);
            const categoria = todasLasCategorias.find(c => c.id === categoriaId);
            if (categoria) {
                editCategorySearchInput.value = categoria.nombre;
                editCategoryHiddenInput.value = categoria.id;
                editCategoryResultsContainer.style.display = 'none';
                if (document.getElementById('edit-category-error')) {
                    document.getElementById('edit-category-error').textContent = '';
                }
            }
        });
    }

    // Función para abrir modal de edición
    async function openEditModal(productId) {
        try {
            // Cargar datos del producto
            const response = await fetch(`${API_PRODUCTOS_URL}/inventario?page=0&size=1000`, { cache: 'no-store' });
            if (!response.ok) throw new Error('Error al cargar datos del producto');

            const pageData = await response.json();
            const product = pageData.content.find(p => p.idProducto == productId);

            if (!product) {
                alert('Producto no encontrado');
                return;
            }

            // Llenar formulario con datos actuales
            editProductId.value = product.idProducto;
            editNameInput.value = product.nombre || '';
            editCategorySearchInput.value = product.categoria || '';
            // Buscar ID de categoría
            const categoriaEncontrada = todasLasCategorias.find(c => c.nombre === product.categoria);
            editCategoryHiddenInput.value = categoriaEncontrada ? categoriaEncontrada.id : '';
            editDescriptionInput.value = product.descripcion || '';
            editPriceInput.value = product.precio || 0;
            editStockMinInput.value = product.stockMinimo || 0;
            editStockMaxInput.value = product.stockMaximo || 0;

            // Limpiar mensajes de error
            document.querySelectorAll('#product-edit-form .error-message').forEach(el => el.textContent = '');
            if (editFormMessage) {
                editFormMessage.textContent = '';
                editFormMessage.className = 'form-message';
            }

            // Mostrar modal
            editModal.style.display = 'flex';
            editNameInput.focus();
        } catch (error) {
            console.error('Error al abrir modal de edición:', error);
            alert('Error al cargar los datos del producto');
        }
    }

    // Función para cerrar modal de edición
    function closeEditModal() {
        editModal.style.display = 'none';
        if (editForm) editForm.reset();
        document.querySelectorAll('#product-edit-form .error-message').forEach(el => el.textContent = '');
        if (editFormMessage) {
            editFormMessage.textContent = '';
            editFormMessage.className = 'form-message';
        }
    }

    // Event listeners para cerrar modal
    if (editCloseBtn) editCloseBtn.addEventListener('click', closeEditModal);
    if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
    if (editModal) {
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }

    // Manejar guardado de cambios
    if (editSaveBtn) {
        editSaveBtn.addEventListener('click', async () => {
            // Limpiar mensajes de error
            document.querySelectorAll('#product-edit-form .error-message').forEach(el => el.textContent = '');
            if (editFormMessage) {
                editFormMessage.textContent = '';
                editFormMessage.className = 'form-message';
            }

            // Obtener valores
            const productId = editProductId.value;
            const nombre = editNameInput.value.trim();
            const idCategoria = editCategoryHiddenInput.value ? parseInt(editCategoryHiddenInput.value, 10) : null;
            const descripcion = editDescriptionInput.value.trim();
            const precio = parseFloat(editPriceInput.value);
            const stockMinimo = parseInt(editStockMinInput.value);
            const stockMaximo = parseInt(editStockMaxInput.value);

            // Validaciones
            let isValid = true;
            if (!nombre) { document.getElementById('edit-name-error').textContent = 'El nombre es obligatorio'; isValid = false; }
            if (!idCategoria) { document.getElementById('edit-category-error').textContent = 'Debe seleccionar una categoría'; isValid = false; }
            if (!descripcion) { document.getElementById('edit-description-error').textContent = 'La descripción es obligatoria'; isValid = false; }
            if (isNaN(precio) || precio < 0) { document.getElementById('edit-price-error').textContent = 'El precio debe ser un número válido'; isValid = false; }
            if (isNaN(stockMinimo) || stockMinimo < 0) { document.getElementById('edit-stock-min-error').textContent = 'El stock mínimo debe ser un número válido'; isValid = false; }
            if (isNaN(stockMaximo) || stockMaximo < 0) { document.getElementById('edit-stock-max-error').textContent = 'El stock máximo debe ser un número válido'; isValid = false; }
            if (!isNaN(stockMinimo) && !isNaN(stockMaximo) && stockMaximo < stockMinimo) {
                document.getElementById('edit-stock-max-error').textContent = 'El stock máximo debe ser mayor o igual al mínimo';
                isValid = false;
            }

            if (!isValid) {
                editFormMessage.textContent = 'Por favor complete todos los campos correctamente';
                editFormMessage.classList.add('error');
                return;
            }

            // Construir DTO
            const actualizarDTO = {
                nombre,
                idCategoria,
                descripcion,
                precio,
                cantidadExtraStock: 0,  // No se modifica stock actual desde edición
                stockMinimo,
                stockMaximo
            };

            try {
                // Enviar PUT request
                const response = await fetch(`/api/stock/${productId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(actualizarDTO)
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(errorData || 'Error al actualizar el producto');
                }

                // Éxito
                editFormMessage.textContent = '✓ Producto actualizado correctamente';
                editFormMessage.classList.add('success');

                closeEditModal();
                // Recargar productos manteniendo filtros
                loadProducts();

            } catch (error) {
                console.error('Error al actualizar producto:', error);
                editFormMessage.textContent = `Error: ${error.message}`;
                editFormMessage.classList.add('error');
            }
        });
    }

    // ===============================
    // LISTENERS Y EJECUCIÓN INICIAL
    // ===============================

    // LISTENERS DE ORDENAMIENTO
    const sortableHeaders = document.querySelectorAll('#productos-section .data-table th[data-sort-by]');
    sortableHeaders.forEach(th => {
        th.addEventListener('click', handleSortClick);
    });

    // ==========================================================
    // FILTRO POR BÚSQUEDA
    // ==========================================================

    function filtrarProductosPorBusqueda() {
        if (!productTableBody) return;

        const textoBusqueda = removeAccents(productSearchInputElement.value.toLowerCase().trim());

        // Agregar animación de fade out
        productTableBody.classList.add('loading');

        // Esperar un poco para la animación
        setTimeout(() => {
            if (textoBusqueda === '') {
                productosBuscados = null;
            } else {
                productosBuscados = todosLosProductos.filter(producto => {
                    // Buscar en nombre del producto (sin acentos)
                    const coincideNombre = producto.nombre &&
                        removeAccents(producto.nombre.toLowerCase()).includes(textoBusqueda);

                    // Buscar en categoría (sin acentos)
                    const coincideCategoria = producto.categoria &&
                        removeAccents(producto.categoria.toLowerCase()).includes(textoBusqueda);

                    // Buscar en descripción (sin acentos)
                    const coincideDescripcion = producto.descripcion &&
                        removeAccents(producto.descripcion.toLowerCase()).includes(textoBusqueda);

                    return coincideNombre || coincideCategoria || coincideDescripcion;
                });
            }

            // Renderizar tabla con filtros aplicados
            const productosAMostrar = aplicarFiltros();
            renderProductTable(productosAMostrar);

            // Mostrar mensaje si no hay resultados
            if (productosAMostrar.length === 0 && textoBusqueda !== '') {
                productTableBody.innerHTML = '<tr><td colspan="5">No se encontraron productos que coincidan con la búsqueda.</td></tr>';
            }

            // Remover animación de loading (fade in)
            requestAnimationFrame(() => {
                productTableBody.classList.remove('loading');
            });
        }, 150); // Delay de 150ms para la animación
    }

    function aplicarFiltros() {
        let productosResultado = todosLosProductos;

        // Aplicar filtro de búsqueda si existe
        if (productosBuscados !== null) {
            productosResultado = productosBuscados;
        }

        return productosResultado;
    }

    function limpiarBusqueda() {
        if (productSearchInputElement) {
            productSearchInputElement.value = '';
        }

        // Agregar animación de fade out
        productTableBody.classList.add('loading');

        // Esperar un poco para la animación
        setTimeout(() => {
            productosBuscados = null;
            const productosAMostrar = aplicarFiltros();
            renderProductTable(productosAMostrar);

            // Remover animación de loading (fade in)
            requestAnimationFrame(() => {
                productTableBody.classList.remove('loading');
            });
        }, 150); // Delay de 150ms para la animación
    }

    // Event listeners para búsqueda en tiempo real con debounce
    if (productSearchInputElement) {
        productSearchInputElement.addEventListener('input', () => {
            // Cancelar búsqueda anterior si existe
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            // Esperar 200ms después de que el usuario deja de escribir
            searchTimeout = setTimeout(() => {
                filtrarProductosPorBusqueda();
            }, 100);
        });
    }

    if (productBtnLimpiar) {
        productBtnLimpiar.addEventListener('click', limpiarBusqueda);
    }

    // ==========================================================
    // FUNCIONALIDAD DE MODAL DE ELIMINACIÓN
    // ==========================================================

    // Función para abrir modal de eliminación
    function openDeleteModal(productId, productName) {
        deleteProductId = productId;
        deleteModalMessage.textContent = `¿Estás seguro de que deseas eliminar "${productName}"?`;
        deleteModal.style.display = 'flex';
    }

    // Función para cerrar modal de eliminación
    function closeDeleteModal() {
        deleteModal.style.display = 'none';
        deleteProductId = null;
    }

    // Event listener para cerrar modal
    if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }

    // Manejar confirmación de eliminación
    if (deleteConfirmBtn) {
        deleteConfirmBtn.addEventListener('click', async () => {
            if (!deleteProductId) {
                alert('¡Error! No se pudo identificar el producto a eliminar.');
                return;
            }

            try {
                // Deshabilitar botón para evitar clics múltiples
                deleteConfirmBtn.disabled = true;
                deleteConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

                // Enviar DELETE request
                const response = await fetch(`${API_PRODUCTOS_URL}/${deleteProductId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al eliminar el producto');
                }

                // \u00c9xito - mostrar mensaje y cerrar

                closeDeleteModal();
                // Recargar productos manteniendo filtros
                loadProducts();

                // Restaurar botón
                deleteConfirmBtn.disabled = false;
                deleteConfirmBtn.textContent = 'Aceptar';

            } catch (error) {
                console.error('Error al eliminar producto:', error);
                alert(`Error al eliminar: ${error.message}`);

                // Rehabilitar botón
                deleteConfirmBtn.disabled = false;
                deleteConfirmBtn.textContent = 'Aceptar';
            }
        });
    }

    // ==========================================================
    // CARGA INICIAL
    // ==========================================================
    loadProducts();
    loadCategoriasParaProductos();
});