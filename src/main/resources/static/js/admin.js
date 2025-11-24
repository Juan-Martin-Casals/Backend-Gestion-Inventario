
document.addEventListener('DOMContentLoaded', function () {

    // Selectores
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
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

    sidebarLinks.forEach(link => {
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

            showSection(sectionId);

            // Manejo de Subsecciones (Productos)
            if (sectionId === 'productos' && subsectionId) {
                if (typeof window.showProductSubsection === 'function') {
                    window.showProductSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Proveedores)
            else if (sectionId === 'proveedores' && subsectionId) {
                if (typeof window.showProveedorSubsection === 'function') {
                    window.showProveedorSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Compras)
            else if (sectionId === 'compras' && subsectionId) {
                if (typeof window.showComprasSubsection === 'function') {
                    window.showComprasSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Usuarios)
            else if (sectionId === 'usuarios' && subsectionId) {
                if (typeof window.showUsuariosSubsection === 'function') {
                    window.showUsuariosSubsection(subsectionId);
                }
            }
            // Manejo de Subsecciones (Ventas)
            else if (sectionId === 'ventas' && subsectionId) {
                if (typeof window.showVentasSubsection === 'function') {
                    window.showVentasSubsection(subsectionId);
                }
            }

            // ACTUALIZACIÓN: Agregar los casos que faltan
            if (sectionId === 'principal' && typeof window.loadPrincipalData === 'function') {
                window.loadPrincipalData();
            } else if (sectionId === 'productos' && typeof window.loadProducts === 'function') {
                window.loadProducts();
            }
            // AGREGA ESTO:
            else if (sectionId === 'ventas' && typeof window.cargarDatosVentas === 'function') {
                // Asumo que en ventas.js tienes una función para cargar los selects
                window.cargarDatosVentas();
            }
            else if (sectionId === 'proveedores' && typeof window.cargarDatosProveedores === 'function') {
                window.cargarDatosProveedores();
            }
            else if (sectionId === 'compras' && typeof window.cargarDatosCompras === 'function') {
                window.cargarDatosCompras();
            }
            else if (sectionId === 'stock' && typeof window.cargarDatosStock === 'function') {
                window.cargarDatosStock();
            }
            // Repite para compras, stock, etc.
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
            window.location.href = 'index.html';
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
