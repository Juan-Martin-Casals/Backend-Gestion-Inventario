// Esperamos a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // ===============================
    // Elementos del DOM
    // ===============================
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const passwordToggle = document.getElementById('login-password-toggle');

    // Creamos un elemento para mostrar mensajes (mejor que usar alert())
    const messageContainer = document.createElement('p');
    messageContainer.id = 'login-message';
    loginForm.after(messageContainer);

    // ===============================
    // Mostrar/ocultar contraseña
    // ===============================
    passwordToggle.addEventListener('click', function() {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        this.innerHTML = type === 'password'
            ? '<i class="fas fa-eye"></i>'
            : '<i class="fas fa-eye-slash"></i>';
    });

    // ===============================
    // Validación de campos en tiempo real
    // ===============================
    function validateField(field, pattern) {
        const value = field.value.trim();
        const isValid = pattern.test(value);
        field.style.borderColor = isValid ? '#28a745' : '#dc3545'; // verde o rojo
        return isValid;
    }

    emailInput.addEventListener('input', () => {
        validateField(emailInput, /^[^\s@]+@[^\s@]+\.[^\s@]+$/); // formato de email
    });

    passwordInput.addEventListener('input', () => {
        validateField(passwordInput, /^.{6,}$/); // mínimo 6 caracteres
    });

    // Añadimos un botón para limpiar el formulario
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'clear-btn'; // Usamos la clase de tu CSS
    clearBtn.textContent = 'Limpiar';
    clearBtn.addEventListener('click', () => {
        loginForm.reset();
        emailInput.style.borderColor = '#ddd';
        passwordInput.style.borderColor = '#ddd';
        messageContainer.textContent = '';
    });
    loginForm.appendChild(clearBtn);


    // ===============================
    // Manejo de envío del formulario
    // ===============================
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        messageContainer.textContent = ''; // Limpiar mensajes previos

        // Validación final antes de enviar
        const isEmailValid = validateField(emailInput, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        const isPasswordValid = validateField(passwordInput, /^.{6,}$/);

        if (!isEmailValid || !isPasswordValid) {
            messageContainer.textContent = "Por favor, corrige los campos en rojo.";
            messageContainer.style.color = '#dc3545';
            return;
        }

        const loginData = {
            email: emailInput.value.trim(),
            contrasena: passwordInput.value.trim() // CAMBIO CLAVE: la clave debe ser "password"
        };

        try {
            // CAMBIO CLAVE: Usamos la ruta relativa, sin http://localhost...
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginData),
            });

            const data = await response.json();

            if (!response.ok) {
                // Si el servidor responde con un error (ej. 401)
                throw new Error(data.message || "Credenciales inválidas ❌");
            }

            // Si todo sale bien, el backend devuelve el rol
            const userRole = data.rol;

            messageContainer.textContent = '¡Login exitoso! Redirigiendo...';
            messageContainer.style.color = '#28a745';

            // Redirigir según rol después de un breve momento
            setTimeout(() => {
                if (userRole === "ADMINISTRADOR") {
                    window.location.href = "admin.html"; // Asegúrate de tener este archivo
                } else if (userRole === "EMPLEADO") {
                    window.location.href = "empleado.html"; // Y este también
                } else {
                    console.warn("Rol desconocido:", userRole);
                }
            }, 1000); // Espera 1 segundo antes de redirigir

        } catch (error) {
            console.error("Error en el login:", error);
            messageContainer.textContent = error.message;
            messageContainer.style.color = '#dc3545';
        }
    });
});