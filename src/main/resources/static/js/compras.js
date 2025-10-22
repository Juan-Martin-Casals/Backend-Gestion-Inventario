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
    /**
     * Array que almacena los productos del "carrito" antes de enviar.
     * Cada objeto tendrá: { idProducto, nombreProducto, cantidad, precioUnitario, nuevoPrecioVenta }
     */
    let detalleItems = [];

    // ===============================
    // SELECTORES DEL FORMULARIO Y TABLA
    // ===============================
    const compraForm = document.getElementById('compra-form');
    const compraProveedorSelect = document.getElementById('compra-proveedor'); 
    const generalMessageCompra = document.getElementById('form-general-message-compra');
    const historialTabla = document.getElementById('compras-historial-tabla-body');

    // --- Selectores del nuevo "carrito" ---
    const addDetalleBtn = document.getElementById('add-detalle-btn');
    const compraProductoSelect = document.getElementById('compra-producto-select');
    const cantidadInput = document.getElementById('compra-cantidad');
    const costoInput = document.getElementById('compra-costo-unit');
    const ventaInput = document.getElementById('compra-venta-unit');
    const detalleTemporalTabla = document.getElementById('compra-detalle-temporal');
    const totalDisplay = document.getElementById('compra-total-display');
    const errorDetalleGeneral = document.getElementById('errorDetalleGeneral');

    // ==========================================================
    // LÓGICA DE CARGA DE DATOS (Dropdowns y Tabla Historial)
    // ==========================================================

    /**
     * Carga el <select> de proveedores (el normal)
     */
    async function loadProveedoresParaCompra() {
        if (!compraProveedorSelect) return; 
        try {
            const response = await fetch(API_PROVEEDORES_URL);
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

    /**
     * Carga el <select> de productos (el nuevo)
     */
    async function loadProductosParaCompra() {
        if (!compraProductoSelect) return;
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error('No se pudieron cargar los productos');

            const productos = await response.json();
            compraProductoSelect.innerHTML = '<option value="">Seleccione un producto...</option>';
            productos.forEach(producto => {
                const option = document.createElement('option');
                option.value = producto.id;
                option.textContent = producto.nombre;
                // Opcional: guardar el precio actual en el 'data' del option
                // option.dataset.precioVenta = producto.precioActual; 
                compraProductoSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            compraProductoSelect.innerHTML = '<option value="">Error al cargar productos</option>';
        }
    }

    /**
     * Carga el historial de compras (la tabla de abajo)
     */
    async function loadComprasHistorial() {
        if (!historialTabla) return; 

        try {
            const response = await fetch(API_COMPRAS_URL); 
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            
            const compras = await response.json();
            renderComprasTabla(compras);
            
        } catch (error) {
            console.error('Error al cargar el historial de compras:', error);
            historialTabla.innerHTML = `<tr><td colspan="4">Error al cargar historial.</td></tr>`;
        }
    }

    /**
     * Dibuja la tabla de historial de compras.
     */
    function renderComprasTabla(compras) {
        if (!historialTabla) return;
        historialTabla.innerHTML = ''; 

        if (compras.length === 0) {
            historialTabla.innerHTML = '<tr><td colspan="4">No hay compras registradas.</td></tr>';
            return;
        }

        compras.forEach(compra => {
            const productosTexto = compra.productosComprados && compra.productosComprados.length > 0
                ? compra.productosComprados.map(p => `${p.nombreProducto} (x${p.cantidad})`).join('<br>')
                : 'Sin productos';

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
                    <td>${totalFormateado}</td>
                </tr>`;
            historialTabla.innerHTML += row;
        });
    }

    // ===============================================
    // LÓGICA DEL "CARRITO" (DETALLE TEMPORAL)
    // ===============================================

    /**
     * Dibuja la tabla del "carrito" basada en el array `detalleItems`
     */
    function renderDetalleTemporal() {
        if (!detalleTemporalTabla || !totalDisplay) return;
        
        detalleTemporalTabla.innerHTML = '';
        let totalCompra = 0;

        if (detalleItems.length === 0) {
            detalleTemporalTabla.innerHTML = '<tr><td colspan="6">Aún no has agregado productos.</td></tr>';
        }

        detalleItems.forEach((item, index) => {
            const subtotal = item.cantidad * item.precioUnitario;
            totalCompra += subtotal;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.nombreProducto}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precioUnitario.toFixed(2)}</td>
                <td>$${item.nuevoPrecioVenta.toFixed(2)}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="btn-icon btn-danger btn-quitar-item" data-index="${index}" title="Quitar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            detalleTemporalTabla.appendChild(row);
        });

        // Actualiza el total en el tfoot
        totalDisplay.textContent = `$${totalCompra.toFixed(2)}`;

        // Agrega los event listeners a los botones de "quitar"
        document.querySelectorAll('.btn-quitar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 'dataset.index' es el 'data-index' que pusimos en el HTML
                const indexToRemove = parseInt(e.currentTarget.dataset.index);
                // Quita el item del array por su índice
                detalleItems.splice(indexToRemove, 1);
                // Vuelve a dibujar la tabla
                renderDetalleTemporal();
            });
        });
    }

    /**
     * Manejador del botón "Agregar Producto al Detalle"
     */
    function handleAgregarDetalle() {
        // Limpiar errores
        errorDetalleGeneral.textContent = '';
        document.getElementById('errorCompraProducto').textContent = '';
        document.getElementById('errorCompraCantidad').textContent = '';
        document.getElementById('errorCompraCosto').textContent = '';
        document.getElementById('errorCompraVenta').textContent = '';

        // 1. Obtener valores
        const idProducto = compraProductoSelect.value;
        const nombreProducto = compraProductoSelect.options[compraProductoSelect.selectedIndex].text;
        const cantidad = parseInt(cantidadInput.value);
        
        const precioUnitario = parseFloat(costoInput.value.replace(',', '.'));
        const nuevoPrecioVenta = parseFloat(ventaInput.value.replace(',', '.')); 
        
        const idProductoNum = parseInt(idProducto);

        // 2. Validar
        let isValid = true;
        if (!idProducto) {
            document.getElementById('errorCompraProducto').textContent = 'Seleccione un producto.';
            isValid = false;
        }
        if (isNaN(cantidad) || cantidad <= 0) {
            document.getElementById('errorCompraCantidad').textContent = 'Cantidad inválida.';
            isValid = false;
        }
        
        // --- MENSAJES MODIFICADOS ---
        if (isNaN(precioUnitario) || precioUnitario <= 0) {
            document.getElementById('errorCompraCosto').textContent = 'Costo inválido.'; // <-- Corregido
            isValid = false;
        }
        if (isNaN(nuevoPrecioVenta) || nuevoPrecioVenta < 0) {
            document.getElementById('errorCompraVenta').textContent = 'Precio de venta inválido.'; // <-- Corregido
            isValid = false;
        }

        // Validación de duplicados
        if (isValid && detalleItems.some(item => item.idProducto === idProductoNum)) {
            document.getElementById('errorCompraProducto').textContent = 'Este producto ya está en el detalle.';
            isValid = false;
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

    // Asignar el evento al botón "Agregar"
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

            // 1. Obtener valores principales
            const fecha = document.getElementById('compra-fecha').value;
            const idProveedor = document.getElementById('compra-proveedor').value;

            // 2. Validar
            let isValid = true;
            if (!fecha) {
                document.getElementById('errorCompraFecha').textContent = 'La fecha es obligatoria.';
                isValid = false;
            }
            if (!idProveedor) {
                document.getElementById('errorCompraProveedor').textContent = 'El proveedor es obligatorio.';
                isValid = false;
            }
            // ¡La validación más importante!
            if (detalleItems.length === 0) {
                if (errorDetalleGeneral) errorDetalleGeneral.textContent = 'Debe agregar al menos un producto al detalle.';
                isValid = false;
            }
            
            if (!isValid) {
                if (generalMessageCompra) {
                    generalMessageCompra.textContent = "Debe completar todos los campos correctamente.";
                    generalMessageCompra.classList.add('error');
                }
                return;
            }

            // 3. Construir el DTO
            // El DTO de backend espera los campos en minúscula (ej: idProducto)
            // Nuestro array `detalleItems` ya tiene el formato correcto.
            const compraRequestDTO = {
                fecha: fecha,
                idProveedor: parseInt(idProveedor),
                detalleCompras: detalleItems // ¡Enviamos el array del carrito!
            };
            
            console.log("Enviando DTO de Compra:", JSON.stringify(compraRequestDTO, null, 2));

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
                
                // Limpieza total
                compraForm.reset(); // Resetea fecha y proveedor
                detalleItems = []; // Vacía el carrito
                renderDetalleTemporal(); // Limpia la tabla temporal
                
                loadComprasHistorial(); // Recarga la tabla de historial

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
    loadProveedoresParaCompra(); // Carga el <select> de proveedores
    loadProductosParaCompra();   // Carga el NUEVO <select> de productos
    loadComprasHistorial();      // Carga la tabla de historial
    renderDetalleTemporal();     // Dibuja la tabla temporal vacía
});