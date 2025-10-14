/**
 * Este archivo es el controlador principal del panel de administración.
 * Se encarga de:
 * - La navegación entre las distintas secciones (SPA - Single Page Application).
 * - Manejar el modal de cierre de sesión.
 * - Llamar a las funciones de carga de datos de otras secciones cuando se navega a ellas.
 */
document.addEventListener('DOMContentLoaded', function() {

    // Selectores
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a[data-section]');
    const sections = document.querySelectorAll('.spa-section');
    const sectionTitle = document.getElementById('section-title');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout');
    const cancelLogoutBtn = document.getElementById('cancel-logout');

    // Función para mostrar una sección y ocultar las demás
    function showSection(sectionId) {
        sections.forEach(section => {
            section.style.display = 'none';
        });

        const activeSection = document.getElementById(`${sectionId}-section`);
        if (activeSection) {
            activeSection.style.display = 'block';
        }

        const activeLink = document.querySelector(`a[data-section="${sectionId}"]`);
        if (activeLink) {
            sectionTitle.textContent = activeLink.textContent.trim();
        }
    }

    // Lógica de navegación
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const sectionId = this.getAttribute('data-section');
            showSection(sectionId);

            // Llama a la función de carga de datos correspondiente si existe
            if (sectionId === 'principal' && typeof window.loadPrincipalData === 'function') {
                window.loadPrincipalData();
            } else if (sectionId === 'productos' && typeof window.loadProducts === 'function') {
                window.loadProducts();
            }
            // ... aquí irían las llamadas a otras funciones de carga (ej: loadUsuarios)
        });
    });

    // Lógica de Logout
    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutModal.style.display = 'flex';
        });

        cancelLogoutBtn.addEventListener('click', () => {
            logoutModal.style.display = 'none';
        });

        confirmLogoutBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });

        window.addEventListener('click', (e) => {
            if (e.target === logoutModal) {
                logoutModal.style.display = 'none';
            }
        });
    }

    // Inicialización: Mostrar la sección principal y cargar sus datos
    showSection('principal');
    if (typeof window.loadPrincipalData === 'function') {
        window.loadPrincipalData();
    }

});
