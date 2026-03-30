// === cliente.js ===
document.addEventListener('DOMContentLoaded', function () {

    const API_CLIENTES_URL = '/api/clientes';

    // Estado global
    let allClientes = [];       // Dataset completo en memoria
    let filteredClientes = [];  // Dataset filtrado
    let currentPage = 0;
    let totalPages = 1;
    const itemsPerPage = 8;

    // Estado de ordenamiento
    let sortField = 'nombre';
    let sortDirection = 'asc';

    // Referencias a la UI principal
    const tbody = document.getElementById('tabla-clientes-body');
    const tableContainer = document.querySelector('.table-container-cliente');
    const paginationInfo = document.getElementById('clientes-page-info');
    const btnPrevPage = document.getElementById('clientes-prev-page');
    const btnNextPage = document.getElementById('clientes-next-page');
    const inputSearch = document.getElementById('clientes-search-input');
    const btnClearSearch = document.getElementById('clientes-btn-limpiar');

    // Modales y formularios
    const detailModal = document.getElementById('cliente-detail-modal');
    const editModal = document.getElementById('cliente-edit-modal');
    const deleteModal = document.getElementById('cliente-delete-modal');

    const isAdmin = editModal !== null;

    if (!tbody) return;

    // Helper: quitar acentos y pasar a minúsculas
    const quitarAcentos = (str) => {
        return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
    };

    // ==========================================
    // CARGA DE DATOS (una sola vez desde la API)
    // ==========================================
    async function fetchAllClientes() {
        const response = await fetch(`${API_CLIENTES_URL}/all?page=0&size=10000&sort=nombre,asc`);
        if (!response.ok) throw new Error('Error al obtener clientes');
        const data = await response.json();
        allClientes = data.content || [];
    }

    // ==========================================
    // FILTRADO + PAGINACIÓN LOCAL
    // ==========================================
    async function loadClientes(forceFetch = false) {
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        tbody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // Solo traemos datos del backend si no los tenemos o si se fuerza
            if (allClientes.length === 0 || forceFetch) {
                await fetchAllClientes();
            }

            // Filtrado local (case + accent insensitive)
            const query = quitarAcentos(inputSearch ? inputSearch.value.trim() : '');
            const queryDigits = query.replace(/\D/g, ''); // Solo dígitos para teléfono
            if (query !== '') {
                filteredClientes = allClientes.filter(c => {
                    const telDigits = (c.telefono || '').replace(/\D/g, '');
                    return (
                        quitarAcentos(c.nombre).includes(query) ||
                        quitarAcentos(c.apellido).includes(query) ||
                        quitarAcentos(c.dni).includes(query) ||
                        quitarAcentos(c.telefono).includes(query) ||
                        (queryDigits.length > 0 && telDigits.includes(queryDigits)) ||
                        quitarAcentos(c.email).includes(query)
                    );
                });
            } else {
                filteredClientes = [...allClientes];
            }

            // Ordenamiento local
            sortClientes();

            // Paginación local
            totalPages = Math.max(1, Math.ceil(filteredClientes.length / itemsPerPage));
            if (currentPage >= totalPages) currentPage = 0;
            const pageSlice = filteredClientes.slice(
                currentPage * itemsPerPage,
                (currentPage + 1) * itemsPerPage
            );

            renderTable(pageSlice);
            updatePagination();
            updateSortIndicators();

            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                tbody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error:', error);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error al cargar datos.</td></tr>`;
            tbody.classList.remove('loading');
        }
    }

    function renderTable(clientes) {
        tbody.innerHTML = '';
        if (clientes.length === 0) {
            const msg = (inputSearch && inputSearch.value.trim() !== '')
                ? 'No se encontraron clientes que coincidan con la búsqueda.'
                : 'No se encontraron clientes.';
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${msg}</td></tr>`;
            return;
        }

        clientes.forEach(cliente => {
            let tr = document.createElement('tr');

            let accionesHtml = `
                <button class="btn-icon btn-view-cliente" data-id="${cliente.idCliente}" title="Ver Detalles">
                    <i class="fas fa-eye"></i>
                </button>
            `;

            if (isAdmin) {
                accionesHtml += `
                    <button class="btn-icon btn-edit-cliente" data-id="${cliente.idCliente}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete-cliente" data-id="${cliente.idCliente}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }

            tr.innerHTML = `
                <td>${cliente.nombre || '-'}</td>
                <td>${cliente.apellido || '-'}</td>
                <td>${cliente.telefono || '-'}</td>
                <td>${cliente.email || '-'}</td>
                <td>${accionesHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updatePagination() {
        if (!paginationInfo) return;
        paginationInfo.textContent = `Página ${currentPage + 1} de ${totalPages}`;

        btnPrevPage.disabled = (currentPage === 0);
        btnNextPage.disabled = (currentPage + 1 >= totalPages);
    }

    // ==========================================
    // ORDENAMIENTO LOCAL
    // ==========================================
    function sortClientes() {
        filteredClientes.sort((a, b) => {
            const valA = quitarAcentos(a[sortField] || '');
            const valB = quitarAcentos(b[sortField] || '');
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function updateSortIndicators() {
        const table = document.getElementById('tabla-clientes');
        if (!table) return;
        table.querySelectorAll('th[data-sort-by]').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
            const icon = th.querySelector('.sort-icon');
            if (icon) icon.className = 'sort-icon fas fa-sort';

            if (th.dataset.sortBy === sortField) {
                th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
                if (icon) icon.className = `sort-icon fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
            }
        });
    }

    // Registrar clics en headers ordenables
    const clienteTable = document.getElementById('tabla-clientes');
    if (clienteTable) {
        clienteTable.querySelectorAll('th[data-sort-by]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sortBy;
                if (sortField === field) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortField = field;
                    sortDirection = 'asc';
                }
                currentPage = 0;
                loadClientes();
            });
        });
    }

    // ==========================================
    // EVENTOS DE NAVEGACION Y BUSQUEDA
    // ==========================================
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                loadClientes();
            }
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', () => {
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadClientes();
            }
        });
    }

    // Búsqueda en tiempo real con debounce
    let searchTimeout;
    if (inputSearch) {
        inputSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 0;
                loadClientes();
            }, 300);
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
            if (inputSearch) inputSearch.value = '';
            currentPage = 0;
            loadClientes();
        });
    }

    // ==========================================
    // DELEGACIÓN DE EVENTOS PARA BOTONES DE ACCIÓN
    // ==========================================
    tbody.addEventListener('click', async (e) => {
        const btnView = e.target.closest('.btn-view-cliente');
        const btnEdit = e.target.closest('.btn-edit-cliente');
        const btnDelete = e.target.closest('.btn-delete-cliente');

        if (btnView) handleView(btnView.dataset.id);
        if (btnEdit) handleEdit(btnEdit.dataset.id);
        if (btnDelete) handleDelete(btnDelete.dataset.id);
    });

    // ==========================================
    // ACCIONES (VER) — con paginación de ventas
    // ==========================================
    let detailVentas = [];
    let detailVentasPage = 0;
    const detailVentasPerPage = 5;

    function renderVentasPage() {
        const ventasBody = document.getElementById('detail-cliente-ventas-body');
        if (detailVentas.length === 0) {
            ventasBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Este cliente no tiene ventas registradas.</td></tr>';
            return;
        }
        const start = detailVentasPage * detailVentasPerPage;
        const pageData = detailVentas.slice(start, start + detailVentasPerPage);

        ventasBody.innerHTML = pageData.map(v => {
            const fecha = v.fecha ? new Date(v.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
            const productos = v.productos && v.productos.length > 0
                ? v.productos.map(p => `${p.nombreProducto} (x${p.cantidad})`).join(', ')
                : '-';
            const total = v.total != null ? `$${v.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '-';
            const metodo = v.metodoPago || '-';
            return `<tr>
                <td>${fecha}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${productos}">${productos}</td>
                <td style="text-align:right;">${total}</td>
                <td>${metodo}</td>
            </tr>`;
        }).join('');

        updateVentasPagination();
    }

    function updateVentasPagination() {
        const pagination = document.getElementById('detail-ventas-pagination');
        const pageInfo = document.getElementById('detail-ventas-page-info');
        const btnPrev = document.getElementById('detail-ventas-prev');
        const btnNext = document.getElementById('detail-ventas-next');
        const totalPagesV = Math.max(1, Math.ceil(detailVentas.length / detailVentasPerPage));

        if (detailVentas.length <= detailVentasPerPage) {
            pagination.style.display = 'none';
        } else {
            pagination.style.display = '';
            pageInfo.textContent = `Página ${detailVentasPage + 1} de ${totalPagesV}`;
            btnPrev.disabled = detailVentasPage === 0;
            btnNext.disabled = detailVentasPage + 1 >= totalPagesV;
        }
    }

    // Pagination button listeners for detail ventas
    const dvPrev = document.getElementById('detail-ventas-prev');
    const dvNext = document.getElementById('detail-ventas-next');
    if (dvPrev) dvPrev.addEventListener('click', () => { if (detailVentasPage > 0) { detailVentasPage--; renderVentasPage(); } });
    if (dvNext) dvNext.addEventListener('click', () => { detailVentasPage++; renderVentasPage(); });

    async function handleView(id) {
        const ventasBody = document.getElementById('detail-cliente-ventas-body');
        const ventasCount = document.getElementById('detail-cliente-ventas-count');

        try {
            const [resCliente, resVentas] = await Promise.all([
                fetch(`${API_CLIENTES_URL}/${id}`),
                fetch(`${API_CLIENTES_URL}/${id}/ventas`)
            ]);

            if (!resCliente.ok) throw new Error('Cliente no encontrado');
            const data = await resCliente.json();

            document.getElementById('detail-cliente-nombre').textContent = data.nombre || '-';
            document.getElementById('detail-cliente-apellido').textContent = data.apellido || '-';
            document.getElementById('detail-cliente-dni').textContent = data.dni || '-';
            document.getElementById('detail-cliente-telefono').textContent = data.telefono || '-';
            document.getElementById('detail-cliente-email').textContent = data.email || '-';
            document.getElementById('detail-cliente-direccion').textContent = data.direccion || '-';

            if (resVentas.ok) {
                detailVentas = await resVentas.json();
                detailVentasPage = 0;
                ventasCount.textContent = `(${detailVentas.length} ${detailVentas.length === 1 ? 'venta' : 'ventas'})`;
                renderVentasPage();
            } else {
                detailVentas = [];
                ventasBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Error al cargar ventas.</td></tr>';
                ventasCount.textContent = '';
                document.getElementById('detail-ventas-pagination').style.display = 'none';
            }

            detailModal.style.display = 'block';
        } catch (error) {
            alert(error.message);
        }
    }

    if (detailModal) {
        document.getElementById('cliente-detail-close').addEventListener('click', () => detailModal.style.display = 'none');
        document.getElementById('cliente-detail-close-btn').addEventListener('click', () => detailModal.style.display = 'none');
    }

    // Si no es admin, la lógica se acaba acá
    if (!isAdmin) {
        // Escuchar clics en el sidebar para cargar datos al activar la sección
        document.querySelectorAll('.sidebar-menu a[data-section="clientes"]').forEach(link => {
            link.addEventListener('click', () => setTimeout(() => loadClientes(true), 50));
        });
        return;
    }

    // ==========================================
    // ACCIONES (EDITAR)
    // ==========================================
    const editForm = document.getElementById('edit-cliente-form');
    const editMsg = document.getElementById('edit-cliente-form-msg');

    async function handleEdit(id) {
        editMsg.textContent = '';
        editMsg.className = 'form-message';

        try {
            const res = await fetch(`${API_CLIENTES_URL}/${id}`);
            if (!res.ok) throw new Error('Cliente no encontrado');
            const data = await res.json();

            document.getElementById('edit-cliente-id').value = data.idCliente;
            document.getElementById('edit-cliente-nombre').value = data.nombre || '';
            document.getElementById('edit-cliente-apellido').value = data.apellido || '';
            document.getElementById('edit-cliente-dni').value = data.dni || '';
            document.getElementById('edit-cliente-telefono').value = data.telefono || '';
            document.getElementById('edit-cliente-email').value = data.email || '';
            document.getElementById('edit-cliente-direccion').value = data.direccion || '';

            editModal.style.display = 'flex';
        } catch (error) {
            alert(error.message);
        }
    }

    function clearEditErrors() {
        document.querySelectorAll('#edit-cliente-form .error-message').forEach(el => el.textContent = '');
        if (editMsg) {
            editMsg.textContent = '';
            editMsg.className = 'form-message';
        }
    }

    document.getElementById('cliente-edit-close').addEventListener('click', () => {
        editModal.style.display = 'none';
        clearEditErrors();
    });
    
    document.getElementById('cliente-edit-cancel').addEventListener('click', () => {
        editModal.style.display = 'none';
        clearEditErrors();
    });

    document.getElementById('cliente-edit-save').addEventListener('click', async () => {
        clearEditErrors();
        
        const id = document.getElementById('edit-cliente-id').value;
        const dto = {
            nombre: document.getElementById('edit-cliente-nombre').value.trim(),
            apellido: document.getElementById('edit-cliente-apellido').value.trim(),
            dni: document.getElementById('edit-cliente-dni').value.trim(),
            telefono: document.getElementById('edit-cliente-telefono').value.trim(),
            email: document.getElementById('edit-cliente-email').value.trim(),
            direccion: document.getElementById('edit-cliente-direccion').value.trim()
        };

        // ====== Validaciones Inline ======
        let isValid = true;
        if (!dto.nombre) { document.getElementById('error-edit-cliente-nombre').textContent = 'El nombre es obligatorio'; isValid = false; }
        if (!dto.apellido) { document.getElementById('error-edit-cliente-apellido').textContent = 'El apellido es obligatorio'; isValid = false; }
        if (!dto.dni) { document.getElementById('error-edit-cliente-dni').textContent = 'El DNI es obligatorio'; isValid = false; }
        if (!dto.telefono) { document.getElementById('error-edit-cliente-telefono').textContent = 'El teléfono es obligatorio'; isValid = false; }
        if (!dto.direccion) { document.getElementById('error-edit-cliente-direccion').textContent = 'La dirección es obligatoria'; isValid = false; }
        if (!dto.email) { 
            document.getElementById('error-edit-cliente-email').textContent = 'El email es obligatorio'; 
            isValid = false; 
        } else if (!dto.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            document.getElementById('error-edit-cliente-email').textContent = 'El formato del email no es válido';
            isValid = false;
        }

        if (!isValid) {
            editMsg.textContent = 'Por favor, complete todos los campos correctamente.';
            editMsg.className = 'form-message error';
            return;
        }

        try {
            const res = await fetch(`${API_CLIENTES_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                if (errorData && errorData.message) {
                    throw new Error(errorData.message);
                } else {
                    const errorText = await res.text();
                    throw new Error(errorText || 'Error al actualizar el cliente');
                }
            }

            editModal.style.display = 'none';
            loadClientes(true);
        } catch (error) {
            editMsg.textContent = error.message;
            editMsg.className = 'form-message error';
        }
    });

    // ==========================================
    // ACCIONES (ELIMINAR)
    // ==========================================
    let clienteToDelete = null;

    function handleDelete(id) {
        clienteToDelete = id;
        const cliente = allClientes.find(c => String(c.idCliente) === String(id));
        const nombre = cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : 'este cliente';
        document.getElementById('delete-cliente-message').textContent = `¿Estás seguro de que quieres eliminar al cliente "${nombre}"?`;
        deleteModal.style.display = 'flex';
    }

    document.getElementById('cliente-delete-close').addEventListener('click', () => deleteModal.style.display = 'none');
    document.getElementById('cliente-delete-cancel').addEventListener('click', () => deleteModal.style.display = 'none');

    document.getElementById('cliente-delete-confirm').addEventListener('click', async () => {
        if (!clienteToDelete) return;

        try {
            const res = await fetch(`${API_CLIENTES_URL}/${clienteToDelete}`, { method: 'DELETE' });
            if (!res.ok) {
                const errorMsg = await res.text();
                throw new Error(errorMsg || 'No se puede eliminar un cliente con ventas.');
            }
            deleteModal.style.display = 'none';
            loadClientes(true);
        } catch (error) {
            alert(error.message);
            deleteModal.style.display = 'none';
        } finally {
            clienteToDelete = null;
        }
    });

    // Escuchar clics en el sidebar para cargar datos al activar la sección
    document.querySelectorAll('.sidebar-menu a[data-section="clientes"]').forEach(link => {
        link.addEventListener('click', () => setTimeout(() => loadClientes(true), 50));
    });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const clientesSection = document.getElementById('clientes-section');
    const subsectionContainers = clientesSection ? clientesSection.querySelectorAll('.subsection-container') : [];

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores de clientes
        subsectionContainers.forEach(container => {
            container.style.display = 'none';
        });

        // 2. Mostrar contenedor seleccionado
        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }

        // Si entramos a la lista de clientes, recargamos los datos
        if (subsectionId === 'clientes-list') {
            loadClientes(true);
        }
    }

    // Exponer globalmente
    window.showClientesSubsection = showSubsection;

    // ===============================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ===============================
    const crearClienteForm = document.getElementById('crear-cliente-form');
    const crearGeneralMessage = document.getElementById('form-general-message-crear-cliente');

    if (crearClienteForm) {
        crearClienteForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. Limpiar mensajes
            document.querySelectorAll('#crear-cliente-form .error-message').forEach(el => el.textContent = '');
            if (crearGeneralMessage) {
                crearGeneralMessage.textContent = '';
                crearGeneralMessage.className = 'form-message';
            }

            // 2. Obtener valores
            const dto = {
                nombre: document.getElementById('crearClienteNombre').value.trim(),
                apellido: document.getElementById('crearClienteApellido').value.trim(),
                dni: document.getElementById('crearClienteDNI').value.trim(),
                telefono: document.getElementById('crearClienteTelefono').value.trim(),
                email: document.getElementById('crearClienteEmail').value.trim(),
                direccion: document.getElementById('crearClienteDireccion').value.trim()
            };

            // 3. Validaciones
            let isValid = true;
            if (!dto.nombre) { document.getElementById('errorCrearClienteNombre').textContent = 'El nombre es obligatorio'; isValid = false; }
            if (!dto.apellido) { document.getElementById('errorCrearClienteApellido').textContent = 'El apellido es obligatorio'; isValid = false; }
            if (!dto.dni) { document.getElementById('errorCrearClienteDNI').textContent = 'El DNI es obligatorio'; isValid = false; }
            if (!dto.telefono) { document.getElementById('errorCrearClienteTelefono').textContent = 'El teléfono es obligatorio'; isValid = false; }
            if (!dto.direccion) { document.getElementById('errorCrearClienteDireccion').textContent = 'La dirección es obligatoria'; isValid = false; }
            if (!dto.email) { 
                document.getElementById('errorCrearClienteEmail').textContent = 'El email es obligatorio'; 
                isValid = false; 
            } else if (!dto.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                document.getElementById('errorCrearClienteEmail').textContent = 'El formato del email no es válido';
                isValid = false;
            }

            if (!isValid) {
                if (crearGeneralMessage) {
                    crearGeneralMessage.textContent = "Por favor, complete todos los campos correctamente.";
                    crearGeneralMessage.classList.add('error');
                }
                return;
            }

            // 4. Confirmar y Enviar
            showConfirmationModal("¿Estás seguro de que deseas registrar este cliente?", async () => {
                try {
                    const response = await fetch(API_CLIENTES_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dto)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || `Error: ${response.status}`);
                    }

                    if (crearGeneralMessage) {
                        crearGeneralMessage.textContent = "¡Cliente registrado con éxito!";
                        crearGeneralMessage.classList.add('success');
                    }
                    crearClienteForm.reset();

                    // Disparar evento para que otras pantallas (ej. ventas) escuchen la actualización
                    document.dispatchEvent(new Event('clientesActualizados'));

                    // Mantener el mensaje de éxito unos segundos y luego limpiarlo
                    setTimeout(() => {
                        if (crearGeneralMessage) {
                            crearGeneralMessage.textContent = '';
                            crearGeneralMessage.className = 'form-message';
                        }
                    }, 4000);

                } catch (error) {
                    console.error('Error al registrar el cliente:', error);
                    if (crearGeneralMessage) {
                        crearGeneralMessage.textContent = `${error.message}`;
                        crearGeneralMessage.classList.add('error');
                    }
                }
            });
        });
    }

    const btnLimpiarCrear = document.getElementById('btn-limpiar-crear-cliente');
    if (btnLimpiarCrear) {
        btnLimpiarCrear.addEventListener('click', () => {
            if (crearClienteForm) crearClienteForm.reset();
            document.querySelectorAll('#crear-cliente-form .error-message').forEach(el => el.textContent = '');
            if (crearGeneralMessage) {
                crearGeneralMessage.textContent = '';
                crearGeneralMessage.className = 'form-message';
            }
        });
    }

});
