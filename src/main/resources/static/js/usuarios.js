/**
 * Este archivo maneja toda la lógica para la sección de "Usuarios":
 * - Cargar la lista de usuarios (paginada y ordenada).
 * - Cargar roles en los formularios.
 * - Validar y enviar el formulario para registrar nuevos usuarios.
 * - Manejar el modal de edición de usuarios.
 * - Manejar el modal de eliminación.
 */
document.addEventListener('DOMContentLoaded', function () {

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_USUARIOS_URL = '/api/usuarios';
    const API_ROLES_URL = '/api/roles';

    // ===============================
    // ESTADO GLOBAL
    // ===============================
    let currentDeleteUserId = null;
    let itemsPerPage = 10;

    // ===============================
    // SELECTORES - TABLA Y PAGINACIÓN
    // ===============================
    const userTableBody = document.getElementById('user-table-body');
    const prevPageBtn = document.getElementById('user-prev-page');
    const nextPageBtn = document.getElementById('user-next-page');
    const pageInfo = document.getElementById('user-page-info');

    // ¡NUEVO! Selector para estabilidad de scroll/foco
    const mainContent = document.querySelector('.main-content');

    // ===============================
    // ESTADO DE PAGINACIÓN
    // ===============================
    let currentPage = 0;
    let totalPages = 1;

    // ===============================
    // ¡NUEVO! ESTADO Y SELECTORES DE ORDENAMIENTO
    // ===============================
    let sortField = 'nombre'; // Campo de ordenamiento inicial
    let sortDirection = 'asc'; // Dirección inicial
    const userTableHeaders = document.querySelectorAll('#usuarios-section .data-table th[data-sort-by]');


    // ===============================
    // SELECTORES - FORMULARIO DE REGISTRO
    // ===============================
    const userForm = document.getElementById('user-form');
    const nombreInput = document.getElementById('user-nombre');
    const apellidoInput = document.getElementById('user-apellido');
    const emailInput = document.getElementById('user-email');
    const rolSelect = document.getElementById('user-rol');
    const passwordInput = document.getElementById('user-password');
    const confirmPasswordInput = document.getElementById('user-confirm-password');
    const generalMessage = document.getElementById('form-general-message-usuario');

    // ===============================
    // SELECTORES - MODAL DE EDICIÓN
    // ===============================
    const modalEdit = document.getElementById('modal-edit-usuario-overlay');
    const modalEditCloseBtn = document.getElementById('modal-edit-usuario-close');
    const editForm = document.getElementById('edit-usuario-form');
    const editIdInput = document.getElementById('editUsuarioId');
    const editNombreInput = document.getElementById('editUsuarioNombre');
    const editApellidoInput = document.getElementById('editUsuarioApellido');
    const editEmailInput = document.getElementById('editUsuarioEmail');
    const editRolSelect = document.getElementById('editUsuarioRol');
    const editGeneralMessage = document.getElementById('form-general-message-edit-usuario');

    // ===============================
    // SELECTORES - MODAL DE BORRADO (REUTILIZADO)
    // ===============================
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteModalMessage = document.getElementById('delete-modal-message');

    // ==========================================================
    // LÓGICA DE CARGA DE DATOS (TABLA Y ROLES)
    // ==========================================================

    /**
     * Carga los roles desde la API y los popula en los <select>
     */
    async function loadRoles() {
        try {
            const response = await fetch(API_ROLES_URL);
            if (!response.ok) throw new Error('Error al cargar roles.');
            allRoles = await response.json(); // <-- Esto trae [{"idRol": 1, "descripcion": "ADMIN"}, ...]

            if (rolSelect) {
                rolSelect.innerHTML = '<option value="">Selecciona rol</option>';
                allRoles.forEach(rol => {
                    const option = document.createElement('option');

                    // --- ¡ESTA ES LA CORRECCIÓN! ---
                    // Usar los nombres exactos del RolSelectDTO
                    option.value = rol.idRol;
                    option.textContent = rol.descripcion; // <-- Debe ser 'descripcion'

                    rolSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar roles:', error);
            if (rolSelect) rolSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    /**
     * ¡MODIFICADO! Carga la tabla de usuarios con paginación, ordenamiento y animación.
     */
    async function loadUsuarios() {
        if (!userTableBody || !mainContent) return;

        // 1. GUARDAR scroll y preparar animación (Fade Out)
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        userTableBody.classList.add('loading');

        // Esperar fade-out
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // 2. Construir URL con paginación y ordenamiento
            const sortParam = sortField ? `&sort=${sortField},${sortDirection}` : '';
            const url = `${API_USUARIOS_URL}?page=${currentPage}&size=${itemsPerPage}${sortParam}`;

            const response = await fetch(url);
            if (!response.ok) {
                // Manejo de error si el token expiró o es inválido
                if (response.status === 401 || response.status === 403) {
                    window.location.href = '/index.html'; // Redirigir al login
                }
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const pageData = await response.json();
            totalPages = pageData.totalPages;

            // 3. Renderizar datos
            renderUserTable(pageData.content);
            updatePaginationControls();
            updateSortIndicators(); // ¡NUEVO!

            // 4. Restaurar scroll y aplicar Fade-In
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                userTableBody.classList.remove('loading');
            });

        } catch (error) {
            console.error('Error al cargar los usuarios:', error);
            userTableBody.innerHTML = `<tr><td colspan="5">Error al cargar usuarios.</td></tr>`;
            userTableBody.classList.remove('loading');
        }
    }

    /**
     * Renderiza las filas de la tabla de usuarios.
     */
    function renderUserTable(usuarios) {
        userTableBody.innerHTML = '';
        if (usuarios.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
            return;
        }

        usuarios.forEach(user => {
            const row = `
                <tr>
                    <td>${user.nombre || 'N/A'}</td>
                    <td>${user.apellido || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.descripcionRol || 'Sin Rol'}</td>
                    <td>
                        <button class="btn-icon btn-edit-usuario" data-id="${user.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete-usuario" data-id="${user.id}" data-nombre="${user.nombre}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            userTableBody.innerHTML += row;
        });
    }

    // ===============================================
    // LÓGICA DE PAGINACIÓN
    // ===============================================

    function updatePaginationControls() {
        if (!pageInfo || !prevPageBtn || !nextPageBtn) return;

        pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages || 1}`;
        prevPageBtn.disabled = (currentPage === 0);
        nextPageBtn.disabled = (currentPage + 1 >= totalPages);
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage > 0) {
                currentPage--;
                loadUsuarios();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadUsuarios();
            }
        });
    }

    // ===============================================
    // ¡NUEVO! LÓGICA DE ORDENAMIENTO
    // ===============================================

    function handleSortClick(event) {
        event.preventDefault();
        event.currentTarget.blur();

        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');

        if (!newSortField) return;

        if (sortField === newSortField) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortField = newSortField;
            sortDirection = 'asc';
        }

        currentPage = 0;
        loadUsuarios();
    }

    function updateSortIndicators() {
        userTableHeaders.forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');

            const icon = th.querySelector('.sort-icon');
            if (icon) {
                icon.className = 'sort-icon fas fa-sort';
            }

            if (th.getAttribute('data-sort-by') === sortField) {
                th.classList.add(`sort-${sortDirection}`);

                if (icon) {
                    icon.className = `sort-icon fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'}`;
                }
            }
        });
    }


    // ===============================================
    // LÓGICA DEL FORMULARIO DE REGISTRO
    // ===============================================

    if (userForm) {
        userForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // 1. Limpiar mensajes
            document.querySelectorAll('#user-form .error-message').forEach(el => el.textContent = '');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';

            // 2. Obtener valores
            const nombre = nombreInput.value.trim();
            const apellido = apellidoInput.value.trim();
            const email = emailInput.value.trim();
            const idRol = rolSelect.value;
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // 3. Validaciones
            let isValid = true;
            if (!nombre) { document.getElementById('error-user-nombre').textContent = 'Complete este campo'; isValid = false; }
            if (!apellido) { document.getElementById('error-user-apellido').textContent = 'Complete este campo'; isValid = false; }
            if (!email) { document.getElementById('error-user-email').textContent = 'Complete este campo'; isValid = false; }
            if (!idRol) { document.getElementById('error-user-rol').textContent = 'Seleccione un rol'; isValid = false; }
            if (!password) { document.getElementById('error-user-password').textContent = 'Complete este campo'; isValid = false; }
            if (password !== confirmPassword) {
                document.getElementById('error-user-confirm-password').textContent = 'Las contraseñas no coinciden';
                isValid = false;
            }
            if (!isValid) { generalMessage.textContent = "Complete los campos."; generalMessage.classList.add('error'); return; }

            // 4. Construir DTO
            const usuarioDTO = {
                nombre: nombre,
                apellido: apellido,
                email: email,
                contrasena: password, // Cambiamos 'password' por 'contrasena'
                confirmacionContrasena: confirmPassword, // Agregamos este campo que espera el DTO
                idRol: parseInt(idRol)
            };
            // 5. Enviar
            try {
                const response = await fetch(API_USUARIOS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(usuarioDTO)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Error: ${response.status}`);
                }

                generalMessage.textContent = "¡Usuario registrado con éxito!";
                generalMessage.classList.add('success');
                userForm.reset();

                currentPage = 0;
                loadUsuarios();
                showSubsection('usuarios-list'); // Redirigir a la lista

            } catch (error) {
                console.error('Error al registrar el usuario:', error);
                generalMessage.textContent = `${error.message}`;
                generalMessage.classList.add('error');
            }
        });
    }

    // ==========================================================
    // LÓGICA DEL MODAL DE EDICIÓN
    // ==========================================================

    const handleEditEsc = (e) => { if (e.key === 'Escape') closeEditModal(); };
    const handleDeleteEsc = (e) => { if (e.key === 'Escape') closeDeleteModal(); };

    // --- Abrir el modal ---
    function openEditModal(user) {
        editIdInput.value = user.id;
        editNombreInput.value = user.nombre;
        editApellidoInput.value = user.apellido;
        editEmailInput.value = user.email;

        // Seleccionar el rol correcto
        editRolSelect.innerHTML = '';
        allRoles.forEach(rol => {
            const option = document.createElement('option');

            // --- ¡CORRECCIÓN DOBLE! ---
            option.value = rol.idRol;
            option.textContent = rol.descripcion;

            if (rol.idRol == user.idRol) {
                option.selected = true;
            }
            editRolSelect.appendChild(option);
        });

        // ¡NUEVO! Mostrar el modal
        // Esta línea faltaba en el código que pegaste
        if (modalEdit) {
            modalEdit.style.display = 'block';
            window.addEventListener('keydown', handleEditEsc); // Agregamos evento
        }
    }

    // --- Cerrar el modal ---
    function closeEditModal() {
        if (modalEdit) {
            modalEdit.style.display = 'none';
            window.removeEventListener('keydown', handleEditEsc); // Quitamos evento
        }
    }

    // --- Manejar el envío (submit) del formulario de EDICIÓN ---
    if (editForm) {
        editForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const id = editIdInput.value;
            const dto = {
                nombre: editNombreInput.value.trim(),
                apellido: editApellidoInput.value.trim(),
                email: editEmailInput.value.trim(),
                idRol: parseInt(editRolSelect.value)
            };

            // Validaciones (similar al de registro pero sin password)
            let isValid = true;
            if (!dto.nombre) { document.getElementById('errorEditUsuarioNombre').textContent = 'Complete este campo'; isValid = false; }
            if (!dto.apellido) { document.getElementById('errorEditUsuarioApellido').textContent = 'Complete este campo'; isValid = false; }
            if (!dto.email) { document.getElementById('errorEditUsuarioEmail').textContent = 'Complete este campo'; isValid = false; }
            if (!dto.idRol) { document.getElementById('errorEditUsuarioRol').textContent = 'Seleccione un rol'; isValid = false; }
            if (!isValid) { editGeneralMessage.textContent = "Complete los campos."; editGeneralMessage.classList.add('error'); return; }


            try {
                const response = await fetch(`${API_USUARIOS_URL}/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dto)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Error: ${response.status}`);
                }

                editGeneralMessage.textContent = "Usuario actualizado con éxito.";
                editGeneralMessage.classList.add('success');

                setTimeout(() => {
                    closeEditModal();
                    loadUsuarios(); // Recargar la tabla
                }, 1000);

            } catch (error) {
                console.error('Error al actualizar usuario:', error);
                editGeneralMessage.textContent = `Error: ${error.message}`;
                editGeneralMessage.classList.add('error');
            }
        });
    }



    // ==========================================================
    // LÓGICA DE BORRADO (MODAL REUTILIZADO)
    // ==========================================================

    function openDeleteModal(id, nombre) {
        currentDeleteUserId = id;
        deleteModalMessage.textContent = `¿Estás seguro de que quieres eliminar al usuario "${nombre}"?`;
        if (deleteConfirmModal) {
            deleteConfirmModal.style.display = 'block';
            // 2. ¡NUEVO! Agregamos el evento al abrir
            window.addEventListener('keydown', handleDeleteEsc);
        }
    }

    function closeDeleteModal() {
        currentDeleteUserId = null;
        if (deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
            // 3. ¡NUEVO! Quitamos el evento al cerrar para evitar errores
            window.removeEventListener('keydown', handleDeleteEsc);
        }
    }

    // ===============================================
    // LISTENERS DE EVENTOS DE TABLA Y MODALES
    // ===============================================

    // --- Clics en botones de la tabla ---
    if (userTableBody) {
        userTableBody.addEventListener('click', async function (e) {
            const editButton = e.target.closest('.btn-edit-usuario');
            const deleteButton = e.target.closest('.btn-delete-usuario');

            // --- Clic en EDITAR ---
            if (editButton) {
                const id = editButton.dataset.id;
                try {
                    // Hacemos un fetch para obtener los datos más frescos del usuario
                    // (El DTO de la tabla puede no tener el idRol, solo el nombre)
                    const response = await fetch(`${API_USUARIOS_URL}/${id}`);
                    if (!response.ok) throw new Error('No se pudo cargar el usuario');
                    const userData = await response.json();
                    openEditModal(userData);
                } catch (error) {
                    console.error('Error al abrir el modal de edición:', error);
                    alert('Error: ' + error.message);
                }
            }

            // --- Clic en BORRAR ---
            if (deleteButton) {
                const id = deleteButton.dataset.id;
                const nombre = deleteButton.dataset.nombre;
                openDeleteModal(id, nombre);
            }
        });
    }

    // --- Clic en el botón de confirmación de BORRADO ---
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            // Verificamos si estamos borrando un usuario (podría ser un producto u otro)
            if (currentDeleteUserId) {
                try {
                    const response = await fetch(`${API_USUARIOS_URL}/${currentDeleteUserId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText || 'No se pudo eliminar el usuario');
                    }

                    loadUsuarios(); // Recarga la tabla

                } catch (error) {
                    alert('Error al eliminar: ' + error.message);
                } finally {
                    closeDeleteModal();
                    currentDeleteUserId = null; // Limpiamos el ID
                }
            }
        });
    }

    // --- Eventos para cerrar modales ---
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    if (deleteConfirmModal) {
        deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === deleteConfirmModal) closeDeleteModal();
        });
    }
    if (modalEditCloseBtn) {
        modalEditCloseBtn.addEventListener('click', closeEditModal);
    }
    if (modalEdit) {
        modalEdit.addEventListener('click', (e) => {
            if (e.target === modalEdit) closeEditModal();
        });
    }

    // ===============================
    // CARGA INICIAL
    // ===============================

    // ¡NUEVO! Asignar eventos de clic a las cabeceras
    userTableHeaders.forEach(header => {
        header.addEventListener('click', handleSortClick);
    });

    // ===============================
    // LÓGICA DE SUBSECCIONES
    // ===============================
    const subsectionContainers = document.querySelectorAll('.subsection-container');

    function showSubsection(subsectionId) {
        // 1. Ocultar todos los contenedores que sean de usuarios
        subsectionContainers.forEach(container => {
            if (container.id.startsWith('usuarios-')) {
                container.style.display = 'none';
            }
        });

        // 2. Mostrar contenedor seleccionado
        const targetContainer = document.getElementById(`${subsectionId}-container`);
        if (targetContainer) {
            targetContainer.style.display = 'block';
        }
    }

    // Exponer globalmente
    window.showUsuariosSubsection = showSubsection;

    loadRoles();
    loadUsuarios();
});