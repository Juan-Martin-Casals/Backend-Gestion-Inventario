document.addEventListener('DOMContentLoaded', function() {
    // =========================================
    // NAVEGACIÓN SIDEBAR (SPA)
    // =========================================
    const links = document.querySelectorAll('.sidebar-menu a[data-section]');
    const sections = document.querySelectorAll('.spa-section');

    function hideAllSections() {
        sections.forEach(section => section.style.display = 'none');
        links.forEach(link => link.classList.remove('active'));
    }

    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section') + '-section';
            const targetSection = document.getElementById(sectionId);

            if (targetSection) {
                hideAllSections();
                targetSection.style.display = 'block';
                this.classList.add('active');
                
                // Actualizar título del header
                const sectionTitle = document.getElementById('section-title');
                if(sectionTitle) {
                    // Capitalizar primera letra
                    const titleText = this.innerText.trim();
                    sectionTitle.textContent = titleText;
                }

                // Guardar sección actual
                localStorage.setItem('lastSectionEmpleado', this.getAttribute('data-section'));
            }
        });
    });

    // Recuperar última sección visitada
    const lastSection = localStorage.getItem('lastSectionEmpleado') || 'principal';
    const activeLink = document.querySelector(`.sidebar-menu a[data-section="${lastSection}"]`);
    if (activeLink) {
        activeLink.click();
    } else if(links.length > 0) {
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
            logoutModal.style.display = 'flex'; // Usar flex para centrar según CSS de admin
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
    if(fechaInput) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
});