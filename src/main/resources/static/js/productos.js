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
            const url = `${API_PRODUCTOS_URL}?page=${currentPage}&size=${itemsPerPage}${sortParam}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const pageData = await response.json();
            totalPages = pageData.totalPages;

            // 3. Renderizar y finalizar animación
            renderProductTable(pageData.content);
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
            productTableBody.innerHTML = `<tr><td colspan="6">Error al cargar productos.</td></tr>`;
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

    function filtrarCategorias() {
        const query = categorySearchInput.value.toLowerCase();
        const categoriasFiltradas = todasLasCategorias.filter(c =>
            c.nombre.toLowerCase().includes(query)
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
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}`);
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
        categorySearchInput.addEventListener('input', filtrarCategorias);
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
    });

    // ===========================================================

    // ===============================
    // FUNCIÓN PARA RENDERIZAR LA TABLA
    // ===============================
    function renderProductTable(products) {
        if (!productTableBody) return;

        productTableBody.innerHTML = '';
        if (products.length === 0) {
            productTableBody.innerHTML = '<tr><td colspan="6">No hay productos registrados.</td></tr>';
            return;
        }

        products.forEach(product => {
            let fechaFormateada = "N/A";
            if (product.fechaCreacion) {
                const parts = product.fechaCreacion.split('-');
                fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            // NOTA: Se asume que el backend devuelve stockMinimo y stockMaximo correctamente en ProductoResponseDTO
            const row = `
                <tr>
                    <td>${product.nombre || 'N/A'}</td>
                    <td>${product.categoria || 'N/A'}</td>
                    <td>${product.descripcion || 'N/A'}</td>
                    <td>${fechaFormateada}</td>
                    <td>${product.stockMinimo}</td>
                    <td>${product.stockMaximo}</td>
                </tr>
            `;
            productTableBody.innerHTML += row;
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
            if (isValid && stockMinimo >= stockMaximo) { stockMaxError.textContent = 'El máx. debe ser mayor que el mín.'; isValid = false; }
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

                // Volver a la vista de lista
                showSubsection('productos-list');

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
    // LISTENERS Y EJECUCIÓN INICIAL
    // ===============================

    // LISTENERS DE ORDENAMIENTO
    const sortableHeaders = document.querySelectorAll('#productos-section .data-table th[data-sort-by]');
    sortableHeaders.forEach(th => {
        th.addEventListener('click', handleSortClick);
    });

    // CARGA INICIAL
    loadProducts();
    loadCategoriasParaProductos();
});