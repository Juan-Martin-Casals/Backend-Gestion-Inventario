// Esperamos a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function () {
    // ===============================
    // Elementos del DOM
    // ===============================
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const passwordToggle = document.getElementById('login-password-toggle');

    // Creamos un elemento para mostrar mensajes
    const messageContainer = document.createElement('p');
    messageContainer.id = 'login-message';
    loginForm.after(messageContainer);

    // ===============================
    // Mostrar/ocultar contraseña
    // ===============================
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function () {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.innerHTML = type === 'password'
                ? '<i class="fas fa-eye"></i>'
                : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // ===============================
    // Función de Validación (Simplificada para solo verificar)
    // ===============================
    function validateField(field, pattern) {
        const value = field.value.trim();
        const isValid = pattern.test(value);

        // Solo marcamos el borde al enviar, no al escribir
        field.style.borderColor = isValid ? '#ddd' : '#dc3545'; // Solo rojo si es inválido

        return isValid;
    }

    // Limpiar errores mientras el usuario escribe
    emailInput.addEventListener('input', () => clearEmailError());
    passwordInput.addEventListener('input', () => clearPasswordError());


    // Añadimos un botón para limpiar el formulario
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'clear-btn';
    clearBtn.textContent = 'Limpiar';
    clearBtn.addEventListener('click', () => {
        loginForm.reset();
        emailInput.style.borderColor = '#ddd';
        passwordInput.style.borderColor = '#ddd';
        messageContainer.textContent = '';
        // Limpiar errores inline
        const emailErr = document.getElementById('email-error');
        const passErr = document.getElementById('password-error');
        if (emailErr) { emailErr.textContent = ''; emailErr.style.display = 'none'; }
        if (passErr) { passErr.textContent = ''; passErr.style.display = 'none'; }
    });
    loginForm.appendChild(clearBtn);


    // ===============================
    // Manejo de envío del formulario (Validación al Final)
    // ===============================
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');

    function showEmailError(msg) {
        emailError.textContent = msg;
        emailError.style.display = 'block';
        emailInput.style.borderColor = '#dc3545';
    }

    function clearEmailError() {
        emailError.textContent = '';
        emailError.style.display = 'none';
        emailInput.style.borderColor = '#ddd';
    }

    function showPasswordError(msg) {
        passwordError.textContent = msg;
        passwordError.style.display = 'block';
        passwordInput.style.borderColor = '#dc3545';
    }

    function clearPasswordError() {
        passwordError.textContent = '';
        passwordError.style.display = 'none';
        passwordInput.style.borderColor = '#ddd';
    }

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        messageContainer.textContent = '';
        clearEmailError();
        clearPasswordError();

        // Reseteamos bordes antes de validar
        emailInput.style.borderColor = '#ddd';
        passwordInput.style.borderColor = '#ddd';

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const emailValue = emailInput.value.trim();
        const passwordValue = passwordInput.value.trim();

        let hasError = false;

        // Validación email
        if (emailValue === '') {
            showEmailError('Debe ingresar el correo electrónico.');
            hasError = true;
        } else if (!emailPattern.test(emailValue)) {
            showEmailError('El formato es incorrecto.');
            hasError = true;
        }

        // Validación password
        if (passwordValue === '') {
            showPasswordError('Debe ingresar la contraseña.');
            hasError = true;
        }

        if (hasError) return;



        const loginData = {
            email: emailInput.value.trim(),
            contrasena: passwordInput.value.trim()
        };

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });


            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Credenciales inválidas ❌");
            }

            const data = await response.json();
            const userRole = data.rol;

            // Éxito:
            messageContainer.textContent = '¡Login exitoso! Redirigiendo...';
            messageContainer.style.color = '#28a745';

            // Limpiamos los bordes si el login fue exitoso
            emailInput.style.borderColor = '#28a745';
            passwordInput.style.borderColor = '#28a745';

            // Redirigir según rol
            setTimeout(() => {
                if (userRole === "ADMINISTRADOR") {
                    window.location.href = "admin.html";
                } else if (userRole === "EMPLEADO") {
                    window.location.href = "empleado.html";
                } else {
                    console.warn("Rol desconocido:", userRole);
                }
            }, 1000);

        } catch (error) {
            console.error("Error en el login:", error);
            messageContainer.textContent = error.message;
            messageContainer.style.color = '#dc3545';
            // Marcamos los campos como incorrectos al fallar el servidor
            emailInput.style.borderColor = '#dc3545';
            passwordInput.style.borderColor = '#dc3545';
        }
    });
});