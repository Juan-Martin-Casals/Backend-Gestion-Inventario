document.addEventListener('DOMContentLoaded', function () {

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_VENTAS_URL = '/api/ventas';
    const API_PRODUCTOS_URL = '/api/productos/select';
    const API_CLIENTES_URL = '/api/clientes/select';
    const API_CLIENTES_BASE_URL = '/api/clientes';
    const API_METODOS_PAGO_URL = '/api/metodos-pago/activos';

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

    // --- Selectores Método de Pago ---
    const metodoPagoSelect = document.getElementById('metodo-pago');
    const camposDatosExtra = document.getElementById('campos-datos-extra');
    const camposTarjeta = document.getElementById('campos-tarjeta');
    const nroTransaccionInput = document.getElementById('nro-transaccion');
    const tipoTarjetaSelect = document.getElementById('tipo-tarjeta');
    const ultimosDigitosInput = document.getElementById('ultimos-digitos');
    const errorMetodoPago = document.getElementById('errorMetodoPago');
    const errorNroTransaccion = document.getElementById('errorNroTransaccion');

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
    let editIndexVenta = -1; // Para edición inline

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

        // Limpiar errores previos
        document.getElementById('errorAddClienteNombre').textContent = '';
        document.getElementById('errorAddClienteApellido').textContent = '';
        document.getElementById('errorAddClienteDNI').textContent = '';
        document.getElementById('errorAddClienteTelefono').textContent = '';
        document.getElementById('errorAddClienteDireccion').textContent = '';
        document.getElementById('errorAddClienteEmail').textContent = '';
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
        const direccion = document.getElementById('addClienteDireccion').value.trim();
        const email = document.getElementById('addClienteEmail').value.trim();

        // Validación: campos obligatorios
        if (!nombre) {
            document.getElementById('errorAddClienteNombre').textContent = 'El nombre es obligatorio.';
            isValid = false;
        }

        if (!apellido) {
            document.getElementById('errorAddClienteApellido').textContent = 'El apellido es obligatorio.';
            isValid = false;
        }

        if (!dni) {
            document.getElementById('errorAddClienteDNI').textContent = 'El DNI es obligatorio.';
            isValid = false;
        }

        if (!telefono) {
            document.getElementById('errorAddClienteTelefono').textContent = 'El teléfono es obligatorio.';
            isValid = false;
        }

        if (!direccion) {
            document.getElementById('errorAddClienteDireccion').textContent = 'La dirección es obligatoria.';
            isValid = false;
        }

        if (!email) {
            document.getElementById('errorAddClienteEmail').textContent = 'El email es obligatorio.';
            isValid = false;
        }

        if (!isValid) return;

        const clienteRequestDTO = {
            nombre: nombre,
            apellido: apellido || null,
            dni: dni,
            telefono: telefono || null,
            direccion: direccion || null,
            email: email || null
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
        // Obtener valores de los inputs
        const cantidadInput = document.getElementById(`inline-cantidad-venta-${index}`);
        const precioInput = document.getElementById(`inline-precio-venta-${index}`);

        if (!cantidadInput || !precioInput) return;

        const nuevaCantidad = parseInt(cantidadInput.value);
        const precioTexto = precioInput.value.replace(/\$/g, '').replace(/\./g, '').replace(',', '.');
        const nuevoPrecio = parseFloat(precioTexto);

        // Validaciones
        if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
            alert('La cantidad debe ser un número mayor a 0');
            return;
        }

        if (isNaN(nuevoPrecio) || nuevoPrecio <= 0) {
            alert('El precio debe ser un número válido mayor a 0');
            return;
        }

        // Actualizar el item
        detallesVenta[index].cantidad = nuevaCantidad;
        detallesVenta[index].precioVenta = nuevoPrecio;

        // Salir del modo edición
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

        // Validar método de pago
        const idMetodoPago = metodoPagoSelect.value;
        if (!idMetodoPago) {
            if (errorMetodoPago) errorMetodoPago.textContent = 'Debe seleccionar un método de pago.';
            isValid = false;
        }

        // Validar datos extra si el método lo requiere
        const selectedOption = metodoPagoSelect.options[metodoPagoSelect.selectedIndex];
        if (selectedOption && selectedOption.dataset.requiereExtra === 'true') {
            const nroTransaccion = nroTransaccionInput.value.trim();
            if (!nroTransaccion) {
                if (errorNroTransaccion) errorNroTransaccion.textContent = 'El número de transacción es obligatorio.';
                isValid = false;
            }
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
                    // Datos del pago
                    idMetodoPago: parseInt(idMetodoPago),
                    nroTransaccion: nroTransaccionInput.value.trim() || null,
                    tipoTarjeta: tipoTarjetaSelect.value || null,
                    ultimosDigitos: ultimosDigitosInput.value.trim() || null,
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
                editIndexVenta = -1; // Reset edit mode
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
        const nombreVendedorTexto = venta.nombreVendedor || 'N/A';

        return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${nombreClienteTexto}</td> 
                <td>${productosTexto}</td> 
                <td>$${formatoMoneda.format(venta.total)}</td>
                <td>${nombreVendedorTexto}</td>
                <td>
                    <button class="btn-icon btn-info" onclick="mostrarDetalleVenta(${venta.idVenta})" title="Ver detalle">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    function renderVentasTable(ventas) {
        if (!ventaTableBody) return;
        ventaTableBody.innerHTML = '';

        if (!Array.isArray(ventas) || ventas.length === 0) {
            ventaTableBody.innerHTML = '<tr><td colspan="6">No hay ventas registradas.</td></tr>';
            return;
        }

        const rowsHtml = ventas.map(crearFilaVentaHTML).join('');
        ventaTableBody.innerHTML = rowsHtml;
    }

    function formatProductosList(productosList) {
        if (!productosList || productosList.length === 0) return "N/A";

        const maxProductos = 2;

        if (productosList.length <= maxProductos) {
            // Mostrar todos los productos
            return productosList.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>');
        } else {
            // Mostrar solo los primeros 2 + contador
            const productosAMostrar = productosList.slice(0, maxProductos);
            const productosRestantes = productosList.length - maxProductos;
            return productosAMostrar.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>') +
                `<br><span style="color: #666; font-style: italic;">+${productosRestantes} más...</span>`;
        }
    }

    // ==========================================================
    // MODAL DE DETALLE DE VENTA
    // ==========================================================

    let modalVentaProductos = [];
    let modalVentaCurrentPage = 0;
    const modalVentaItemsPerPage = 5;

    async function mostrarDetalleVenta(ventaId) {
        try {
            const response = await fetch(`/api/ventas/${ventaId}`);
            if (!response.ok) throw new Error('Error al obtener detalle de venta');

            const venta = await response.json();

            // Poblar información general
            document.getElementById('modal-venta-id').textContent = `#${venta.idVenta}`;

            const parts = venta.fecha.split('-');
            const fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            document.getElementById('modal-venta-fecha').textContent = fechaFormateada;
            document.getElementById('modal-venta-cliente').textContent = venta.nombreCliente || 'N/A';
            document.getElementById('modal-venta-vendedor').textContent = venta.nombreVendedor || 'N/A';
            document.getElementById('modal-venta-total').textContent = `$${formatoMoneda.format(venta.total)}`;

            // Guardar productos y resetear paginación
            modalVentaProductos = venta.productos || [];
            modalVentaCurrentPage = 0;

            // Renderizar tabla con paginación
            renderModalVentaProductos();

            // Mostrar modal
            document.getElementById('venta-detail-modal').style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            alert('No se pudo cargar el detalle de la venta');
        }
    }

    function cerrarModalDetalleVenta() {
        document.getElementById('venta-detail-modal').style.display = 'none';
    }

    function renderModalVentaProductos() {
        const tbody = document.getElementById('modal-venta-productos');
        const pageInfo = document.getElementById('modal-venta-page-info');
        const prevBtn = document.getElementById('modal-venta-prev-page');
        const nextBtn = document.getElementById('modal-venta-next-page');

        if (!tbody) return;

        tbody.innerHTML = '';

        if (modalVentaProductos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No hay productos en esta venta.</td></tr>';
            if (pageInfo) pageInfo.textContent = 'Página 0 de 0';
            if (prevBtn) prevBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            return;
        }

        // Calcular paginación
        const totalPages = Math.ceil(modalVentaProductos.length / modalVentaItemsPerPage);
        const startIndex = modalVentaCurrentPage * modalVentaItemsPerPage;
        const endIndex = Math.min(startIndex + modalVentaItemsPerPage, modalVentaProductos.length);
        const productosEnPagina = modalVentaProductos.slice(startIndex, endIndex);

        // Calcular precio unitario promedio
        const totalVentaStr = document.getElementById('modal-venta-total').textContent;
        const totalVenta = parseFloat(totalVentaStr.replace('$', '').replace(/\./g, '').replace(',', '.'));
        const cantidadTotal = modalVentaProductos.reduce((sum, p) => sum + p.cantidad, 0);

        // Renderizar productos de la página actual
        productosEnPagina.forEach(producto => {
            const precioUnitario = totalVenta / cantidadTotal;
            const subtotal = precioUnitario * producto.cantidad;

            const row = `
                <tr>
                    <td>${producto.nombreProducto || 'N/A'}</td>
                    <td>${producto.cantidad || 0}</td>
                    <td>$${formatoMoneda.format(precioUnitario)}</td>
                    <td>$${formatoMoneda.format(subtotal)}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        // Actualizar controles de paginación
        if (pageInfo) {
            pageInfo.textContent = `Página ${modalVentaCurrentPage + 1} de ${totalPages}`;
        }
        if (prevBtn) {
            prevBtn.disabled = (modalVentaCurrentPage === 0);
        }
        if (nextBtn) {
            nextBtn.disabled = (modalVentaCurrentPage + 1 >= totalPages);
        }
    }

    function modalVentaPrevPage() {
        if (modalVentaCurrentPage > 0) {
            modalVentaCurrentPage--;
            renderModalVentaProductos();
        }
    }

    function modalVentaNextPage() {
        const totalPages = Math.ceil(modalVentaProductos.length / modalVentaItemsPerPage);
        if (modalVentaCurrentPage + 1 < totalPages) {
            modalVentaCurrentPage++;
            renderModalVentaProductos();
        }
    }

    // Exponer funciones globalmente
    window.mostrarDetalleVenta = mostrarDetalleVenta;
    window.cerrarModalDetalleVenta = cerrarModalDetalleVenta;
    window.modalVentaPrevPage = modalVentaPrevPage;
    window.modalVentaNextPage = modalVentaNextPage;

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

        // Ordenar las ventas filtradas localmente en lugar de recargar del servidor
        ordenarVentasFiltradas();
        renderVentasFiltradas();
    }

    function ordenarVentasFiltradas() {
        ventasFiltradas.sort((a, b) => {
            let valorA, valorB;

            switch (ventasSortField) {
                case 'fecha':
                    valorA = new Date(a.fecha);
                    valorB = new Date(b.fecha);
                    break;
                case 'cliente.nombre':
                    valorA = (a.nombreCliente || '').toLowerCase();
                    valorB = (b.nombreCliente || '').toLowerCase();
                    break;
                case 'total':
                    valorA = a.total;
                    valorB = b.total;
                    break;
                case 'vendedor.nombre':
                    valorA = (a.nombreVendedor || '').toLowerCase();
                    valorB = (b.nombreVendedor || '').toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (valorA < valorB) return ventasSortDirection === 'asc' ? -1 : 1;
            if (valorA > valorB) return ventasSortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        updateVentasSortIndicators();
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
            // Filtro por búsqueda (cliente, producto o vendedor)
            if (textoBusqueda) {
                const cliente = (venta.nombreCliente || '').toLowerCase();
                const vendedor = (venta.nombreVendedor || '').toLowerCase();
                const productos = venta.productos || [];
                const tieneProducto = productos.some(p =>
                    p.nombreProducto.toLowerCase().includes(textoBusqueda)
                );

                if (!cliente.includes(textoBusqueda) &&
                    !tieneProducto &&
                    !vendedor.includes(textoBusqueda)) {
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

            // Generar nombre del archivo según filtros
            let nombreArchivo = 'reporte_ventas';
            if (inicio && fin) {
                // Formato: reporte_ventas_2024-12-01_al_2024-12-15.pdf
                nombreArchivo += `_${inicio}_al_${fin}`;
            } else {
                // Formato: reporte_ventas_2024-12-03.pdf
                nombreArchivo += `_${new Date().toISOString().split('T')[0]}`;
            }
            nombreArchivo += '.pdf';

            a.download = nombreArchivo;
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
            // Botón eliminar
            const deleteButton = event.target.closest('.btn-delete-detalle');
            if (deleteButton) {
                const idParaQuitar = Number(deleteButton.dataset.id);
                detallesVenta = detallesVenta.filter(item => item.idProducto !== idParaQuitar);
                editIndexVenta = -1; // Reset edit mode
                renderDetalleTemporal();
                return;
            }

            // Botón editar
            const editButton = event.target.closest('.btn-editar-venta-item');
            if (editButton) {
                const index = Number(editButton.dataset.index);
                editarVentaItemInline(index);
                return;
            }

            // Botón guardar
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

    // ==========================================================
    // MÉTODOS DE PAGO
    // ==========================================================

    /**
     * Cargar métodos de pago activos desde la API
     */
    async function cargarMetodosPago() {
        try {
            const response = await fetch(API_METODOS_PAGO_URL);
            if (!response.ok) throw new Error('Error al cargar métodos de pago');

            const metodos = await response.json();

            // Limpiar y poblar select
            metodoPagoSelect.innerHTML = '<option value="">-- Seleccione un método --</option>';
            metodos.forEach(metodo => {
                const option = document.createElement('option');
                option.value = metodo.idMetodoPago;
                option.textContent = metodo.nombre;
                option.dataset.requiereExtra = metodo.requiereDatosExtra;
                option.dataset.nombre = metodo.nombre;
                metodoPagoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error:', error);
            errorMetodoPago.textContent = 'No se pudieron cargar los métodos de pago';
        }
    }

    /**
     * Manejar cambio de método de pago
     */
    function handleMetodoPagoChange() {
        const selectedOption = metodoPagoSelect.options[metodoPagoSelect.selectedIndex];

        if (!selectedOption || !selectedOption.value) {
            // No hay método seleccionado
            camposDatosExtra.style.display = 'none';
            camposTarjeta.style.display = 'none';
            return;
        }

        const requiereExtra = selectedOption.dataset.requiereExtra === 'true';
        const nombreMetodo = selectedOption.dataset.nombre;

        if (requiereExtra) {
            // Mostrar campos de datos extra
            camposDatosExtra.style.display = 'block';

            // Si es Tarjeta, mostrar campos adicionales
            if (nombreMetodo === 'Tarjeta') {
                camposTarjeta.style.display = 'block';
            } else {
                camposTarjeta.style.display = 'none';
            }
        } else {
            // Ocultar campos extra (Efectivo)
            camposDatosExtra.style.display = 'none';
            camposTarjeta.style.display = 'none';
        }

        // Limpiar errores
        errorMetodoPago.textContent = '';
        errorNroTransaccion.textContent = '';
    }

    // Event listener para cambio de método
    if (metodoPagoSelect) {
        metodoPagoSelect.addEventListener('change', handleMetodoPagoChange);
    }

    // Cargar métodos al iniciar
    cargarMetodosPago();

    // Exponer globalmente
    window.showVentasSubsection = showSubsection;

});