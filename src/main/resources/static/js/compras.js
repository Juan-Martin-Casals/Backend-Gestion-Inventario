document.addEventListener('DOMContentLoaded', function() {
    
    // ===============================
    // URLs DE LA API
    // ===============================
    const API_PRODUCTOS_URL = '/api/productos/select';
    const API_COMPRAS_URL = '/api/compras'; 
    const API_PROVEEDORES_URL = '/api/proveedores/select';
    
    // ===============================
    // ESTADO GLOBAL
    // ===============================
    let detalleItems = []; // "Carrito" de compras
    let todosLosProveedores = []; // Array para el buscador de proveedores
    let todosLosProductos = []; // Array para el buscador de productos

    // ===============================
    // SELECTORES DEL FORMULARIO
    // ===============================
    const compraForm = document.getElementById('compra-form');
    const generalMessageCompra = document.getElementById('form-general-message-compra');
    
    // --- Selectores Buscador Proveedor ---
    const proveedorSearchInput = document.getElementById('compra-proveedor-search');
    const proveedorHiddenInput = document.getElementById('compra-proveedor-id-hidden');
    const proveedorResultsContainer = document.getElementById('compra-proveedor-results');
    const proveedorError = document.getElementById('errorCompraProveedor');

    // --- Selectores Buscador Producto (NUEVO) ---
    const productoSearchInput = document.getElementById('compra-producto-search');
    const productoHiddenInput = document.getElementById('compra-producto-id-hidden');
    const productoResultsContainer = document.getElementById('compra-producto-results');
    const productoError = document.getElementById('errorCompraProducto');

    // --- Selectores del Detalle ("Carrito") ---
    const addDetalleBtn = document.getElementById('add-detalle-btn');
    const cantidadInput = document.getElementById('compra-cantidad');
    const costoInput = document.getElementById('compra-costo-unit');
    const ventaInput = document.getElementById('compra-venta-unit');
    const detalleTemporalTabla = document.getElementById('compra-detalle-temporal');
    const totalDisplay = document.getElementById('compra-total-display'); 
    const errorDetalleGeneral = document.getElementById('errorDetalleGeneral');

    // ===============================
    // SELECTORES TABLA HISTORIAL
    // ===============================
    const historialTabla = document.getElementById('compras-historial-tabla-body');
    const historialPrevPageBtn = document.getElementById('compras-prev-page');
    const historialNextPageBtn = document.getElementById('compras-next-page');
    const historialPageInfo = document.getElementById('compras-page-info');
    
    let historialCurrentPage = 0;
    let historialTotalPages = 1;
    const historialItemsPerPage = 10;
    let historialSortField = 'fecha';
    let historialSortDirection = 'desc';
    const historialTableHeaders = document.querySelectorAll('#compras-section .data-table th[data-sort-by]');
    const mainContent = document.querySelector('.main-content');

    // ==========================================================
    // LÓGICA DE CARGA DE DATOS
    // ==========================================================

    /**
     * Carga Proveedores al array 'todosLosProveedores'
     */
    async function loadProveedoresParaCompra() {
        if (!proveedorSearchInput) return; 
        try {
            const response = await fetch(API_PROVEEDORES_URL); 
            if (!response.ok) throw new Error('Error al cargar proveedores');
            todosLosProveedores = await response.json(); 
        } catch (error) {
            console.error(error);
            proveedorSearchInput.placeholder = "Error al cargar proveedores";
        }
    }

    /**
     * Carga Productos al array 'todosLosProductos'
     */
    async function loadProductosParaCompra() {
        if (!productoSearchInput) return;
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error('No se pudieron cargar los productos');
            todosLosProductos = await response.json();
        } catch (error) {
            console.error(error);
            productoSearchInput.placeholder = "Error al cargar productos";
        }
    }

    // ==========================================================
    // LÓGICA DEL BUSCADOR DE PROVEEDORES
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
        const proveedorId = target.dataset.id;
        const proveedor = todosLosProveedores.find(p => p.id == proveedorId);

        if (proveedor) {
            proveedorSearchInput.value = proveedor.nombre;
            proveedorHiddenInput.value = proveedor.id;
            proveedorResultsContainer.style.display = 'none';
            if (proveedorError) proveedorError.textContent = '';
        }
    }

    // --- Listeners Buscador Proveedor ---
    if (proveedorSearchInput) {
        proveedorSearchInput.addEventListener('input', () => {
            proveedorHiddenInput.value = ''; 
            if (proveedorError) proveedorError.textContent = '';
            filtrarProveedores(); 
        });
        proveedorSearchInput.addEventListener('focus', filtrarProveedores);
    }
    if (proveedorResultsContainer) {
        proveedorResultsContainer.addEventListener('click', seleccionarProveedor);
    }
    
    // ==========================================================
    // LÓGICA DEL BUSCADOR DE PRODUCTOS (NUEVO)
    // ==========================================================

    function renderResultadosProductos(productos) {
        if (productos.length === 0) {
            productoResultsContainer.innerHTML = '<div class="product-result-item">No se encontraron productos</div>';
        } else {
            productoResultsContainer.innerHTML = productos.map(p => {
                // El DTO de producto usa 'idProducto' y 'nombreProducto'
                return `<div class="product-result-item" data-id="${p.idProducto}">
                    ${p.nombreProducto} <span>($${p.precioVenta.toFixed(2)})</span>
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
        const productoId = target.dataset.id;
        const producto = todosLosProductos.find(p => p.idProducto == productoId);

        if (producto) {
            productoSearchInput.value = producto.nombreProducto;
            productoHiddenInput.value = producto.idProducto;
            productoResultsContainer.style.display = 'none';
            if (productoError) productoError.textContent = '';
            
            // Auto-rellenar precio de venta si el campo existe
            if(ventaInput) {
                 ventaInput.value = producto.precioVenta.toFixed(2);
            }
        }
    }
    
    // --- Listeners Buscador Producto ---
    if (productoSearchInput) {
        productoSearchInput.addEventListener('input', () => {
            productoHiddenInput.value = '';
            if (productoError) productoError.textContent = '';
            filtrarProductos();
        });
        productoSearchInput.addEventListener('focus', filtrarProductos);
    }
    if (productoResultsContainer) {
        productoResultsContainer.addEventListener('click', seleccionarProducto);
    }

    // --- Listener Global para cerrar AMBOS dropdowns ---
    document.addEventListener('click', function (event) {
        // Cierra Proveedor
        const isClickInsideProviderInput = proveedorSearchInput && proveedorSearchInput.contains(event.target);
        const isClickInsideProviderResults = proveedorResultsContainer && proveedorResultsContainer.contains(event.target);
        if (!isClickInsideProviderInput && !isClickInsideProviderResults) {
            if (proveedorResultsContainer) proveedorResultsContainer.style.display = 'none';
        }
        
        // Cierra Producto
        const isClickInsideProductInput = productoSearchInput && productoSearchInput.contains(event.target);
        const isClickInsideProductResults = productoResultsContainer && productoResultsContainer.contains(event.target);
        if (!isClickInsideProductInput && !isClickInsideProductResults) {
            if (productoResultsContainer) productoResultsContainer.style.display = 'none';
        }
    });

    // ===============================================
    // LÓGICA DEL "CARRITO" (DETALLE TEMPORAL)
    // (Modificado para leer del buscador de producto)
    // ===============================================

    function renderDetalleTemporal() {
        if (!detalleTemporalTabla || !totalDisplay) return;
        detalleTemporalTabla.innerHTML = '';
        let totalCompra = 0;

        if (detalleItems.length === 0) {
            detalleTemporalTabla.innerHTML = '<tr><td colspan="5">Aún no has agregado productos.</td></tr>';
        }

        detalleItems.forEach((item, index) => {
            const subtotal = item.cantidad * item.precioUnitario;
            totalCompra += subtotal;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nombreProducto}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precioUnitario.toFixed(2)}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="btn-icon btn-danger btn-quitar-item" data-index="${index}" title="Quitar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            detalleTemporalTabla.appendChild(row);
        });

        totalDisplay.textContent = `$ Total Compra: $${totalCompra.toFixed(2)}`;

        document.querySelectorAll('.btn-quitar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.currentTarget.dataset.index);
                detalleItems.splice(indexToRemove, 1);
                renderDetalleTemporal();
            });
        });
    }

    /**
     * ¡MODIFICADO! Lee de los inputs del buscador de productos.
     */
    function handleAgregarDetalle() {
        document.querySelectorAll('#compra-form .error-message').forEach(el => el.textContent = '');
        errorDetalleGeneral.textContent = '';

        // --- Lectura desde los nuevos inputs ---
        const idProducto = productoHiddenInput.value;
        const nombreProducto = productoSearchInput.value; // El nombre ya está en el input visible
        const idProductoNum = parseInt(idProducto);
        
        // El resto de la lógica es la misma
        const cantidad = parseInt(cantidadInput.value);
        const precioUnitario = parseFloat(costoInput.value.replace(',', '.'));
        const nuevoPrecioVenta = parseFloat(ventaInput.value.replace(',', '.')); 

        // --- Validación ---
        let isValid = true;
        if (!idProducto) {
            if(productoError) productoError.textContent = 'Seleccione un producto.'; 
            isValid = false;
        }
        if (isNaN(cantidad) || cantidad <= 0) {
            document.getElementById('errorCompraCantidad').textContent = 'Cantidad inválida.'; isValid = false;
        }
        if (isNaN(precioUnitario) || precioUnitario <= 0) {
            document.getElementById('errorCompraCosto').textContent = 'Costo inválido.'; isValid = false;
        }
        if (isNaN(nuevoPrecioVenta) || nuevoPrecioVenta < 0) {
            document.getElementById('errorCompraVenta').textContent = 'Precio de venta inválido.'; isValid = false;
        }
        if (isValid && detalleItems.some(item => item.idProducto === idProductoNum)) {
            if(productoError) productoError.textContent = 'Este producto ya está en el detalle.'; 
            isValid = false;
        }
        if (!isValid) return;

        // --- Agregar al array ---
        detalleItems.push({
            idProducto: idProductoNum,
            nombreProducto: nombreProducto,
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            nuevoPrecioVenta: nuevoPrecioVenta
        });

        renderDetalleTemporal();

        // --- Limpiar los inputs para el siguiente producto ---
        productoSearchInput.value = '';
        productoHiddenInput.value = '';
        cantidadInput.value = '1';
        costoInput.value = '';
        ventaInput.value = '';
        
        productoSearchInput.focus(); // Devolvemos el foco al buscador de producto
    }

    if (addDetalleBtn) {
         addDetalleBtn.addEventListener('click', handleAgregarDetalle);
    }

    // ===============================================
    // MANEJADOR DEL FORMULARIO PRINCIPAL (SUBMIT)
    // ===============================================

    if (compraForm) {
        compraForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            document.querySelectorAll('#compra-form .error-message').forEach(el => el.textContent = '');
            if (generalMessageCompra) {
                generalMessageCompra.textContent = '';
                generalMessageCompra.className = 'form-message';
            }

            let isValid = true;
            const fecha = document.getElementById('compra-fecha').value;
            const idProveedor = proveedorHiddenInput.value;
            
            if (!fecha) { document.getElementById('errorCompraFecha').textContent = 'La fecha es obligatoria.'; isValid = false; }
            if (!idProveedor) { 
                document.getElementById('errorCompraProveedor').textContent = 'El proveedor es obligatorio.'; 
                isValid = false; 
            }
            if (detalleItems.length === 0) {
                if (errorDetalleGeneral) errorDetalleGeneral.textContent = 'Debe agregar al menos un producto al detalle.'; isValid = false;
            }
            if (!isValid) {
                if (generalMessageCompra) {
                    generalMessageCompra.textContent = "Debe completar todos los campos correctamente.";
                    generalMessageCompra.classList.add('error');
                }
                return;
            }

            const compraRequestDTO = {
                fecha: fecha,
                idProveedor: parseInt(idProveedor),
                detalleCompras: detalleItems 
            };
            
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

                if (generalMessageCompra) {
                    generalMessageCompra.textContent = "¡Compra registrada exitosamente!";
                    generalMessageCompra.classList.add('success');
                }
                
                compraForm.reset(); 
                detalleItems = []; 
                renderDetalleTemporal(); 
                
                // Limpiamos AMBOS buscadores
                proveedorSearchInput.value = '';
                proveedorHiddenInput.value = '';
                productoSearchInput.value = '';
                productoHiddenInput.value = '';

                historialCurrentPage = 0;
                loadComprasHistorial(); 

            } catch (error) {
                console.error('Error al registrar la compra:', error);
                if (generalMessageCompra) {
                    generalMessageCompra.textContent = `Error al registrar: ${error.message}`;
                    generalMessageCompra.classList.add('error');
                }
            }
        });
    }

    // ===============================================
    // LÓGICA DE LA TABLA HISTORIAL (Sin cambios)
    // ===============================================
    
    async function loadComprasHistorial() {
        if (!historialTabla || !mainContent) return; 
        
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        historialTabla.classList.add('loading');
        historialTabla.innerHTML = `<tr><td colspan="5">Cargando historial...</td></tr>`;
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const sortParam = historialSortField ? `&sort=${historialSortField},${historialSortDirection}` : '';
            const url = `${API_COMPRAS_URL}?page=${historialCurrentPage}&size=${historialItemsPerPage}${sortParam}`;
            
            const response = await fetch(url); 
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            
            const pageData = await response.json(); 
            historialTotalPages = pageData.totalPages;
            
            renderComprasTabla(pageData.content);
            updateHistorialPaginationControls(); 
            updateHistorialSortIndicators(); 
            
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                historialTabla.classList.remove('loading');
            });
            
        } catch (error) {
            console.error('Error al cargar el historial de compras:', error);
            historialTabla.innerHTML = `<tr><td colspan="5">Error al cargar historial.</td></tr>`;
            historialTabla.classList.remove('loading');
        }
    }

    function renderComprasTabla(compras) {
        if (!historialTabla) return;
        historialTabla.innerHTML = ''; 

        if (compras.length === 0) {
            historialTabla.innerHTML = '<tr><td colspan="5">No hay compras registradas.</td></tr>';
            return;
        }

        compras.forEach(compra => {
            const productosTexto = compra.productosComprados && compra.productosComprados.length > 0
                ? compra.productosComprados.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>')
                : 'Sin productos';

            const costosTexto = compra.productosComprados && compra.productosComprados.length > 0
                ? compra.productosComprados.map(p => `$${(p.precioUnitario || 0).toFixed(2)}`).join('<br>')
                : 'N/A';
                
            const totalFormateado = `$${(compra.total || 0).toFixed(2)}`;
            
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

    if (historialPrevPageBtn) {
        historialPrevPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (historialCurrentPage > 0) {
                historialCurrentPage--;
                loadComprasHistorial();
            }
        });
    }

    if (historialNextPageBtn) {
        historialNextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (historialCurrentPage + 1 < historialTotalPages) {
                historialCurrentPage++;
                loadComprasHistorial();
            }
        });
    }

    function handleHistorialSortClick(event) {
        event.preventDefault();
        event.currentTarget.blur();
        
        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');
        if (!newSortField) return;

        if (historialSortField === newSortField) {
            historialSortDirection = historialSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            historialSortField = newSortField;
            historialSortDirection = 'asc';
        }
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

    historialTableHeaders.forEach(header => {
        header.addEventListener('click', handleHistorialSortClick);
    });

    // ===============================
    // CARGA INICIAL (COMPRAS)
    // ===============================
    loadProveedoresParaCompra(); // Carga proveedores al array
    loadProductosParaCompra();   // Carga productos al array
    loadComprasHistorial();       // Carga la tabla de historial
    renderDetalleTemporal();     // Renderiza la tabla vacía del carrito
});