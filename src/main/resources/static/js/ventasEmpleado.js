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

    // --- Selectores Detalle Venta (\"Carrito\") ---
    const btnAgregarProducto = document.getElementById('btn-agregar-producto');
    const ventaDetalleTemporalBody = document.getElementById('venta-detalle-temporal');
    const totalVentaDisplay = document.getElementById('total-venta');

    // --- Mensajes de Error ---
    const errorFechaVenta = document.getElementById('errorFechaVenta');
    const errorProducto = document.getElementById('errorProducto');
    const errorDetalleGeneral = document.getElementById('errorStockVenta');
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
    // ESTABLECER FECHA ACTUAL
    // ===============================
    function setFechaActual() {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        const fechaFormateada = `${año}-${mes}-${dia}`;

        if (fechaVentaInput) {
            fechaVentaInput.value = fechaFormateada;
        }
    }

    // Establecer fecha al cargar
    setFechaActual();

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
    let editIndexVenta = -1;

    // --- Estado de Paginación ---
    let currentPageVentas = 0;
    const pageSizeVentas = 7;
    let totalPagesVentas = 0;
    let ventasSortField = 'fecha';
    let ventasSortDirection = 'desc';

    // --- Variables para rastrear el cliente anterior ---
    let previousClienteId = null;
    let previousClienteNombre = '';

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
            updateVentasPaginationControls();
            ventaTableBody.classList.remove('loading');
        }
    }

    async function loadProductosParaSelect() {
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            todosLosProductos = await response.json();
            console.log("Productos actualizados en Ventas Empleado:", todosLosProductos.length);
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
        window.addEventListener('keydown', handleAddClienteEsc);
    }

    function closeAddClienteModal() {
        if (!addClienteModal) return;
        addClienteModal.style.display = 'none';
        window.removeEventListener('keydown', handleAddClienteEsc);
    }

    async function handleAddClienteSubmit(event) {
        event.preventDefault();

        // Limpiar errores previos
        document.getElementById('errorAddClienteNombre').textContent = '';
        document.getElementById('errorAddClienteDNI').textContent = '';
        if (addClienteMessage) {
            addClienteMessage.textContent = '';
            addClienteMessage.classList.remove('error', 'success');
        }

        let isValid = true;

        // Obtener valores
        const nombre = document.getElementById('addClienteNombre').value.trim();
        const apellido = document.getElementById('addClienteApellido').value.trim();
        const dni = document.getElementById('addClienteDNI').value.trim();
        const telefono = document.getElementById('addClienteTelefono').value.trim();

        // Validación: campos obligatorios
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
            apellido: apellido || null,
            dni: dni,
            telefono: telefono || null
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
            const newClienteId = cliente.id.toString();
            const nombreCompleto = `${cliente.nombre} ${cliente.apellido || ''} (${cliente.dni})`;

            // Verificar si hay productos en el detalle y si el cliente es diferente
            if (detallesVenta.length > 0 && previousClienteId && newClienteId !== previousClienteId) {
                showConfirmationModal(
                    `Ya tienes ${detallesVenta.length} producto${detallesVenta.length > 1 ? 's' : ''} agregado${detallesVenta.length > 1 ? 's' : ''}.\nCambiar de cliente borrará el detalle actual.\n¿Deseas continuar?`,
                    () => {
                        // Usuario confirmó: limpiar detalle y cambiar cliente
                        detallesVenta = [];
                        editIndexVenta = -1;
                        renderDetalleTemporal();
                        clienteSearchInput.value = nombreCompleto.trim();
                        clienteHiddenInput.value = newClienteId;
                        previousClienteId = newClienteId;
                        previousClienteNombre = nombreCompleto;
                        clienteResultsContainer.style.display = 'none';
                        if (clienteError) clienteError.textContent = '';
                    },
                    () => {
                        // Usuario canceló: revertir al cliente anterior
                        clienteSearchInput.value = previousClienteNombre;
                        clienteHiddenInput.value = previousClienteId;
                        clienteResultsContainer.style.display = 'none';
                    }
                );
            } else {
                // No hay productos o es el mismo cliente: cambiar sin confirmación
                clienteSearchInput.value = nombreCompleto.trim();
                clienteHiddenInput.value = newClienteId;
                previousClienteId = newClienteId;
                previousClienteNombre = nombreCompleto;
                clienteResultsContainer.style.display = 'none';
                if (clienteError) clienteError.textContent = '';
            }
        }
    }

    // ==========================================================
    // LÓGICA DEL BUSCADOR DE PRODUCTOS
    // ==========================================================

    function buscarProductos() {
        const query = productSearchInput.value.toLowerCase().trim();

        // Si el campo está vacío o solo tiene espacios, mostrar todos los productos
        const productosFiltrados = query === ''
            ? todosLosProductos
            : todosLosProductos.filter(producto => {
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
            const stockActual = producto.stockActual || 0;
            const stockColor = stockActual > 10 ? '#28a745' : stockActual > 0 ? '#ffc107' : '#dc3545';
            const stockText = stockActual > 0 ? `Stock: ${stockActual}` : 'Sin stock';

            return `
                <div class="product-result-item" data-id="${producto.idProducto}">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="font-weight: 500;">${producto.nombreProducto}</span>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <span style="color: ${stockColor}; font-weight: 600; font-size: 12px;">
                                <i class="fas fa-box"></i> ${stockText}
                            </span>
                            <span style="color: #667eea; font-weight: 600;">
                                $${formatoMoneda.format(producto.precioVenta)}
                            </span>
                        </div>
                    </div>
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
    // LÓGICA DEL DETALLE DE VENTA (\"CARRITO\")
    // ==========================================================

    function agregarProductoAlDetalle() {
        // Limpiar errores previos
        errorDetalleGeneral.textContent = '';
        errorDetalleGeneral.style.display = 'none';

        if (!productoSeleccionado) {
            errorDetalleGeneral.textContent = 'Debe seleccionar un producto de la lista.';
            errorDetalleGeneral.className = 'form-message error';
            errorDetalleGeneral.style.display = 'block';
            return;
        }
        const cantidad = parseInt(cantidadProductoInput.value, 10);
        if (isNaN(cantidad) || cantidad <= 0) {
            errorDetalleGeneral.textContent = 'La cantidad debe ser un número mayor a 0.';
            return;
        }

        // Validar stock disponible
        const stockDisponible = productoSeleccionado.stockActual || 0;
        const productoExistente = detallesVenta.find(item => item.idProducto === productoSeleccionado.idProducto);
        const cantidadActualEnDetalle = productoExistente ? productoExistente.cantidad : 0;
        const cantidadTotal = cantidadActualEnDetalle + cantidad;

        if (cantidadTotal > stockDisponible) {
            const mensajeError = `Stock insuficiente. Stock disponible: ${stockDisponible} unidades.`;

            errorDetalleGeneral.textContent = mensajeError;
            errorDetalleGeneral.className = 'form-message error';
            errorDetalleGeneral.style.display = 'block';

            return;
        }

        const productoExistente2 = detallesVenta.find(item => item.idProducto === productoSeleccionado.idProducto);

        if (productoExistente2) {
            productoExistente2.cantidad += cantidad;
        } else {
            detallesVenta.push({
                idProducto: productoSeleccionado.idProducto,
                nombreProducto: productoSeleccionado.nombreProducto,
                precioVenta: productoSeleccionado.precioVenta,
                cantidad: cantidad
            });
        }
        renderDetalleTemporal();

        // Limpiar error después de agregar exitosamente
        errorDetalleGeneral.textContent = '';
        errorDetalleGeneral.style.display = 'none';
        errorDetalleGeneral.className = 'form-message';

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

        detallesVenta.forEach((item, index) => {
            const subtotal = item.precioVenta * item.cantidad;
            totalAcumulado += subtotal;

            let row;
            if (editIndexVenta === index) {
                // Modo edición
                row = `
                    <tr>
                        <td>${item.nombreProducto}</td>
                        <td><input type="number" class="inline-edit-input" id="inline-cantidad-venta-${index}" value="${item.cantidad}" min="1"></td>
                        <td><input type="text" class="inline-edit-input" id="inline-precio-venta-${index}" value="${formatoMoneda.format(item.precioVenta)}"></td>
                        <td>$${formatoMoneda.format(subtotal)}</td>
                        <td>
                            <button type="button" class="btn-icon btn-success btn-guardar-venta-inline" data-index="${index}" title="Guardar">
                                <i class="fas fa-check"></i>
                            </button>
                            <button type="button" class="btn-icon btn-secondary" onclick="cancelarEdicionVentaInline()" title="Cancelar">
                                <i class="fas fa-times"></i>
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                // Modo normal
                row = `
                    <tr>
                        <td>${item.nombreProducto}</td>
                        <td>${item.cantidad}</td>
                        <td>$${formatoMoneda.format(item.precioVenta)}</td>
                        <td>$${formatoMoneda.format(subtotal)}</td>
                        <td>
                            <button type="button" class="btn-icon btn-warning btn-editar-venta-item" data-index="${index}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn-icon btn-danger btn-delete-detalle" data-id="${item.idProducto}" title="Quitar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
            ventaDetalleTemporalBody.innerHTML += row;
        });

        totalVentaDisplay.textContent = `$ Total: $${formatoMoneda.format(totalAcumulado)}`;
    }

    // ==========================================================
    // FUNCIONES DE EDICIÓN INLINE
    // ==========================================================

    function editarVentaItemInline(index) {
        editIndexVenta = index;
        renderDetalleTemporal();
    }

    function guardarVentaEdicionInline(index) {
        const cantidadInput = document.getElementById(`inline-cantidad-venta-${index}`);
        const precioInput = document.getElementById(`inline-precio-venta-${index}`);

        if (!cantidadInput || !precioInput) return;

        const nuevaCantidad = parseInt(cantidadInput.value);
        const precioTexto = precioInput.value.replace(/\$/g, '').replace(/\./g, '').replace(',', '.');
        const nuevoPrecio = parseFloat(precioTexto);

        if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
            alert('La cantidad debe ser un número mayor a 0');
            return;
        }

        if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
            alert('El precio debe ser un número válido mayor a 0');
            return;
        }

        detallesVenta[index].cantidad = nuevaCantidad;
        detallesVenta[index].precioVenta = nuevoPrecio;

        editIndexVenta = -1;
        renderDetalleTemporal();
    }

    function cancelarEdicionVentaInline() {
        editIndexVenta = -1;
        renderDetalleTemporal();
    }

    // Exponer funciones globalmente
    window.cancelarEdicionVentaInline = cancelarEdicionVentaInline;

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
                    // Empleado no necesita método de pago - se asigna el por defecto en backend
                    idMetodoPago: 1, // Efectivo por defecto
                    tipoTarjeta: null
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
                editIndexVenta = -1;
                renderDetalleTemporal();
                clienteHiddenInput.value = '';
                previousClienteId = null;
                previousClienteNombre = '';

                await new Promise(resolve => setTimeout(resolve, 250));
                currentPageVentas = 0;
                ventasSortField = 'fecha';
                ventasSortDirection = 'desc';
                loadVentas(currentPageVentas);
                showSubsection('ventas-list');

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

        const maxProductos = 2;

        if (productosList.length <= maxProductos) {
            return productosList.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>');
        } else {
            const productosAMostrar = productosList.slice(0, maxProductos);
            const productosRestantes = productosList.length - maxProductos;
            return productosAMostrar.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>') +
                `<br><span style="color: #666; font-style: italic;">+${productosRestantes} más...</span>`;
        }
    }

    // ==========================================================
    // PAGINACIÓN
    // ==========================================================

    function updateVentasPaginationControls() {
        if (!ventasPageInfo) return;
        ventasPageInfo.textContent = `Página ${currentPageVentas + 1} de ${totalPagesVentas || 1}`;
        ventasPrevPageBtn.disabled = (currentPageVentas === 0);
        ventasNextPageBtn.disabled = (currentPageVentas + 1 >= totalPagesVentas);
    }

    function handleVentasPrevPage(event) {
        event.preventDefault();
        if (currentPageVentas > 0) {
            currentPageVentas--;
            loadVentas(currentPageVentas);
        }
    }

    function handleVentasNextPage(event) {
        event.preventDefault();
        if (currentPageVentas + 1 < totalPagesVentas) {
            currentPageVentas++;
            loadVentas(currentPageVentas);
        }
    }

    // ==========================================================
    // ORDENAMIENTO
    // ==========================================================

    function handleVentasSortClick(event) {
        event.preventDefault();
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
        loadVentas(currentPageVentas);
    }

    function updateVentasSortIndicators() {
        ventasTableHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            th.querySelector('.sort-icon').className = 'sort-icon fas fa-sort';

            if (th.getAttribute('data-sort-by') === ventasSortField) {
                const directionClass = `sort-${ventasSortDirection}`;
                th.classList.add(directionClass);

                const icon = th.querySelector('.sort-icon');
                if (icon) {
                    icon.className = `sort-icon fas fa-sort-${ventasSortDirection === 'asc' ? 'up' : 'down'}`;
                }
            }
        });
    }

    // ==========================================================
    // EVENT LISTENERS
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

    if (clienteSearchInput) {
        clienteSearchInput.addEventListener('input', filtrarClientes);
    }

    if (clienteResultsContainer) {
        clienteResultsContainer.addEventListener('click', seleccionarCliente);
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', buscarProductos);
        productSearchInput.addEventListener('focus', buscarProductos);
        productSearchInput.addEventListener('click', buscarProductos);
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
                editIndexVenta = -1;
                renderDetalleTemporal();
                return;
            }

            const editButton = event.target.closest('.btn-editar-venta-item');
            if (editButton) {
                const index = Number(editButton.dataset.index);
                editarVentaItemInline(index);
                return;
            }

            const saveButton = event.target.closest('.btn-guardar-venta-inline');
            if (saveButton) {
                const index = Number(saveButton.dataset.index);
                guardarVentaEdicionInline(index);
                return;
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
    // CARGA INICIAL Y EXPOSICIÓN DE FUNCIONES
    // ==========================================================

    loadProductosParaSelect();
    loadClientesParaVenta();
    loadVentas();
    renderDetalleTemporal();

    window.cargarDatosVentas = async function () {
        await loadProductosParaSelect();
        await loadClientesParaVenta();
        if (currentPageVentas === 0) {
            loadVentas(0);
        }
    };

    document.addEventListener('productosActualizados', function () {
        console.log('VentasEmpleado.js: Detectada actualización de productos. Recargando lista...');
        loadProductosParaSelect();
    });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        subsectionContainers.forEach(container => {
            if (container.id.startsWith('ventas-')) {
                container.style.display = 'none';
            }
        });

        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }

        // Cargar datos según la subsección
        if (subsectionId === 'ventas-create') {
            loadProductosParaSelect();
            loadClientesParaVenta();
            setFechaActual();
        } else if (subsectionId === 'ventas-list') {
            loadVentas(0);
        }
    }

    // ==========================================================
    // FUNCIÓN LIMPIAR FORMULARIO DE VENTA
    // ==========================================================

    function limpiarFormularioVenta() {
        // Limpiar campos del formulario
        if (ventaForm) ventaForm.reset();

        // Limpiar errores
        document.querySelectorAll('#venta-form .error-message').forEach(el => el.textContent = '');
        if (errorDetalleGeneral) {
            errorDetalleGeneral.textContent = '';
            errorDetalleGeneral.style.display = 'none';
        }
        if (generalMessage) {
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';
        }

        // Limpiar inputs de búsqueda y ocultos
        clienteSearchInput.value = '';
        clienteHiddenInput.value = '';
        productSearchInput.value = '';
        cantidadProductoInput.value = '1';

        // Limpiar detalle de venta
        detallesVenta = [];
        productoSeleccionado = null;
        renderDetalleTemporal();

        // Resetear cliente anterior
        previousClienteId = null;
        previousClienteNombre = '';

        // Resetear método de pago
        document.querySelectorAll('input[name="metodo-pago"]').forEach(radio => {
            radio.checked = false;
        });
        const camposTarjeta = document.getElementById('campos-tipo-tarjeta');
        if (camposTarjeta) camposTarjeta.style.display = 'none';
        const tipoTarjeta = document.getElementById('tipo-tarjeta');
        if (tipoTarjeta) tipoTarjeta.value = '';

        // Establecer fecha actual nuevamente
        setFechaActual();
    }

    // Event listener para botón limpiar
    const btnLimpiarFormVenta = document.getElementById('limpiar-form-venta');
    if (btnLimpiarFormVenta) {
        btnLimpiarFormVenta.addEventListener('click', limpiarFormularioVenta);
    }

    // Exponer globalmente
    window.showVentasSubsection = showSubsection;

});
