document.addEventListener('DOMContentLoaded', function() {
    // ===============================
    // SELECTORES DE ELEMENTOS DEL DOM
    // ===============================
    const proveedorForm = document.getElementById('proveedor-form');
    const proveedorTabla = document.getElementById('proveedor-tabla');
    const nombreInput = document.getElementById('proveedorNombre');
    const telefonoInput = document.getElementById('proveedorTelefono');
    const emailInput = document.getElementById('proveedorEmail');
    const direccionInput = document.getElementById('proveedorDireccion');
    const generalMessage = document.getElementById('form-general-message-proveedor');

    // --- Selectores del Multi-Select ---
    const multiSelectContainer = document.getElementById('productos-multi-select-container');
    const tagsContainer = document.getElementById('tags-container');
    const optionsContainer = document.getElementById('productos-options-container');
    const hiddenSelect = document.getElementById('proveedorProductosSelect');
    const selectInput = document.getElementById('productos-select-input');
    
    // ===============================
    // URLs DE LA API
    // ===============================
    const API_PROVEEDORES_URL = '/api/proveedores';
    const API_PRODUCTOS_URL = '/api/productos/select'; 

    // ===============================
    // LÓGICA DE PROVEEDORES
    // ===============================

    async function loadProveedores() {
        try {
            const response = await fetch(API_PROVEEDORES_URL);
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const proveedores = await response.json();
            renderProveedoresTabla(proveedores);
        } catch (error) {
            console.error('Error al cargar los proveedores:', error);
            proveedorTabla.innerHTML = `<tr><td colspan="6">Error al cargar proveedores.</td></tr>`;
        }
    }

    function renderProveedoresTabla(proveedores) {
    proveedorTabla.innerHTML = '';
    if (proveedores.length === 0) {
        proveedorTabla.innerHTML = '<tr><td colspan="6">No hay proveedores registrados.</td></tr>';
        return;
    }

    proveedores.forEach(proveedor => {
        // ✅ ESTA LÍNEA ES LA CLAVE
        // Revisa si la lista 'productos' existe Y si tiene al menos un elemento.
        // Si está vacía, muestra "Sin productos asignados".
        const productosNombres = proveedor.productos && proveedor.productos.length > 0
            ? proveedor.productos.join(', ')
            : 'Sin productos asignados';

        const row = `
            <tr>
                <td>${proveedor.nombre || 'N/A'}</td>
                <td>${proveedor.telefono || 'N/A'}</td>
                <td>${proveedor.email || 'N/A'}</td>
                <td>${proveedor.direccion || 'N/A'}</td>
                <td>${productosNombres}</td>
                <td>
                    <button class="btn-icon"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        proveedorTabla.innerHTML += row;
    });
}

    // ===============================================
    // LÓGICA PARA EL MULTI-SELECT DE PRODUCTOS
    // ===============================================

    async function cargarProductosSelect() {
        try {
            const response = await fetch(API_PRODUCTOS_URL);
            if (!response.ok) throw new Error('No se pudieron cargar los productos');

            // --- ¡CORRECCIÓN AQUÍ! ---
            // 1. DECLARAMOS la variable primero
             const productos = await response.json();



            // 3. Y AHORA la validamos
            if (!Array.isArray(productos)) {
                throw new Error("La respuesta de la API no es un array de productos.");
            }
            // --- FIN DE LA CORRECCIÓN ---

            optionsContainer.innerHTML = '';
            hiddenSelect.innerHTML = '';

            productos.forEach(producto => {
                // (Tu código de mapeo que ya corregimos)
                const realOption = document.createElement('option');
                realOption.value = producto.idProducto;
                realOption.textContent = producto.nombreProducto;
                hiddenSelect.appendChild(realOption);

                const visualOption = document.createElement('div');
                visualOption.classList.add('option');
                visualOption.textContent = producto.nombreProducto;
                visualOption.dataset.value = producto.idProducto;
                
                visualOption.addEventListener('click', () => seleccionarProducto(visualOption, realOption));
                optionsContainer.appendChild(visualOption);
            });

        } catch (error) {
            // Ahora el error será más claro si la API falla
            console.error("Error en cargarProductosSelect:", error); 
            optionsContainer.innerHTML = `<div class="option">Error al cargar productos</div>`;
        }
    }

    function seleccionarProducto(visualOption, realOption) {
        realOption.selected = true;
        crearTag(visualOption.textContent, visualOption.dataset.value, visualOption, realOption);
        visualOption.style.display = 'none';
        optionsContainer.style.display = 'none';
        selectInput.value = '';
    }

    function crearTag(texto, valor, visualOption, realOption) {
        const tag = document.createElement('div');
        tag.classList.add('tag');
        tag.textContent = texto;

        const closeBtn = document.createElement('span');
        closeBtn.classList.add('tag-close');
        closeBtn.innerHTML = '&times;';
        
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            realOption.selected = false;
            tagsContainer.removeChild(tag);
            visualOption.style.display = 'block';
        });

        tag.appendChild(closeBtn);
        tagsContainer.appendChild(tag);
    }

    // --- Eventos del Multi-Select ---
    if (multiSelectContainer) {
        multiSelectContainer.addEventListener('click', () => {
            optionsContainer.style.display = 'block';
            selectInput.focus();
        });
    }
    if (selectInput) {
        selectInput.addEventListener('input', () => {
            const filtro = selectInput.value.toLowerCase();
            optionsContainer.querySelectorAll('.option').forEach(opcion => {
                const textoOpcion = opcion.textContent.toLowerCase();
                opcion.style.display = textoOpcion.includes(filtro) ? 'block' : 'none';
            });
        });
    }
    document.addEventListener('click', (e) => {
        if (multiSelectContainer && !multiSelectContainer.contains(e.target) && !optionsContainer.contains(e.target)) {
            optionsContainer.style.display = 'none';
        }
    });

    // ==========================================================
    // ¡¡AQUÍ ESTÁ EL CÓDIGO RESTAURADO Y CORREGIDO!!
    // ==========================================================
    if (proveedorForm) {
        proveedorForm.addEventListener('submit', async function(event) {
            // 1. Prevenir el envío por defecto para que no recargue la página
            event.preventDefault();

            // 2. Limpiar mensajes de error anteriores
            document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';
            
            // 3. Obtener los valores y validarlos
            const nombre = nombreInput.value.trim();
            const telefono = telefonoInput.value.trim();
            const email = emailInput.value.trim();
            const direccion = direccionInput.value.trim();
            const productosIds = Array.from(hiddenSelect.selectedOptions).map(option => option.value);

            // Validaciones individuales (puedes personalizarlas más)
            let isValid = true;
            if (!nombre) {
                // Aquí deberías tener un <div class="error-message" id="nombreProveedorError"></div> en tu HTML
                document.getElementById('errorNombre').textContent = 'El nombre es obligatorio.';
                isValid = false;
            }
            if (!telefono) {
                document.getElementById('errorTelefono').textContent = 'El teléfono es obligatorio.';
                isValid = false;
            }
            if (!email) {
                document.getElementById('errorEmail').textContent = 'El email es obligatorio.';
                isValid = false;
            }

            if (!direccion) {
                document.getElementById('errorDireccion').textContent = 'La dirección es obligatorio.';
                isValid = false;
            }

            if (productosIds.length === 0) {
                document.getElementById('proveedorProductosError').textContent = 'Debes seleccionar al menos un producto.';
                isValid = false;
            }

            // Si algo no es válido, detenemos la ejecución aquí
            if (!isValid) {
                generalMessage.textContent = "Debe completar todos los campos correctamente.";
                generalMessage.classList.add('error');
                return;
            }

            // 4. Construir el objeto DTO para enviar
            const proveedorDTO = { nombre, telefono, email, direccion, productosIds };

            // 5. Enviar los datos a la API
            try {
                const response = await fetch(API_PROVEEDORES_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(proveedorDTO)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Error: ${response.status}`);
                }

                generalMessage.textContent = "¡Proveedor registrado exitosamente!";
                generalMessage.classList.add('success');
                proveedorForm.reset();
                tagsContainer.innerHTML = '';
                cargarProductosSelect();
                loadProveedores();

            } catch (error) {
                console.error('Error al registrar el proveedor:', error);
                generalMessage.textContent = `Error: ${error.message}`;
                generalMessage.classList.add('error');
            }
        });
    }

    // ===============================
    // CARGA INICIAL DE DATOS
    // ===============================
    loadProveedores();
    cargarProductosSelect();
});