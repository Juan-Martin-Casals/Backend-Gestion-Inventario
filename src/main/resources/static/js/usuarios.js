document.addEventListener('DOMContentLoaded', function () {

    const API_URL = '/api/usuarios';

    const userForm = document.getElementById('user-form');
    const userTableBody = document.getElementById('user-table-body');
    const generalMessage = document.getElementById('form-general-message-usuario');

    async function loadUsers() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }
            const users = await response.json();
            renderUsersTable(users);
        } catch (error) {
            console.error('Error al cargar los usuarios:', error);
            if (userTableBody) {
                userTableBody.innerHTML = `<tr><td colspan="6">Error al cargar usuarios.</td></tr>`;
            }
        }
    }

    function renderUsersTable(users) {
        if (!userTableBody) return;
        userTableBody.innerHTML = '';

        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="6">No hay usuarios registrados.</td></tr>';
            return;
        }

        users.forEach(user => {
            const rolClass = user.descripcionRol.toLowerCase() === 'administrador' ? 'admin' : 'empleado';
            const row = `
                <tr>
                    <td>${user.nombre}</td>
                    <td>${user.apellido}</td>
                    <td>${user.email}</td>
                    <td><span class="status-badge ${rolClass}">${user.descripcionRol}</span></td>
                    <td>
                        <button class="btn-icon btn-edit-usuario" data-id="${user.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-delete-usuario" data-id="${user.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            userTableBody.innerHTML += row;
        });
    }

    if (userForm) {
        userForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            document.querySelectorAll('#user-form .error-message').forEach(el => el.textContent = '');
            generalMessage.textContent = '';
            generalMessage.className = 'form-message';

            const nombre = document.getElementById('user-nombre').value.trim();
            const apellido = document.getElementById('user-apellido').value.trim();
            const email = document.getElementById('user-email').value.trim();
            const rol = document.getElementById('user-rol').value;
            const password = document.getElementById('user-password').value;
            const confirmPassword = document.getElementById('user-confirm-password').value;

            let isValid = true;

            if (!nombre) {
                document.getElementById('error-user-nombre').textContent = 'El nombre es obligatorio.';
                isValid = false;
            }
            if (!apellido) {
                document.getElementById('error-user-apellido').textContent = 'El apellido es obligatorio.';
                isValid = false;
            }
            if (!email) {
                document.getElementById('error-user-email').textContent = 'El email es obligatorio.';
                isValid = false;
            } else if (!/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
                document.getElementById('error-user-email').textContent = 'El formato del email no es válido.';
                isValid = false;
            }
            if (!rol) {
                document.getElementById('error-user-rol').textContent = 'Debe seleccionar un rol.';
                isValid = false;
            }
            if (!password) {
                document.getElementById('error-user-password').textContent = 'La contraseña es obligatoria.';
                isValid = false;
            }
            if (password !== confirmPassword) {
                document.getElementById('error-user-confirm-password').textContent = 'Las contraseñas no coinciden.';
                isValid = false;
            }

            if (!isValid) {
                generalMessage.textContent = "Debe completar todos los campos correctamente.";
                generalMessage.classList.add('error');
                return;
            }

            const usuarioRequestDTO = {
                nombre,
                apellido,
                email,
                contrasena: password,
                confirmacionContrasena: confirmPassword,
                idRol: rol
            };

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(usuarioRequestDTO)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || 'Error al crear el usuario');
                }

                generalMessage.textContent = '¡Usuario registrado con éxito!';
                generalMessage.classList.add('success');
                userForm.reset();
                loadUsers();

            } catch (error) {
                if (error.message === "Ya existe un usuario con este correo") {
                    generalMessage.textContent = error.message;
                } else {
                    generalMessage.textContent = "Error al registrar el usuario, intente nuevamente.";
                }
                generalMessage.classList.add('error');
                console.error('Error al registrar usuario:', error);
            }
        });
    }

    loadUsers();
});
