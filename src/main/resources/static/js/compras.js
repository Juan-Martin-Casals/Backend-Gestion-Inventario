document.addEventListener('DOMContentLoaded', function() {
    
    // ===============================
    // URLs DE LA API
    // ===============================
    const API_PRODUCTOS_URL = '/api/productos/select';
    const API_COMPRAS_URL = '/api/compras'; 
    const API_PROVEEDORES_URL = '/api/proveedores'; 
    
    // ===============================
    // ESTADO DE LA COMPRA (CARRITO)
    // ===============================
    let detalleItems = [];

    // ===============================
    // SELECTORES DEL FORMULARIO Y TABLA
    // ===============================
    const compraForm = document.getElementById('compra-form');
    const compraProveedorSelect = document.getElementById('compra-proveedor'); 
    const generalMessageCompra = document.getElementById('form-general-message-compra');
    const historialTabla = document.getElementById('compras-historial-tabla-body');

    // --- Selectores del Detalle ---
    const addDetalleBtn = document.getElementById('add-detalle-btn');
    const compraProductoSelect = document.getElementById('compra-producto-select');
    const cantidadInput = document.getElementById('compra-cantidad');
    const costoInput = document.getElementById('compra-costo-unit');
    const ventaInput = document.getElementById('compra-venta-unit');
    const detalleTemporalTabla = document.getElementById('compra-detalle-temporal');
    const totalDisplay = document.getElementById('compra-total-display'); 
    const errorDetalleGeneral = document.getElementById('errorDetalleGeneral');

    // ===============================
    // ¡NUEVO! ESTADO Y SELECTORES DE PAGINACIÓN
    // ===============================
    const historialPrevPageBtn = document.getElementById('compras-prev-page');
    const historialNextPageBtn = document.getElementById('compras-next-page');
    const historialPageInfo = document.getElementById('compras-page-info');
    
    let historialCurrentPage = 0; // Las páginas de Spring Boot empiezan en 0
    let historialTotalPages = 1;
    const historialItemsPerPage = 10; // Número de items a mostrar

    // ==========================================================
    // LÓGICA DE CARGA DE DATOS (Dropdowns y Tabla Historial)
    // ==========================================================

    async function loadProveedoresParaCompra() {
        if (!compraProveedorSelect) return; 
        try {
            const response = await fetch(API_PROVEEDORES_URL + "/select"); 
            if (!response.ok) throw new Error('Error al cargar proveedores');
            
            const proveedores = await response.json(); 
            
            compraProveedorSelect.innerHTML = '<option value="">Seleccione un proveedor...</option>';
            proveedores.forEach(p => {
                const option = document.createElement('option');
                option.value = p.id; 
                option.textContent = p.nombre;
                compraProveedorSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            compraProveedorSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    async function loadProductosParaCompra() {
        if (!compraProductoSelect) return;
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error('No se pudieron cargar los productos');

            const productos = await response.json();
            compraProductoSelect.innerHTML = '<option value="">Seleccione un producto...</option>';
            productos.forEach(producto => {
                const option = document.createElement('option');
                option.value = producto.idProducto; 
                option.textContent = producto.nombreProducto;
                option.dataset.precioVenta = producto.precioVenta; 
                compraProductoSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            compraProductoSelect.innerHTML = '<option value="">Error al cargar productos</option>';
        }
    }

    // ¡FUNCIÓN DE HISTORIAL ACTUALIZADA PARA PAGINACIÓN!
    async function loadComprasHistorial() {
        if (!historialTabla) return; 
        
        historialTabla.innerHTML = `<tr><td colspan="5">Cargando historial...</td></tr>`;

        try {
            // Enviamos los parámetros de paginación y el ordenamiento por fecha (DESC)
            const url = `${API_COMPRAS_URL}?page=${historialCurrentPage}&size=${historialItemsPerPage}&sort=fecha,desc`;
            const response = await fetch(url); 
            
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            
            const pageData = await response.json(); // Recibimos el objeto Page
            
            historialTotalPages = pageData.totalPages;
            
            renderComprasTabla(pageData.content);
            updateHistorialPaginationControls(); // Actualizamos controles
            
        } catch (error) {
            console.error('Error al cargar el historial de compras:', error);
            historialTabla.innerHTML = `<tr><td colspan="5">Error al cargar historial.</td></tr>`;
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

            // Costos unitarios de los productos
            const costosTexto = compra.productosComprados && compra.productosComprados.length > 0
                ? compra.productosComprados.map(p => `$${(p.precioUnitario || 0).toFixed(2)}`).join('<br>')
                : 'N/A';
                
            const totalFormateado = `$${(compra.total || 0).toFixed(2)}`;
            
            let fechaFormateada = compra.fecha || 'N/A';
            if (typeof fechaFormateada === 'string' && fechaFormateada.includes('-')) {
                 const partes = fechaFormateada.split('T')[0].split('-');
                 fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
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

    // ===============================================
    // ¡NUEVO! LÓGICA DE PAGINACIÓN DEL HISTORIAL
    // ===============================================
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


    // ===============================================
    // LÓGICA DEL "CARRITO" (DETALLE TEMPORAL)
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

    function handleAgregarDetalle() {
        // Limpiar errores
        document.querySelectorAll('#compra-form .error-message').forEach(el => el.textContent = '');
        errorDetalleGeneral.textContent = '';

        // 1. Obtener valores (misma lógica que ya tenías)
        const selectElement = compraProductoSelect;
        const idProducto = selectElement.value;
        const nombreProducto = selectElement.options[selectElement.selectedIndex].text;
        
        const cantidad = parseInt(cantidadInput.value);
        const precioUnitario = parseFloat(costoInput.value.replace(',', '.'));
        const nuevoPrecioVenta = parseFloat(ventaInput.value.replace(',', '.')); 
        
        const idProductoNum = parseInt(idProducto);

        // 2. Validar
        let isValid = true;
        if (!idProducto) {
            document.getElementById('errorCompraProducto').textContent = 'Seleccione un producto.'; isValid = false;
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
            document.getElementById('errorCompraProducto').textContent = 'Este producto ya está en el detalle.'; isValid = false;
        }
        if (!isValid) return;

        // 3. Agregar al array `detalleItems`
        detalleItems.push({
            idProducto: idProductoNum,
            nombreProducto: nombreProducto,
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            nuevoPrecioVenta: nuevoPrecioVenta
        });

        // 4. Actualizar la tabla temporal
        renderDetalleTemporal();

        // 5. Limpiar los inputs para el siguiente producto
        compraProductoSelect.value = '';
        cantidadInput.value = '1';
        costoInput.value = '';
        ventaInput.value = '';
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

            // ... (validación de fecha y proveedor) ...
            let isValid = true;
            const fecha = document.getElementById('compra-fecha').value;
            const idProveedor = document.getElementById('compra-proveedor').value;
            
            if (!fecha) { document.getElementById('errorCompraFecha').textContent = 'La fecha es obligatoria.'; isValid = false; }
            if (!idProveedor) { document.getElementById('errorCompraProveedor').textContent = 'El proveedor es obligatorio.'; isValid = false; }
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
            
            // 4. Enviar los datos a la API
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
                
                // Limpieza y recarga en página 0 para ver la compra nueva
                compraForm.reset(); 
                detalleItems = []; 
                renderDetalleTemporal(); 
                
                historialCurrentPage = 0; // Volver a la primera página
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

    // ===============================
    // CARGA INICIAL (COMPRAS)
    // ===============================
    loadProveedoresParaCompra();
    loadProductosParaCompra();  
    loadComprasHistorial();      
    renderDetalleTemporal();    
});