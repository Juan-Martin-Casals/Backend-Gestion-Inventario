document.addEventListener('DOMContentLoaded', function () {

    // --- 1. Constantes (Sección Informes) ---
    const fechaInicioInput = document.getElementById('fecha-inicio');
    const fechaFinInput = document.getElementById('fecha-fin');
    const btnBuscarFiltros = document.getElementById('buscar-filtros');
    const btnLimpiarFiltros = document.getElementById('limpiar-filtros');
    const btnExportarPDF = document.getElementById('exportar-pdf');

    const errorFechaInicio = document.getElementById('error-fecha-inicio');
    const errorFechaFin = document.getElementById('error-fecha-fin');

    // Contenedor de resultados
    const reporteContainer = document.getElementById('reporte-informes');

    function setFechasPorDefecto() {
        const hoy = new Date();
        
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        
        const primerDiaDelMes = `${yyyy}-${mm}-01`;
        const diaDeHoy = `${yyyy}-${mm}-${dd}`;

        fechaInicioInput.value = primerDiaDelMes;
        fechaFinInput.value = diaDeHoy;
    }

    async function buscarInformes() {
        errorFechaInicio.textContent = '';
        errorFechaFin.textContent = '';

        const fechaInicio = fechaInicioInput.value;
        const fechaFin = fechaFinInput.value;

        let isValid = true;
        if (!fechaInicio) {
            errorFechaInicio.textContent = 'Por favor, seleccione una fecha de inicio.';
            isValid = false;
        }
        if (!fechaFin) {
            errorFechaFin.textContent = 'Por favor, seleccione una fecha de fin.';
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        if (fechaFin < fechaInicio) {
            // Mostramos el error en el div de "Fecha Fin"
            errorFechaFin.textContent = 'La fecha de fin no puede ser anterior a la de inicio.';
            return; // Detiene la ejecución
        }

        const url = `/api/informes/resumen?inicio=${fechaInicio}&fin=${fechaFin}`;

        try {
            reporteContainer.style.display = 'block';
            reporteContainer.innerHTML = '<p>Cargando informe...</p>';

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            renderReporte(data);

        } catch (error) {
            console.error('Error al cargar informe:', error);
            reporteContainer.innerHTML = '<p>Error al cargar el informe.</p>';
        }
    }

    function renderReporte(data) {
        // Hacemos los cálculos para las nuevas métricas
        const totalVentas = data.totalVentas || 0;
        const totalImporte = data.totalImporte || 0;
        const totalCantidad = data.totalCantidad || 0;



        // Usamos las fechas tal como vienen (ej: 2025-11-03)
        const fechaInicioRaw = data.inicio || 'N/A';
        const fechaFinRaw = data.fin || 'N/A';

        // Mostramos el contenedor
        reporteContainer.style.display = 'block';
        
        // Construimos el nuevo HTML
       reporteContainer.innerHTML = `
            <div class="reporte-header" style="text-align: center; margin-bottom: 20px;">
                <h3 style="font-size: 20px; font-weight: 600; color: #333;">Resumen del Periodo</h3>
                <p style="color: #666; font-size: 14px;">${fechaInicioRaw} - ${fechaFinRaw}</p>
            </div>

            <div class="dashboard-stats" style="padding: 0; gap: 15px; margin-bottom: 15px;">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
                    <div class="stat-content">
                        <h3>${totalVentas}</h3>
                        <p>Ventas Realizadas</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-box"></i></div>
                    <div class="stat-content">
                        <h3>${totalCantidad}</h3>
                        <p>Productos Vendidos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                    <div class="stat-content">
                        <h3>$${totalImporte.toFixed(2)}</h3>
                        <p>Ganancias Totales</p>
                    </div>
                </div>
            </div>

            <div class="stat-card warning" style="margin-top: 15px; flex-direction: column; text-align: center;">
                <div class="stat-icon" style="background: none; color: #f57c00; font-size: 24px; height: auto;">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="stat-content">
                    <h3 style="font-size: 18px; margin-bottom: 5px;">Producto Más Vendido</h3>
                    <p style="font-size: 16px; font-weight: 600; color: #333;">${data.productoMasVendido || 'N/A'}</p>
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <button type="button" class="btn-outline" id="cerrar-resumen-btn">
                    <i class="fas fa-times"></i> Cerrar Resumen
                </button>
            </div>
        `;
    }

    function limpiarFiltros() {
        console.log('Limpiando filtros...');
        setFechasPorDefecto(); // Restablece a las fechas por defecto

        errorFechaInicio.textContent = '';
        errorFechaFin.textContent = '';
        
        // Limpia y oculta el reporte
        reporteContainer.innerHTML = '';
        reporteContainer.style.display = 'none';
    }

    async function exportarPDF() {
        const fechaInicio = fechaInicioInput.value;
        const fechaFin = fechaFinInput.value;

        if (!fechaInicio || !fechaFin) {
            alert("Debe seleccionar una fecha de inicio y fin para exportar.");
            return;
        }

        const url = `/api/informes/exportar-pdf?inicio=${fechaInicio}&fin=${fechaFin}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = `informe_ventas_${fechaInicio}_a_${fechaFin}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } catch (error) {
            console.error('Error al exportar PDF:', error);
            alert('No se pudo generar el PDF.');
        }
    }

    if (btnBuscarFiltros) {
        btnBuscarFiltros.addEventListener('click', buscarInformes);
    }

    if (btnLimpiarFiltros) {
        btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
    }

    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', exportarPDF);
    }

    /**
     * Listener para el contenedor de reportes.
     * Maneja el clic en el botón "Cerrar Resumen" (que se crea dinámicamente).
     */
    if (reporteContainer) {
        reporteContainer.addEventListener('click', function(event) {
            const cerrarBtn = event.target.closest('#cerrar-resumen-btn');
            
            if (cerrarBtn) {
                reporteContainer.style.display = 'none';
            }
        });
    }

    setFechasPorDefecto();

});