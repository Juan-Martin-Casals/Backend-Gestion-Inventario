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
