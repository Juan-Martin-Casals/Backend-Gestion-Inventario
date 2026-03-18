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

    let lowStockSortField = 'stock'; // Campo de ordenamiento inicial
    let lowStockSortDirection = 'asc';
    let lowStockAllData = []; // Dataset en memoria para ordenamiento global
    let lowStockFilteredData = []; // Dataset con filtros aplicados
    
    // --- Referencias UI de búsqueda de Reposición ---
    const mainLowStockSearchInput = document.getElementById('main-low-stock-search-input');
    const mainLowStockBtnLimpiar = document.getElementById('main-low-stock-btn-limpiar');
    const mainLowStockBtnPdf = document.getElementById('main-low-stock-btn-exportar-pdf');

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

    async function loadLowStockTable(forceFetch = false) {
        if (!lowStockTableBody) return;

        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        lowStockTableBody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            // Traemos todos los datos desde el backend si no los tenemos o si se fuerza
            if (lowStockAllData.length === 0 || forceFetch) {
                const url = `${API_LOW_STOCK_URL}?page=0&size=10000`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const pageData = await response.json();
                lowStockAllData = pageData.content || [];
            }
            
            // Función auxiliar para quitar acentos
            const quitarAcentos = (str) => {
                return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
            };

            // Filtrado Local (Search Bar)
            lowStockFilteredData = lowStockAllData;
            if (mainLowStockSearchInput && mainLowStockSearchInput.value.trim() !== '') {
                const query = quitarAcentos(mainLowStockSearchInput.value);
                lowStockFilteredData = lowStockAllData.filter(producto => {
                    return (
                        quitarAcentos(producto.nombre).includes(query) ||
                        quitarAcentos(producto.descripcion).includes(query) ||
                        quitarAcentos(producto.proveedor).includes(query) ||
                        quitarAcentos(producto.email).includes(query) ||
                        quitarAcentos(producto.telefono).includes(query)
                    );
                });
            }

            // Ordenamiento local (Client-Side)
            const sorted = [...lowStockFilteredData].sort((a, b) => {
                let valA = a[lowStockSortField];
                let valB = b[lowStockSortField];
                if (valA == null) valA = typeof valB === 'number' ? 0 : '';
                if (valB == null) valB = typeof valA === 'number' ? 0 : '';
                
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return lowStockSortDirection === 'asc' ? valA - valB : valB - valA;
                }
                
                return lowStockSortDirection === 'asc'
                    ? String(valA).localeCompare(String(valB), 'es')
                    : String(valB).localeCompare(String(valA), 'es');
            });

            // Paginación local
            lowStockTotalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
            const pageSlice = sorted.slice(
                lowStockCurrentPage * itemsPerPage,
                (lowStockCurrentPage + 1) * itemsPerPage
            );

            renderLowStockTable(pageSlice);
            updatePaginationControls();
            updateSortIndicators();

            requestAnimationFrame(() => {
                // Removemos el mainContent.focus() que rompía el input de búsqueda interactivo
                lowStockTableBody.classList.remove('loading');
            });
            // El timeout de scroll también se restringe para evitar saltos.
            if(window.scrollY !== scrollPosition) {
               window.scrollTo(0, scrollPosition);
            }

        } catch (error) {
            console.error('Error al cargar tabla de stock bajo:', error);
            lowStockTableBody.innerHTML = '<tr><td colspan="7">Error al cargar datos.</td></tr>';
            lowStockTableBody.classList.remove('loading');
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
    
    // --- Lógica de la barra de búsqueda y PDF ---
    if (mainLowStockSearchInput) {
        mainLowStockSearchInput.addEventListener('input', () => {
            lowStockCurrentPage = 0;
            loadLowStockTable();
        });
    }

    if (mainLowStockBtnLimpiar) {
        mainLowStockBtnLimpiar.addEventListener('click', () => {
            if (mainLowStockSearchInput) mainLowStockSearchInput.value = '';
            lowStockCurrentPage = 0;
            loadLowStockTable();
        });
    }

    if (mainLowStockBtnPdf) {
        mainLowStockBtnPdf.addEventListener('click', () => {
            exportarTablaPDF(lowStockFilteredData, "Productos_a_Reponer");
        });
    }
    
    /**
     * Función genérica para exportar tablas ordenadas.
     * (Tomada prestada de la base del sistema)
     */
    function exportarTablaPDF(data, titulo) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.error('jsPDF no está cargado');
            alert('Error: La librería para generar PDF no está disponible.');
            return;
        }

        const doc = new window.jspdf.jsPDF();
        
        // Configuración de fecha
        const hoy = new Date();
        const fechaFormateada = hoy.toLocaleDateString('es-AR');
        
        // Título del documento
        doc.setFontSize(18);
        doc.text(titulo.replace(/_/g, " "), 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Fecha de exportación: ${fechaFormateada}`, 14, 30);

        // Armado de datos de la tabla (usaremos solo las 7 columnas que muestra admin.html)
        const columnas = [
            "Nombre", "Descripción", "Proveedor", "Email", "Teléfono", "Stock", "Costo ($)"
        ];
        
        const filas = data.map(item => [
            item.nombre || 'N/A',
            item.descripcion || '-',
            item.proveedor || '-',
            item.email || '-',
            item.telefono || '-',
            item.stock !== null ? item.stock.toString() : '0',
            item.precioCosto !== null ? item.precioCosto.toFixed(2) : '0.00'
        ]);

        doc.autoTable({
            head: [columnas],
            body: filas,
            startY: 35,
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [65, 84, 241] } // Color azul corporativo
        });

        doc.save(`${titulo}_${fechaFormateada.replace(/\//g, "-")}.pdf`);
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
            lowStockTableBody.innerHTML = '<tr><td colspan="7">No hay productos con stock bajo o agotado.</td></tr>';
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

            // --- ¡FILA CORREGIDA (7 CELDAS)! ---
            const row = `
                <tr>
                    <td>${producto.nombre}</td>
                    <td>${producto.descripcion != null ? producto.descripcion : '-'}</td>
                    <td>${producto.proveedor || '-'}</td>
                    <td>${producto.email || '-'}</td>
                    <td>${producto.telefono || '-'}</td>
                    <td class="col-num"><span class="stock-badge ${stockClass}">${producto.stock}</span></td>
                    <td class="col-num">$${producto.precioCosto != null ? producto.precioCosto.toFixed(2) : '0.00'}</td>
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

            // Función fuerte para parsear LocalDateTime de SpringBoot (Array o String)
            const parseDate = (d) => {
                if (!d) return new Date();
                if (Array.isArray(d)) {
                    // Meses en JS son de 0 a 11
                    // Puede venir como [YYYY, MM, DD, HH, mm, ss]
                    return new Date(d[0], d[1] - 1, d[2] || 1, d[3] || 0, d[4] || 0, d[5] || 0); 
                }
                // Convertir a string
                const str = String(d);
                if (str.includes('T')) {
                    const parts = str.split('T');
                    const dateParts = parts[0].split('-');
                    const timeParts = parts[1].split(':');
                    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0] || 0, timeParts[1] || 0, timeParts[2] ? parseInt(timeParts[2]) : 0);
                }
                const parts = str.split('-');
                if(parts.length === 3) {
                    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
                }
                return new Date(d);
            };

            const unifiedActivity = [
                ...ventas.map(v => ({
                    type: 'venta',
                    date: parseDate(v.fecha),
                    id: v.idVenta || 0,
                    title: `Venta registrada: ${formatCurrency(v.total)}`,
                    subtitle: `Cliente: ${v.nombreCliente || 'General'} | Vendió: ${v.nombreVendedor || 'Desconocido'} | Pago: ${v.metodoPago || 'Efectivo'}`,
                    icon: 'fa-shopping-cart',
                    color: '#28a745'
                })),
                ...compras.map(c => ({
                    type: 'compra',
                    date: parseDate(c.fecha),
                    id: c.id || c.idCompra || 0, 
                    title: `Compra registrada: ${formatCurrency(c.total)}`,
                    subtitle: `Proveedor: ${c.nombreProveedor || 'Desconocido'}`,
                    icon: 'fa-truck-loading',
                    color: '#e74c3c'
                }))
            ];

            // Ordenar por fecha descendente (más recientes primero)
            // Si las fechas son las mismas (mismo día, porque no hay hora), desempatar favoreciendo al ID mayor
            unifiedActivity.sort((a, b) => {
                const diffDate = b.date.getTime() - a.date.getTime();
                if (diffDate === 0 || isNaN(diffDate)) {
                    return b.id - a.id; 
                }
                return diffDate;
            });

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
                // Formateamos mostrando Fecha, Hora y Minuto
                const opciones = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
                const displayDate = item.date.toLocaleDateString('es-AR', opciones) + ' hs';

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
    loadLowStockTable(true);
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
        loadLowStockTable(true);
        loadRecentActivity();
    });

    // Escuchar evento de compra registrada para actualizar el dashboard
    document.addEventListener('compraRegistrada', function () {
        console.log('Principal: Compra registrada, actualizando dashboard...');
        loadTodayData();
        loadDashboardData();
        loadStockData();
        loadLowStockTable(true);
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
        toggle.addEventListener('click', function (e) {
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

        const agotadosItemsPerPage = 7;

        // Dataset completo en memoria (se carga una sola vez al abrir el modal)
        let agotadosAllData = [];
        let agotadosCurrentPage = 0;
        let agotadosTotalPages = 1;

        // Estado de ordenamiento
        let agotadosSortField = 'nombre';
        let agotadosSortDirection = 'asc';

        const agotadosPrevPageBtn = document.getElementById('agotados-prev-page');
        const agotadosNextPageBtn = document.getElementById('agotados-next-page');
        const agotadosPageInfo = document.getElementById('agotados-page-info');
        const agotadosSearchInput = document.getElementById('agotados-search-input');
        const agotadosBtnLimpiar = document.getElementById('agotados-btn-limpiar-busqueda');

        // Término de búsqueda activo
        let agotadosSearchQuery = '';

        // Carga TODOS los datos desde la API (una sola vez por apertura del modal)
        async function fetchAllAgotados() {
            agotadosTableBody.classList.add('loading');
            await new Promise(resolve => setTimeout(resolve, 200));
            try {
                const url = `${API_AGOTADOS_URL}?page=0&size=10000`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const pageData = await response.json();
                agotadosAllData = pageData.content || [];
            } catch (error) {
                console.error("Error cargando productos agotados", error);
                agotadosTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Error al cargar datos.</td></tr>';
                agotadosAllData = [];
                // Solo quitar loading en caso de error (en éxito lo maneja renderAgotadosTable)
                requestAnimationFrame(() => agotadosTableBody.classList.remove('loading'));
            }
        }

        // Ordena el dataset en memoria y renderiza la página actual (con animación)
        async function renderAgotadosTable() {
            agotadosTableBody.classList.add('loading');
            await new Promise(resolve => setTimeout(resolve, 150));

            // Función auxiliar para quitar acentos
            const quitarAcentos = (str) => {
                return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
            };

            // 1. Filtrar por búsqueda (nombre, proveedor, email, teléfono, descripcion)
            const query = quitarAcentos(agotadosSearchQuery);
            const filtered = query
                ? agotadosAllData.filter(p =>
                    quitarAcentos(p.nombre).includes(query) ||
                    quitarAcentos(p.descripcion).includes(query) ||
                    quitarAcentos(p.proveedor).includes(query) ||
                    quitarAcentos(p.email).includes(query) ||
                    quitarAcentos(p.telefono).includes(query)
                )
                : agotadosAllData;

            // 2. Ordenar el resultado filtrado
            const sorted = [...filtered].sort((a, b) => {
                let valA = a[agotadosSortField];
                let valB = b[agotadosSortField];
                if (valA == null) valA = typeof valB === 'number' ? 0 : '';
                if (valB == null) valB = typeof valA === 'number' ? 0 : '';
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return agotadosSortDirection === 'asc' ? valA - valB : valB - valA;
                }
                return agotadosSortDirection === 'asc'
                    ? String(valA).localeCompare(String(valB), 'es')
                    : String(valB).localeCompare(String(valA), 'es');
            });

            // 3. Calcular paginación sobre el resultado filtrado y ordenado
            agotadosTotalPages = Math.max(1, Math.ceil(sorted.length / agotadosItemsPerPage));
            const pageSlice = sorted.slice(
                agotadosCurrentPage * agotadosItemsPerPage,
                (agotadosCurrentPage + 1) * agotadosItemsPerPage
            );

            // 4. Renderizar filas de la página actual
            agotadosTableBody.innerHTML = '';
            if (sorted.length === 0) {
                const msg = query ? 'No se encontraron productos que coincidan con la búsqueda.' : 'No hay productos agotados que estén activos.';
                agotadosTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${msg}</td></tr>`;
            } else {
                pageSlice.forEach(prod => {
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

            // 4. Actualizar controles y quitar animación
            if (agotadosPageInfo) agotadosPageInfo.textContent = `Página ${agotadosCurrentPage + 1} de ${agotadosTotalPages}`;
            if (agotadosPrevPageBtn) agotadosPrevPageBtn.disabled = (agotadosCurrentPage === 0);
            if (agotadosNextPageBtn) agotadosNextPageBtn.disabled = (agotadosCurrentPage + 1 >= agotadosTotalPages);
            updateAgotadosSortIndicators();
            requestAnimationFrame(() => agotadosTableBody.classList.remove('loading'));
        }

        // Función para actualizar los iconos de ordenamiento en el modal
        function updateAgotadosSortIndicators() {
            const headers = modalAgotados.querySelectorAll('th[data-sort-by]');
            headers.forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
                const icon = th.querySelector('.sort-icon');
                if (icon) icon.className = 'sort-icon fas fa-sort';
                if (th.getAttribute('data-sort-by') === agotadosSortField) {
                    th.classList.add(`sort-${agotadosSortDirection}`);
                    if (icon) icon.className = `sort-icon fas fa-sort-${agotadosSortDirection === 'asc' ? 'up' : 'down'}`;
                }
            });
        }

        // Listener para abrir el modal: carga todos los datos y renderiza
        cardAgotados.addEventListener('click', async () => {
            modalAgotados.style.display = 'flex';
            agotadosCurrentPage = 0;
            agotadosSortField = 'nombre';
            agotadosSortDirection = 'asc';
            agotadosSearchQuery = '';          // Limpiar búsqueda al abrir
            if (agotadosSearchInput) agotadosSearchInput.value = '';
            await fetchAllAgotados(); // Una sola llamada a la API
            renderAgotadosTable();
        });

        // Búsqueda en tiempo real
        if (agotadosSearchInput) {
            agotadosSearchInput.addEventListener('input', () => {
                agotadosSearchQuery = agotadosSearchInput.value;
                agotadosCurrentPage = 0;
                renderAgotadosTable();
            });
        }

        // Limpiar búsqueda
        if (agotadosBtnLimpiar) {
            agotadosBtnLimpiar.addEventListener('click', () => {
                agotadosSearchQuery = '';
                if (agotadosSearchInput) agotadosSearchInput.value = '';
                agotadosCurrentPage = 0;
                renderAgotadosTable();
            });
        }

        // Exportar a PDF el dataset completo filtrado y ordenado
        function exportAgotadosPdf() {
            if (!window.jspdf) {
                alert('La librería de PDF no está disponible. Verificá tu conexión a internet.');
                return;
            }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape' });

            // 1. Calcular el dataset filtrado + ordenado (igual que renderAgotadosTable)
            const query = agotadosSearchQuery.toLowerCase().trim();
            const filtered = query
                ? agotadosAllData.filter(p =>
                    (p.nombre && p.nombre.toLowerCase().includes(query)) ||
                    (p.proveedor && p.proveedor.toLowerCase().includes(query)) ||
                    (p.email && p.email.toLowerCase().includes(query)) ||
                    (p.telefono && p.telefono.toLowerCase().includes(query))
                )
                : agotadosAllData;

            const sorted = [...filtered].sort((a, b) => {
                let valA = a[agotadosSortField];
                let valB = b[agotadosSortField];
                if (valA == null) valA = typeof valB === 'number' ? 0 : '';
                if (valB == null) valB = typeof valA === 'number' ? 0 : '';
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return agotadosSortDirection === 'asc' ? valA - valB : valB - valA;
                }
                return agotadosSortDirection === 'asc'
                    ? String(valA).localeCompare(String(valB), 'es')
                    : String(valB).localeCompare(String(valA), 'es');
            });

            // 2. Título y metadatos
            const fechaHoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            doc.setFontSize(16);
            doc.setTextColor(220, 53, 69);
            doc.text('Productos Agotados', 14, 16);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Generado: ${fechaHoy}`, 14, 23);
            if (query) doc.text(`Filtro activo: "${agotadosSearchQuery}"`, 14, 29);

            // 3. Tabla con autoTable
            doc.autoTable({
                startY: query ? 34 : 28,
                head: [['Nombre', 'Descripción', 'Proveedor', 'Email', 'Teléfono', 'Precio Costo']],
                body: sorted.map(p => [
                    p.nombre || '',
                    p.descripcion || '-',
                    p.proveedor || '-',
                    p.email || '-',
                    p.telefono || '-',
                    `$${p.precioCosto != null ? p.precioCosto.toFixed(2) : '0.00'}`
                ]),
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [220, 53, 69], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [255, 245, 245] },
                columnStyles: { 5: { halign: 'right' } },
                margin: { left: 14, right: 14 }
            });

            // 4. Pie de página con total de registros
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(
                    `Página ${i} de ${totalPages}  |  Total de productos: ${sorted.length}`,
                    doc.internal.pageSize.getWidth() / 2,
                    doc.internal.pageSize.getHeight() - 8,
                    { align: 'center' }
                );
            }

            doc.save(`productos_agotados_${fechaHoy.replace(/\//g, '-')}.pdf`);
        }

        // Listener botón PDF
        const agotadosBtnPdf = document.getElementById('agotados-btn-exportar-pdf');
        if (agotadosBtnPdf) {
            agotadosBtnPdf.addEventListener('click', exportAgotadosPdf);
        }

        // Ordenar columnas: NO vuelve a buscar en la API, solo re-renderiza en memoria
        const agotadosSortableHeaders = modalAgotados.querySelectorAll('th[data-sort-by]');
        agotadosSortableHeaders.forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-sort-by');
                if (agotadosSortField === field) {
                    agotadosSortDirection = agotadosSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    agotadosSortField = field;
                    agotadosSortDirection = 'asc';
                }
                agotadosCurrentPage = 0;
                renderAgotadosTable(); // Sin fetch, solo re-renderiza
            });
        });

        // Paginación: tampoco vuelve a buscar en la API, solo re-renderiza
        if (agotadosPrevPageBtn) {
            agotadosPrevPageBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (agotadosCurrentPage > 0) {
                    agotadosCurrentPage--;
                    renderAgotadosTable();
                }
            });
        }

        if (agotadosNextPageBtn) {
            agotadosNextPageBtn.addEventListener('click', (event) => {
                event.preventDefault();
                if (agotadosCurrentPage + 1 < agotadosTotalPages) {
                    agotadosCurrentPage++;
                    renderAgotadosTable();
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

        // Cerrar con tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalAgotados.style.display === 'flex') {
                closeAgotadosModal();
            }
        });
    }

    // --- 8. LÓGICA MODAL STOCK BAJO ---
    const API_STOCK_BAJO_URL = '/api/informes/solo-stock-bajo';
    const cardStockBajo = document.getElementById('card-stock-bajo');
    const modalStockBajo = document.getElementById('modal-stock-bajo');
    const modalStockBajoClose = document.getElementById('modal-stock-bajo-close');
    const modalStockBajoCloseBtn = document.getElementById('modal-stock-bajo-close-btn');
    const stockBajoTableBody = document.getElementById('stock-bajo-table-body');

    if (cardStockBajo && modalStockBajo) {

        const sbItemsPerPage = 7;

        // Dataset completo en memoria
        let sbAllData = [];
        let sbCurrentPage = 0;
        let sbTotalPages = 1;

        // Estado de ordenamiento
        let sbSortField = 'nombre';
        let sbSortDirection = 'asc';

        // Búsqueda
        let sbSearchQuery = '';

        const sbPrevBtn = document.getElementById('stock-bajo-prev-page');
        const sbNextBtn = document.getElementById('stock-bajo-next-page');
        const sbPageInfo = document.getElementById('stock-bajo-page-info');
        const sbSearchInput = document.getElementById('stock-bajo-search-input');
        const sbBtnLimpiar = document.getElementById('stock-bajo-btn-limpiar');

        // Carga TODOS los données de una vez
        async function fetchAllStockBajo() {
            stockBajoTableBody.classList.add('loading');
            await new Promise(resolve => setTimeout(resolve, 200));
            try {
                const url = `${API_STOCK_BAJO_URL}?page=0&size=10000`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                const pageData = await response.json();
                sbAllData = pageData.content || [];
            } catch (error) {
                console.error('Error cargando stock bajo:', error);
                stockBajoTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar datos.</td></tr>';
                sbAllData = [];
                // Solo quitar loading en caso de error (en éxito lo maneja renderStockBajoTable)
                requestAnimationFrame(() => stockBajoTableBody.classList.remove('loading'));
            }
        }

        async function renderStockBajoTable() {
            stockBajoTableBody.classList.add('loading');
            await new Promise(resolve => setTimeout(resolve, 150));

            // Función auxiliar para quitar acentos
            const quitarAcentos = (str) => {
                return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
            };

            // 1. Filtrar
            const query = quitarAcentos(sbSearchQuery);
            const filtered = query
                ? sbAllData.filter(p =>
                    quitarAcentos(p.nombre).includes(query) ||
                    quitarAcentos(p.descripcion).includes(query) ||
                    quitarAcentos(p.proveedor).includes(query) ||
                    quitarAcentos(p.email).includes(query) ||
                    quitarAcentos(p.telefono).includes(query)
                )
                : sbAllData;

            // 2. Ordenar
            const sorted = [...filtered].sort((a, b) => {
                let valA = a[sbSortField];
                let valB = b[sbSortField];
                if (valA == null) valA = typeof valB === 'number' ? 0 : '';
                if (valB == null) valB = typeof valA === 'number' ? 0 : '';
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sbSortDirection === 'asc' ? valA - valB : valB - valA;
                }
                return sbSortDirection === 'asc'
                    ? String(valA).localeCompare(String(valB), 'es')
                    : String(valB).localeCompare(String(valA), 'es');
            });

            // 3. Paginar
            sbTotalPages = Math.max(1, Math.ceil(sorted.length / sbItemsPerPage));
            const pageSlice = sorted.slice(sbCurrentPage * sbItemsPerPage, (sbCurrentPage + 1) * sbItemsPerPage);

            // 4. Renderizar filas
            stockBajoTableBody.innerHTML = '';
            if (sorted.length === 0) {
                const msg = query ? 'No se encontraron productos que coincidan con la búsqueda.' : 'No hay productos con stock bajo.';
                stockBajoTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">${msg}</td></tr>`;
            } else {
                pageSlice.forEach(p => {
                    const row = `
                        <tr>
                            <td>${p.nombre || '-'}</td>
                            <td>${p.descripcion || '-'}</td>
                            <td>${p.proveedor || '-'}</td>
                            <td>${p.email || '-'}</td>
                            <td>${p.telefono || '-'}</td>
                            <td class="col-num"><span class="stock-badge low">${p.stock}</span></td>
                            <td class="col-num">${p.stockMinimo}</td>
                            <td class="col-num">$${p.precioCosto != null ? p.precioCosto.toFixed(2) : '0.00'}</td>
                        </tr>
                    `;
                    stockBajoTableBody.innerHTML += row;
                });
            }

            // 5. Controles y fade-in
            if (sbPageInfo) sbPageInfo.textContent = `Página ${sbCurrentPage + 1} de ${sbTotalPages}`;
            if (sbPrevBtn) sbPrevBtn.disabled = (sbCurrentPage === 0);
            if (sbNextBtn) sbNextBtn.disabled = (sbCurrentPage + 1 >= sbTotalPages);
            updateStockBajoSortIndicators();
            requestAnimationFrame(() => { stockBajoTableBody.classList.remove('loading'); });
        }

        function updateStockBajoSortIndicators() {
            const headers = modalStockBajo.querySelectorAll('th[data-sort-by]');
            headers.forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
                const icon = th.querySelector('.sort-icon');
                if (icon) icon.className = 'sort-icon fas fa-sort';
                if (th.getAttribute('data-sort-by') === sbSortField) {
                    th.classList.add(`sort-${sbSortDirection}`);
                    if (icon) icon.className = `sort-icon fas fa-sort-${sbSortDirection === 'asc' ? 'up' : 'down'}`;
                }
            });
        }

        // PDF export
        function exportStockBajoPdf() {
            if (!window.jspdf) { alert('Librería PDF no disponible.'); return; }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape' });

            const query = sbSearchQuery.toLowerCase().trim();
            const filtered = query
                ? sbAllData.filter(p =>
                    (p.nombre && p.nombre.toLowerCase().includes(query)) ||
                    (p.descripcion && p.descripcion.toLowerCase().includes(query)) ||
                    (p.proveedor && p.proveedor.toLowerCase().includes(query)) ||
                    (p.email && p.email.toLowerCase().includes(query)) ||
                    (p.telefono && p.telefono.toLowerCase().includes(query))
                )
                : sbAllData;

            const sorted = [...filtered].sort((a, b) => {
                let valA = a[sbSortField]; let valB = b[sbSortField];
                if (valA == null) valA = typeof valB === 'number' ? 0 : '';
                if (valB == null) valB = typeof valA === 'number' ? 0 : '';
                if (typeof valA === 'number' && typeof valB === 'number') return sbSortDirection === 'asc' ? valA - valB : valB - valA;
                return sbSortDirection === 'asc' ? String(valA).localeCompare(String(valB), 'es') : String(valB).localeCompare(String(valA), 'es');
            });

            const fechaHoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            doc.setFontSize(16); doc.setTextColor(255, 152, 0);
            doc.text('Productos con Stock Bajo', 14, 16);
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text(`Generado: ${fechaHoy}`, 14, 23);
            if (query) doc.text(`Filtro activo: "${sbSearchQuery}"`, 14, 29);

            doc.autoTable({
                startY: query ? 34 : 28,
                head: [['Nombre', 'Descripción', 'Proveedor', 'Email', 'Teléfono', 'Stock Actual', 'Stock Mínimo', 'Precio de Costo']],
                body: sorted.map(p => [
                    p.nombre || '-', p.descripcion || '-',
                    p.proveedor || '-', p.email || '-', p.telefono || '-',
                    p.stock, p.stockMinimo,
                    `$${p.precioCosto != null ? p.precioCosto.toFixed(2) : '0.00'}`
                ]),
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [255, 152, 0], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [255, 248, 240] },
                columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
                margin: { left: 14, right: 14 }
            });

            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150);
                doc.text(`Página ${i} de ${totalPages}  |  Total: ${sorted.length} productos`,
                    doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
            }
            doc.save(`stock_bajo_${fechaHoy.replace(/\//g, '-')}.pdf`);
        }

        // Abrir modal
        cardStockBajo.addEventListener('click', async () => {
            modalStockBajo.style.display = 'flex';
            sbCurrentPage = 0; sbSortField = 'nombre'; sbSortDirection = 'asc';
            sbSearchQuery = '';
            if (sbSearchInput) sbSearchInput.value = '';
            await fetchAllStockBajo();
            renderStockBajoTable();
        });

        // Búsqueda
        if (sbSearchInput) {
            sbSearchInput.addEventListener('input', () => {
                sbSearchQuery = sbSearchInput.value;
                sbCurrentPage = 0;
                renderStockBajoTable();
            });
        }

        // Limpiar búsqueda
        if (sbBtnLimpiar) {
            sbBtnLimpiar.addEventListener('click', () => {
                sbSearchQuery = '';
                if (sbSearchInput) sbSearchInput.value = '';
                sbCurrentPage = 0;
                renderStockBajoTable();
            });
        }

        // PDF
        const sbBtnPdf = document.getElementById('stock-bajo-btn-exportar-pdf');
        if (sbBtnPdf) sbBtnPdf.addEventListener('click', exportStockBajoPdf);

        // Ordenar columnas
        const sbSortableHeaders = modalStockBajo.querySelectorAll('th[data-sort-by]');
        sbSortableHeaders.forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-sort-by');
                if (sbSortField === field) {
                    sbSortDirection = sbSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sbSortField = field;
                    sbSortDirection = 'asc';
                }
                sbCurrentPage = 0;
                renderStockBajoTable();
            });
        });

        // Paginación
        if (sbPrevBtn) {
            sbPrevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (sbCurrentPage > 0) { sbCurrentPage--; renderStockBajoTable(); }
            });
        }
        if (sbNextBtn) {
            sbNextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (sbCurrentPage + 1 < sbTotalPages) { sbCurrentPage++; renderStockBajoTable(); }
            });
        }

        // Cerrar modal
        const closeStockBajoModal = () => { modalStockBajo.style.display = 'none'; };
        if (modalStockBajoClose) modalStockBajoClose.addEventListener('click', closeStockBajoModal);
        if (modalStockBajoCloseBtn) modalStockBajoCloseBtn.addEventListener('click', closeStockBajoModal);
        modalStockBajo.addEventListener('click', (e) => { if (e.target === modalStockBajo) closeStockBajoModal(); });

        // Cerrar con tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalStockBajo.style.display === 'flex') {
                closeStockBajoModal();
            }
        });
    }

});