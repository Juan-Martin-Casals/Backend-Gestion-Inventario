function showConfirmationModal(message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    const messageElement = document.getElementById('confirmation-message');
    const btnYes = document.getElementById('btn-confirm-yes');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const spanClose = modal.querySelector('.close-modal');

    // 1. Establecer el texto dinámico
    messageElement.textContent = message;

    // 2. Mostrar el modal
    modal.style.display = "block";

    // --- NUEVO: Función para manejar la tecla Esc ---
    const handleEsc = (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    };
    // Agregamos el listener
    window.addEventListener('keydown', handleEsc);

    // 3. Función para cerrar el modal y limpiar eventos
    const closeModal = () => {
        modal.style.display = "none";
        // Limpiamos los eventos para evitar ejecuciones múltiples
        btnYes.onclick = null;
        btnCancel.onclick = null;
        spanClose.onclick = null;
        window.onclick = null;
        
        // --- NUEVO: Removemos el listener de Esc ---
        window.removeEventListener('keydown', handleEsc);
    };

    // 4. Asignar la acción al botón "Confirmar"
    btnYes.onclick = () => {
        onConfirm(); 
        closeModal(); 
    };

    // 5. Asignar acción de cerrar al botón "Cancelar" y a la "X"
    btnCancel.onclick = closeModal;
    spanClose.onclick = closeModal;

    // Cerrar si se hace clic fuera del modal
    window.onclick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };

}
