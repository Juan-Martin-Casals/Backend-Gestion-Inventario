function showConfirmationModal(message, onConfirm, onCancel) {
    const modal = document.getElementById('confirmation-modal');
    const messageElement = document.getElementById('confirmation-message');
    const btnYes = document.getElementById('btn-confirm-yes');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const btnClose = document.getElementById('btn-confirm-close');

    // 1. Establecer el texto dinámico
    messageElement.textContent = message;

    // 2. Mostrar el modal
    modal.style.display = 'flex';

    // Función para manejar la tecla Esc
    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            cancelAndClose();
        }
    };
    window.addEventListener('keydown', handleEsc);

    // 3. Función para cerrar sin confirmar (cancelar)
    const cancelAndClose = () => {
        if (typeof onCancel === 'function') onCancel();
        closeModal();
    };

    // 4. Función para cerrar el modal y limpiar eventos
    const closeModal = () => {
        modal.style.display = 'none';
        btnYes.onclick = null;
        btnCancel.onclick = null;
        if (btnClose) btnClose.onclick = null;
        window.onclick = null;
        window.removeEventListener('keydown', handleEsc);
    };

    // 5. Asignar la acción al botón "Confirmar"
    btnYes.onclick = () => {
        if (typeof onConfirm === 'function') onConfirm();
        closeModal();
    };

    // 6. Asignar acción de cancelar al botón "Cancelar" y a la "X"
    btnCancel.onclick = cancelAndClose;
    if (btnClose) btnClose.onclick = cancelAndClose;

    // Cancelar si se hace clic fuera del modal
    window.onclick = (event) => {
        if (event.target === modal) {
            cancelAndClose();
        }
    };
}

/**
 * Muestra una notificacion tipo Toast global con diseno UX/UI premium.
 * @param {string} type - 'success', 'error', o 'info'
 * @param {string} title - Titulo principal
 * @param {string} message - Mensaje secundario
 * @param {number} duration - Tiempo en ms antes de ocultarse (default 4000)
 */
window.showUIToast = function(type, title, message, duration = 4000) {
    const container = document.getElementById('ui-toast-container');
    if (!container) return;

    // Crear el elemento toast
    const toast = document.createElement('div');
    toast.className = `ui-toast ${type}`;

    // Icono segun tipo
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-times-circle';

    toast.innerHTML = `
        <div class="ui-toast-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="ui-toast-content">
            <h4 class="ui-toast-title">${title}</h4>
            <p class="ui-toast-message">${message}</p>
        </div>
        <button class="ui-toast-close"><i class="fas fa-times"></i></button>
        <div class="ui-toast-progress">
            <div class="ui-toast-progress-bar" style="animation-duration: ${duration}ms"></div>
        </div>
    `;

    container.appendChild(toast);

    // Boton de cerrar
    const closeBtn = toast.querySelector('.ui-toast-close');
    
    const removeToast = () => {
        toast.classList.add('toast-exiting');
        toast.addEventListener('animationend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    };

    closeBtn.addEventListener('click', removeToast);

    // Auto eliminar despues de duration
    setTimeout(removeToast, duration);
};

/**
 * Muestra un error inline debajo de un input
 */
window.mostrarErrorInline = function(inputId, mensaje) {
    const input = document.getElementById(inputId);
    const errorDiv = document.getElementById('error-' + inputId);
    if(input) {
        input.classList.add('input-error');
    }
    if(errorDiv) {
        errorDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + mensaje;
        errorDiv.style.display = 'flex';
    }
};

/**
 * Limpia un error inline de un input
 */
window.limpiarErroresInline = function(inputId) {
    const input = document.getElementById(inputId);
    const errorDiv = document.getElementById('error-' + inputId);
    if(input) {
        input.classList.remove('input-error');
    }
    if(errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.innerHTML = '';
    }
};

/**
 * Limpia todos los errores inline que contengan una subcadena en su ID (ej: 'oc-')
 */
window.limpiarTodosErroresInline = function(prefix) {
    const inputs = document.querySelectorAll('.input-error');
    inputs.forEach(input => {
        if (input.id.includes(prefix)) {
            input.classList.remove('input-error');
        }
    });
    const errors = document.querySelectorAll('.error-message');
    errors.forEach(err => {
        if (err.id.includes('error-' + prefix)) {
            err.style.display = 'none';
            err.innerHTML = '';
        }
    });
};

/**
 * Valida el Limite de caracteres en tiempo real.
 * Se debe usar en el evento oninput del input.
 */
window.checkMaxLength = function(input, limite, idError) {
    // Para type number el maxlength html a veces no funciona, lo forzamos por js
    if(input.value.length >= limite) {
        input.value = input.value.slice(0, limite);
        window.mostrarErrorInline(input.id, 'Limite de ' + limite + ' caracteres alcanzado');
    } else {
        window.limpiarErroresInline(input.id);
    }
};

