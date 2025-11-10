document.addEventListener('DOMContentLoaded', function () {

    const API_VENTAS_URL = '/api/ventas';
    const API_PRODUCTOS_URL = '/api/productos/select';

    // --- 2. Constantes del Formulario (Inputs) ---
    const ventaForm = document.getElementById('venta-form');
    const fechaVentaInput = document.getElementById('fecha-venta');
    const nombreClienteInput = document.getElementById('nombre-venta');
    const apellidoClienteInput = document.getElementById('apellido-cliente');
    const telefonoClienteInput = document.getElementById('telefono-cliente');
    const dniClienteInput = document.getElementById('dni-cliente');
    const btnAgregarProducto = document.getElementById('btn-agregar-producto');
    const ventaDetalleTemporalBody = document.getElementById('venta-detalle-temporal');
    


    // Inputs de búsqueda de producto
    const productSearchInput = document.getElementById('product-search');
    const cantidadProductoInput = document.getElementById('cantidad-producto');

    // --- 3. Constantes del Formulario (UI y Errores) ---
    const productResultsContainer = document.getElementById('product-results');
    const totalVentaDisplay = document.getElementById('total-venta');
    const generalMessage = document.getElementById('form-general-message-venta');

    // Mensajes de error para validación
    const errorFechaVenta = document.getElementById('errorFechaVenta');
    const errorNombreCliente = document.getElementById('errorNombreCliente');
    const errorApellidoCliente = document.getElementById('errorApellidoCliente');
    const errorTelefonoCliente = document.getElementById('errorTelefonoCliente');
    const errorDniCliente = document.getElementById('errorDniCliente');
    const errorProducto = document.getElementById('errorProducto');
    const errorCompraCantidad = document.getElementById('errorCompraCantidad');
    const errorDetalleGeneral = document.getElementById('errorDetalleGeneral');

    // --- 4. Constantes de la Tabla y Paginación ---

    const ventaTableBody = document.querySelector('#tabla-ventas tbody');
    
    // Controles de Paginación de Ventas
    const ventasPageInfo = document.getElementById('ventas-page-info');
    const ventasPrevPageBtn = document.getElementById('ventas-prev-page');
    const ventasNextPageBtn = document.getElementById('ventas-next-page');


    // --- VARIABLES DE ESTADO ---
    let todosLosProductos = []; // Aquí guardaremos los productos del /select
    let productoSeleccionado = null; // Guardará el objeto producto elegido
    let detallesVenta = []; // Esta es la LISTA de productos para enviar

    // --- ESTADO DE PAGINACIÓN DE VENTAS ---
    let currentPageVentas = 0; 
    const pageSizeVentas = 7; // Tamaño de página a 7
    let totalPagesVentas = 0;


    // --- 5. Funciones ---

    // CARGAR VENTAS EN LA TABLA (AHORA CON PAGINACIÓN Y ORDENAMIENTO)
    async function loadVentas(page = 0) { // Recibe el número de página a cargar

        
        try {
            // DEFINE LA VARIABLE sortParam E INCLUYE LA PÁGINA Y TAMAÑO
            const sortParam = 'fecha,desc'; // Orden descendente por fecha
            
            // Construye la URL con paginación y ordenamiento
            const url = `${API_VENTAS_URL}?page=${page}&size=${pageSizeVentas}&sort=${sortParam}`; 

            const response = await fetch(url);
            if (!response.ok) {
                // Si el servidor devuelve 404 o similar, el .json() fallará, manejamos el error
                throw new Error(`Error HTTP: ${response.status}`);
            }

            // Se espera una respuesta paginada (Page<VentaResponseDTO>)
            const pageData = await response.json(); 
            const ventas = pageData.content;

            currentPageVentas = pageData.number; // Índice de página actual (0-based)
            totalPagesVentas = pageData.totalPages; // Total de páginas

            renderVentasTable(ventas);
            updateVentasPaginationControls(); // Llama a la función de control

        } catch (error) {
            console.error('Error al cargar las ventas:', error);
            if (ventaTableBody) {
                ventaTableBody.innerHTML = `<tr><td colspan="4">Error al cargar el historial de ventas.</td></tr>`;
            }
            // En caso de error, resetea los controles de paginación
            currentPageVentas = 0;
            totalPagesVentas = 0;
            renderVentasTable([]);
            updateVentasPaginationControls();
        }
    }

    // ACTULIZAR CONTROLES DE PAGINACIÓN
    function updateVentasPaginationControls() {
        if (!ventasPageInfo || !ventasPrevPageBtn || !ventasNextPageBtn) return;
        
        // Muestra el estado actual de la paginación (índice 1 para el usuario)
        const displayPage = totalPagesVentas > 0 ? currentPageVentas + 1 : 0;
        ventasPageInfo.textContent = `Página ${displayPage} de ${totalPagesVentas}`;
        
        // Deshabilita/Habilita el botón de página anterior
        ventasPrevPageBtn.disabled = currentPageVentas === 0 || totalPagesVentas === 0;
        
        // Deshabilita/Habilita el botón de página siguiente
        ventasNextPageBtn.disabled = currentPageVentas >= totalPagesVentas - 1 || totalPagesVentas === 0;

    }

    function formatProductosList(productosList) {
        if (!productosList || productosList.length === 0) {
            return "N/A";
        }

        return productosList.map(producto => {
            return `${producto.nombreProducto} x${producto.cantidad}`;
        }).join(', ');
    }


    // RENDIZAR LA TABLA VENTAS

    function renderVentasTable(ventas) {
        if (!ventaTableBody) return;
        ventaTableBody.innerHTML = '';
        
        // Comprueba que 'ventas' sea un array válido.
        if (!Array.isArray(ventas) || ventas.length === 0) {
            ventaTableBody.innerHTML = '<tr><td colspan="4">No hay ventas registradas.</td></tr>';
            return;
        }

        const rowsHtml = ventas.map(venta => {
            // Convierte la fecha del backend (YYYY-MM-DD) al formato DD/MM/YYYY para mostrar
            const parts = venta.fecha.split('-');
            const fechaFormateada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            const productosTexto = formatProductosList(venta.productos);

            return `
                <tr>
                    <td>${fechaFormateada}</td>
                    <td>${venta.nombreCliente}</td> 
                    <td>${productosTexto}</td> 
                    <td>$${venta.total.toFixed(2)}</td> 
                </tr>
            `;
        }).join('');

        ventaTableBody.innerHTML = rowsHtml;
    }

    async function loadProductosParaSelect() {
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            todosLosProductos = await response.json();
        } catch (error) {
            console.error('Error al cargar productos para el select:', error);
            errorProducto.textContent = "No se pudieron cargar los productos.";
        }
    }


    function buscarProductos() {
        const query = productSearchInput.value.toLowerCase();

        if (query.length === 0) {
            renderResultados(todosLosProductos); 
            return;
        }

        const productosFiltrados = todosLosProductos.filter(producto => {
            return producto.nombreProducto.toLowerCase().includes(query);
        });

        renderResultados(productosFiltrados);
    }

    function renderResultados(productos) {
        if (productos.length === 0) {
            productResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron productos</div>';
            productResultsContainer.style.display = 'block';
            return;
        }

        productResultsContainer.innerHTML = productos.map(producto => {
            return `
                <div class="product-result-item" data-id="${producto.idProducto}">
                    ${producto.nombreProducto} <span>($${producto.precioVenta.toFixed(2)})</span>
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
        ventaDetalleTemporalBody.innerHTML = ''; // Limpia la tabla
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
                    <td>$${item.precioVenta.toFixed(2)}</td>
                    <td>$${subtotal.toFixed(2)}</td>
                    <td>
                        <button type="button" class="btn-icon btn-delete-detalle" data-id="${item.idProducto}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            ventaDetalleTemporalBody.innerHTML += row;
        });
        totalVentaDisplay.textContent = `$ Total: $${totalAcumulado.toFixed(2)}`;
    }

    async function saveVenta(event) {
        event.preventDefault();
        generalMessage.textContent = '';
        generalMessage.className = 'form-message';

        const fechaVenta = fechaVentaInput.value;
        const nombreCliente = nombreClienteInput.value.trim();
        const apellidoCliente = apellidoClienteInput.value.trim();
        const dniCliente = dniClienteInput.value.trim();
        const telefonoCliente = telefonoClienteInput.value.trim();

        let isValid = true;
        if (!fechaVenta) {
            errorFechaVenta.textContent = 'La fecha es obligatoria.';
            isValid = false;
        }
        if (!nombreCliente) {
            errorNombreCliente.textContent = 'El nombre es obligatorio.';
            isValid = false;
        }
        if (!apellidoCliente) {
            errorApellidoCliente.textContent = 'El apellido es obligatorio.';
            isValid = false;
        }
        if(!dniCliente){
            errorDniCliente.textContent = 'El DNI es obligatorio';
        } else {
            errorDniCliente.textContent = '';
        }
        if(!telefonoCliente){
            errorTelefonoCliente.textContent = 'El telefono es obligatorio';
        } else {
            errorTelefonoCliente.textContent = '';
        }

        if (detallesVenta.length === 0) {
            errorDetalleGeneral.textContent = 'Debe agregar al menos un producto a la venta.';
            isValid = false;
        }

        if (!isValid) {
            generalMessage.textContent = 'Por favor, complete todos los campos obligatorios.';
            generalMessage.classList.add('error');
            return; 
        }

        const detallesParaBackend = detallesVenta.map(item => {
            return {
                productoId: item.idProducto, // El backend espera 'productoId'
                cantidad: item.cantidad     // El backend espera 'cantidad'
            };
        });

        const clienteDTO = {
            nombre: nombreCliente,
            apellido: apellidoCliente,
            dni: dniCliente,
            telefono: telefonoCliente
        };

        const ventaRequestDTO = {
            fecha: fechaVenta,
            cliente: clienteDTO,
            detalles: detallesParaBackend,
        };

        try {
            const response = await fetch(API_VENTAS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ventaRequestDTO),
            });

            if (!response.ok) {
                const errorTexto = await response.text();
                throw new Error(errorTexto || `Error HTTP: ${response.status}`);
            }

            const ventaCreada = await response.json();
            console.log('Venta registrada con éxito:', ventaCreada);

            generalMessage.textContent = '¡Venta registrada con éxito!';
            generalMessage.classList.add('success');

            ventaForm.reset();
            detallesVenta = [];
            renderDetalleTemporal();
            loadVentas(0); // Recargar la primera página de ventas
        } catch (error) {
            console.error('Error al registrar la venta:', error);
            generalMessage.textContent = `Error: ${error.message}`;
            generalMessage.classList.add('error');
        }
    }

    // MANEJADORES DE EVENTOS DE PAGINACIÓN DE VENTAS
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

    if (ventaForm) {
        ventaForm.addEventListener('submit', saveVenta);
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

    document.addEventListener('click', function (event) {
        // Aseguramos que los elementos existen antes de usar .contains
        const isClickInsideInput = productSearchInput && productSearchInput.contains(event.target);
        const isClickInsideResults = productResultsContainer && productResultsContainer.contains(event.target);
        const isClickInsideAddButton = btnAgregarProducto && btnAgregarProducto.contains(event.target);


        if (!isClickInsideInput && !isClickInsideResults && (!btnAgregarProducto || !isClickInsideAddButton)) {
            if (productResultsContainer) {
                productResultsContainer.style.display = 'none';
            }
        }
    });

    if (ventaDetalleTemporalBody) {
        ventaDetalleTemporalBody.addEventListener('click', function(event) {
            const deleteButton = event.target.closest('.btn-delete-detalle');
            if (deleteButton) {
                const idParaQuitar = Number(deleteButton.dataset.id);

                detallesVenta = detallesVenta.filter(item => item.idProducto !== idParaQuitar);

                renderDetalleTemporal();
            }
        });
    }

    // Event Listeners de Paginación
    if (ventasPrevPageBtn) {
        ventasPrevPageBtn.addEventListener('click', handleVentasPrevPage);
    }
    if (ventasNextPageBtn) {
        ventasNextPageBtn.addEventListener('click', handleVentasNextPage);
    }


    loadProductosParaSelect();
    loadVentas(); // Carga inicial
});