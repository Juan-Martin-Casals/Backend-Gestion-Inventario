// Esperamos a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
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
        passwordToggle.addEventListener('click', function() {
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

    // --- ELIMINAMOS TODOS LOS EVENT LISTENERS DE 'INPUT' ---
    // (emailInput.addEventListener('input', ...))
    // (passwordInput.addEventListener('input', ...))

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
    });
    loginForm.appendChild(clearBtn);


    // ===============================
    // Manejo de envío del formulario (Validación al Final)
    // ===============================
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        messageContainer.textContent = ''; 
        
        // Reseteamos bordes antes de validar
        emailInput.style.borderColor = '#ddd';
        passwordInput.style.borderColor = '#ddd';

        // Patrones de validación
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordPattern = /^.{6,}$/; // Mínimo 6 caracteres

        // VALIDACIÓN DE FORMATO Y PRESENCIA
        const isEmailValid = validateField(emailInput, emailPattern);
        const isPasswordValid = validateField(passwordInput, passwordPattern);
        
        // Chequeo de campos vacíos
        const isEmailEmpty = emailInput.value.trim() === "";
        const isPasswordEmpty = passwordInput.value.trim() === "";


        


        if (isEmailEmpty || isPasswordEmpty) {
            messageContainer.textContent = "El email y la contraseña son obligatorios.";
            messageContainer.style.color = '#dc3545';
            if (isEmailEmpty) emailInput.style.borderColor = '#dc3545';
            if (isPasswordEmpty) passwordInput.style.borderColor = '#dc3545';
            return;
        }

        if (!isEmailValid || !isPasswordValid) {
            messageContainer.textContent = "El formato de los datos ingresados no es válido (ej. contraseña debe tener min. 6 caracteres).";
            messageContainer.style.color = '#dc3545';
            return;
        }

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