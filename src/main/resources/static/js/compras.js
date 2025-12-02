document.addEventListener('DOMContentLoaded', function () {

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_PRODUCTOS_URL_SELECT_ALL = '/api/productos/select';
    const API_COMPRAS_URL = '/api/compras';
    const API_PROVEEDORES_URL = '/api/proveedores/select';
    const API_PRODUCTOS_URL_BASE = '/api/productos';

    // ===============================
    // CONFIGURACIÓN DE FORMATO
    // ===============================
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    function parsearMoneda(valor) {
        if (!valor) return NaN;
        const limpio = valor.toString().replace(/\./g, '').replace(',', '.');
        return parseFloat(limpio);
    }

    // ===============================
    // ESTADO GLOBAL
    // ===============================
    let detalleItems = [];
    let todosLosProveedores = [];
    let todosLosProductos = [];
    let editIndex = -1; // Index of item being edited inline
    let originalItemData = null; // Backup of original data for cancel

    // ===============================
    // SELECTORES
    // ===============================
    const compraForm = document.getElementById('compra-form');
    const generalMessageCompra = document.getElementById('form-general-message-compra');

    const proveedorSearchInput = document.getElementById('compra-proveedor-search');
    const proveedorHiddenInput = document.getElementById('compra-proveedor-id-hidden');
    const proveedorResultsContainer = document.getElementById('compra-proveedor-results');
    const proveedorError = document.getElementById('errorCompraProveedor');

    const productoSearchInput = document.getElementById('compra-producto-search');
    const productoHiddenInput = document.getElementById('compra-producto-id-hidden');
    const productoResultsContainer = document.getElementById('compra-producto-results');
    const productoError = document.getElementById('errorCompraProducto');

    const addDetalleBtn = document.getElementById('add-detalle-btn');
    const cantidadInput = document.getElementById('compra-cantidad');
    const costoInput = document.getElementById('compra-costo-unit');
    const ventaInput = document.getElementById('compra-venta-unit');
    const detalleTemporalTabla = document.getElementById('compra-detalle-temporal');
    const totalDisplay = document.getElementById('compra-total-display');
    const errorDetalleGeneral = document.getElementById('errorDetalleGeneral');

    const historialTabla = document.getElementById('compras-historial-tabla-body');
    const historialPrevPageBtn = document.getElementById('compras-prev-page');
    const historialNextPageBtn = document.getElementById('compras-next-page');
    const historialPageInfo = document.getElementById('compras-page-info');
    const historialTableHeaders = document.querySelectorAll('#compras-section .data-table th[data-sort-by]');
    const mainContent = document.querySelector('.main-content');
    const comprasSearchInput = document.getElementById('compras-search-input');

    let historialCurrentPage = 0;
    let historialTotalPages = 1;
    const historialItemsPerPage = 10;
    let historialSortField = 'fecha';
    let historialSortDirection = 'desc';

    // Variable para rastrear el proveedor anterior
    let previousProveedorId = null;
    let previousProveedorNombre = '';

    // ==========================================================
    // FUNCIONES AUXILIARES
    // ==========================================================

    // Función para establecer la fecha actual en el campo de fecha
    function establecerFechaActual() {
        const fechaInput = document.getElementById('compra-fecha');
        if (fechaInput && !fechaInput.value) {
            const hoy = new Date();
            const year = hoy.getFullYear();
            const month = String(hoy.getMonth() + 1).padStart(2, '0');
            const day = String(hoy.getDate()).padStart(2, '0');
            fechaInput.value = `${year}-${month}-${day}`;
        }
    }

    // ==========================================================
    // LÓGICA DE CARGA DE DATOS
    // ==========================================================

    async function loadProveedoresParaCompra() {
        if (!proveedorSearchInput) return;
        try {
            const response = await fetch(API_PROVEEDORES_URL);
            if (!response.ok) throw new Error('Error al cargar proveedores');
            todosLosProveedores = await response.json();
            console.log("Proveedores actualizados en Compras:", todosLosProveedores.length);
        } catch (error) {
            console.error(error);
            proveedorSearchInput.placeholder = "Error al cargar proveedores";
        }
    }

    async function fetchProductosDelProveedor(idProveedor) {
        if (!productoSearchInput) return;
        todosLosProductos = [];

        try {
            const response = await fetch(`${API_PRODUCTOS_URL_BASE}/por-proveedor/${idProveedor}`);
            if (!response.ok) throw new Error('No se pudieron cargar los productos');
            todosLosProductos = await response.json();

            if (todosLosProductos.length > 0) {
                productoSearchInput.placeholder = "Buscar producto...";
                productoSearchInput.disabled = false;
            } else {
                productoSearchInput.placeholder = "Este proveedor no tiene productos";
            }
        } catch (error) {
            console.error(error);
            productoSearchInput.placeholder = "Error al cargar productos";
        }
    }

    // ==========================================================
    // BUSCADOR PROVEEDORES
    // ==========================================================

    function renderResultadosProveedores(proveedores) {
        if (proveedores.length === 0) {
            proveedorResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron proveedores</div>';
        } else {
            proveedorResultsContainer.innerHTML = proveedores.map(p => {
                return `<div class="product-result-item" data-id="${p.id}">${p.nombre}</div>`;
            }).join('');
        }
        proveedorResultsContainer.style.display = 'block';
    }

    function filtrarProveedores() {
        const query = proveedorSearchInput.value.toLowerCase();
        const proveedoresFiltrados = todosLosProveedores.filter(p => {
            return p.nombre.toLowerCase().includes(query);
        });
        renderResultadosProveedores(proveedoresFiltrados);
    }

    function seleccionarProveedor(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const proveedorIdNum = parseInt(target.dataset.id, 10);
        if (isNaN(proveedorIdNum)) return;

        const proveedor = todosLosProveedores.find(p => p.id === proveedorIdNum);

        if (proveedor) {
            const newProveedorId = proveedor.id.toString();
            const newProveedorNombre = proveedor.nombre;

            // Verificar si hay productos en el detalle y si el proveedor es diferente
            if (detalleItems.length > 0 && previousProveedorId && newProveedorId !== previousProveedorId) {
                showConfirmationModal(
                    `Ya tienes ${detalleItems.length} producto${detalleItems.length > 1 ? 's' : ''} agregado${detalleItems.length > 1 ? 's' : ''}.\nCambiar de proveedor borrará el detalle actual.\n¿Deseas continuar?`,
                    () => {
                        // Usuario confirmó: limpiar detalle y cambiar proveedor
                        detalleItems = [];
                        renderDetalleTemporal();
                        proveedorSearchInput.value = newProveedorNombre;
                        proveedorHiddenInput.value = newProveedorId;
                        previousProveedorId = newProveedorId;
                        previousProveedorNombre = newProveedorNombre;
                        fetchProductosDelProveedor(newProveedorId);
                        proveedorResultsContainer.style.display = 'none';
                        if (proveedorError) proveedorError.textContent = '';
                        productoSearchInput.value = '';
                        productoHiddenInput.value = '';
                    },
                    () => {
                        // Usuario canceló: revertir al proveedor anterior
                        proveedorSearchInput.value = previousProveedorNombre;
                        proveedorHiddenInput.value = previousProveedorId;
                        proveedorResultsContainer.style.display = 'none';
                    }
                );
            } else {
                // No hay productos o es el mismo proveedor: cambiar sin confirmación
                proveedorSearchInput.value = newProveedorNombre;
                proveedorHiddenInput.value = newProveedorId;
                previousProveedorId = newProveedorId;
                previousProveedorNombre = newProveedorNombre;
                fetchProductosDelProveedor(newProveedorId);
                proveedorResultsContainer.style.display = 'none';
                if (proveedorError) proveedorError.textContent = '';
                productoSearchInput.value = '';
                productoHiddenInput.value = '';
            }
        }
    }

    if (proveedorSearchInput) {
        proveedorSearchInput.addEventListener('input', () => {
            proveedorHiddenInput.value = '';
            if (proveedorError) proveedorError.textContent = '';
            filtrarProveedores();
            if (proveedorSearchInput.value.trim() === '') {
                todosLosProductos = [];
                productoSearchInput.value = '';
                productoHiddenInput.value = '';
                productoSearchInput.placeholder = "Seleccione un proveedor primero";
                productoSearchInput.disabled = true;
            }
        });
        proveedorSearchInput.addEventListener('focus', filtrarProveedores);
        proveedorSearchInput.addEventListener('click', function () {
            if (this.value) {
                this.select();
            }
            filtrarProveedores();
        });
    }
    if (proveedorResultsContainer) proveedorResultsContainer.addEventListener('click', seleccionarProveedor);

    // ==========================================================
    // BUSCADOR PRODUCTOS
    // ==========================================================

    function renderResultadosProductos(productos) {
        if (productos.length === 0) {
            productoResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron productos</div>';
        } else {
            productoResultsContainer.innerHTML = productos.map(p => {
                return `<div class="product-result-item" data-id="${p.idProducto}">
                    ${p.nombreProducto} <span>($${formatoMoneda.format(p.precioVenta)})</span>
                </div>`;
            }).join('');
        }
        productoResultsContainer.style.display = 'block';
    }

    function filtrarProductos() {
        const query = productoSearchInput.value.toLowerCase();
        const productosFiltrados = todosLosProductos.filter(p => {
            return p.nombreProducto.toLowerCase().includes(query);
        });
        renderResultadosProductos(productosFiltrados);
    }

    function seleccionarProducto(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const productoIdNum = parseInt(target.dataset.id, 10);
        if (isNaN(productoIdNum)) return;

        const producto = todosLosProductos.find(p => p.idProducto === productoIdNum);

        if (producto) {
            productoSearchInput.value = producto.nombreProducto;
            productoHiddenInput.value = producto.idProducto;
            productoResultsContainer.style.display = 'none';
            if (productoError) productoError.textContent = '';
            if (ventaInput) ventaInput.value = formatoMoneda.format(producto.precioVenta);
        }
    }

    if (productoSearchInput) {
        productoSearchInput.addEventListener('input', () => {
            productoHiddenInput.value = '';
            if (productoError) productoError.textContent = '';
            filtrarProductos();
        });
        productoSearchInput.addEventListener('focus', filtrarProductos);
        productoSearchInput.addEventListener('click', function () {
            if (this.value) {
                this.select();
            }
            filtrarProductos();
        });
    }
    if (productoResultsContainer) productoResultsContainer.addEventListener('click', seleccionarProducto);

    document.addEventListener('click', function (event) {
        if (proveedorSearchInput && !proveedorSearchInput.contains(event.target) && proveedorResultsContainer && !proveedorResultsContainer.contains(event.target)) {
            proveedorResultsContainer.style.display = 'none';
        }
        if (productoSearchInput && !productoSearchInput.contains(event.target) && productoResultsContainer && !productoResultsContainer.contains(event.target)) {
            productoResultsContainer.style.display = 'none';
        }
    });

    // ===============================================
    // CARRITO COMPRAS
    // ===============================================

    // Función helper para auto-ocultar errores después de 4 segundos
    function autoOcultarErrores() {
        const errorElements = document.querySelectorAll('#compra-form .error-message');
        errorElements.forEach(el => {
            if (el.textContent.trim() !== '') {
                setTimeout(() => {
                    el.textContent = '';
                }, 4000);
            }
        });
    }

    function renderDetalleTemporal() {
        if (!detalleTemporalTabla || !totalDisplay) return;
        detalleTemporalTabla.innerHTML = '';
        let totalCompra = 0;
        if (detalleItems.length === 0) detalleTemporalTabla.innerHTML = '<tr><td colspan="7">Aún no has agregado productos.</td></tr>';

        detalleItems.forEach((item, index) => {
            const subtotal = item.cantidad * item.precioUnitario;
            totalCompra += subtotal;
            const row = document.createElement('tr');

            // Check if this row is in edit mode
            if (editIndex === index) {
                row.innerHTML = `
                    <td>${item.nombreProducto}</td>
                    <td><input type="number" class="inline-edit-input" id="inline-cantidad-${index}" value="${item.cantidad}" min="1"></td>
                    <td><input type="text" class="inline-edit-input" id="inline-costo-${index}" value="${formatoMoneda.format(item.precioUnitario)}"></td>
                    <td><input type="text" class="inline-edit-input" id="inline-venta-${index}" value="${formatoMoneda.format(item.nuevoPrecioVenta)}"></td>
                    <td>$${formatoMoneda.format(subtotal)}</td>
                    <td>
                        <button type="button" class="btn-icon btn-success btn-guardar-inline" data-index="${index}" title="Guardar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button type="button" class="btn-icon btn-secondary" onclick="cancelarEdicionInline()" title="Cancelar">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                `;
            } else {
                row.innerHTML = `
                    <td>${item.nombreProducto}</td>
                    <td>${item.cantidad}</td>
                    <td>$${formatoMoneda.format(item.precioUnitario)}</td>
                    <td>$${formatoMoneda.format(item.nuevoPrecioVenta)}</td>
                    <td>$${formatoMoneda.format(subtotal)}</td>
                    <td>
                        <button type="button" class="btn-icon btn-warning btn-editar-item" data-index="${index}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-icon btn-danger btn-quitar-item" data-index="${index}" title="Quitar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
            }
            detalleTemporalTabla.appendChild(row);
        });
        totalDisplay.textContent = `$ Total Compra: $${formatoMoneda.format(totalCompra)}`;

        document.querySelectorAll('.btn-quitar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.currentTarget.dataset.index);
                // If we're editing this item, clear edit state
                if (editIndex === indexToRemove) {
                    editIndex = -1;
                    originalItemData = null;
                } else if (editIndex > indexToRemove) {
                    editIndex--;
                }
                detalleItems.splice(indexToRemove, 1);
                renderDetalleTemporal();
            });
        });

        document.querySelectorAll('.btn-editar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const indexToEdit = parseInt(e.currentTarget.dataset.index);
                activarEdicionInline(indexToEdit);
            });
        });

        document.querySelectorAll('.btn-guardar-inline').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const indexToSave = parseInt(e.currentTarget.dataset.index);
                guardarEdicionInline(indexToSave);
            });
        });
    }

    function activarEdicionInline(index) {
        // Save original data for cancel
        originalItemData = JSON.parse(JSON.stringify(detalleItems[index]));
        editIndex = index;
        renderDetalleTemporal();
    }

    function guardarEdicionInline(index) {
        const cantidadInput = document.getElementById(`inline-cantidad-${index}`);
        const costoInput = document.getElementById(`inline-costo-${index}`);
        const ventaInput = document.getElementById(`inline-venta-${index}`);

        const cantidad = parseInt(cantidadInput.value);
        const precioUnitario = parsearMoneda(costoInput.value);
        const nuevoPrecioVenta = parsearMoneda(ventaInput.value);

        // Validate inputs
        let isValid = true;
        if (isNaN(cantidad) || cantidad <= 0) {
            cantidadInput.style.border = '2px solid red';
            isValid = false;
        }
        if (isNaN(precioUnitario) || precioUnitario <= 0) {
            costoInput.style.border = '2px solid red';
            isValid = false;
        }
        if (isNaN(nuevoPrecioVenta) || nuevoPrecioVenta < 0) {
            ventaInput.style.border = '2px solid red';
            isValid = false;
        }

        if (!isValid) return;

        // Update the item
        detalleItems[index].cantidad = cantidad;
        detalleItems[index].precioUnitario = precioUnitario;
        detalleItems[index].nuevoPrecioVenta = nuevoPrecioVenta;

        // Clear edit state
        editIndex = -1;
        originalItemData = null;
        renderDetalleTemporal();
    }

    function cancelarEdicionInline() {
        if (editIndex >= 0 && originalItemData) {
            // Restore original data
            detalleItems[editIndex] = originalItemData;
        }
        editIndex = -1;
        originalItemData = null;
        renderDetalleTemporal();
    }

    // Expose cancelarEdicionInline globally for inline onclick
    window.cancelarEdicionInline = cancelarEdicionInline;

    function handleAgregarDetalle() {
        document.querySelectorAll('#compra-form .error-message').forEach(el => el.textContent = '');
        errorDetalleGeneral.textContent = '';

        const idProducto = productoHiddenInput.value;
        const nombreProducto = productoSearchInput.value;
        const idProductoNum = parseInt(idProducto);
        const cantidad = parseInt(cantidadInput.value);
        const precioUnitario = parsearMoneda(costoInput.value);
        const nuevoPrecioVenta = parsearMoneda(ventaInput.value);

        let isValid = true;
        if (!idProducto) { if (productoError) productoError.textContent = 'Seleccione un producto.'; isValid = false; }
        if (isNaN(cantidad) || cantidad <= 0) { document.getElementById('errorCompraCantidad').textContent = 'Cantidad inválida.'; isValid = false; }
        if (isNaN(precioUnitario) || precioUnitario <= 0) { document.getElementById('errorCompraCosto').textContent = 'Costo inválido.'; isValid = false; }
        if (isNaN(nuevoPrecioVenta) || nuevoPrecioVenta < 0) { document.getElementById('errorCompraVenta').textContent = 'Precio de venta inválido.'; isValid = false; }

        // Check for duplicates
        if (isValid && detalleItems.some(item => item.idProducto === idProductoNum)) {
            if (productoError) productoError.textContent = 'Este producto ya está en el detalle.';
            isValid = false;
        }

        if (!isValid) {
            autoOcultarErrores();
            return;
        }

        detalleItems.push({
            idProducto: idProductoNum,
            nombreProducto: nombreProducto,
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            nuevoPrecioVenta: nuevoPrecioVenta
        });

        renderDetalleTemporal();
        productoSearchInput.value = '';
        productoHiddenInput.value = '';
        cantidadInput.value = '1';
        costoInput.value = '';
        ventaInput.value = '';
        productoSearchInput.focus();
    }

    if (addDetalleBtn) addDetalleBtn.addEventListener('click', handleAgregarDetalle);

    if (compraForm) {
        compraForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            document.querySelectorAll('#compra-form .error-message').forEach(el => el.textContent = '');
            if (generalMessageCompra) { generalMessageCompra.textContent = ''; generalMessageCompra.className = 'form-message'; }

            let isValid = true;
            const fecha = document.getElementById('compra-fecha').value;
            const idProveedor = proveedorHiddenInput.value;

            if (!fecha) { document.getElementById('errorCompraFecha').textContent = 'La fecha es obligatoria.'; isValid = false; }
            if (!idProveedor) { document.getElementById('errorCompraProveedor').textContent = 'El proveedor es obligatorio.'; isValid = false; }
            if (detalleItems.length === 0) { if (errorDetalleGeneral) errorDetalleGeneral.textContent = 'Debe agregar al menos un producto al detalle.'; isValid = false; }
            if (!isValid) {
                if (generalMessageCompra) {
                    generalMessageCompra.textContent = "Debe completar todos los campos correctamente.";
                    generalMessageCompra.classList.add('error');
                    setTimeout(() => {
                        generalMessageCompra.textContent = '';
                        generalMessageCompra.className = 'form-message';
                    }, 4000);
                }
                autoOcultarErrores();
                return;
            }

            showConfirmationModal("¿Estás seguro de que deseas registrar esta compra?", async () => {
                const compraRequestDTO = { fecha: fecha, idProveedor: parseInt(idProveedor), detalleCompras: detalleItems };
                try {
                    const response = await fetch(API_COMPRAS_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(compraRequestDTO)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
                    }

                    // Mostrar banner de éxito grande y destacado
                    const successBanner = document.getElementById('success-banner');
                    if (successBanner) {
                        successBanner.classList.add('show');
                        // Auto-ocultar después de 5 segundos
                        setTimeout(() => {
                            successBanner.classList.remove('show');
                        }, 5000);
                    }

                    compraForm.reset();
                    detalleItems = [];
                    renderDetalleTemporal();
                    proveedorSearchInput.value = '';
                    proveedorHiddenInput.value = '';
                    previousProveedorId = null;
                    previousProveedorNombre = '';
                    productoSearchInput.value = '';
                    productoHiddenInput.value = '';
                    todosLosProductos = [];
                    if (productoSearchInput) { productoSearchInput.placeholder = "Seleccione un proveedor primero"; productoSearchInput.disabled = true; }

                    await new Promise(resolve => setTimeout(resolve, 250));
                    historialCurrentPage = 0;
                    loadComprasHistorial();
                    // Permanece en la sección de registro para facilitar múltiples registros

                    document.dispatchEvent(new Event('productosActualizados'));
                    document.dispatchEvent(new Event('comprasActualizadas'));

                } catch (error) {
                    console.error('Error al registrar la compra:', error);
                    if (generalMessageCompra) { generalMessageCompra.textContent = `Error al registrar: ${error.message}`; generalMessageCompra.classList.add('error'); }
                }
            });
        });
    }

    // ===============================================
    // HISTORIAL
    // ===============================================

    // Variables para filtro de fechas y búsqueda
    let todasLasCompras = []; // Almacena todas las compras sin filtrar
    let comprasFiltradas = null; // Compras filtradas por fecha
    let comprasBuscadas = null; // Compras filtradas por búsqueda

    async function loadComprasHistorial() {
        if (!historialTabla || !mainContent) return;
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        historialTabla.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const sortParam = historialSortField ? `&sort=${historialSortField},${historialSortDirection}` : '';
            const url = `${API_COMPRAS_URL}?page=${historialCurrentPage}&size=${historialItemsPerPage}${sortParam}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const pageData = await response.json();
            historialTotalPages = pageData.totalPages;
            todasLasCompras = pageData.content; // Guardar todas las compras

            // Aplicar filtros (búsqueda y fechas)
            const comprasAMostrar = aplicarFiltros();
            renderComprasTabla(comprasAMostrar);
            updateHistorialPaginationControls();
            updateHistorialSortIndicators();
            requestAnimationFrame(() => { window.scrollTo(0, scrollPosition); historialTabla.classList.remove('loading'); });
        } catch (error) {
            console.error('Error al cargar el historial de compras:', error);
            historialTabla.innerHTML = `<tr><td colspan="6">Error al cargar historial.</td></tr>`;
            historialTabla.classList.remove('loading');
        }
    }

    function renderComprasTabla(compras) {
        if (!historialTabla) return;
        historialTabla.innerHTML = '';
        if (compras.length === 0) { historialTabla.innerHTML = '<tr><td colspan="6">No hay compras registradas.</td></tr>'; return; }

        compras.forEach(compra => {
            // Mostrar máximo 2 productos, si hay más agregar "+X más..."
            let productosTexto = 'Sin productos';
            let costosTexto = 'N/A';

            if (compra.productosComprados && compra.productosComprados.length > 0) {
                const productos = compra.productosComprados;
                const maxProductos = 2;

                if (productos.length <= maxProductos) {
                    // Mostrar todos los productos
                    productosTexto = productos.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>');
                    costosTexto = productos.map(p => `$${formatoMoneda.format(p.precioUnitario || 0)}`).join('<br>');
                } else {
                    // Mostrar solo los primeros 2 + contador
                    const productosAMostrar = productos.slice(0, maxProductos);
                    const productosRestantes = productos.length - maxProductos;
                    productosTexto = productosAMostrar.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>') +
                        `<br><span style="color: #666; font-style: italic;">+${productosRestantes} más...</span>`;
                    costosTexto = productosAMostrar.map(p => `$${formatoMoneda.format(p.precioUnitario || 0)}`).join('<br>') +
                        '<br><span style="color: #666;">...</span>';
                }
            }
            const totalFormateado = `$${formatoMoneda.format(compra.total || 0)}`;
            let fechaFormateada = compra.fecha || 'N/A';
            if (typeof fechaFormateada === 'string' && fechaFormateada.includes('-')) {
                const partes = fechaFormateada.split('T')[0].split('-');
                fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
            const row = `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${compra.nombreProveedor || 'N/A'}</td>
                    <td>${productosTexto}</td>
                    <td>${costosTexto}</td> 
                    <td>${totalFormateado}</td>
                    <td>
                        <button type="button" class="btn-icon btn-primary" onclick="mostrarDetalleCompra(${compra.id})" title="Ver Detalle">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>`;
            historialTabla.innerHTML += row;
        });
    }

    function updateHistorialPaginationControls() {
        if (!historialPageInfo) return;
        historialPageInfo.textContent = `Página ${historialCurrentPage + 1} de ${historialTotalPages || 1}`;
        historialPrevPageBtn.disabled = (historialCurrentPage === 0);
        historialNextPageBtn.disabled = (historialCurrentPage + 1 >= historialTotalPages);
    }

    if (historialPrevPageBtn) historialPrevPageBtn.addEventListener('click', (e) => { e.preventDefault(); if (historialCurrentPage > 0) { historialCurrentPage--; loadComprasHistorial(); } });
    if (historialNextPageBtn) historialNextPageBtn.addEventListener('click', (e) => { e.preventDefault(); if (historialCurrentPage + 1 < historialTotalPages) { historialCurrentPage++; loadComprasHistorial(); } });

    function handleHistorialSortClick(event) {
        event.preventDefault();
        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');
        if (!newSortField) return;
        if (historialSortField === newSortField) { historialSortDirection = historialSortDirection === 'asc' ? 'desc' : 'asc'; } else { historialSortField = newSortField; historialSortDirection = 'asc'; }
        historialCurrentPage = 0;
        loadComprasHistorial();
    }

    function updateHistorialSortIndicators() {
        historialTableHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'sort-icon fas fa-sort';
            if (th.getAttribute('data-sort-by') === historialSortField) {
                th.classList.add(`sort-${historialSortDirection}`);
                if (icon) icon.className = `sort-icon fas fa-sort-${historialSortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });
    }

    historialTableHeaders.forEach(header => { header.addEventListener('click', handleHistorialSortClick); });

    // ==========================================================
    // FUNCIÓN LIMPIAR FORMULARIO
    // ==========================================================
    function limpiarFormularioCompra() {
        // Limpiar campos del formulario
        if (compraForm) compraForm.reset();

        // Limpiar errores
        document.querySelectorAll('#compra-form .error-message').forEach(el => el.textContent = '');
        if (generalMessageCompra) {
            generalMessageCompra.textContent = '';
            generalMessageCompra.className = 'form-message';
        }

        // Limpiar inputs ocultos y búsquedas
        proveedorSearchInput.value = '';
        proveedorHiddenInput.value = '';
        productoSearchInput.value = '';
        productoHiddenInput.value = '';

        // Limpiar detalle de compra
        detalleItems = [];
        renderDetalleTemporal();

        // Resetear proveedor anterior
        previousProveedorId = null;
        previousProveedorNombre = '';

        // Deshabilitar búsqueda de productos
        productoSearchInput.disabled = true;
        productoSearchInput.placeholder = "Seleccione un proveedor primero";
        todosLosProductos = [];

        // Establecer fecha actual nuevamente
        establecerFechaActual();
    }

    // Event listener para el botón limpiar
    const btnLimpiarForm = document.getElementById('limpiar-form-compra');
    if (btnLimpiarForm) {
        btnLimpiarForm.addEventListener('click', limpiarFormularioCompra);
    }

    // ==========================================================
    // CARGA INICIAL Y EXPOSICIÓN
    // ==========================================================
    loadProveedoresParaCompra();
    loadComprasHistorial();
    renderDetalleTemporal();
    establecerFechaActual(); // Establecer fecha actual al cargar
    if (productoSearchInput) { productoSearchInput.disabled = true; productoSearchInput.placeholder = "Seleccione un proveedor primero"; }

    window.cargarDatosCompras = async function () {
        await loadProveedoresParaCompra();
        if (historialCurrentPage === 0) { loadComprasHistorial(); }
        const idProveedorSeleccionado = proveedorHiddenInput.value;
        if (idProveedorSeleccionado) { fetchProductosDelProveedor(idProveedorSeleccionado); }
        establecerFechaActual(); // Establecer fecha actual al recargar datos
    };

    // Escucha actualizaciones de productos (ej: stock, precios)
    document.addEventListener('productosActualizados', function () {
        console.log('Compras.js: Detectados cambios en productos/stock. Recargando...');
        window.cargarDatosCompras();
    });

    // Escucha actualizaciones de proveedores (nuevo proveedor creado)
    document.addEventListener('proveedoresActualizados', function () {
        console.log('Compras.js: Detectado cambio en proveedores. Recargando lista...');
        loadProveedoresParaCompra();
    });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores que sean de compras
        subsectionContainers.forEach(container => {
            if (container.id.startsWith('compras-')) {
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
    window.showComprasSubsection = showSubsection;

    // ==========================================================
    // FILTRO POR FECHAS
    // ==========================================================

    const btnFiltrar = document.getElementById('compras-btn-filtrar');
    const btnLimpiarFiltro = document.getElementById('compras-btn-limpiar-filtro');
    const btnExportarPdf = document.getElementById('compras-btn-exportar-pdf');
    const fechaInicio = document.getElementById('compras-fecha-inicio');
    const fechaFin = document.getElementById('compras-fecha-fin');
    const filtroError = document.getElementById('compras-filtro-error');

    // Función helper para mostrar mensajes de error inline
    function mostrarErrorFiltro(mensaje) {
        if (filtroError) {
            filtroError.textContent = mensaje;
            filtroError.style.display = 'block';
            // Auto-ocultar después de 4 segundos
            setTimeout(() => {
                filtroError.style.display = 'none';
            }, 4000);
        }
    }

    function ocultarErrorFiltro() {
        if (filtroError) {
            filtroError.style.display = 'none';
            filtroError.textContent = '';
        }
    }

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', filtrarComprasPorFecha);
    }

    if (btnLimpiarFiltro) {
        btnLimpiarFiltro.addEventListener('click', limpiarFiltroFechas);
    }

    if (btnExportarPdf) {
        btnExportarPdf.addEventListener('click', exportarPdfCompras);
    }

    // Ocultar error cuando el usuario modifica las fechas
    if (fechaInicio) {
        fechaInicio.addEventListener('change', ocultarErrorFiltro);
    }
    if (fechaFin) {
        fechaFin.addEventListener('change', ocultarErrorFiltro);
    }

    // ==========================================================
    // FILTRO POR BÚSQUEDA
    // ==========================================================

    function filtrarComprasPorBusqueda() {
        if (!comprasSearchInput) return;

        const textoBusqueda = comprasSearchInput.value.toLowerCase().trim();

        if (textoBusqueda === '') {
            comprasBuscadas = null;
        } else {
            comprasBuscadas = todasLasCompras.filter(compra => {
                // Buscar en nombre del proveedor
                const coincideProveedor = compra.nombreProveedor &&
                    compra.nombreProveedor.toLowerCase().includes(textoBusqueda);

                // Buscar en nombres de productos
                const coincideProducto = compra.productosComprados &&
                    compra.productosComprados.some(p =>
                        p.nombreProducto && p.nombreProducto.toLowerCase().includes(textoBusqueda)
                    );

                return coincideProveedor || coincideProducto;
            });
        }

        // Renderizar tabla con filtros aplicados
        const comprasAMostrar = aplicarFiltros();
        renderComprasTabla(comprasAMostrar);
    }

    function aplicarFiltros() {
        let comprasResultado = todasLasCompras;

        // Aplicar filtro de búsqueda
        if (comprasBuscadas !== null) {
            comprasResultado = comprasBuscadas;
        }

        // Aplicar filtro de fechas sobre el resultado anterior
        if (comprasFiltradas !== null) {
            // Si hay búsqueda activa, filtrar las compras buscadas por fecha
            if (comprasBuscadas !== null) {
                const inicio = fechaInicio.value;
                const fin = fechaFin.value;
                const fechaInicioDate = new Date(inicio);
                const fechaFinDate = new Date(fin);

                comprasResultado = comprasBuscadas.filter(compra => {
                    if (!compra.fecha) return false;
                    let fechaCompra;
                    if (Array.isArray(compra.fecha)) {
                        fechaCompra = new Date(compra.fecha[0], compra.fecha[1] - 1, compra.fecha[2]);
                    } else if (typeof compra.fecha === 'string') {
                        fechaCompra = new Date(compra.fecha.split('T')[0]);
                    } else {
                        return false;
                    }
                    return fechaCompra >= fechaInicioDate && fechaCompra <= fechaFinDate;
                });
            } else {
                comprasResultado = comprasFiltradas;
            }
        }

        return comprasResultado;
    }

    async function filtrarComprasPorFecha() {
        const inicio = fechaInicio.value;
        const fin = fechaFin.value;

        if (!inicio || !fin) {
            mostrarErrorFiltro('Por favor selecciona ambas fechas');
            return;
        }

        const fechaInicioDate = new Date(inicio);
        const fechaFinDate = new Date(fin);

        if (fechaInicioDate > fechaFinDate) {
            mostrarErrorFiltro('La fecha de inicio no puede ser mayor que la fecha de fin');
            return;
        }

        // Ocultar error si todo está bien
        ocultarErrorFiltro();

        // Agregar animación de carga
        historialTabla.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        // Filtrar compras por fecha
        comprasFiltradas = todasLasCompras.filter(compra => {
            if (!compra.fecha) return false;

            // Parsear fecha de la compra
            let fechaCompra;
            if (Array.isArray(compra.fecha)) {
                // Si viene como array [año, mes, día]
                fechaCompra = new Date(compra.fecha[0], compra.fecha[1] - 1, compra.fecha[2]);
            } else if (typeof compra.fecha === 'string') {
                fechaCompra = new Date(compra.fecha.split('T')[0]);
            } else {
                return false;
            }

            return fechaCompra >= fechaInicioDate && fechaCompra <= fechaFinDate;
        });

        // Aplicar todos los filtros
        const comprasAMostrar = aplicarFiltros();
        renderComprasTabla(comprasAMostrar);

        if (comprasAMostrar.length === 0) {
            historialTabla.innerHTML = '<tr><td colspan="6">No se encontraron compras en el rango de fechas seleccionado.</td></tr>';
        }

        // Remover animación de carga
        requestAnimationFrame(() => historialTabla.classList.remove('loading'));
    }

    async function limpiarFiltroFechas() {
        // Agregar animación de carga
        historialTabla.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        fechaInicio.value = '';
        fechaFin.value = '';
        comprasFiltradas = null;

        // Aplicar filtros restantes
        const comprasAMostrar = aplicarFiltros();
        renderComprasTabla(comprasAMostrar);

        // Remover animación de carga
        requestAnimationFrame(() => historialTabla.classList.remove('loading'));
    }

    async function exportarPdfCompras() {
        const inicio = fechaInicio.value;
        const fin = fechaFin.value;

        // Construir URL con parámetros opcionales
        let url = `${API_COMPRAS_URL}/exportar-pdf`;
        const params = new URLSearchParams();

        if (inicio) params.append('inicio', inicio);
        if (fin) params.append('fin', fin);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al generar PDF');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;

            // Nombre del archivo con fechas si se especificaron
            let filename = 'compras';
            if (inicio && fin) {
                filename += `_${inicio}_a_${fin}`;
            }
            filename += '.pdf';

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } catch (error) {
            console.error('Error al exportar PDF:', error);
            mostrarErrorFiltro('No se pudo generar el PDF. Por favor intenta nuevamente.');
        }
    }

    // ==========================================================
    // EVENT LISTENER PARA BÚSQUEDA
    // ==========================================================

    if (comprasSearchInput) {
        comprasSearchInput.addEventListener('input', filtrarComprasPorBusqueda);
    }

    // ==========================================================
    // MODAL DETALLE DE COMPRA
    // ==========================================================

    // Variables para paginación del modal
    let modalProductosActuales = [];
    let modalCurrentPage = 0;
    const modalItemsPerPage = 5;

    async function mostrarDetalleCompra(compraId) {
        const modal = document.getElementById('purchase-detail-modal');
        if (!modal) return;

        try {
            const response = await fetch(`${API_COMPRAS_URL}/${compraId}`);
            if (!response.ok) throw new Error('Error al cargar el detalle');
            const compra = await response.json();

            // Formatear fecha
            let fechaFormateada = compra.fecha || 'N/A';
            if (typeof fechaFormateada === 'string' && fechaFormateada.includes('-')) {
                const partes = fechaFormateada.split('T')[0].split('-');
                fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
            }

            // Llenar información general
            document.getElementById('modal-compra-id').textContent = `#${compra.id}`;
            document.getElementById('modal-compra-fecha').textContent = fechaFormateada;
            document.getElementById('modal-compra-proveedor').textContent = compra.nombreProveedor || 'N/A';
            document.getElementById('modal-compra-total').textContent = `$${formatoMoneda.format(compra.total || 0)}`;

            // Guardar productos y resetear paginación
            modalProductosActuales = compra.productosComprados || [];
            modalCurrentPage = 0;

            // Renderizar tabla con paginación
            renderModalProductos();

            // Mostrar modal
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error al cargar el detalle de la compra:', error);
            alert('No se pudo cargar el detalle de la compra.');
        }
    }

    function renderModalProductos() {
        const tbody = document.getElementById('modal-compra-productos');
        const pageInfo = document.getElementById('modal-compra-page-info');
        const prevBtn = document.getElementById('modal-compra-prev-page');
        const nextBtn = document.getElementById('modal-compra-next-page');

        if (!tbody) return;

        tbody.innerHTML = '';

        if (modalProductosActuales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No hay productos en esta compra.</td></tr>';
            if (pageInfo) pageInfo.textContent = 'Página 0 de 0';
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            return;
        }

        // Calcular paginación
        const totalPages = Math.ceil(modalProductosActuales.length / modalItemsPerPage);
        const startIndex = modalCurrentPage * modalItemsPerPage;
        const endIndex = Math.min(startIndex + modalItemsPerPage, modalProductosActuales.length);
        const productosEnPagina = modalProductosActuales.slice(startIndex, endIndex);

        // Renderizar productos de la página actual
        productosEnPagina.forEach(producto => {
            const subtotal = (producto.cantidad || 0) * (producto.precioUnitario || 0);
            const row = `
                <tr>
                    <td>${producto.nombreProducto || 'N/A'}</td>
                    <td>${producto.cantidad || 0}</td>
                    <td>$${formatoMoneda.format(producto.precioUnitario || 0)}</td>
                    <td>$${formatoMoneda.format(subtotal)}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        // Actualizar controles de paginación
        if (pageInfo) {
            pageInfo.textContent = `Página ${modalCurrentPage + 1} de ${totalPages}`;
        }
        if (prevBtn) {
            prevBtn.disabled = (modalCurrentPage === 0);
        }
        if (nextBtn) {
            nextBtn.disabled = (modalCurrentPage + 1 >= totalPages);
        }
    }

    function modalPrevPage() {
        if (modalCurrentPage > 0) {
            modalCurrentPage--;
            renderModalProductos();
        }
    }

    function modalNextPage() {
        const totalPages = Math.ceil(modalProductosActuales.length / modalItemsPerPage);
        if (modalCurrentPage + 1 < totalPages) {
            modalCurrentPage++;
            renderModalProductos();
        }
    }

    // Event listeners para botones de paginación del modal
    const modalPrevBtn = document.getElementById('modal-compra-prev-page');
    const modalNextBtn = document.getElementById('modal-compra-next-page');

    if (modalPrevBtn) {
        modalPrevBtn.addEventListener('click', modalPrevPage);
    }
    if (modalNextBtn) {
        modalNextBtn.addEventListener('click', modalNextPage);
    }

    function cerrarModalDetalleCompra() {
        const modal = document.getElementById('purchase-detail-modal');
        if (modal) modal.style.display = 'none';
        // Resetear paginación al cerrar
        modalProductosActuales = [];
        modalCurrentPage = 0;
    }

    // Exponer funciones globalmente
    window.mostrarDetalleCompra = mostrarDetalleCompra;
    window.cerrarModalDetalleCompra = cerrarModalDetalleCompra;
});