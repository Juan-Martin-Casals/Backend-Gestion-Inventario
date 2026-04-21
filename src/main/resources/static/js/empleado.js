document.addEventListener('DOMContentLoaded', function () {

    // Selectores
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const sections = document.querySelectorAll('.spa-section');
    const sectionTitle = document.getElementById('section-title');
    const sectionIcon = document.getElementById('section-icon');

    // Mapa de sección → ícono
    const sectionIcons = {
        'principal': 'fas fa-home',
        'ventas': 'fas fa-shopping-cart',
        'caja': 'fas fa-cash-register',
        'productos': 'fas fa-box',
        'clientes': 'fas fa-address-book'
    };

    // Mostrar sección y ocultar las demás
    function showSection(sectionId) {
        sections.forEach(s => s.style.display = 'none');
        const activeSection = document.getElementById(`${sectionId}-section`);
        if (activeSection) activeSection.style.display = 'block';
        if (sectionIcon && sectionIcons[sectionId]) {
            sectionIcon.className = sectionIcons[sectionId];
        }
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {

            // Submenú Toggle: solo abre/cierra, no navega
            if (this.classList.contains('submenu-toggle')) {
                e.preventDefault();
                this.parentElement.classList.toggle('open');
                return;
            }

            // Logout tiene su propio handler
            if (this.id === 'logout-btn') return;

            e.preventDefault();

            // Marcar activo: quitar de todos y poner en el clickeado
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const sectionId = this.getAttribute('data-section');
            const subsectionId = this.getAttribute('data-subsection');

            showSection(sectionId);

            // Actualizar título del header con el texto del link
            if (sectionTitle) sectionTitle.textContent = this.textContent.trim();

            if (sectionId === 'ventas') {
                const targetSubsection = subsectionId || localStorage.getItem('lastSubsectionEmpleado') || 'ventas-create';

                if (targetSubsection === 'ventas-create' && typeof window.isCajaAbierta === 'function' && !window.isCajaAbierta()) {
                    // Caja cerrada: redirigir a Caja
                    sidebarLinks.forEach(l => l.classList.remove('active'));
                    const cajaLink = document.querySelector('.sidebar-menu a[data-section="caja"]');
                    if (cajaLink) cajaLink.classList.add('active');
                    showSection('caja');
                    if (sectionTitle) sectionTitle.textContent = 'Caja';
                    if (sectionIcon) sectionIcon.className = sectionIcons['caja'];
                    if (typeof window.showCajaSubsection === 'function') window.showCajaSubsection('caja-operaciones');
                    return;
                }

                if (typeof window.showVentasSubsection === 'function') {
                    window.showVentasSubsection(targetSubsection);
                }
                if (subsectionId) localStorage.setItem('lastSubsectionEmpleado', subsectionId);
                if (typeof window.cargarDatosVentas === 'function') window.cargarDatosVentas();
            }

            if (sectionId === 'caja') {
                if (typeof window.showCajaSubsection === 'function') {
                    window.showCajaSubsection('caja-operaciones');
                }
            }

            if (sectionId === 'productos') {
                if (typeof window.showProductSubsection === 'function') {
                    window.showProductSubsection('productos-list');
                } else if (typeof window.loadProducts === 'function') {
                    window.loadProducts();
                }
            }

            if (sectionId === 'clientes') {
                const targetSubsection = subsectionId || 'clientes-list';
                if (typeof window.showClientesSubsection === 'function') {
                    window.showClientesSubsection(targetSubsection);
                }
            }

            if (sectionId === 'principal') {
                if (typeof window.loadPrincipalData === 'function') window.loadPrincipalData();
            }

            localStorage.setItem('lastSectionEmpleado', sectionId);
        });
    });

    // Inicialización: mostrar principal y marcar su link como activo
    showSection('principal');
    const principalLink = document.querySelector('.sidebar-menu a[data-section="principal"]');
    if (principalLink) principalLink.classList.add('active');

    // =========================================
    // LOGOUT
    // =========================================
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout');

    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutModal.style.display = 'flex';
        });

        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });

        confirmLogoutBtn.addEventListener('click', () => {
            // Limpiar sesión
            document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            localStorage.removeItem('lastSectionEmpleado');
            window.location.href = 'index.html';
        });

        // Cerrar al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.style.display = 'none';
            }
        });
    }

    // Cargar fecha actual en ventas al iniciar
    const fechaInput = document.getElementById('fecha-venta');
    if (fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }

    // =========================================
    // MODAL DE CONFIRMACIÓN
    // =========================================
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmationMessage = document.getElementById('confirmation-message');
    const btnConfirmYes = document.getElementById('btn-confirm-yes');
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const closeConfirmModal = document.getElementById('btn-confirm-close');

    let pendingConfirmAction = null;
    let pendingCancelAction = null;

    window.showConfirmationModal = function (message, onConfirm, onCancel) {
        if (!confirmationModal) return;
        if (confirmationMessage) confirmationMessage.textContent = message;
        pendingConfirmAction = onConfirm || null;
        pendingCancelAction = onCancel || null;
        confirmationModal.style.display = 'flex';
    };

    function closeConfirmationModal() {
        if (confirmationModal) confirmationModal.style.display = 'none';
        pendingConfirmAction = null;
        pendingCancelAction = null;
    }

    if (btnConfirmYes) {
        btnConfirmYes.addEventListener('click', () => {
            if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
            closeConfirmationModal();
        });
    }

    if (btnConfirmCancel) {
        btnConfirmCancel.addEventListener('click', () => {
            if (typeof pendingCancelAction === 'function') pendingCancelAction();
            closeConfirmationModal();
        });
    }

    if (closeConfirmModal) {
        closeConfirmModal.addEventListener('click', () => {
            if (typeof pendingCancelAction === 'function') pendingCancelAction();
            closeConfirmationModal();
        });
    }

    // Cerrar al hacer clic fuera del modal
    if (confirmationModal) {
        confirmationModal.addEventListener('click', (e) => {
            if (e.target === confirmationModal) {
                if (typeof pendingCancelAction === 'function') pendingCancelAction();
                closeConfirmationModal();
            }
        });
    }
});