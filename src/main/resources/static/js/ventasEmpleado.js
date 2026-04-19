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

    // --- Selectores Método de Pago ---
    const metodoPagoSelect = document.getElementById('metodo-pago');
    const tipoTarjetaSelect = document.getElementById('tipo-tarjeta');
    const errorMetodoPago = document.getElementById('errorMetodoPago');

    // --- Selectores Descuento ---
    const descuentoInput = document.getElementById('descuento-venta');
    const tipoDescuentoSelect = document.getElementById('tipo-descuento-venta');
    const descuentoDisplay = document.getElementById('descuento-aplicado-display');
    const montoDescuentoMostrado = document.getElementById('monto-descuento-mostrado');
    const subtotalVentaDisplay = document.getElementById('subtotal-venta');
    const errorDescuento = document.getElementById('errorDescuento');

    // --- Navegación con teclado en dropdowns ---
    let clienteSelectedIndex = -1;
    let productoSelectedIndex = -1;

    function actualizarSeleccionKeyboard(items, selectedIndex) {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // ===================================
    // SELECTORES - MODAL NUEVO CLIENTE
    // ===================================
    const addClienteBtn = document.getElementById('btn-add-cliente');
    const addClienteCloseBtn = document.getElementById('modal-add-cliente-close');
    const addClienteForm = document.getElementById('add-cliente-form');
    const addClienteMessage = document.getElementById('form-general-message-add-cliente');

    // ===================================
    // SELECTORES - MODAL TICKET
    // ===================================
    const modalTicketOverlay = document.getElementById('modal-ticket-overlay');
    const btnGenerarTicket = document.getElementById('btn-generar-ticket');
    const btnCerrarTicket = document.getElementById('btn-cerrar-ticket');

    // Variable para guardar el ID de la última venta
    let ultimaVentaId = null;

    // Función para mostrar modal ticket
    function mostrarModalTicket(idVenta) {
        ultimaVentaId = idVenta;
        if (modalTicketOverlay) {
            modalTicketOverlay.style.display = 'block';
        }
    }

    // Función para cerrar modal ticket
    function cerrarModalTicket() {
        if (modalTicketOverlay) {
            modalTicketOverlay.style.display = 'none';
        }
        ultimaVentaId = null;
    }

    // Event listeners para botones del modal ticket
    if (btnGenerarTicket) {
        btnGenerarTicket.addEventListener('click', async () => {
            if (!ultimaVentaId) return;
            try {
                const response = await fetch(`/api/ventas/${ultimaVentaId}/ticket`);
                if (!response.ok) throw new Error('Error al generar ticket');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ticket_Venta_${ultimaVentaId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (error) {
                console.error('Error al descargar ticket:', error);
                alert('Error al generar el ticket');
            }
            cerrarModalTicket();
        });
    }

    if (btnCerrarTicket) {
        btnCerrarTicket.addEventListener('click', cerrarModalTicket);
    }

    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalTicketOverlay && modalTicketOverlay.style.display !== 'none') {
            cerrarModalTicket();
        }
    });

    // Click fuera del modal para cerrar
    if (modalTicketOverlay) {
        const modalInner = modalTicketOverlay.firstElementChild;
        if (modalInner) {
            modalInner.addEventListener('click', (e) => {
                if (e.target === modalInner) {
                    cerrarModalTicket();
                }
            });
        }
    }

    // ===============================
    // RESTRICCIÓN DE CAMPO TELÉFONO CLIENTE
    // Solo permite dígitos, + y espacios. Soporta copiar/pegar.
    // ===============================
    function restrictTelefonoInput(input) {
        if (!input) return;
        input.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9+ ]/g, '');
        });
        input.addEventListener('keydown', function (e) {
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

    restrictTelefonoInput(document.getElementById('addClienteTelefono'));

    // ===============================
    // VALIDACIÓN DNI DUPLICADO (en tiempo real al salir del campo)
    // ===============================
    const addClienteDNIInput = document.getElementById('addClienteDNI');
    const errorAddClienteDNIEl = document.getElementById('errorAddClienteDNI');
    if (addClienteDNIInput && errorAddClienteDNIEl) {
        addClienteDNIInput.addEventListener('blur', async function () {
            const dni = this.value.trim();
            if (!dni) { errorAddClienteDNIEl.textContent = ''; return; }
            try {
                const response = await fetch(`/api/clientes/existe/dni/${encodeURIComponent(dni)}`);
                const existe = await response.json();
                errorAddClienteDNIEl.textContent = existe ? 'Ya existe un cliente con ese DNI.' : '';
            } catch (err) {
                console.error('Error al verificar DNI:', err);
            }
        });
    }

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
    let productosStockDesactualizado = false; // flag: recarga stock antes de la próxima búsqueda

    // --- Estado de Paginación ---
    let currentPageVentas = 0;
    const pageSizeVentas = 7;
    let totalPagesVentas = 0;
    let ventasSortField = 'fecha';
    let ventasSortDirection = 'desc';

    // --- Variables para rastrear el cliente anterior ---
    let previousClienteId = null;
    let previousClienteNombre = '';

    // --- Variables para búsqueda y filtrado ---
    let todasLasVentas = [];
    let ventasFiltradas = [];
    let modoFiltradoLocal = false;
    const ventasSearchInput = document.getElementById('ventas-search-input');
    const ventasFechaInicio = document.getElementById('ventas-fecha-inicio');
    const ventasFechaFin = document.getElementById('ventas-fecha-fin');
    const ventasBtnFiltrar = document.getElementById('ventas-btn-filtrar');
    const ventasBtnLimpiar = document.getElementById('ventas-btn-limpiar-filtro');
    const ventasFiltroError = document.getElementById('ventas-filtro-error');

    function mostrarErrorFiltroVentas(mensaje) {
        if (ventasFiltroError) {
            ventasFiltroError.textContent = mensaje;
            ventasFiltroError.style.display = 'block';
            setTimeout(() => { ventasFiltroError.style.display = 'none'; }, 4000);
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
            const textoBusqueda = ventasSearchInput ? ventasSearchInput.value.trim().toLowerCase() : '';
            const fechaInicio = ventasFechaInicio ? ventasFechaInicio.value : '';
            const fechaFin = ventasFechaFin ? ventasFechaFin.value : '';
            // Mapear campos del frontend a campos reales de la entidad JPA
            const sortFieldMap = {
                'vendedor.nombre': 'usuario.nombre',
                'cliente.nombre': 'cliente.nombre'
            };
            const sortFieldBackend = sortFieldMap[ventasSortField] || ventasSortField;
            const sortParam = `${sortFieldBackend},${ventasSortDirection}`;


            if (textoBusqueda) {
                // Modo local: cargar todas y filtrar en el frontend
                const url = `${API_VENTAS_URL}?page=0&size=1000&sort=${sortParam}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const pageData = await response.json();

                let ventas = pageData.content;

                // Filtrar por fechas si aplica
                if (fechaInicio) ventas = ventas.filter(v => v.fecha >= fechaInicio);
                if (fechaFin) ventas = ventas.filter(v => v.fecha <= fechaFin);

                // Filtrar por texto (cliente, producto, vendedor)
                ventas = ventas.filter(v => {
                    const cliente = (v.nombreCliente || '').toLowerCase();
                    const vendedor = (v.nombreVendedor || '').toLowerCase();
                    const productos = (v.productos || []).map(p => (p.nombreProducto || '').toLowerCase()).join(' ');
                    return cliente.includes(textoBusqueda) ||
                        vendedor.includes(textoBusqueda) ||
                        productos.includes(textoBusqueda);
                });

                // Paginar localmente
                const totalLocal = ventas.length;
                totalPagesVentas = Math.ceil(totalLocal / pageSizeVentas) || 1;
                currentPageVentas = Math.min(page, totalPagesVentas - 1);
                const start = currentPageVentas * pageSizeVentas;
                renderVentasTable(ventas.slice(start, start + pageSizeVentas));

            } else {
                // Modo normal: paginación del backend
                let url = `${API_VENTAS_URL}?page=${page}&size=${pageSizeVentas}&sort=${sortParam}`;
                if (fechaInicio) url += `&fechaInicio=${fechaInicio}`;
                if (fechaFin) url += `&fechaFin=${fechaFin}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const pageData = await response.json();
                currentPageVentas = pageData.number;
                totalPagesVentas = pageData.totalPages;
                renderVentasTable(pageData.content);
            }

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

    async function loadMetodosPago() {
        if (!metodoPagoSelect) return;
        try {
            const response = await fetch(API_METODOS_PAGO_URL);
            if (!response.ok) throw new Error('Error al cargar métodos de pago');
            const metodos = await response.json();
            const currentValue = metodoPagoSelect.value;
            metodoPagoSelect.innerHTML = '<option value="">Seleccionar método</option>';
            metodos.forEach(m => {
                const option = document.createElement('option');
                option.value = m.idMetodoPago;
                option.textContent = m.nombre;
                option.dataset.nombre = m.nombre;
                metodoPagoSelect.appendChild(option);
            });
            if (currentValue) metodoPagoSelect.value = currentValue;
        } catch (error) {
            console.error('Error al cargar métodos de pago:', error);
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
        const dni = document.getElementById('addClienteDNI').value.trim().replace(/[^0-9]/g, '');
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
        } else {
            try {
                const dniCheckResponse = await fetch(`/api/clientes/existe/dni/${encodeURIComponent(dni)}`);
                const dniExiste = await dniCheckResponse.json();
                if (dniExiste) {
                    document.getElementById('errorAddClienteDNI').textContent = 'Ya existe un cliente con ese DNI.';
                    isValid = false;
                }
            } catch (err) {
                console.error('Error al verificar DNI:', err);
            }
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
                const errorText = await response.text();
                let errorMsg = `Error ${response.status}`;
                try { errorMsg = JSON.parse(errorText).message || errorText; } catch { errorMsg = errorText; }
                throw new Error(errorMsg);
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

    function capitalizarNombre(texto) {
        if (!texto) return '';
        return texto.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    function formatearDNI(dni) {
        if (!dni) return '';
        const soloNumeros = dni.toString().replace(/\D/g, '');
        return soloNumeros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function formatearFechaHora(dateInput) {
        if (!dateInput) return 'N/A';
        let date;
        if (Array.isArray(dateInput)) {
            const [year, month, day, hour = 0, minute = 0] = dateInput;
            date = new Date(year, month - 1, day, hour, minute);
        } else if (typeof dateInput === 'string') {
            const parts = dateInput.split(/\D+/);
            if (parts.length >= 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const hour = parts[3] ? parseInt(parts[3], 10) : 0;
                const minute = parts[4] ? parseInt(parts[4], 10) : 0;
                date = new Date(year, month, day, hour, minute);
            } else {
                date = new Date(dateInput);
            }
        } else {
            return 'N/A';
        }
        
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        const hr = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        
        return `${d}/${m}/${y} ${hr}:${min} hs`;
    }

    function renderResultadosClientes(clientes) {
        if (clientes.length === 0) {
            clienteResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron clientes</div>';
        } else {
            // Separar "Consumidor Final" del resto
            const consumidorFinal = clientes.find(c => 
                c.nombre && c.nombre.toLowerCase() === 'consumidor' && 
                c.apellido && c.apellido.toLowerCase() === 'final'
            );
            
            const otrosClientes = clientes.filter(c => 
                !(c.nombre && c.nombre.toLowerCase() === 'consumidor' && 
                  c.apellido && c.apellido.toLowerCase() === 'final')
            );
            
            // Ordenar el resto alfabéticamente
            const clientesOrdenados = [...otrosClientes].sort((a, b) => {
                const nombreA = `${a.nombre} ${a.apellido || ''}`.toLowerCase();
                const nombreB = `${b.nombre} ${b.apellido || ''}`.toLowerCase();
                return nombreA.localeCompare(nombreB, 'es');
            });
            
            // Consumidor Final primero, luego los demás
            const clientesFinal = consumidorFinal 
                ? [consumidorFinal, ...clientesOrdenados] 
                : clientesOrdenados;

            clienteResultsContainer.innerHTML = clientesFinal.map(c => {
                const nombre = capitalizarNombre(c.nombre);
                const apellido = capitalizarNombre(c.apellido);
                
                // Si es Consumidor Final, no mostrar DNI
                const esConsumidorFinal = c.nombre && c.nombre.toLowerCase() === 'consumidor' && 
                                          c.apellido && c.apellido.toLowerCase() === 'final';
                
                let nombreCompleto;
                if (esConsumidorFinal) {
                    nombreCompleto = `${nombre} ${apellido}`;
                } else {
                    const dniFormateado = formatearDNI(c.dni);
                    nombreCompleto = `${nombre} ${apellido} (${dniFormateado})`;
                }
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

    async function buscarProductos() {
        // Si hubo una venta reciente, recargar el stock antes de filtrar
        if (productosStockDesactualizado) {
            productosStockDesactualizado = false;
            await loadProductosParaSelect();
        }

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
                        <td class="col-num"><input type="number" class="inline-edit-input" id="inline-cantidad-venta-${index}" value="${item.cantidad}" min="1"></td>
                        <td class="col-num">$${formatoMoneda.format(item.precioVenta)}</td>
                        <td class="col-num">$${formatoMoneda.format(subtotal)}</td>
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
                        <td class="col-num">${item.cantidad}</td>
                        <td class="col-num">$${formatoMoneda.format(item.precioVenta)}</td>
                        <td class="col-num">$${formatoMoneda.format(subtotal)}</td>
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

        // Calcular descuento aplicado
        const descuento = parseFloat(descuentoInput?.value) || 0;
        const tipoDescuento = tipoDescuentoSelect?.value || '$';
        let descuentoMonto = 0;
        let totalConDescuento = totalAcumulado;

        if (descuento > 0 && totalAcumulado > 0) {
            if (tipoDescuento === '%') {
                descuentoMonto = totalAcumulado * (descuento / 100);
            } else {
                descuentoMonto = descuento;
            }
            descuentoMonto = Math.min(descuentoMonto, totalAcumulado);
            totalConDescuento = totalAcumulado - descuentoMonto;

            if (descuentoDisplay) {
                descuentoDisplay.style.display = 'block';
                montoDescuentoMostrado.textContent = `-${formatoMoneda.format(descuentoMonto)}`;
            }
        } else {
            if (descuentoDisplay) {
                descuentoDisplay.style.display = 'none';
            }
        }

        // Validar descuento en tiempo real
        if (totalConDescuento <= 0 && descuento > 0) {
            if (errorDescuento) {
                errorDescuento.textContent = 'El total con descuento debe ser mayor a $0.';
                errorDescuento.style.display = 'block';
            }
        } else {
            if (errorDescuento) {
                errorDescuento.textContent = '';
                errorDescuento.style.display = 'none';
            }
        }

        // Mostrar total real (con descuento)
        totalVentaDisplay.textContent = `$ Total: $${formatoMoneda.format(totalConDescuento)}`;
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

        if (!cantidadInput) return;

        const nuevaCantidad = parseInt(cantidadInput.value);

        if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
            errorDetalleGeneral.textContent = 'La cantidad debe ser un n\u00famero entero mayor a 0.';
            errorDetalleGeneral.className = 'form-message error';
            errorDetalleGeneral.style.display = 'block';
            return;
        }

        // Validar stock disponible
        const item = detallesVenta[index];
        const productoEnLista = todosLosProductos.find(p => p.idProducto === item.idProducto);
        if (productoEnLista) {
            const stockDisponible = productoEnLista.stockActual || 0;
            if (nuevaCantidad > stockDisponible) {
                errorDetalleGeneral.textContent = `Stock insuficiente. Stock disponible: ${stockDisponible} unidades.`;
                errorDetalleGeneral.className = 'form-message error';
                errorDetalleGeneral.style.display = 'block';
                return;
            }
        }

        // Limpiar error previo si la validaci\u00f3n pas\u00f3
        errorDetalleGeneral.textContent = '';
        errorDetalleGeneral.style.display = 'none';
        errorDetalleGeneral.className = 'form-message';

        // Solo se actualiza la cantidad; el precio no es editable por el empleado
        detallesVenta[index].cantidad = nuevaCantidad;

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
        const idMetodoPago = metodoPagoSelect ? metodoPagoSelect.value : '';
        if (!idMetodoPago) {
            if (errorMetodoPago) errorMetodoPago.textContent = 'Debe seleccionar un método de pago.';
            isValid = false;
        }

        // Validar tipo de tarjeta si es necesario
        if (metodoPagoSelect && tipoTarjetaSelect) {
            const selectedOption = metodoPagoSelect.options[metodoPagoSelect.selectedIndex];
            if (selectedOption && selectedOption.dataset.nombre === 'Tarjeta') {
                const tipoTarjeta = tipoTarjetaSelect.value;
                if (!tipoTarjeta) {
                    const errorTipoTarjeta = document.getElementById('errorTipoTarjeta');
                    if (errorTipoTarjeta) errorTipoTarjeta.textContent = 'Debe seleccionar el tipo de tarjeta.';
                    isValid = false;
                }
            }
        }

        // Calcular descuentos para validación y DTO
        let descuentoMonto = 0;
        const descuento = parseFloat(descuentoInput?.value) || 0;
        const tipoDescuento = tipoDescuentoSelect?.value || '$';

        // Calcular total base (sin descuento)
        let totalBase = 0;
        detallesVenta.forEach(item => {
            totalBase += item.precioVenta * item.cantidad;
        });

        if (descuento > 0 && totalBase > 0) {
            if (tipoDescuento === '%') {
                descuentoMonto = totalBase * (descuento / 100);
            } else {
                descuentoMonto = descuento;
            }
            descuentoMonto = Math.min(descuentoMonto, totalBase);
        }

        const totalFinal = totalBase - descuentoMonto;

        // Validar que el total no sea <= 0
        if (totalFinal <= 0) {
            if (errorDescuento) {
                errorDescuento.textContent = 'El total con descuento debe ser mayor a $0.';
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
                    idMetodoPago: parseInt(idMetodoPago),
                    tipoTarjeta: tipoTarjetaSelect ? (tipoTarjetaSelect.value || null) : null,
                    descuento: descuento,
                    tipoDescuento: tipoDescuento,
                    montoPagado: null // Por ahora null en empleado
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

                // Mostrar modal de ticket inmediatamente después de que se cierre el modal de confirmación
                setTimeout(() => {
                    mostrarModalTicket(ventaCreada.idVenta);
                }, 100);

                // Resetear formulario
                ventaForm.reset();

                ventaForm.reset();
                detallesVenta = [];
                editIndexVenta = -1;
                renderDetalleTemporal();
                clienteHiddenInput.value = '';
                clienteSearchInput.value = '';
                productSearchInput.value = '';
                cantidadProductoInput.value = '1';
                // Resetear descuento
                if (descuentoInput) descuentoInput.value = '';
                if (tipoDescuentoSelect) tipoDescuentoSelect.value = '$';
                if (descuentoDisplay) descuentoDisplay.style.display = 'none';
                if (subtotalVentaDisplay) subtotalVentaDisplay.textContent = '$0.00';
                previousClienteId = null;
                previousClienteNombre = '';

                // Resetear método de pago y ocultar tipo tarjeta
                if (metodoPagoSelect) metodoPagoSelect.value = '';
                const camposTipoTarjeta = document.getElementById('campos-tipo-tarjeta');
                if (camposTipoTarjeta) camposTipoTarjeta.style.display = 'none';
                if (tipoTarjetaSelect) tipoTarjetaSelect.value = '';

                setFechaActual();

                // Notificar al dashboard para actualizar KPIs en tiempo real
                document.dispatchEvent(new CustomEvent('ventaRegistrada'));

                // Marcar que el stock necesita actualizarse en la próxima búsqueda
                productosStockDesactualizado = true;

                // Recargar ventas en background sin cambiar de sección
                currentPageVentas = 0;
                ventasSortField = 'fecha';
                ventasSortDirection = 'desc';
                loadVentas(currentPageVentas);

                // Ocultar mensaje de éxito después de 3 segundos
                setTimeout(() => {
                    generalMessage.textContent = '';
                    generalMessage.className = 'form-message';
                }, 3000);

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
        const fechaFormateada = formatearFechaHora(venta.fecha);

        const productosTexto = formatProductosList(venta.productos);
        const nombreClienteTexto = venta.nombreCliente || 'Cliente N/A';
        const nombreVendedorTexto = venta.nombreVendedor || '-';
        const metodoPagoTexto = venta.metodoPago || 'No especificado';

        return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${nombreClienteTexto}</td> 
                <td>${productosTexto}</td> 
                <td class="col-num">$${formatoMoneda.format(venta.total)}</td>
                <td>${nombreVendedorTexto}</td>
                <td>${metodoPagoTexto}</td>
                <td>
                    <button class="btn-icon btn-view-venta" onclick="mostrarDetalleVenta(${venta.idVenta})" title="Ver detalle">
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
            ventaTableBody.innerHTML = '<tr><td colspan="7">No hay ventas registradas.</td></tr>';
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
        clienteSearchInput.addEventListener('focus', filtrarClientes);
        clienteSearchInput.addEventListener('click', filtrarClientes);
        clienteSearchInput.addEventListener('keydown', (e) => {
            const items = clienteResultsContainer.querySelectorAll('.product-result-item[data-id]');
            if (items.length === 0) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                clienteSelectedIndex = Math.min(clienteSelectedIndex + 1, items.length - 1);
                actualizarSeleccionKeyboard(items, clienteSelectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                clienteSelectedIndex = Math.max(clienteSelectedIndex - 1, 0);
                actualizarSeleccionKeyboard(items, clienteSelectedIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (clienteSelectedIndex >= 0 && items[clienteSelectedIndex]) {
                    items[clienteSelectedIndex].click();
                    clienteSearchInput.blur();
                }
            }
        });
        clienteSearchInput.addEventListener('blur', () => {
            setTimeout(() => {
                clienteSelectedIndex = -1;
                const items = clienteResultsContainer.querySelectorAll('.product-result-item');
                items.forEach(item => item.classList.remove('selected'));
            }, 150);
        });
    }

    if (clienteResultsContainer) {
        clienteResultsContainer.addEventListener('click', seleccionarCliente);
    }

    if (productSearchInput) {
        productSearchInput.addEventListener('input', buscarProductos);
        productSearchInput.addEventListener('focus', buscarProductos);
        productSearchInput.addEventListener('click', buscarProductos);
        productSearchInput.addEventListener('keydown', (e) => {
            const items = productResultsContainer.querySelectorAll('.product-result-item[data-id]');
            if (items.length === 0) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                productoSelectedIndex = Math.min(productoSelectedIndex + 1, items.length - 1);
                actualizarSeleccionKeyboard(items, productoSelectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                productoSelectedIndex = Math.max(productoSelectedIndex - 1, 0);
                actualizarSeleccionKeyboard(items, productoSelectedIndex);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (productoSelectedIndex >= 0 && items[productoSelectedIndex]) {
                    items[productoSelectedIndex].click();
                    productSearchInput.blur();
                }
            }
        });
        productSearchInput.addEventListener('blur', () => {
            setTimeout(() => {
                productoSelectedIndex = -1;
                const items = productResultsContainer.querySelectorAll('.product-result-item');
                items.forEach(item => item.classList.remove('selected'));
            }, 150);
        });
    }
    if (productResultsContainer) {
        productResultsContainer.addEventListener('click', seleccionarProducto);
    }
    if (btnAgregarProducto) {
        btnAgregarProducto.addEventListener('click', agregarProductoAlDetalle);
    }

    // Toggle tipo de tarjeta cuando se selecciona un método de pago
    if (metodoPagoSelect) {
        metodoPagoSelect.addEventListener('change', function () {
            const selectedOption = this.options[this.selectedIndex];
            const esTarjeta = selectedOption && selectedOption.dataset.nombre === 'Tarjeta';
            const camposTipoTarjeta = document.getElementById('campos-tipo-tarjeta');
            if (camposTipoTarjeta) {
                camposTipoTarjeta.style.display = esTarjeta ? 'block' : 'none';
            }
            if (!esTarjeta && tipoTarjetaSelect) tipoTarjetaSelect.value = '';
        });
    }

    // Event listeners para descuento
    if (descuentoInput) {
        descuentoInput.addEventListener('input', function () {
            renderDetalleTemporal();
        });
    }
    if (tipoDescuentoSelect) {
        tipoDescuentoSelect.addEventListener('change', function () {
            renderDetalleTemporal();
        });
    }

    // Búsqueda en tiempo real
    if (ventasSearchInput) {
        let searchDebounce = null;
        ventasSearchInput.addEventListener('input', function () {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                currentPageVentas = 0;
                loadVentas(0);
            }, 250);
        });
    }

    if (ventasBtnFiltrar) {
        ventasBtnFiltrar.addEventListener('click', function () {
            ocultarErrorFiltroVentas();
            const fechaInicio = ventasFechaInicio ? ventasFechaInicio.value : '';
            const fechaFin = ventasFechaFin ? ventasFechaFin.value : '';
            if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
                mostrarErrorFiltroVentas('La fecha de inicio no puede ser mayor a la fecha de fin.');
                return;
            }
            currentPageVentas = 0;
            loadVentas(0);
        });
    }

    if (ventasBtnLimpiar) {
        ventasBtnLimpiar.addEventListener('click', function () {
            ocultarErrorFiltroVentas();
            if (ventasSearchInput) ventasSearchInput.value = '';
            if (ventasFechaInicio) ventasFechaInicio.value = '';
            if (ventasFechaFin) ventasFechaFin.value = '';
            currentPageVentas = 0;
            loadVentas(0);
        });
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
    loadMetodosPago();
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
            loadMetodosPago();
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
        if (metodoPagoSelect) metodoPagoSelect.value = '';
        const camposTarjeta = document.getElementById('campos-tipo-tarjeta');
        if (camposTarjeta) camposTarjeta.style.display = 'none';
        if (tipoTarjetaSelect) tipoTarjetaSelect.value = '';

        // Establecer fecha actual nuevamente
        setFechaActual();
    }

    // Event listener para botón limpiar
    const btnLimpiarFormVenta = document.getElementById('limpiar-form-venta');
    if (btnLimpiarFormVenta) {
        btnLimpiarFormVenta.addEventListener('click', limpiarFormularioVenta);
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

            document.getElementById('modal-venta-id').textContent = `#${venta.idVenta}`;

            const fechaFormateada = formatearFechaHora(venta.fecha);
            document.getElementById('modal-venta-fecha').textContent = fechaFormateada;
            document.getElementById('modal-venta-cliente').textContent = venta.nombreCliente || 'N/A';
            document.getElementById('modal-venta-vendedor').textContent = venta.nombreVendedor || 'N/A';
            document.getElementById('modal-venta-metodo-pago').textContent = venta.metodoPago || 'No especificado';

            // Totales
            document.getElementById('modal-venta-subtotal').textContent = `$${formatoMoneda.format(venta.subtotal || 0)}`;
            
            // Descuento
            const descuentoContainer = document.getElementById('modal-venta-descuento-container');
            if (venta.descuentoMonto && venta.descuentoMonto > 0) {
                descuentoContainer.style.display = 'flex';
                document.getElementById('modal-venta-descuento').textContent = `-$${formatoMoneda.format(venta.descuentoMonto)}`;
            } else {
                descuentoContainer.style.display = 'none';
            }
            
            document.getElementById('modal-venta-total').textContent = `$${formatoMoneda.format(venta.total)}`;

            // Resumen pago efectivo
            const resumenPago = document.getElementById('modal-venta-resumen-pago');
            if (venta.metodoPago === 'Efectivo' && venta.montoPagado && venta.vuelto !== null) {
                resumenPago.style.display = 'block';
                document.getElementById('modal-venta-pago-con').textContent = `$${formatoMoneda.format(venta.montoPagado)}`;
                document.getElementById('modal-venta-vuelto').textContent = `$${formatoMoneda.format(venta.vuelto)}`;
            } else {
                resumenPago.style.display = 'none';
            }

            modalVentaProductos = venta.productos || [];
            modalVentaCurrentPage = 0;
            renderModalVentaProductos();

            document.getElementById('venta-detail-modal').style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            alert('No se pudo cargar el detalle de la venta');
        }
    }

    function cerrarModalDetalleVenta() {
        const modal = document.getElementById('venta-detail-modal');
        if (modal) modal.style.display = 'none';
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

        const totalPages = Math.ceil(modalVentaProductos.length / modalVentaItemsPerPage);
        const startIndex = modalVentaCurrentPage * modalVentaItemsPerPage;
        const endIndex = Math.min(startIndex + modalVentaItemsPerPage, modalVentaProductos.length);
        const productosEnPagina = modalVentaProductos.slice(startIndex, endIndex);

        const totalVentaStr = document.getElementById('modal-venta-total').textContent;
        const totalVenta = parseFloat(totalVentaStr.replace('$', '').replace(/\./g, '').replace(',', '.'));
        const cantidadTotal = modalVentaProductos.reduce((sum, p) => sum + p.cantidad, 0);

        productosEnPagina.forEach(producto => {
            const precioUnitario = cantidadTotal > 0 ? totalVenta / cantidadTotal : 0;
            const subtotal = precioUnitario * producto.cantidad;

            tbody.innerHTML += `
                <tr>
                    <td>${producto.nombreProducto || 'N/A'}</td>
                    <td>${producto.cantidad || 0}</td>
                    <td>$${formatoMoneda.format(precioUnitario)}</td>
                    <td>$${formatoMoneda.format(subtotal)}</td>
                </tr>
            `;
        });

        if (pageInfo) pageInfo.textContent = `Página ${modalVentaCurrentPage + 1} de ${totalPages}`;
        if (prevBtn) prevBtn.disabled = (modalVentaCurrentPage === 0);
        if (nextBtn) nextBtn.disabled = (modalVentaCurrentPage + 1 >= totalPages);
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

    // Cerrar modal de detalle al hacer clic fuera del contenido
    const ventaDetailModal = document.getElementById('venta-detail-modal');
    if (ventaDetailModal) {
        ventaDetailModal.addEventListener('click', function (e) {
            if (e.target === ventaDetailModal) cerrarModalDetalleVenta();
        });
    }




    // Exponer globalmente
    window.showVentasSubsection = showSubsection;
    window.mostrarDetalleVenta = mostrarDetalleVenta;
    window.cerrarModalDetalleVenta = cerrarModalDetalleVenta;
    window.modalVentaPrevPage = modalVentaPrevPage;
    window.modalVentaNextPage = modalVentaNextPage;

});
