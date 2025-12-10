// informes.js - Dashboard de Informes
document.addEventListener('DOMContentLoaded', () => {
    const informesSection = document.getElementById('informes-section');
    if (!informesSection) return;

    // Variables globales para los gráficos
    let ventasComprasChart = null;
    let estadoStockChart = null;

    // Fechas por defecto: mes actual
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Formatear fecha para inputs (YYYY-MM-DD)
    const formatFechaInput = (fecha) => {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Formatear fecha para mostrar (DD/MM/YYYY)
    const formatFechaDisplay = (fechaStr) => {
        const fecha = new Date(fechaStr + 'T00:00:00');
        const day = String(fecha.getDate()).padStart(2, '0');
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const year = fecha.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Formatear números con separador de miles
    const formatNumber = (num) => {
        return new Intl.NumberFormat('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    // Elementos del DOM
    const fechaInicioInput = document.getElementById('fecha-inicio');
    const fechaFinInput = document.getElementById('fecha-fin');
    const buscarBtn = document.getElementById('buscar-filtros');
    const limpiarBtn = document.getElementById('limpiar-filtros');
    const periodoTexto = document.getElementById('periodo-texto');

    // Inicializar fechas por defecto
    fechaInicioInput.value = formatFechaInput(primerDiaMes);
    fechaFinInput.value = formatFechaInput(hoy);

    // Función para mostrar errores de validación
    const mostrarErrorFecha = (mensaje) => {
        const errorContainer = document.getElementById('fecha-error-message');
        const errorText = document.getElementById('fecha-error-text');
        if (errorContainer && errorText) {
            errorText.textContent = mensaje;
            errorContainer.style.display = 'block';
        }
    };

    // Función para ocultar errores
    const ocultarErrorFecha = () => {
        const errorContainer = document.getElementById('fecha-error-message');
        if (errorContainer) {
            errorContainer.style.display = 'none';
        }
    };

    // Función para validar fechas
    const validarFechas = (inicio, fin) => {
        if (!inicio || !fin) {
            mostrarErrorFecha('Por favor selecciona un rango de fechas válido');
            return false;
        }

        const fechaInicio = new Date(inicio);
        const fechaFin = new Date(fin);

        if (fechaInicio > fechaFin) {
            mostrarErrorFecha('La fecha de inicio no puede ser posterior a la fecha de fin');
            return false;
        }

        ocultarErrorFecha();
        return true;
    };

    // Cargar datos al entrar a la sección
    const cargarDashboard = async () => {
        const inicio = fechaInicioInput.value;
        const fin = fechaFinInput.value;

        if (!validarFechas(inicio, fin)) {
            return;
        }

        // Actualizar texto del período
        periodoTexto.textContent = `Mostrando datos del ${formatFechaDisplay(inicio)} al ${formatFechaDisplay(fin)}`;

        try {
            // Cargar todos los datos en paralelo
            await Promise.all([
                cargarKPIs(inicio, fin),
                cargarGraficoVentasCompras(inicio, fin),
                cargarTopProductos(inicio, fin),
                cargarEstadoStock()
            ]);
        } catch (error) {
            console.error('Error al cargar dashboard:', error);
            alert('Error al cargar los datos del dashboard');
        }
    };

    // 1. Cargar KPIs
    const cargarKPIs = async (inicio, fin) => {
        try {
            const response = await fetch(`/api/informes/kpis?inicio=${inicio}&fin=${fin}`);
            if (!response.ok) throw new Error('Error al obtener KPIs');

            const data = await response.json();

            // Actualizar valores en las tarjetas
            document.getElementById('kpi-ventas').textContent = `$${formatNumber(data.totalVentas || 0)}`;
            document.getElementById('kpi-compras').textContent = `$${formatNumber(data.totalCompras || 0)}`;
            document.getElementById('kpi-ganancia').textContent = `$${formatNumber(data.ganancia || 0)}`;
            document.getElementById('kpi-stock-bajo').textContent = data.productosStockBajo || 0;

            // Cambiar color de ganancia según sea positiva o negativa
            const gananciaEl = document.getElementById('kpi-ganancia');
            if (data.ganancia >= 0) {
                gananciaEl.style.color = '#28a745';
            } else {
                gananciaEl.style.color = '#dc3545';
            }

        } catch (error) {
            console.error('Error al cargar KPIs:', error);
        }
    };

    // 2. Cargar Gráfico de Líneas (Ventas vs Compras)
    const cargarGraficoVentasCompras = async (inicio, fin) => {
        try {
            const response = await fetch(`/api/informes/ventas-compras-diarias?inicio=${inicio}&fin=${fin}`);
            if (!response.ok) throw new Error('Error al obtener datos de ventas/compras');

            const data = await response.json();

            // Preparar datos para el gráfico
            const labels = data.map(item => formatFechaDisplay(item.fecha));
            const ventasData = data.map(item => item.ventas || 0);
            const comprasData = data.map(item => item.compras || 0);

            // Destruir gráfico anterior si existe
            if (ventasComprasChart) {
                ventasComprasChart.destroy();
            }

            // Crear nuevo gráfico
            const ctx = document.getElementById('ventas-compras-chart').getContext('2d');
            ventasComprasChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Ventas',
                            data: ventasData,
                            borderColor: '#28a745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Compras',
                            data: comprasData,
                            borderColor: '#dc3545',
                            backgroundColor: 'rgba(220, 53, 69, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2.5,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function (context) {
                                    return context.dataset.label + ': $' + formatNumber(context.parsed.y);
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return '$' + formatNumber(value);
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error al cargar gráfico de ventas/compras:', error);
        }
    };

    // 3. Cargar Top 5 Productos
    const cargarTopProductos = async (inicio, fin) => {
        try {
            const response = await fetch(`/api/informes/top-productos?inicio=${inicio}&fin=${fin}&limit=5`);
            if (!response.ok) throw new Error('Error al obtener top productos');

            const data = await response.json();
            const tbody = document.getElementById('top-productos-body');

            if (data.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 20px; color: #999;">
                            No hay datos para mostrar en este período
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = data.map((producto, index) => `
                <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td>${producto.nombreProducto}</td>
                    <td>${producto.cantidad} uds</td>
                    <td>$${formatNumber(producto.totalVentas)}</td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Error al cargar top productos:', error);
            document.getElementById('top-productos-body').innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #dc3545;">
                        Error al cargar datos
                    </td>
                </tr>
            `;
        }
    };

    // 4. Cargar Gráfico de Dona (Estado Stock)
    const cargarEstadoStock = async () => {
        try {
            const response = await fetch('/api/informes/estado-stock');
            if (!response.ok) throw new Error('Error al obtener estado de stock');

            const data = await response.json();

            const total = (data.optimo || 0) + (data.bajo || 0) + (data.agotado || 0);

            // Destruir gráfico anterior si existe
            if (estadoStockChart) {
                estadoStockChart.destroy();
            }

            // Crear nuevo gráfico
            const ctx = document.getElementById('estado-stock-chart').getContext('2d');
            estadoStockChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Óptimo', 'Bajo', 'Agotado'],
                    datasets: [{
                        data: [data.optimo || 0, data.bajo || 0, data.agotado || 0],
                        backgroundColor: [
                            '#28a745',  // Verde para óptimo
                            '#ffc107',  // Amarillo para bajo
                            '#dc3545'   // Rojo para agotado
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const value = context.parsed;
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return context.label + ': ' + value + ' (' + percentage + '%)';
                                }
                            }
                        }
                    }
                }
            });

            // Actualizar leyenda
            const leyenda = document.getElementById('stock-leyenda');
            const porcentajeOptimo = total > 0 ? ((data.optimo / total) * 100).toFixed(1) : 0;
            const porcentajeBajo = total > 0 ? ((data.bajo / total) * 100).toFixed(1) : 0;
            const porcentajeAgotado = total > 0 ? ((data.agotado / total) * 100).toFixed(1) : 0;

            leyenda.innerHTML = `
                <div style="display: inline-block; margin: 0 15px;">
                    <span style="display: inline-block; width: 12px; height: 12px; background: #28a745; border-radius: 50%; margin-right: 5px;"></span>
                    <strong>Óptimo:</strong> ${data.optimo} (${porcentajeOptimo}%)
                </div>
                <div style="display: inline-block; margin: 0 15px;">
                    <span style="display: inline-block; width: 12px; height: 12px; background: #ffc107; border-radius: 50%; margin-right: 5px;"></span>
                    <strong>Bajo:</strong> ${data.bajo} (${porcentajeBajo}%)
                </div>
                <div style="display: inline-block; margin: 0 15px;">
                    <span style="display: inline-block; width: 12px; height: 12px; background: #dc3545; border-radius: 50%; margin-right: 5px;"></span>
                    <strong>Agotado:</strong> ${data.agotado} (${porcentajeAgotado}%)
                </div>
            `;

        } catch (error) {
            console.error('Error al cargar estado de stock:', error);
        }
    };

    // Event Listeners
    buscarBtn.addEventListener('click', cargarDashboard);

    limpiarBtn.addEventListener('click', () => {
        fechaInicioInput.value = formatFechaInput(primerDiaMes);
        fechaFinInput.value = formatFechaInput(hoy);
        cargarDashboard();
    });

    // Event Listener para Exportar PDF
    const exportarPdfBtn = document.getElementById('exportar-pdf');
    if (exportarPdfBtn) {
        exportarPdfBtn.addEventListener('click', async () => {
            const inicio = fechaInicioInput.value;
            const fin = fechaFinInput.value;

            if (!validarFechas(inicio, fin)) {
                return;
            }

            try {
                // Deshabilitar el botón mientras se genera el PDF
                exportarPdfBtn.disabled = true;
                exportarPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';

                const response = await fetch(`/api/informes/exportar-pdf?inicio=${inicio}&fin=${fin}`);

                if (!response.ok) {
                    throw new Error('Error al generar el PDF');
                }

                // Convertir la respuesta en un Blob
                const blob = await response.blob();

                // Crear URL temporal para el blob
                const url = window.URL.createObjectURL(blob);

                // Crear enlace temporal para descargar
                const a = document.createElement('a');
                a.href = url;
                a.download = `Informe_Completo_${inicio}_${fin}.pdf`;
                document.body.appendChild(a);
                a.click();

                // Limpiar
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

            } catch (error) {
                console.error('Error al exportar PDF:', error);
                alert('❌ Error al generar el PDF. Por favor intenta nuevamente.');
            } finally {
                // Restaurar el botón
                exportarPdfBtn.disabled = false;
                exportarPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Exportar PDF';
            }
        });
    }

    // Cargar dashboard automáticamente cuando se muestra la sección
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const displayStyle = window.getComputedStyle(informesSection).display;
                if (displayStyle !== 'none') {
                    cargarDashboard();
                }
            }
        });
    });

    observer.observe(informesSection, {
        attributes: true,
        attributeFilter: ['style']
    });

    // Cargar datos iniciales si la sección ya está visible
    if (window.getComputedStyle(informesSection).display !== 'none') {
        cargarDashboard();
    }
});