document.addEventListener('DOMContentLoaded', function () {
    // =========================================
    // NAVEGACIÓN SIDEBAR (SPA)
    // =========================================
    const links = document.querySelectorAll('.sidebar-menu a[data-section]');
    const sections = document.querySelectorAll('.spa-section');

    // Handler separado para los toggles de submenú
    document.querySelectorAll('.sidebar-menu .submenu-toggle').forEach(toggle => {
        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            this.parentElement.classList.toggle('open');
        });
    });

    function hideAllSections() {
        sections.forEach(section => section.style.display = 'none');
        links.forEach(link => link.classList.remove('active'));
    }

    links.forEach(link => {
        link.addEventListener('click', function (e) {

            // Lógica para Submenú Toggle
            if (this.classList.contains('submenu-toggle')) {
                e.preventDefault();
                const parentLi = this.parentElement;
                parentLi.classList.toggle('open');
                return; // No navegar, solo abrir/cerrar
            }

            e.preventDefault();

            // Remover active de todos los links (incluyendo submenús)
            document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const sectionId = this.getAttribute('data-section');
            const subsectionId = this.getAttribute('data-subsection');

            if (sectionId) {
                hideAllSections();
                const targetSection = document.getElementById(`${sectionId}-section`);
                if (targetSection) {
                    targetSection.style.display = 'block';
                }

                // Actualizar título del header
                const sectionTitle = document.getElementById('section-title');
                const sectionIcon = document.getElementById('section-icon');

                const sectionIcons = {
                    'principal': 'fas fa-home',
                    'ventas': 'fas fa-shopping-cart',
                    'stock': 'fas fa-box'
                };

                if (sectionTitle) {
                    const titleText = this.innerText.trim();
                    sectionTitle.textContent = titleText;
                }
                if (sectionIcon && sectionIcons[sectionId]) {
                    sectionIcon.className = sectionIcons[sectionId];
                }

                // Guardar sección actual
                localStorage.setItem('lastSectionEmpleado', sectionId);
            }

            // Manejo de Subsecciones (Ventas)
            if (sectionId === 'ventas') {
                const targetSubsection = subsectionId || localStorage.getItem('lastSubsectionEmpleado') || 'ventas-create';
                if (typeof window.showVentasSubsection === 'function') {
                    window.showVentasSubsection(targetSubsection);
                }
                if (subsectionId) {
                    localStorage.setItem('lastSubsectionEmpleado', subsectionId);
                }
            }

            // Cargar datos si es necesario
            if (sectionId === 'ventas' && typeof window.cargarDatosVentas === 'function') {
                window.cargarDatosVentas();
            }
        });
    });

    // Siempre iniciar en la sección principal al recargar
    const activeLink = document.querySelector(`.sidebar-menu a[data-section="principal"]`);
    if (activeLink) {
        activeLink.click();
    } else if (links.length > 0) {
        links[0].click(); // Default a la primera
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
});