document.addEventListener('DOMContentLoaded', function () {

    // --- 1. URLs DE LA API ---
    // (Asegurate de que tu backend tenga estos endpoints)

    // Endpoint para las tarjetas de Ventas (El que ya tenías)
    const API_DASHBOARD_URL = '/api/informes/resumen';
    // Endpoint para las tarjetas de Stock (El que creamos)
    const API_STOCK_RESUMEN_URL = '/api/informes/resumen-stock';
    // Endpoint para la tabla de productos agotados (Nuevo)
    const API_LOW_STOCK_URL = '/api/informes/low-stock'; // (Asumimos este endpoint)
    // Endpoints para Actividad Reciente
    const API_RECENTS_VENTAS_URL = '/api/ventas';
    const API_RECENTS_COMPRAS_URL = '/api/compras';

    const mainContent = document.querySelector('.main-content');
    // --- 2. CONSTANTES DEL DOM (Tarjetas del Mes) ---
    const ventasMesCount = document.getElementById('ventas-mes-count');
    const ventasHistoricasCount = document.getElementById('ventas-historicas-count');
    const productosMesCount = document.getElementById('productos-mes-count');
    const recaudacionMesAmount = document.getElementById('recaudacion-mes-amount');

    const lowStockPrevPageBtn = document.getElementById('low-stock-prev-page');
    const lowStockNextPageBtn = document.getElementById('low-stock-next-page');
    const lowStockPageInfo = document.getElementById('low-stock-page-info');

    let lowStockCurrentPage = 0; // Las páginas de Spring Boot empiezan en 0
    let lowStockTotalPages = 1;
    const itemsPerPage = 7;

    let lowStockSortField = 'stockActual'; // Campo de ordenamiento inicial
    let lowStockSortDirection = 'asc';


    // --- 3. CONSTANTES DEL DOM (Tarjetas de Stock) ---
    // (Estos son los IDs que agregaste en el HTML)
    const totalProductosCount = document.getElementById('total-productos-count');
    const productosAgotadosCount = document.getElementById('productos-agotados-count');
    const stockBajoCount = document.getElementById('stock-bajo-count');

    // --- 4. CONSTANTES DEL DOM (Tabla de Stock Bajo) ---
    // (Tenés que agregar este ID a tu <tbody> en el HTML)
    // <tbody id="low-stock-table-body">
    const lowStockTableBody = document.querySelector('.low-stock-section .data-table tbody');


    // =================================================================
    // --- 5. FUNCIONES DE CARGA DE DATOS ---
    // =================================================================

    /**
     * Carga el resumen de ventas del mes (InformeDashboardDTO) 
     * Compatible con admin.html (necesita todos los elementos)
     */
    async function loadDashboardData() {
        try {
            const response = await fetch(API_DASHBOARD_URL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const data = await response.json();

            // Rellenamos las tarjetas del mes (solo en admin.html, opcionales)
            if (ventasMesCount) ventasMesCount.textContent = data.ventasMes;
            if (ventasHistoricasCount) ventasHistoricasCount.textContent = data.ventasHistoricas;
            if (productosMesCount) productosMesCount.textContent = data.productoMes;
            if (recaudacionMesAmount) {
                const formato = new Intl.NumberFormat('es-AR', {
                    style: 'decimal',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                });
                recaudacionMesAmount.textContent = `$${formato.format(data.recaudacionMes)}`;
            }

        } catch (error) {
            console.error('Error al cargar datos del dashboard:', error);
        }
    }

    /**
     * Carga datos de HOY
     * Compatible con ambos: admin.html y empleado.html
     */
    async function loadTodayData() {
        try {
            const hoy = new Date();
            const fechaHoy = hoy.toISOString().split('T')[0]; // YYYY-MM-DD

            // Obtener KPIs de hoy
            const response = await fetch(`/api/informes/kpis?inicio=${fechaHoy}&fin=${fechaHoy}`);
            if (!response.ok) throw new Error('Error al obtener datos de hoy');

            const data = await response.json();

            // Actualizar las tarjetas de "Resumen de Hoy" (existen en admin y empleado)
            const ventasHoyAmount = document.getElementById('ventas-hoy-amount');
            const ventasHoyCount = document.getElementById('ventas-hoy-count');
            const productosVendidosHoy = document.getElementById('productos-vendidos-hoy');

            if (ventasHoyAmount) {
                ventasHoyAmount.textContent = `$${data.totalVentas ? data.totalVentas.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`;
            }

            // Cantidad de ventas y productos vendidos
            if (ventasHoyCount) ventasHoyCount.textContent = data.cantidadVentas || 0;
            if (productosVendidosHoy) productosVendidosHoy.textContent = data.productosVendidos || 0;

            // Actualizar banner de bienvenida (solo en admin.html)
            const welcomeDate = document.getElementById('welcome-date');
            if (welcomeDate) {
                const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                welcomeDate.textContent = hoy.toLocaleDateString('es-AR', opciones);
            }

        } catch (error) {
            console.error('Error al cargar datos de hoy:', error);
        }
    }

    /**
     * Carga el resumen de stock (ResumenStockDTO)
     */
    async function loadStockData() {
        try {
            const response = await fetch(API_STOCK_RESUMEN_URL);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const data = await response.json();

            // Rellenamos las tarjetas de stock (pueden existir solo en admin o solo en empleado)
            if (totalProductosCount) totalProductosCount.textContent = data.totalProductos;
            if (productosAgotadosCount) productosAgotadosCount.textContent = data.productosAgotados;
            if (stockBajoCount) stockBajoCount.textContent = data.productosBajoStock;

        } catch (error) {
            console.error('Error al cargar resumen de stock:', error);
        }
    }

    /**
     * Carga la tabla de productos con stock bajo o agotado.
     * (Asume que la API devuelve un Array de StockTablaDTO)
     */
    async function loadLowStockTable() {
        if (!lowStockTableBody) return;

        const scrollPosition = window.scrollY || document.documentElement.scrollTop;

        lowStockTableBody.classList.add('loading');


        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // Añadimos el parámetro de ordenamiento: sort=campo,direccion
            const sortParam = lowStockSortField ? `&sort=${lowStockSortField},${lowStockSortDirection}` : '';
            const url = `${API_LOW_STOCK_URL}?page=${lowStockCurrentPage}&size=${itemsPerPage}${sortParam}`;

            const response = await fetch(url);

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

            const pageData = await response.json();

            lowStockTotalPages = pageData.totalPages;

            renderLowStockTable(pageData.content);
            updatePaginationControls();
            updateSortIndicators();

            requestAnimationFrame(() => {
                // 1. Forzar el foco en el contenedor estable
                mainContent.focus();
                // 2. Restaurar la posición de scroll
                window.scrollTo(0, scrollPosition);

                lowStockTableBody.classList.remove('loading');
            });

            // AÑADIDO: Restaurar la posición de scroll después de renderizar el contenido
            // Utilizamos setTimeout(0) para asegurar que la actualización del DOM haya finalizado
            setTimeout(() => {
                window.scrollTo(0, scrollPosition);
            }, 0);


        } catch (error) {
            console.error('Error al cargar tabla de stock bajo:', error);
            lowStockTableBody.innerHTML = '<tr><td colspan="5">Error al cargar datos.</td></tr>';
        }
    }

    function handleSortClick(event) {
        event.preventDefault();
        event.currentTarget.blur();
        const th = event.currentTarget;
        const newSortField = th.getAttribute('data-sort-by');

        if (!newSortField) return;

        if (lowStockSortField === newSortField) {
            // Cambiar dirección si se hace clic en la columna ya ordenada
            lowStockSortDirection = lowStockSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Nueva columna, ordenar por defecto ascendente
            lowStockSortField = newSortField;
            lowStockSortDirection = 'asc';
        }

        // Reiniciar a la primera página al ordenar
        lowStockCurrentPage = 0;
        loadLowStockTable();
    }

    function updateSortIndicators() {
        // Seleccionamos solo los TH que tienen el atributo data-sort-by
        const headers = document.querySelectorAll('.low-stock-section .data-table th[data-sort-by]');
        headers.forEach(th => {
            // Quitamos las clases de ordenamiento anterior
            th.classList.remove('sort-asc', 'sort-desc');

            // Asumimos que la hoja de estilos tiene el selector .fa-sort
            th.querySelector('.sort-icon').className = 'sort-icon fas fa-sort'; // Icono por defecto

            if (th.getAttribute('data-sort-by') === lowStockSortField) {
                // Columna actualmente ordenada
                const directionClass = `sort-${lowStockSortDirection}`;
                th.classList.add(directionClass);

                // Actualizar el ícono: fa-sort-up o fa-sort-down
                const icon = th.querySelector('.sort-icon');
                if (icon) {
                    icon.className = `sort-icon fas fa-sort-${lowStockSortDirection === 'asc' ? 'up' : 'down'}`;
                }
            }
        });
    }
    /**
     * Dibuja la tabla de productos con stock bajo.
     */
    function renderLowStockTable(productos) {
        if (!lowStockTableBody) return;
        lowStockTableBody.innerHTML = '';

        if (productos.length === 0) {
            lowStockTableBody.innerHTML = '<tr><td colspan="5">No hay productos con stock bajo o agotado.</td></tr>';
            return;
        }

        productos.forEach(producto => {

            // Lógica para el color del stock
            let stockClass = 'good';
            if (producto.stock <= 0) {
                stockClass = 'empty';
            } else if (producto.stockMinimo && producto.stock < producto.stockMinimo) {
                stockClass = 'low';
            }

            // --- ¡FILA CORREGIDA (5 CELDAS Y ORDENADAS)! ---
            const row = `
                <tr>
                    <td>${producto.nombre}</td>
                    <td>${producto.categoria}</td>
                    <td>${producto.descripcion}</td>
                    <td class="col-num"><span class="stock-badge ${stockClass}">${producto.stock}</span></td>
                    <td class="col-num">$${producto.precio.toFixed(2)}</td>
                </tr>
            `;
            // --- FIN DE LA CORRECCIÓN ---

            lowStockTableBody.innerHTML += row;
        });
    }

    function updatePaginationControls() {
        if (!lowStockPageInfo) return;

        // Sumamos 1 a la página actual para mostrar (porque empieza en 0)
        lowStockPageInfo.textContent = `Página ${lowStockCurrentPage + 1} de ${lowStockTotalPages || 1}`;
        lowStockPrevPageBtn.disabled = (lowStockCurrentPage === 0);
        lowStockNextPageBtn.disabled = (lowStockCurrentPage + 1 >= lowStockTotalPages);
    }

    async function loadUserInfo() {
        const userNameEl = document.getElementById('header-user-name');
        const userRoleEl = document.getElementById('header-user-role');

        if (!userNameEl || !userRoleEl) return; // Salir si no estamos en el layout principal

        try {
            const response = await fetch('/api/auth/perfil');

            if (response.status === 401) {
                // Si la cookie no es válida o expiró, redirigir al login
                window.location.href = 'index.html'; // O tu página de login
                return;
            }

            if (!response.ok) {
                throw new Error('Error al cargar perfil');
            }

            const perfil = await response.json(); // { nombreCompleto, rol }

            userNameEl.textContent = perfil.nombreCompleto;
            userRoleEl.textContent = perfil.rol;

            // Actualizar banner de bienvenida
            const welcomeUserName = document.getElementById('welcome-user-name');
            if (welcomeUserName) {
                welcomeUserName.textContent = perfil.nombreCompleto ? perfil.nombreCompleto.split(' ')[0] : 'Usuario';
            }

        } catch (error) {
            console.error(error);
            userNameEl.textContent = 'Error';
            userRoleEl.textContent = 'Error';
        }
    }

    /**
     * Carga y renderiza la actividad reciente (últimas ventas y compras)
     */
    async function loadRecentActivity() {
        const recentActivityList = document.getElementById('recent-activity-list');
        if (!recentActivityList) return; // Solo ejecutar si el panel existe (ej. admin.html)

        try {
            recentActivityList.innerHTML = `
                <li style="text-align: center; color: #999; padding: 20px;">
                    <i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i> Cargando actividad...
                </li>
            `;

            // Obtener últimas 5 ventas y 5 compras
            const [ventasRes, comprasRes] = await Promise.all([
                fetch(`${API_RECENTS_VENTAS_URL}?page=0&size=5&sort=fecha,desc`),
                fetch(`${API_RECENTS_COMPRAS_URL}?page=0&size=5&sort=fecha,desc`)
            ]);

            let ventas = [];
            let compras = [];

            if (ventasRes.ok) {
                const ventasData = await ventasRes.json();
                ventas = ventasData.content || [];
            } else {
                console.warn('No se pudieron cargar ventas recientes');
            }

            if (comprasRes.ok) {
                const comprasData = await comprasRes.json();
                compras = comprasData.content || [];
            } else {
                console.warn('No se pudieron cargar compras recientes');
            }

            // Mapear ventas a un formato unificado
            const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

            const unifiedActivity = [
                ...ventas.map(v => ({
                    type: 'venta',
                    date: new Date(v.fecha), // Asegurate de que v.fecha string sea un formato de fecha válido
                    title: `Venta registrada: ${formatCurrency(v.total)}`,
                    subtitle: `Cliente: ${v.nombreCliente || 'General'} | Vendió: ${v.nombreVendedor || 'Desconocido'} | Pago: ${v.metodoPago || 'Efectivo'}`,
                    icon: 'fa-shopping-cart',
                    color: '#28a745'
                })),
                ...compras.map(c => ({
                    type: 'compra',
                    date: new Date(c.fecha),
                    title: `Compra registrada: ${formatCurrency(c.total)}`,
                    subtitle: `Proveedor: ${c.nombreProveedor || 'Desconocido'}`,
                    icon: 'fa-truck-loading',
                    color: '#e74c3c'
                }))
            ];

            // Ordenar por fecha descendente (más recientes primero)
            unifiedActivity.sort((a, b) => b.date - a.date);

            // Tomar solo los primeros 6 elementos para no saturar el panel
            const topActivity = unifiedActivity.slice(0, 6);

            recentActivityList.innerHTML = '';

            if (topActivity.length === 0) {
                recentActivityList.innerHTML = `
                    <li style="text-align: center; color: #999; padding: 20px;">
                        No hay actividad reciente.
                    </li>
                `;
                return;
            }

            topActivity.forEach(item => {
                const timeString = item.date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                const dateString = item.date.toLocaleDateString('es-AR');
                
                // Formatear si es "Hoy" o poner fecha
                const hoy = new Date();
                const esHoy = item.date.toDateString() === hoy.toDateString();
                const displayDate = esHoy ? `Hoy, ${timeString} hs` : `${dateString}, ${timeString} hs`;

                // Determinar el prefijo +, - o nada
                const prefix = item.type === 'venta' ? '+' : '-';

                const listItem = document.createElement('li');
                listItem.style.cssText = 'padding: 12px 0; border-bottom: 1px solid #eee; display: flex; gap: 15px;';
                listItem.innerHTML = `
                    <div style="min-width: 40px; display: flex; flex-direction: column; align-items: center; padding-top: 5px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${item.color}20; color: ${item.color}; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                            <i class="fas ${item.icon}"></i>
                        </div>
                        <div style="width: 2px; height: 100%; background: #f0f0f0; margin-top: 5px;"></div>
                    </div>
                    <div style="flex: 1; padding-bottom: 5px;">
                        <span style="color: #888; font-size: 12px; display: block; margin-bottom: 3px;">
                            ${displayDate}
                        </span>
                        <div style="font-weight: 600; color: ${item.color}; font-size: 14px; margin-bottom: 2px;">
                            ${prefix} ${item.title}
                        </div>
                        <div style="font-size: 13px; color: #666;">
                            ${item.subtitle}
                        </div>
                    </div>
                `;
                recentActivityList.appendChild(listItem);
            });
            
            // Ocultar linea conectora del último elemento
            const lastItemDivider = recentActivityList.querySelector('li:last-child > div > div:last-child');
            if (lastItemDivider) lastItemDivider.style.display = 'none';

        } catch (error) {
            console.error('Error al cargar la actividad reciente:', error);
            recentActivityList.innerHTML = `
                <li style="text-align: center; color: #e74c3c; padding: 20px;">
                    <i class="fas fa-exclamation-triangle"></i> Error al cargar actividad.
                </li>
            `;
        }
    }


    // =================================================================
    // --- 6. EJECUCIÓN INICIAL ---
    // =================================================================

    // NOTA: Estas funciones deben ser llamadas por tu 'admin.js'
    // (o el script que maneja la navegación SPA) CADA VEZ
    // que el usuario hace clic en la sección "Principal".

    // Si este script SÓLO se carga en la página principal,
    // estas llamadas funcionarán bien aquí:
    const sortableHeaders = document.querySelectorAll('.low-stock-section .data-table th[data-sort-by]');
    sortableHeaders.forEach(th => {
        th.addEventListener('click', handleSortClick);
    });

    if (lowStockPrevPageBtn) {
        lowStockPrevPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (lowStockCurrentPage > 0) {
                lowStockCurrentPage--;
                loadLowStockTable();
            }
        });
    }

    if (lowStockNextPageBtn) {
        lowStockNextPageBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (lowStockCurrentPage + 1 < lowStockTotalPages) {
                lowStockCurrentPage++;
                loadLowStockTable();
            }
        });
    }


    loadTodayData();
    loadDashboardData(); // Para métricas del mes (empleado y admin)
    loadStockData();
    loadLowStockTable();
    loadUserInfo();
    loadRecentActivity();

    // Event listener para el botón de refrescar del panel de actividad
    const btnRefreshActivity = document.getElementById('btn-refresh-activity');
    if (btnRefreshActivity) {
        btnRefreshActivity.addEventListener('click', () => {
             // Animar el ícono
             const icon = btnRefreshActivity.querySelector('i');
             icon.classList.add('fa-spin');
             
             loadRecentActivity().finally(() => {
                 setTimeout(() => icon.classList.remove('fa-spin'), 500);
             });
        });
    }

    // Escuchar evento de venta registrada para actualizar el dashboard en tiempo real
    document.addEventListener('ventaRegistrada', function () {
        console.log('Principal: Venta registrada, actualizando dashboard...');
        loadTodayData();
        loadDashboardData();
        loadStockData();
        loadLowStockTable();
        loadRecentActivity();
    });

    // Escuchar evento de compra registrada para actualizar el dashboard
    document.addEventListener('compraRegistrada', function () {
        console.log('Principal: Compra registrada, actualizando dashboard...');
        loadTodayData();
        loadDashboardData();
        loadStockData();
        loadLowStockTable();
        loadRecentActivity();
    });

    // --- LÓGICA DEL SIDEBAR COLAPSABLE ---
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');

    // Restaurar el estado del sidebar desde localStorage
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }

    if (sidebarToggleBtn && sidebar) {
        sidebarToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            
            // Guardar el estado en localStorage
            if (sidebar.classList.contains('collapsed')) {
                localStorage.setItem('sidebarCollapsed', 'true');
            } else {
                localStorage.setItem('sidebarCollapsed', 'false');
            }
        });
    }

    // --- AUTO-EXPANDIR AL HACER CLIC EN UN SUBMENÚ ---
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    submenuToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            // Si el sidebar está colapsado, lo expandimos automáticamente
            if (sidebar && sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
                localStorage.setItem('sidebarCollapsed', 'false');
                
                // Opcional: Evitar que el menú se abra de inmediato para dar tiempo a la animación,
                // pero si tus submenús ya manejan su propia lógica de apertura/cierre en otro archivo,
                // simplemente con quitarle el 'collapsed' al padre, la UX será buena.
            }
        });
    });

    // --- 7. LÓGICA MODAL PRODUCTOS AGOTADOS ---
    const API_AGOTADOS_URL = '/api/informes/agotados';
    const cardAgotados = document.getElementById('card-productos-agotados');
    const modalAgotados = document.getElementById('modal-agotados');
    const modalAgotadosClose = document.getElementById('modal-agotados-close');
    const modalAgotadosCloseBtn = document.getElementById('modal-agotados-close-btn');
    const agotadosTableBody = document.getElementById('agotados-table-body');

    if (cardAgotados && modalAgotados) {
        
        let agotadosCurrentPage = 0;
        let agotadosTotalPages = 1;
        const agotadosItemsPerPage = 7; // Mismo tamaño de página que stock bajo

        const agotadosPrevPageBtn = document.getElementById('agotados-prev-page');
        const agotadosNextPageBtn = document.getElementById('agotados-next-page');
        const agotadosPageInfo = document.getElementById('agotados-page-info');

        async function loadAgotadosTable() {
            agotadosTableBody.classList.add('loading');
            
            // Simular un pequeño retardo para que la animación sea visible, al igual que en las otras tablas
            await new Promise(resolve => setTimeout(resolve, 200));

            try {
                // Fetch de la página actual con tamaño itemsPerPage
                const url = `${API_AGOTADOS_URL}?page=${agotadosCurrentPage}&size=${agotadosItemsPerPage}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                
                const pageData = await response.json();
                agotadosTotalPages = pageData.totalPages || 1;
                const content = pageData.content || [];
                
                agotadosTableBody.innerHTML = '';
                if (content.length === 0) {
                    agotadosTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay productos agotados que estén activos.</td></tr>';
                } else {
                    content.forEach(prod => {
                        const row = `
                            <tr>
                                <td>${prod.nombre}</td>
                                <td>${prod.descripcion != null ? prod.descripcion : '-'}</td>
                                <td>${prod.proveedor}</td>
                                <td>${prod.email}</td>
                                <td>${prod.telefono}</td>
                                <td class="col-num">$${prod.precioCosto != null ? prod.precioCosto.toFixed(2) : '0.00'}</td>
                            </tr>
                        `;
                        agotadosTableBody.innerHTML += row;
                    });
                }

                // Actualizar info y botones de paginación
                if (agotadosPageInfo) {
                    agotadosPageInfo.textContent = `Página ${agotadosCurrentPage + 1} de ${agotadosTotalPages || 1}`;
                }
                if (agotadosPrevPageBtn) {
                    agotadosPrevPageBtn.disabled = (agotadosCurrentPage === 0);
                }
                if (agotadosNextPageBtn) {
                    agotadosNextPageBtn.disabled = (agotadosCurrentPage + 1 >= agotadosTotalPages);
                }

                requestAnimationFrame(() => {
                    agotadosTableBody.classList.remove('loading');
                });

            } catch (error) {
                console.error("Error cargando productos agotados", error);
                agotadosTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Error al cargar datos.</td></tr>';
            }
        }

        // Listener para abrir el modal
        cardAgotados.addEventListener('click', () => {
            modalAgotados.style.display = 'flex'; 
            agotadosCurrentPage = 0; // Reiniciar a la primera página al abrir
            loadAgotadosTable();
        });

        // Listeners para los botones de paginación
        if (agotadosPrevPageBtn) {
            agotadosPrevPageBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (agotadosCurrentPage > 0) {
                    agotadosCurrentPage--;
                    loadAgotadosTable();
                }
            });
        }

        if (agotadosNextPageBtn) {
            agotadosNextPageBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (agotadosCurrentPage + 1 < agotadosTotalPages) {
                    agotadosCurrentPage++;
                    loadAgotadosTable();
                }
            });
        }

        const closeAgotadosModal = () => {
            modalAgotados.style.display = 'none';
        };

        if (modalAgotadosClose) modalAgotadosClose.addEventListener('click', closeAgotadosModal);
        if (modalAgotadosCloseBtn) modalAgotadosCloseBtn.addEventListener('click', closeAgotadosModal);
        
        // Cerrar al clickear fuera del contenido
        modalAgotados.addEventListener('click', (e) => {
            if (e.target === modalAgotados) closeAgotadosModal();
        });
    }

});