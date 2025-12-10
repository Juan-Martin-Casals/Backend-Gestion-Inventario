document.addEventListener('DOMContentLoaded', function () {

    // =========================================
    // NAVEGACIÓN SIDEBAR (SPA)
    // =========================================
    const links = document.querySelectorAll('.sidebar-menu a');
    const sections = document.querySelectorAll('.spa-section');

    function hideAllSections() {
        sections.forEach(section => section.style.display = 'none');
    }

    links.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent # in URL for ALL links

            // Lógica para Submenú Toggle
            if (this.classList.contains('submenu-toggle')) {
                const parentLi = this.parentElement;
                parentLi.classList.toggle('open');
                return; // No navegar, solo abrir/cerrar
            }

            // Skip logout button (let it be handled separately)
            if (this.id === 'logout-btn') {
                return;
            }

            const sectionId = this.getAttribute('data-section');
            const subsectionId = this.getAttribute('data-subsection');

            // If no section ID, skip
            if (!sectionId) return;

            // Remover active de todos los links
            links.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Hide all sections and show target section
            hideAllSections();
            const targetSection = document.getElementById(`${sectionId}-section`);
            if (targetSection) {
                targetSection.style.display = 'block';
            }

            // Actualizar título del header
            const sectionTitle = document.getElementById('section-title');
            if (sectionTitle) {
                const titleText = this.innerText.trim();
                sectionTitle.textContent = titleText;
            }

            // Guardar sección actual
            localStorage.setItem('lastSectionEmpleado', sectionId);

            // Manejo de Subsecciones (Ventas)
            if (sectionId === 'ventas' && subsectionId) {
                if (typeof window.showVentasSubsection === 'function') {
                    window.showVentasSubsection(subsectionId);
                }
            }

            // Manejo de Subsecciones (Productos)
            if (sectionId === 'productos' && subsectionId) {
                if (typeof window.showProductSubsection === 'function') {
                    window.showProductSubsection(subsectionId);
                }
            }

            // Cargar datos si es necesario
            if (sectionId === 'principal' && typeof window.loadPrincipalData === 'function') {
                window.loadPrincipalData();
            } else if (sectionId === 'ventas' && typeof window.cargarDatosVentas === 'function') {
                window.cargarDatosVentas();
            } else if (sectionId === 'productos' && typeof window.loadProducts === 'function') {
                window.loadProducts();
            }
        });
    });

    // Inicialización: Mostrar sección principal por defecto
    const lastSection = localStorage.getItem('lastSectionEmpleado') || 'principal';
    const activeLinkToClick = Array.from(links).find(link => link.getAttribute('data-section') === lastSection && !link.classList.contains('submenu-toggle'));
    if (activeLinkToClick) {
        activeLinkToClick.click();
    }

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
            document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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
    // CERRAR MODALES CON ESC
    // =========================================
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            // Buscar todos los modales visibles
            const modals = document.querySelectorAll('.modal, .modal-overlay');
            modals.forEach(modal => {
                if (modal.style.display === 'flex' || modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
    });
});