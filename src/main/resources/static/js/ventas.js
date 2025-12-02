document.addEventListener('DOMContentLoaded', function () {

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_VENTAS_URL = '/api/ventas';
    const API_PRODUCTOS_URL = '/api/productos/select';

    const API_CLIENTES_URL = '/api/clientes/select';
    const API_CLIENTES_BASE_URL = '/api/clientes';

    // =================================================================
    // --- CONFIGURACIÓN DE FORMATO ---
    // =================================================================
    // Formateador para MOSTRAR (ej: 54.000 o 1.500,50)
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    // ===============================
    // SELECTORES FORMULARIO VENTA
    // ===============================
    const ventaForm = document.getElementById('venta-form');
    const fechaVentaInput = document.getElementById('fecha-venta');

    // --- Selectores Buscador Cliente ---
    const clienteSearchInput = document.getElementById('venta-cliente-search');
    const clienteHiddenInput = document.getElementById('venta-cliente-id-hidden');
    const clienteResultsContainer = document.getElementById('venta-cliente-results');
    const clienteError = document.getElementById('errorVentaCliente');

    // --- Selectores Buscador Producto ---
    const productSearchInput = document.getElementById('product-search');
    const cantidadProductoInput = document.getElementById('cantidad-producto');
    const productResultsContainer = document.getElementById('product-results');

    // --- Selectores Detalle Venta ("Carrito") ---
    const btnAgregarProducto = document.getElementById('btn-agregar-producto');
    const ventaDetalleTemporalBody = document.getElementById('venta-detalle-temporal');
    const totalVentaDisplay = document.getElementById('total-venta');

    // --- Mensajes de Error ---
    const errorFechaVenta = document.getElementById('errorFechaVenta');
    const errorProducto = document.getElementById('errorProducto');
    const errorDetalleGeneral = document.getElementById('errorDetalleGeneral');
    const generalMessage = document.getElementById('form-general-message-venta');

    // ===================================
    // SELECTORES - MODAL NUEVO CLIENTE
    // ===================================
    const addClienteModal = document.getElementById('modal-add-cliente-overlay');
    const addClienteBtn = document.getElementById('btn-add-cliente');
    const addClienteCloseBtn = document.getElementById('modal-add-cliente-close');
    const addClienteForm = document.getElementById('add-cliente-form');
    const addClienteMessage = document.getElementById('form-general-message-add-cliente');

    // ===============================
    // SELECTORES TABLA HISTORIAL
    // ===============================
    const ventaTableBody = document.querySelector('#tabla-ventas tbody');
    const ventasPageInfo = document.getElementById('ventas-page-info');
    const ventasPrevPageBtn = document.getElementById('ventas-prev-page');
    const ventasNextPageBtn = document.getElementById('ventas-next-page');
    const mainContent = document.querySelector('.main-content');
    const ventasTableHeaders = document.querySelectorAll('#ventas-section .data-table th[data-sort-by]');

    // ===============================
    // ESTADO GLOBAL
    // ===============================
    let todosLosProductos = [];
    let todosLosClientes = [];
    let productoSeleccionado = null;
    let detallesVenta = [];

    // --- Estado de Paginación ---
    let currentPageVentas = 0;
    const pageSizeVentas = 7;
    let totalPagesVentas = 0;
    let ventasSortField = 'fecha';
    let ventasSortDirection = 'desc';

    // --- Variables para búsqueda y filtrado ---
    let todasLasVentas = [];
    let ventasFiltradas = [];
    const ventasSearchInput = document.getElementById('ventas-search-input');
    const ventasFechaInicio = document.getElementById('ventas-fecha-inicio');
    const ventasFechaFin = document.getElementById('ventas-fecha-fin');
    const ventasBtnFiltrar = document.getElementById('ventas-btn-filtrar');
    const ventasBtnLimpiar = document.getElementById('ventas-btn-limpiar-filtro');
    const ventasFiltroError = document.getElementById('ventas-filtro-error');

    // Función helper para mostrar mensajes de error inline
    function mostrarErrorFiltroVentas(mensaje) {
        if (ventasFiltroError) {
            ventasFiltroError.textContent = mensaje;
            ventasFiltroError.style.display = 'block';
            setTimeout(() => {
                ventasFiltroError.style.display = 'none';
            }, 4000);
        }
    }

    function ocultarErrorFiltroVentas() {
        if (ventasFiltroError) {
            ventasFiltroError.style.display = 'none';
            ventasFiltroError.textContent = '';
        }
    }


    // ==========================================================
    // LÓGICA DE CARGA DE DATOS
    // ==========================================================

    async function loadVentas(page = 0) {
        if (!ventaTableBody || !mainContent) return;

        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        ventaTableBody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const sortParam = `${ventasSortField},${ventasSortDirection}`;
            const url = `${API_VENTAS_URL}?page=${page}&size=${pageSizeVentas}&sort=${sortParam}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const pageData = await response.json();
            currentPageVentas = pageData.number;
            totalPagesVentas = pageData.totalPages;

            renderVentasTable(pageData.content);
            updateVentasPaginationControls();
            updateVentasSortIndicators();

            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                ventaTableBody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar las ventas:', error);
            if (ventaTableBody) {
                ventaTableBody.innerHTML = `<tr><td colspan="4">Error al cargar el historial de ventas.</td></tr>`;
            }
            currentPageVentas = 0;
            totalPagesVentas = 0;
            renderVentasTable([]);
            updateVentasPaginationControls();
            ventaTableBody.classList.remove('loading');
        }
    }

    async function loadProductosParaSelect() {
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            todosLosProductos = await response.json();
            console.log("Productos actualizados en Ventas:", todosLosProductos.length); // Log para verificar
        } catch (error) {
            console.error('Error al cargar productos:', error);
            if (errorProducto) errorProducto.textContent = "No se pudieron cargar los productos.";
        }
    }

    async function loadClientesParaVenta() {
        if (!clienteSearchInput) return;
        try {
            const response = await fetch(API_CLIENTES_URL);
            if (!response.ok) throw new Error('Error al cargar clientes');
            todosLosClientes = await response.json();
        } catch (error) {
            console.error(error);
            clienteSearchInput.placeholder = "Error al cargar clientes";
        }
    }

    // ==========================================================
    // LÓGICA DEL MODAL DE CREACIÓN RÁPIDA DE CLIENTES
    // ==========================================================

    const handleAddClienteEsc = (e) => {
        if (e.key === 'Escape') closeAddClienteModal();
    };

    function resetAddClienteModal() {
        if (addClienteForm) addClienteForm.reset();
        if (addClienteMessage) {
            addClienteMessage.textContent = '';
            addClienteMessage.className = 'form-message';
        }
        document.querySelectorAll('#add-cliente-form .error-message')
            .forEach(el => el.textContent = '');
    }

    function openAddClienteModal() {
        if (!addClienteModal) return;
        resetAddClienteModal();
        addClienteModal.style.display = 'flex';
        document.getElementById('addClienteNombre').focus();

        // Agregar listener para ESC
        window.addEventListener('keydown', handleAddClienteEsc);
    }

    function closeAddClienteModal() {
        if (!addClienteModal) return;
        addClienteModal.style.display = 'none';

        // Remover listener para ESC
        window.removeEventListener('keydown', handleAddClienteEsc);
    }

    async function handleAddClienteSubmit(event) {
        event.preventDefault();

        let isValid = true;
        const nombre = document.getElementById('addClienteNombre').value.trim();
        const dni = document.getElementById('addClienteDNI').value.trim();

        if (!nombre) {
            document.getElementById('errorAddClienteNombre').textContent = 'El nombre es obligatorio.';
            isValid = false;
        }
        if (!dni) {
            document.getElementById('errorAddClienteDNI').textContent = 'El DNI es obligatorio.';
            isValid = false;
        }
        if (!isValid) return;

        const clienteRequestDTO = {
            nombre: nombre,
            apellido: document.getElementById('addClienteApellido').value.trim(),
            dni: dni,
            telefono: document.getElementById('addClienteTelefono').value.trim()
        };

        try {
            const response = await fetch(API_CLIENTES_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clienteRequestDTO)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            const nuevoCliente = await response.json();
            closeAddClienteModal();

            const nombreCompleto = `${nuevoCliente.nombre} ${nuevoCliente.apellido || ''} (${nuevoCliente.dni})`;
            clienteSearchInput.value = nombreCompleto.trim();
            clienteHiddenInput.value = nuevoCliente.idCliente;
            if (clienteError) clienteError.textContent = '';

            loadClientesParaVenta();

        } catch (error) {
            console.error('Error al crear cliente:', error);
            if (addClienteMessage) {
                addClienteMessage.textContent = error.message;
                addClienteMessage.classList.add('error');
            }
        }
    }

    // ==========================================================
    // LÓGICA DEL BUSCADOR DE CLIENTES
    // ==========================================================

    function renderResultadosClientes(clientes) {
        if (clientes.length === 0) {
            clienteResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron clientes</div>';
        } else {
            clienteResultsContainer.innerHTML = clientes.map(c => {
                const nombreCompleto = `${c.nombre} ${c.apellido || ''} (${c.dni})`;
                return `<div class="product-result-item" data-id="${c.id}">${nombreCompleto.trim()}</div>`;
            }).join('');
        }
        clienteResultsContainer.style.display = 'block';
    }

    function filtrarClientes() {
        const query = clienteSearchInput.value.toLowerCase();
        const terminosBusqueda = query.split(' ').filter(term => term.length > 0);

        const clientesFiltrados = todosLosClientes.filter(c => {
            const nombreCompleto = `${c.nombre.toLowerCase()} ${c.apellido ? c.apellido.toLowerCase() : ''} ${c.dni.toLowerCase()}`;
            return terminosBusqueda.every(term => nombreCompleto.includes(term));
        });

        renderResultadosClientes(clientesFiltrados);
    }

    function seleccionarCliente(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const clienteIdNum = parseInt(target.dataset.id, 10);
        const cliente = todosLosClientes.find(c => c.id === clienteIdNum);

        if (cliente) {
            const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ''} (${cliente.dni})`;
            clienteSearchInput.value = nombreCompleto.trim();
            clienteHiddenInput.value = cliente.id;
            clienteResultsContainer.style.display = 'none';
            if (clienteError) clienteError.textContent = '';
        }
    }

    // ==========================================================
    // LÓGICA DEL BUSCADOR DE PRODUCTOS
    // ==========================================================

    function buscarProductos() {
        const query = productSearchInput.value.toLowerCase();
        const productosFiltrados = todosLosProductos.filter(producto => {
            return producto.nombreProducto.toLowerCase().includes(query);
        });
        renderResultadosProductos(productosFiltrados);
    }

    function renderResultadosProductos(productos) {
        if (productos.length === 0) {
            productResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron productos</div>';
            productResultsContainer.style.display = 'block';
            return;
        }

        productResultsContainer.innerHTML = productos.map(producto => {
            return `
                <div class="product-result-item" data-id="${producto.idProducto}">
                    ${producto.nombreProducto} <span>($${formatoMoneda.format(producto.precioVenta)})</span>
                </div>
            `;
        }).join('');
        productResultsContainer.style.display = 'block';
    }

    function seleccionarProducto(event) {
        const target = event.target.closest('.product-result-item');
        if (!target || !target.dataset.id) return;

        const productoId = Number(target.dataset.id);
        productoSeleccionado = todosLosProductos.find(p => p.idProducto === productoId);

        if (productoSeleccionado) {
            productSearchInput.value = productoSeleccionado.nombreProducto;
            productResultsContainer.innerHTML = '';
            productResultsContainer.style.display = 'none';
        }
    }

    // ==========================================================
    // LÓGICA DEL DETALLE DE VENTA ("CARRITO")
    // ==========================================================

    function agregarProductoAlDetalle() {
        errorDetalleGeneral.textContent = '';
        if (!productoSeleccionado) {
            errorDetalleGeneral.textContent = 'Debe seleccionar un producto de la lista.';
            return;
        }
        const cantidad = parseInt(cantidadProductoInput.value, 10);
        if (isNaN(cantidad) || cantidad <= 0) {
            errorDetalleGeneral.textContent = 'La cantidad debe ser un número mayor a 0.';
            return;
        }

        const productoExistente = detallesVenta.find(item => item.idProducto === productoSeleccionado.idProducto);

        if (productoExistente) {
            productoExistente.cantidad += cantidad;
        } else {
            detallesVenta.push({
                idProducto: productoSeleccionado.idProducto,
                nombreProducto: productoSeleccionado.nombreProducto,
                precioVenta: productoSeleccionado.precioVenta,
                cantidad: cantidad
            });
        }
        renderDetalleTemporal();

        productoSeleccionado = null;
        productSearchInput.value = '';
        cantidadProductoInput.value = '1';
        productSearchInput.focus();
    }

    function renderDetalleTemporal() {
        ventaDetalleTemporalBody.innerHTML = '';
        let totalAcumulado = 0;

        if (detallesVenta.length === 0) {
            ventaDetalleTemporalBody.innerHTML = '<tr><td colspan="5">Agregue productos a la venta...</td></tr>';
            totalVentaDisplay.textContent = '$ Total: $0.00';
            return;
        }

        detallesVenta.forEach(item => {
            const subtotal = item.precioVenta * item.cantidad;
            totalAcumulado += subtotal;

            const row = `
                <tr>
                    <td>${item.nombreProducto}</td>
                    <td>${item.cantidad}</td>
                    <td>$${formatoMoneda.format(item.precioVenta)}</td>
                    <td>$${formatoMoneda.format(subtotal)}</td>
                    <td>
                        <button type="button" class="btn-icon btn-danger btn-delete-detalle" data-id="${item.idProducto}" title="Quitar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            ventaDetalleTemporalBody.innerHTML += row;
        });

        totalVentaDisplay.textContent = `$ Total: $${formatoMoneda.format(totalAcumulado)}`;
    }

    // ==========================================================
    // LÓGICA DE ENVÍO DE FORMULARIO (SUBMIT)
    // ==========================================================

    async function saveVenta(event) {
        event.preventDefault();

        generalMessage.textContent = '';
        generalMessage.className = 'form-message';
        if (errorFechaVenta) errorFechaVenta.textContent = '';
        if (clienteError) clienteError.textContent = '';
        if (errorDetalleGeneral) errorDetalleGeneral.textContent = '';

        const fechaVenta = fechaVentaInput.value;
        const idCliente = clienteHiddenInput.value;

        let isValid = true;

        if (!fechaVenta) {
            if (errorFechaVenta) errorFechaVenta.textContent = 'La fecha es obligatoria.';
            isValid = false;
        }

        if (!idCliente) {
            if (clienteError) clienteError.textContent = 'Debe seleccionar un cliente.';
            isValid = false;
        }

        if (detallesVenta.length === 0) {
            if (errorDetalleGeneral) errorDetalleGeneral.textContent = 'Debe agregar al menos un producto.';
            isValid = false;
        }

        if (!isValid) {
            generalMessage.textContent = 'Por favor, complete todos los campos obligatorios.';
            generalMessage.classList.add('error');
            return;
        }

        showConfirmationModal("¿Estás seguro de que deseas registrar esta venta?", async () => {

            try {
                const detallesParaBackend = detallesVenta.map(item => {
                    return {
                        productoId: item.idProducto,
                        cantidad: item.cantidad
                    };
                });

                const ventaRequestDTO = {
                    fecha: fechaVenta,
                    idCliente: parseInt(idCliente),
                    detalles: detallesParaBackend,
                };

                const response = await fetch(API_VENTAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(ventaRequestDTO),
                });

                if (!response.ok) {
                    const errorTexto = await response.text();
                    try {
                        const errorData = JSON.parse(errorTexto);
                        throw new Error(errorData.message || "Error desconocido del servidor.");
                    } catch (jsonError) {
                        throw new Error(errorTexto || `Error HTTP: ${response.status}`);
                    }
                }

                const ventaCreada = await response.json();
                console.log('Venta registrada con éxito:', ventaCreada);

                generalMessage.textContent = '¡Venta registrada con éxito!';
                generalMessage.classList.add('success');

                ventaForm.reset();
                detallesVenta = [];
                renderDetalleTemporal();
                clienteHiddenInput.value = '';

                await new Promise(resolve => setTimeout(resolve, 250));
                currentPageVentas = 0;
                ventasSortField = 'fecha';
                ventasSortDirection = 'desc';
                loadVentas(currentPageVentas);
                showSubsection('ventas-list'); // Redirigir a la lista

            } catch (error) {
                console.error('Error al registrar la venta:', error);
                generalMessage.textContent = `Error: ${error.message}`;
                generalMessage.classList.add('error');
            }
        });
    }

    // ==========================================================
    // LÓGICA DE TABLA DE VENTAS
    // ==========================================================
    function crearFilaVentaHTML(venta) {
        const parts = venta.fecha.split('-');
        const fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;

        const productosTexto = formatProductosList(venta.productos);
        const nombreClienteTexto = venta.nombreCliente || 'Cliente N/A';

        return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${nombreClienteTexto}</td> 
                <td>${productosTexto}</td> 
                <td>$${formatoMoneda.format(venta.total)}</td> 
            </tr>
        `;
    }

    function renderVentasTable(ventas) {
        if (!ventaTableBody) return;
        ventaTableBody.innerHTML = '';

        if (!Array.isArray(ventas) || ventas.length === 0) {
            ventaTableBody.innerHTML = '<tr><td colspan="4">No hay ventas registradas.</td></tr>';
            return;
        }

        const rowsHtml = ventas.map(crearFilaVentaHTML).join('');
        ventaTableBody.innerHTML = rowsHtml;
    }

    function formatProductosList(productosList) {
        if (!productosList || productosList.length === 0) return "N/A";
        return productosList.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>');
    }

    function updateVentasPaginationControls() {
        if (!ventasPageInfo || !ventasPrevPageBtn || !ventasNextPageBtn) return;
        const displayPage = totalPagesVentas > 0 ? currentPageVentas + 1 : 0;
        ventasPageInfo.textContent = `Página ${displayPage} de ${totalPagesVentas || 1}`;
        ventasPrevPageBtn.disabled = currentPageVentas === 0 || totalPagesVentas === 0;
        ventasNextPageBtn.disabled = currentPageVentas >= totalPagesVentas - 1 || totalPagesVentas === 0;
    }

    function updateVentasSortIndicators() {
        ventasTableHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'sort-icon fas fa-sort';

            if (th.getAttribute('data-sort-by') === ventasSortField) {
                th.classList.add(`sort-${ventasSortDirection}`);
                if (icon) icon.className = `sort-icon fas fa-sort-${ventasSortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });
    }

    function handleVentasSortClick(event) {
        event.preventDefault();
        event.currentTarget.blur();
        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');
        if (!newSortField) return;

        if (ventasSortField === newSortField) {
            ventasSortDirection = ventasSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            ventasSortField = newSortField;
            ventasSortDirection = 'asc';
        }
        currentPageVentas = 0;
        loadVentas(0);
    }

    function handleVentasPrevPage() {
        if (currentPageVentas > 0) {
            loadVentas(currentPageVentas - 1);
        }
    }

    function handleVentasNextPage() {
        if (currentPageVentas < totalPagesVentas - 1) {
            loadVentas(currentPageVentas + 1);
        }
    }

    // ==========================================================
    // BÚSQUEDA Y FILTRADO DE VENTAS
    // ==========================================================

    async function cargarTodasLasVentas() {
        try {
            const response = await fetch(`${API_VENTAS_URL}/all`);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            todasLasVentas = await response.json();
            ventasFiltradas = [...todasLasVentas];
        } catch (error) {
            console.error('Error al cargar todas las ventas:', error);
            todasLasVentas = [];
            ventasFiltradas = [];
        }
    }

    function aplicarFiltrosVentas() {
        const textoBusqueda = ventasSearchInput ? ventasSearchInput.value.toLowerCase() : '';

        ventasFiltradas = todasLasVentas.filter(venta => {
            // Filtro por búsqueda (cliente o producto)
            if (textoBusqueda) {
                const cliente = (venta.nombreCliente || '').toLowerCase();
                const productos = venta.productos || [];
                const tieneProducto = productos.some(p =>
                    p.nombreProducto.toLowerCase().includes(textoBusqueda)
                );

                if (!cliente.includes(textoBusqueda) && !tieneProducto) {
                    return false;
                }
            }

            return true;
        });

        renderVentasFiltradas();
    }

    async function filtrarVentasPorFecha() {
        const inicio = ventasFechaInicio ? ventasFechaInicio.value : '';
        const fin = ventasFechaFin ? ventasFechaFin.value : '';

        if (!inicio || !fin) {
            mostrarErrorFiltroVentas('Por favor selecciona ambas fechas');
            return;
        }

        const fechaInicioDate = new Date(inicio);
        const fechaFinDate = new Date(fin);

        if (fechaInicioDate > fechaFinDate) {
            mostrarErrorFiltroVentas('La fecha de inicio no puede ser mayor que la fecha de fin');
            return;
        }

        ocultarErrorFiltroVentas();

        const textoBusqueda = ventasSearchInput ? ventasSearchInput.value.toLowerCase() : '';

        ventasFiltradas = todasLasVentas.filter(venta => {
            if (!venta.fecha) return false;

            const fechaVenta = new Date(venta.fecha);
            const dentroRango = fechaVenta >= fechaInicioDate && fechaVenta <= fechaFinDate;

            if (!dentroRango) return false;

            // Aplicar búsqueda si existe
            if (textoBusqueda) {
                const cliente = (venta.nombreCliente || '').toLowerCase();
                const productos = venta.productos || [];
                const tieneProducto = productos.some(p =>
                    p.nombreProducto.toLowerCase().includes(textoBusqueda)
                );

                return cliente.includes(textoBusqueda) || tieneProducto;
            }

            return true;
        });

        renderVentasFiltradas();
    }

    function limpiarFiltrosVentas() {
        if (ventasSearchInput) ventasSearchInput.value = '';
        if (ventasFechaInicio) ventasFechaInicio.value = '';
        if (ventasFechaFin) ventasFechaFin.value = '';
        ocultarErrorFiltroVentas();

        ventasFiltradas = [...todasLasVentas];
        renderVentasFiltradas();
    }

    function renderVentasFiltradas() {
        if (!ventaTableBody) return;

        ventaTableBody.classList.add('loading');

        setTimeout(() => {
            renderVentasTable(ventasFiltradas);
            ventaTableBody.classList.remove('loading');
        }, 100);
    }

    async function exportarVentasPdf() {
        const inicio = ventasFechaInicio ? ventasFechaInicio.value : '';
        const fin = ventasFechaFin ? ventasFechaFin.value : '';

        // Construir URL con parámetros opcionales
        let url = '/api/ventas/pdf';
        const params = new URLSearchParams();

        if (inicio && fin) {
            params.append('inicio', inicio);
            params.append('fin', fin);
        }

        if (params.toString()) {
            url += '?' + params.toString();
        }

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Error al generar el PDF');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `reporte_ventas_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error al exportar PDF:', error);
            mostrarErrorFiltroVentas('No se pudo generar el PDF');
        }
    }

    // ==========================================================
    // ASIGNACIÓN DE EVENT LISTENERS
    // ==========================================================

    if (ventaForm) {
        ventaForm.addEventListener('submit', saveVenta);
    }

    if (addClienteBtn) {
        addClienteBtn.addEventListener('click', openAddClienteModal);
    }
    if (addClienteCloseBtn) {
        addClienteCloseBtn.addEventListener('click', closeAddClienteModal);
    }
    if (addClienteForm) {
        addClienteForm.addEventListener('submit', handleAddClienteSubmit);
    }
    if (addClienteModal) {
        addClienteModal.addEventListener('click', (event) => {
            if (event.target === addClienteModal) closeAddClienteModal();
        });
    }

    if (clienteSearchInput) {
        clienteSearchInput.addEventListener('input', () => {
            clienteHiddenInput.value = '';
            if (clienteError) clienteError.textContent = '';
            filtrarClientes();
        });
        clienteSearchInput.addEventListener('focus', filtrarClientes);
    }
    if (clienteResultsContainer) {
        clienteResultsContainer.addEventListener('click', seleccionarCliente);
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', buscarProductos);
        productSearchInput.addEventListener('focus', buscarProductos);
    }
    if (productResultsContainer) {
        productResultsContainer.addEventListener('click', seleccionarProducto);
    }
    if (btnAgregarProducto) {
        btnAgregarProducto.addEventListener('click', agregarProductoAlDetalle);
    }

    if (ventaDetalleTemporalBody) {
        ventaDetalleTemporalBody.addEventListener('click', function (event) {
            const deleteButton = event.target.closest('.btn-delete-detalle');
            if (deleteButton) {
                const idParaQuitar = Number(deleteButton.dataset.id);
                detallesVenta = detallesVenta.filter(item => item.idProducto !== idParaQuitar);
                renderDetalleTemporal();
            }
        });
    }

    document.addEventListener('click', function (event) {
        const isClickInsideProductInput = productSearchInput && productSearchInput.contains(event.target);
        const isClickInsideProductResults = productResultsContainer && productResultsContainer.contains(event.target);
        if (!isClickInsideProductInput && !isClickInsideProductResults) {
            if (productResultsContainer) productResultsContainer.style.display = 'none';
        }

        const isClickInsideClientInput = clienteSearchInput && clienteSearchInput.contains(event.target);
        const isClickInsideClientResults = clienteResultsContainer && clienteResultsContainer.contains(event.target);
        if (!isClickInsideClientInput && !isClickInsideClientResults) {
            if (clienteResultsContainer) clienteResultsContainer.style.display = 'none';
        }
    });

    if (ventasPrevPageBtn) {
        ventasPrevPageBtn.addEventListener('click', handleVentasPrevPage);
    }
    if (ventasNextPageBtn) {
        ventasNextPageBtn.addEventListener('click', handleVentasNextPage);
    }
    ventasTableHeaders.forEach(header => {
        header.addEventListener('click', handleVentasSortClick);
    });

    // ==========================================================
    // CARGA INICIAL Y EXPOSICIÓN DE FUNCIONES (MODIFICADO)
    // ==========================================================

    // Event listeners para búsqueda y filtrado
    if (ventasBtnFiltrar) {
        ventasBtnFiltrar.addEventListener('click', filtrarVentasPorFecha);
    }
    if (ventasBtnLimpiar) {
        ventasBtnLimpiar.addEventListener('click', limpiarFiltrosVentas);
    }
    if (ventasSearchInput) {
        ventasSearchInput.addEventListener('input', aplicarFiltrosVentas);
    }
    // Ocultar error cuando el usuario modifica las fechas
    if (ventasFechaInicio) {
        ventasFechaInicio.addEventListener('change', ocultarErrorFiltroVentas);
    }
    if (ventasFechaFin) {
        ventasFechaFin.addEventListener('change', ocultarErrorFiltroVentas);
    }
    // Event listener para exportar PDF
    const ventasBtnExportarPdf = document.getElementById('ventas-btn-exportar-pdf');
    if (ventasBtnExportarPdf) {
        ventasBtnExportarPdf.addEventListener('click', exportarVentasPdf);
    }

    // 1. Carga inicial estándar
    loadProductosParaSelect();
    loadClientesParaVenta();
    loadVentas();
    cargarTodasLasVentas(); // Cargar todas las ventas para búsqueda/filtrado
    renderDetalleTemporal();

    // --- NUEVO: Exponer la función para que admin.js pueda llamarla al cambiar de pestaña ---
    window.cargarDatosVentas = async function () {
        // Recargamos productos y clientes (para asegurar que estén frescos)
        await loadProductosParaSelect();
        await loadClientesParaVenta();
        // Si estamos en la primera página del historial, también lo refrescamos
        if (currentPageVentas === 0) {
            loadVentas(0);
        }
    };

    // --- NUEVO: Escuchar evento de actualización automática de productos ---
    document.addEventListener('productosActualizados', function () {
        console.log('Ventas.js: Detectada actualización de productos. Recargando lista...');
        loadProductosParaSelect();
    });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores que sean de ventas
        subsectionContainers.forEach(container => {
            if (container.id.startsWith('ventas-')) {
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
    window.showVentasSubsection = showSubsection;

});