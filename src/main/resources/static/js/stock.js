document.addEventListener('DOMContentLoaded', function () {

    // --- 1. URLs DE LA API ---
    // Endpoint para cargar la tabla de stock (GET)
    const API_STOCK_URL = '/api/stock/productos';
    // Endpoint para editar un producto (PUT)
    const API_STOCK_EDIT_URL = '/api/stock/'; // (Ej: /api/stock/1)
    // Endpoint para borrar un producto (DELETE)
    const API_PRODUCTOS_DELETE_URL = '/api/productos/'; // (Ej: /api/productos/1)

    // --- 2. ELEMENTOS PRINCIPALES DE LA PÁGINA ---
    const searchInput = document.getElementById('stock-search-input');
    const tableBody = document.getElementById('stock-table-body');

    // --- 3. CONSTANTES MODAL DE BORRADO (DELETE) ---
    const deleteModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

    // --- 4. CONSTANTES MODAL DE EDICIÓN (EDIT) ---
    
    // Contenedor
    const editModal = document.getElementById('edit-product-modal');
    const editModalCloseBtn = document.getElementById('edit-modal-close-btn');
    const editProductForm = document.getElementById('edit-product-form');

    // Campos (Inputs)
    const editProductId = document.getElementById('edit-product-id');
    const editNombre = document.getElementById('edit-nombre');
    const editCategoria = document.getElementById('edit-categoria');
    const editDescripcion = document.getElementById('edit-descripcion');
    const editPrecio = document.getElementById('edit-precio');
    const editStockActual = document.getElementById('edit-stock-actual');
    const editCantidadAjuste = document.getElementById('edit-cantidad-ajuste');

    // Mensajes (Errores)
    const errorEditNombre = document.getElementById('error-edit-nombre');
    const errorEditCategoria = document.getElementById('error-edit-categoria');
    const errorEditDescripcion = document.getElementById('error-edit-descripcion');
    const errorEditPrecio = document.getElementById('error-edit-precio');
    const errorEditAjuste = document.getElementById('error-edit-ajuste');
    const editFormGeneralMessage = document.getElementById('edit-form-general-message');

    // --- 5. VARIABLES DE ESTADO ---
    // (Las dejamos aquí listas para el siguiente paso)
    let todosLosProductos = [];
    let idParaBorrar = null;

    async function loadStock() {
        // Asegurarse de que tableBody no sea null antes de usarlo
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
        }
        
        try {
            // Usamos la constante que definimos
            const response = await fetch(API_STOCK_URL); 
            
            if (!response.ok) {
                // Si el backend devuelve 401, 403, 500, etc.
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const productos = await response.json();

            // Guardamos la lista completa en nuestra variable de estado
            todosLosProductos = productos; 
            
            // Enviamos los datos a la función que dibuja
            renderStockTable(productos);

        } catch (error) {
            console.error('Error al cargar el stock:', error);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="6">Error al cargar el stock. ${error.message}</td></tr>`;
            }
        }
    }

    function renderStockTable(productos) {
        if (!tableBody) return; // Salir si la tabla no existe

        tableBody.innerHTML = ''; // Limpia la tabla
        
        if (productos.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No se encontraron productos.</td></tr>';
            return;
        }

        productos.forEach(producto => {
            // Usamos los campos de tu StockTablaDTO:
            // id, nombre, categoria, descripcion, precio, stock
            
            // Lógica para la clase del badge de stock
            let stockClass = 'good';
            if (producto.stock <= 0) {
                stockClass = 'empty';
            } else if (producto.stock <= 5) { // (Podés ajustar este '5')
                stockClass = 'low';
            }

            const row = `
                <tr>
                    <td>${producto.nombre}</td>
                    <td>${producto.categoria}</td>
                    <td>${producto.descripcion}</td>
                    <td>$${producto.precio.toFixed(2)}</td>
                    <td><span class="stock-badge ${stockClass}">${producto.stock}</span></td>
                    <td>
                        <button class="btn-icon btn-edit-producto" data-id="${producto.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete-producto" data-id="${producto.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    function filtrarStock() {
        const textoBusqueda = searchInput.value.toLowerCase();

        // Filtramos la lista 'todosLosProductos'
        const productosFiltrados = todosLosProductos.filter(producto => {
            // Comparamos el nombre del producto (en minúsculas)
            // (Usamos producto.nombre según tu StockTablaDTO)
            return producto.nombre.toLowerCase().includes(textoBusqueda);
        });

        // Volvemos a dibujar la tabla, pero solo con los resultados filtrados
        renderStockTable(productosFiltrados);
    }

    function removerFilaDelDOM(id) {
        // 1. Busca el botón de borrar que tiene ese data-id
        const botonParaBorrar = tableBody.querySelector(`.btn-delete-producto[data-id="${id}"]`);
        
        if (botonParaBorrar) {
            // 2. Encuentra la fila (<tr>) padre de ese botón
            const fila = botonParaBorrar.closest('tr');
            if (fila) {
                fila.remove(); // 3. ¡La borra del HTML!
            }
        }
        // 4. Actualiza la lista local (para que el buscador tampoco la encuentre)
        todosLosProductos = todosLosProductos.filter(p => p.id != id);
    }

    function openEditModal(id) {
        // Buscamos el objeto completo en la lista que ya cargamos
        const producto = todosLosProductos.find(p => p.id == id); // Usamos == por si el id es string

        if (!producto) {
            alert('Error: Producto no encontrado en el inventario local.');
            return;
        }

        // Limpiamos mensajes de error
        document.querySelectorAll('#edit-product-form .error-message').forEach(el => el.textContent = '');
        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';
        
        // Rellenamos el formulario con los datos actuales
        editProductId.value = producto.id;
        editNombre.value = producto.nombre;
        editCategoria.value = producto.categoria;
        editDescripcion.value = producto.descripcion;
        editPrecio.value = producto.precio.toFixed(2);
        editStockActual.value = producto.stock; // Muestra el stock actual (solo lectura)
        editCantidadAjuste.value = 0; // Por defecto, el ajuste es 0

        editModal.style.display = 'block';
    }

    /**
     * Maneja el envío del formulario de edición (PUT).
     */
    async function handleEditSubmit(event) {
        event.preventDefault(); // Evita que el formulario recargue la página
        
        // Limpiamos errores
        editFormGeneralMessage.textContent = '';
        editFormGeneralMessage.className = 'form-message';

        const id = editProductId.value;
        // (Convertimos el ajuste a número)
        const ajuste = parseInt(editCantidadAjuste.value) || 0; 
        
        // 1. Validaciones
        let isValid = true;
        
        if (editNombre.value.trim() === "") {
             errorEditNombre.textContent = 'El nombre es obligatorio.';
            isValid = false;
        }
        if (editCategoria.value.trim() === "") {
             errorEditCategoria.textContent = 'La categoría es obligatoria.';
            isValid = false;
        }
        if (editPrecio.value <= 0 || isNaN(parseFloat(editPrecio.value))) {
            errorEditPrecio.textContent = 'El precio debe ser un valor numérico positivo.';
            isValid = false;
        }
        if (isNaN(ajuste)) { // Chequea si no es un número
            errorEditAjuste.textContent = 'El ajuste debe ser un número (o 0).';
            isValid = false;
        }
        
        if (!isValid) return; // Si algo falla, no enviamos

        // 2. Construir el DTO (tal como lo espera tu backend)
        const actualizarDTO = {
            nombre: editNombre.value.trim(),
            categoria: editCategoria.value.trim(),
            descripcion: editDescripcion.value.trim(),
            precio: parseFloat(editPrecio.value),
            cantidadExtraStock: ajuste // Solo enviamos el ajuste
        };

        // 3. Llamar al backend (PUT a /api/stock/{id})
        try {
            const response = await fetch(API_STOCK_EDIT_URL + id, { 
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actualizarDTO)
            });

            if (!response.ok) {
                // Si el backend devuelve un error (400, 500...)
                const errorText = await response.text();
                throw new Error(errorText || `Error HTTP: ${response.status}`);
            }

            // 4. Éxito
            editModal.style.display = 'none';
            alert('¡Producto actualizado con éxito!');
            loadStock(); // Recargamos la tabla para ver los cambios

        } catch (error) {
            console.error('Error al actualizar producto:', error);
            editFormGeneralMessage.textContent = `Error: ${error.message}`;
            editFormGeneralMessage.classList.add('error');
        }
    }


    searchInput.addEventListener('input', filtrarStock);

    tableBody.addEventListener('click', (event) => {
        const target = event.target; // El elemento exacto donde se hizo clic

        // --- LÓGICA DE BORRAR (ABRIR MODAL) ---
        // Usamos .closest() por si el usuario hace clic en el ícono <i>
        const deleteButton = target.closest('.btn-delete-producto');
        if (deleteButton) {
            
            // 1. Obtenemos el ID del producto desde el 'data-id'
            //    y lo guardamos en la variable global.
            idParaBorrar = deleteButton.dataset.id; 

            
            // (Opcional: Si querés personalizar el mensaje del modal)
            // const nombreProducto = deleteButton.closest('tr').cells[0].textContent;
            // document.getElementById('delete-modal-message').textContent = `¿Seguro querés borrar "${nombreProducto}"?`;
            
            // 2. Mostramos el modal
            deleteModal.style.display = 'block';
        }

        // --- LÓGICA DE EDITAR (PARA DESPUÉS) ---
        const editButton = target.closest('.btn-edit-producto');
        if (editButton) {
            const id = editButton.dataset.id;
            console.log('Abrir modal para editar el producto con ID:', id);
            // openEditModal(id);
        }
    });


    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        idParaBorrar = null; // Limpiamos el ID guardado
    });


    confirmDeleteBtn.addEventListener('click', async () => {
        if (!idParaBorrar) return;

        try {
            const response = await fetch(API_PRODUCTOS_DELETE_URL + idParaBorrar, {
                method: 'DELETE'
            });

            // Analizamos la respuesta
            if (response.ok) {
                // ÉXITO (Status 200-299)
                removerFilaDelDOM(idParaBorrar); // <-- ¡BORRA LA FILA SIN RECARGAR!

            } else {
                // ERROR (Status 400, 403, 500, etc.)
                const errorTexto = await response.text();
                throw new Error(errorTexto || `Error HTTP: ${response.status}`);
            }

        } catch (error) {
            // Maneja los errores de red o los 'throw' de arriba
            console.error('Error al eliminar:', error.message);
            alert(`Error inesperado: ${error.message}`);
        
        } finally {
            // Limpiamos
            deleteModal.style.display = 'none';
            idParaBorrar = null;
        }
    });

    loadStock();



});