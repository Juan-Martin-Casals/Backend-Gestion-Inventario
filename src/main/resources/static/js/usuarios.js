document.addEventListener('DOMContentLoaded', function() {

    // ===============================
    // URLs DE LA API
    // ===============================
    const API_USUARIOS_URL = '/api/usuarios'; 
    const API_ROLES_URL = '/api/roles'; 

    // ===============================
    // ESTADO GLOBAL Y PAGINACIÓN
    // ===============================
    let currentDeleteUserId = null; 
    let allRoles = []; 
    
    // Paginación
    let currentPage = 0; // Las páginas de Spring Boot empiezan en 0
    let totalPages = 1;
    const itemsPerPage = 7; // Define el tamaño de la página

    // ===============================
    // SELECTORES - TABLA Y PAGINACIÓN
    // ===============================
    const userTableBody = document.getElementById('user-table-body');
    const userPrevPageBtn = document.getElementById('user-prev-page'); // <-- Nuevo
    const userNextPageBtn = document.getElementById('user-next-page'); // <-- Nuevo
    const userPageInfo = document.getElementById('user-page-info');     // <-- Nuevo

    // ... (otros selectores de registro y modales) ...
    // --- Selectores de Registro ---
    const userForm = document.getElementById('user-form');
    const rolSelect = document.getElementById('user-rol');
    const generalMessage = document.getElementById('form-general-message-usuario');
    const errorNombre = document.getElementById('error-user-nombre');
    const errorApellido = document.getElementById('error-user-apellido');
    const errorEmail = document.getElementById('error-user-email');
    const errorRol = document.getElementById('error-user-rol');
    // --- Selectores Modales ---
    const editModalOverlay = document.getElementById('modal-edit-usuario-overlay');
    const editModalCloseBtn = document.getElementById('modal-edit-usuario-close');
    const editForm = document.getElementById('edit-usuario-form');
    const editIdInput = document.getElementById('editUsuarioId');
    const editNombreInput = document.getElementById('editUsuarioNombre');
    const editApellidoInput = document.getElementById('editUsuarioApellido');
    const editEmailInput = document.getElementById('editUsuarioEmail');
    const editRolSelect = document.getElementById('editUsuarioRol'); 
    const editGeneralMessage = document.getElementById('form-general-message-edit-usuario');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteModalMessage = document.getElementById('delete-modal-message');

    // ==========================================================
    // LÓGICA DE CARGA DE DATOS (Roles y Tabla)
    // ==========================================================

    async function loadRoles() {
        // ... (Tu lógica de carga de roles - sin cambios) ...
        try {
            const response = await fetch(API_ROLES_URL);
            if (!response.ok) throw new Error('Error al cargar roles.');
            allRoles = await response.json();
            
            if (rolSelect) {
                rolSelect.innerHTML = '<option value="">Selecciona rol</option>';
                allRoles.forEach(rol => {
                    const option = document.createElement('option');
                    const roleId = rol.idRol || rol.id; 
                    const roleName = rol.descripcion || rol.nombre || 'Rol sin nombre'; 
                    option.value = roleId; 
                    option.textContent = roleName; 
                    rolSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar roles:', error);
            if (rolSelect) rolSelect.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    /**
     * Carga y renderiza la tabla de usuarios (MODIFICADA para PAGINACIÓN).
     */
    async function loadUsers() {
        if (!userTableBody) return;
        userTableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
        
        try {
            // Enviamos los parámetros de paginación y ordenamos por apellido (ascendente)
            const url = `${API_USUARIOS_URL}?page=${currentPage}&size=${itemsPerPage}&sort=apellido,asc`;
            const response = await fetch(url); 
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            
            const pageData = await response.json(); // Recibimos el objeto Page
            
            totalPages = pageData.totalPages;
            renderUsersTable(pageData.content); // Solo renderizamos el contenido
            updatePaginationControls(); // Actualizamos los controles

        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            userTableBody.innerHTML = `<tr><td colspan="5">Error al cargar usuarios.</td></tr>`;
        }
    }

    function renderUsersTable(users) {
        // ... (Tu lógica de renderizado - sin cambios en la fila) ...
        if (!userTableBody) return;
        userTableBody.innerHTML = '';
        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = `
                <tr>
                    <td>${user.nombre || 'N/A'}</td>
                    <td>${user.apellido || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${user.descripcionRol || user.nombreRol || 'N/A'}</td>
                    <td>
                        <button class="btn-icon btn-edit-user" data-id="${user.id || user.idUsuario}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-danger btn-delete-user" data-id="${user.id || user.idUsuario}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            userTableBody.innerHTML += row;
        });
    }

    // ==========================================================
    // ¡NUEVO! LÓGICA DE PAGINACIÓN DE USUARIOS
    // ==========================================================
    function updatePaginationControls() {
        if (!userPageInfo) return;
        
        userPageInfo.textContent = `Página ${currentPage + 1} de ${totalPages || 1}`;
        userPrevPageBtn.disabled = (currentPage === 0);
        userNextPageBtn.disabled = (currentPage + 1 >= totalPages);
    }

    if (userPrevPageBtn) {
        userPrevPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage > 0) {
                currentPage--;
                loadUsers();
            }
        });
    }

    if (userNextPageBtn) {
        userNextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (currentPage + 1 < totalPages) {
                currentPage++;
                loadUsers();
            }
        });
    }


    // ==========================================================
    // LÓGICA DEL FORMULARIO DE REGISTRO (MODIFICADO)
    // ==========================================================
    if (userForm) {
        userForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // 1. Limpiar mensajes
            document.querySelectorAll('#user-form .error-message').forEach(el => el.textContent = '');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';
            
            // 2. Obtener valores
            const nombre = document.getElementById('user-nombre').value.trim();
            const apellido = document.getElementById('user-apellido').value.trim();
            const email = document.getElementById('user-email').value.trim();
            const idRol = rolSelect.value;
            const password = document.getElementById('user-password').value;
            const confirmPassword = document.getElementById('user-confirm-password').value;

            // 3. Validaciones
            let isValid = true;
            if (!nombre) { errorNombre.textContent = 'Campo obligatorio.'; isValid = false; }
            if (!apellido) { errorApellido.textContent = 'Campo obligatorio.'; isValid = false; }
            if (!email) { errorEmail.textContent = 'Campo obligatorio.'; isValid = false; }
            if (!idRol) { errorRol.textContent = 'Seleccione un rol.'; isValid = false; }
            if (!password) { errorPassword.textContent = 'Campo obligatorio'; isValid=false}
            if (password !== confirmPassword) {
                errorConfirmPassword.textContent = 'Las contraseñas no coinciden.';
                errorPassword.textContent = 'Las contraseñas no coinciden.';
                isValid = false;
            }

            if (!isValid) {
                generalMessage.textContent = "Debe completar todos los campos correctamente.";
                generalMessage.classList.add('error');
                return;
            }

            // 4. Construir DTO (usando los nombres de campos de tu UsuarioRequestDTO)
            const userDTO = { 
                nombre, 
                apellido, 
                email, 
                idRol: parseInt(idRol), 
                contrasena: password, // <-- Nombre del campo en tu DTO
                confirmacionContrasena: confirmPassword // <-- Nombre del campo en tu DTO
            };

            // 5. Enviar
            try {
                const response = await fetch(API_USUARIOS_URL, { // POST a /api/usuarios
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userDTO)
                });

                if (!response.ok) {
                    const errorText = await response.text(); 
                    throw new Error(errorText || `Error del servidor: ${response.status}`);
                }

                generalMessage.textContent = "¡Usuario registrado con éxito!";
                generalMessage.classList.add('success');
                userForm.reset();
                loadUsers(); // Recargar la tabla

            } catch (error) {
                console.error('Error al registrar el usuario:', error);
                generalMessage.textContent = `${error.message}`; 
                generalMessage.classList.add('error');
            }
        });
    }

    // ... (El resto de la lógica de Modales de Edición y Borrado sigue aquí) ...

    // ==========================================================
    // LÓGICA DEL MODAL DE EDICIÓN
    // ==========================================================
    
    async function openEditModal(id) {
        // ... (lógica de apertura) ...
        try {
            document.querySelectorAll('#edit-usuario-form .error-message').forEach(el => el.textContent = '');
            editGeneralMessage.textContent = '';
            
            const response = await fetch(`${API_USUARIOS_URL}/${id}`); 
            if (!response.ok) throw new Error('No se pudo cargar el usuario para edición.');
            
            const data = await response.json();
            
            editIdInput.value = data.id || data.idUsuario;
            editNombreInput.value = data.nombre;
            editApellidoInput.value = data.apellido;
            editEmailInput.value = data.email;
            
            editRolSelect.innerHTML = '';
            allRoles.forEach(rol => {
                const option = document.createElement('option');
                const roleId = rol.idRol || rol.id; 
                const roleName = rol.descripcion || rol.nombre;
                
                option.value = roleId; 
                option.textContent = roleName;
                
                if (roleId == data.idRol) { 
                    option.selected = true;
                }
                editRolSelect.appendChild(option);
            });
            
            editModalOverlay.style.display = 'block';
        } catch (error) {
            console.error('Error al abrir el modal de edición:', error);
            alert('Error al cargar datos: ' + error.message);
        }
    }

    function closeEditModal() {
        editModalOverlay.style.display = 'none';
        editGeneralMessage.textContent = '';
        document.querySelectorAll('#edit-usuario-form .error-message').forEach(el => el.textContent = '');
    }

    // --- Manejador del envío del formulario de EDICIÓN ---
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // 1. Construir DTO para PUT (solo datos básicos y Rol)
            const id = editIdInput.value;
            const updateDTO = {
                nombre: editNombreInput.value.trim(),
                apellido: editApellidoInput.value.trim(),
                email: editEmailInput.value.trim(),
                idRol: parseInt(editRolSelect.value),
                
                contrasena: null, 
                confirmacionContrasena: null 
            };
            
            // 2. Enviar PUT
            try {
                const response = await fetch(`${API_USUARIOS_URL}/${id}`, { 
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateDTO)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Error: ${response.status}`);
                }
                
                editGeneralMessage.textContent = "Usuario actualizado con éxito.";
                editGeneralMessage.classList.add('success');

                setTimeout(() => {
                    closeEditModal();
                    loadUsers(); 
                }, 1000);

            } catch (error) {
                console.error('Error al actualizar usuario:', error);
                editGeneralMessage.textContent = `Error: ${error.message}`;
                editGeneralMessage.classList.add('error');
            }
        });
    }
    
    // ... (Lógica de Borrado y Event Listeners de la Tabla - sin cambios) ...

    function openDeleteModal(id, nombre) {
        currentDeleteUserId = id; 
        deleteModalMessage.textContent = `¿Estás seguro de que quieres eliminar al usuario "${nombre}"?`;
        if(deleteConfirmModal) deleteConfirmModal.style.display = 'block';
    }

    function closeDeleteModal() {
        currentDeleteUserId = null;
        if(deleteConfirmModal) deleteConfirmModal.style.display = 'none';
    }

    if (userTableBody) {
        userTableBody.addEventListener('click', async function(e) {
            const editButton = e.target.closest('.btn-edit-user');
            const deleteButton = e.target.closest('.btn-delete-user');

            if (editButton) {
                const id = editButton.dataset.id;
                openEditModal(id); 
            }

            if (deleteButton) {
                const id = deleteButton.dataset.id;
                const nombreCompleto = deleteButton.closest('tr').cells[0].textContent + ' ' + deleteButton.closest('tr').cells[1].textContent;
                openDeleteModal(id, nombreCompleto); 
            }
        });
    }

    if (editModalCloseBtn) {
        editModalCloseBtn.addEventListener('click', closeEditModal);
    }
    if (editModalOverlay) {
        editModalOverlay.addEventListener('click', (e) => {
            if (e.target === editModalOverlay) closeEditModal();
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    }
    
    if (deleteConfirmModal) {
         deleteConfirmModal.addEventListener('click', (e) => {
            if (e.target === deleteConfirmModal) closeDeleteModal();
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!currentDeleteUserId) return; 

            try {
                const response = await fetch(`${API_USUARIOS_URL}/${currentDeleteUserId}`, {
                    method: 'DELETE'
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'No se pudo eliminar el usuario');
                }
                
                loadUsers(); // Recarga la tabla

            } catch (error) {
                alert('Error al eliminar: ' + error.message);
            } finally {
                closeDeleteModal(); 
            }
        });
    }

    // ===============================
    // CARGA INICIAL
    // ===============================
    loadRoles().then(loadUsers);
});