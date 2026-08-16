window.salesChannel = window.salesChannel || new BroadcastChannel('sales_channel');

document.addEventListener('DOMContentLoaded', function () {
    const salesChannel = window.salesChannel;
    const sectionCaja = document.getElementById('caja-section');
    if (!sectionCaja) return;

    const panelApertura = document.getElementById('caja-panel-apertura');
    const tituloApertura = document.getElementById('caja-titulo-apertura');
    const panelCierre = document.getElementById('caja-panel-cierre');

    // Elementos de Apertura
    const formApertura = document.getElementById('form-apertura-caja');
    const inputMontoInicial = document.getElementById('caja-monto-inicial');
    const inputObservaciones = document.getElementById('caja-observaciones');
    const spanOperador = document.getElementById('caja-operador-nombre');
    const spanSaldoAnterior = document.getElementById('caja-saldo-anterior');
    const warningText = document.getElementById('caja-monto-warning');
    const btnAbrirCaja = document.getElementById('btn-abrir-caja');
    const errorMessage = document.getElementById('caja-error-message');

    // Elementos de Estado
    const badgeEstado = document.getElementById('caja-badge-estado');
    const infoEstado = document.getElementById('caja-info-estado');

    // Elementos de Cierre (Dashboard Analítico)
    const btnCerrarCaja = document.getElementById('btn-cerrar-caja');
    const inputFondoFijo = document.getElementById('caja-fondo-fijo');
    const inputMontoFinalFisico = document.getElementById('caja-monto-final');
    const warningFinalText = document.getElementById('caja-monto-final-warning');
    const inputObsCierre = document.getElementById('caja-observaciones-cierre');
    const panelErrorCierre = document.getElementById('caja-error-cierre');

    let saldoAnteriorGlobal = 0.0;
    let usuarioIdActual = null;
    let cajaEstaAbierta = false;
    let resumenCajaActual = null; // Almacenamos el DTO de respuesta para cálculos locales y PDF

    // ===================================
    // SELECTORES - MODAL TICKET
    // ===================================
    const modalTicketOverlay = document.getElementById('modal-ticket-overlay');
    const btnGenerarTicket = document.getElementById('btn-generar-ticket');
    const btnCerrarTicket = document.getElementById('btn-cerrar-ticket');

    let ultimaVentaId = null;

    function mostrarModalTicket(idVenta) {
        ultimaVentaId = idVenta;
        if (modalTicketOverlay) {
            modalTicketOverlay.style.display = 'block';
        }
    }

    function cerrarModalTicket() {
        if (modalTicketOverlay) {
            modalTicketOverlay.style.display = 'none';
        }
        ultimaVentaId = null;
    }

    if (btnGenerarTicket) {
        btnGenerarTicket.addEventListener('click', async () => {
            if (!ultimaVentaId) return;
            try {
                const response = await fetch(`/api/ventas/${ultimaVentaId}/ticket`);
                if (!response.ok) throw new Error('Error al generar ticket');

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ticket_Venta_${ultimaVentaId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (error) {
                console.error('Error al descargar ticket:', error);
                alert('Error al generar el ticket');
            }
            cerrarModalTicket();
        });
    }

    if (btnCerrarTicket) {
        btnCerrarTicket.addEventListener('click', cerrarModalTicket);
    }

    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalTicketOverlay && modalTicketOverlay.style.display !== 'none') {
            cerrarModalTicket();
        }
    });

    const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 });

    // Verificar el estado de la caja de forma automática al cargar
    async function verificarEstadoCaja(silentRefresh = false) {
        try {
            const userRes = await fetch('/api/auth/perfil');
            if (!userRes.ok) throw new Error('Usuario no autenticado o sesión expirada');
            const usuarioObj = await userRes.json();
            if (!usuarioObj || !usuarioObj.idUsuario) return;
            usuarioIdActual = usuarioObj.idUsuario;

            const res = await fetch(`/api/caja/estado/${usuarioIdActual}`);
            if (!res.ok) throw new Error('Error al conectar con la verificación de Caja.');

            const data = await res.json();
            cajaEstaAbierta = data.abierta;

            window.usuarioNombreActual = usuarioObj.nombreCompleto;
            spanOperador.textContent = `${usuarioObj.nombreCompleto} (${usuarioObj.rol})`;

            if (!cajaEstaAbierta) {
                // CONFIGURACIÓN PARA APERTURA
                saldoAnteriorGlobal = data.saldoAnterior || 0.0;

                spanSaldoAnterior.textContent = formatter.format(saldoAnteriorGlobal);
                inputMontoInicial.value = new Intl.NumberFormat('es-AR').format(Math.round(saldoAnteriorGlobal));

                // Contexto visual del cierre anterior
                const contextoCierre = document.getElementById('caja-contexto-cierre');
                const contextoIcono = document.getElementById('caja-contexto-icono');
                const contextoTexto = document.getElementById('caja-contexto-texto');
                const contextoOperador = document.getElementById('caja-contexto-operador');

                if (contextoCierre && data.ultimoCierreInfo) {
                    const info = data.ultimoCierreInfo;
                    contextoCierre.style.display = 'block';

                    if (info.esFondoFijo) {
                        contextoIcono.className = 'fas fa-shield-alt';
                        contextoTexto.textContent = 'Fondo Fijo Asignado';
                        contextoTexto.parentElement.style.color = '#2563eb';
                        contextoTexto.parentElement.style.background = '#eff6ff';
                        contextoTexto.parentElement.style.borderColor = '#bfdbfe';
                    } else {
                        contextoIcono.className = 'fas fa-money-bill-wave';
                        contextoTexto.textContent = 'Efectivo Físico Declarado';
                        contextoTexto.parentElement.style.color = '#059669';
                        contextoTexto.parentElement.style.background = '#ecfdf5';
                        contextoTexto.parentElement.style.borderColor = '#a7f3d0';
                    }

                    const fechaObj = info.fecha ? new Date(info.fecha) : new Date();
                    const fechaStr = fechaObj.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    contextoOperador.innerHTML = `<i class="fas fa-user-clock" style="font-size: 10px;"></i> <span>Por ${info.operador} (${info.rol}) el ${fechaStr}</span>`;
                }

                panelApertura.style.display = 'block';
                if (tituloApertura) tituloApertura.style.display = 'block';
                panelCierre.style.display = 'none';

                if (badgeEstado) {
                    badgeEstado.innerHTML = '<i class="fas fa-lock"></i> CERRADA';
                    badgeEstado.style.backgroundColor = '#dc3545';
                }
                if (infoEstado) infoEstado.textContent = 'Para registrar compras o ventas, debes realizar la Apertura de Caja.';
            } else {
                // CONFIGURACIÓN PARA CIERRE Y DASHBOARD
                panelApertura.style.display = 'none';
                if (tituloApertura) tituloApertura.style.display = 'none';
                panelCierre.style.display = 'block';

                if (badgeEstado) {
                    badgeEstado.innerHTML = '<i class="fas fa-lock-open"></i> ABIERTA';
                    badgeEstado.style.backgroundColor = '#28a745';
                }
                if (infoEstado) infoEstado.textContent = 'Caja abierta y operando con normalidad. Recuerda cerrarla al final de tu turno.';

                cargarDashboardCierre(silentRefresh);
            }

            const btnNuevoIngreso = document.getElementById('btn-nuevo-ingreso');
            const btnNuevoEgreso = document.getElementById('btn-nuevo-egreso');
            if (btnNuevoIngreso) {
                btnNuevoIngreso.disabled = !cajaEstaAbierta;
                btnNuevoIngreso.style.opacity = cajaEstaAbierta ? '1' : '0.6';
                btnNuevoIngreso.style.cursor = cajaEstaAbierta ? 'pointer' : 'not-allowed';
            }
            if (btnNuevoEgreso) {
                btnNuevoEgreso.disabled = !cajaEstaAbierta;
                btnNuevoEgreso.style.opacity = cajaEstaAbierta ? '1' : '0.6';
                btnNuevoEgreso.style.cursor = cajaEstaAbierta ? 'pointer' : 'not-allowed';
            }

        } catch (error) {
            console.error('Error verificando la caja:', error);
        }
    }

    async function cargarDashboardCierre(silentRefresh = false) {
        try {
            const resumenRes = await fetch(`/api/caja/sesion-activa/${usuarioIdActual}`);
            if (!resumenRes.ok) throw new Error("No se pudo obtener el resumen");

            const resumenData = await resumenRes.json();
            resumenCajaActual = resumenData;

            // 1. Poblamos Tarjetas Sumarias (con null-check por si algún elemento fue removido del HTML)
            const elInicial = document.getElementById('caja-resumen-inicial');
            const elIngresos = document.getElementById('caja-resumen-ingresos');
            const elEgresos = document.getElementById('caja-resumen-egresos');
            const elEsperado = document.getElementById('caja-resumen-esperado');
            const elOperador = document.getElementById('caja-kpi-operador');

            if (elInicial) elInicial.textContent = formatter.format(resumenData.montoInicial || 0);
            if (elOperador && window.usuarioNombreActual) elOperador.textContent = window.usuarioNombreActual;
            if (elIngresos) elIngresos.textContent = formatter.format(resumenData.totalVentas || 0);
            if (elEgresos) elEgresos.textContent = formatter.format(resumenData.totalCompras || 0);
            if (elEsperado) elEsperado.textContent = formatter.format(resumenData.saldoEsperado || 0);

            // 2. Poblamos Tarjetas del Nuevo Dashboard Analítico
            const elTotalVentas = document.getElementById('caja-card-total-ventas');
            if (elTotalVentas) elTotalVentas.textContent = formatter.format(resumenData.totalVentas || 0);

            const elCantVentas = document.getElementById('caja-card-cantidad-ventas');
            if (elCantVentas) elCantVentas.textContent = resumenData.cantidadVentas || 0;

            const elEfectivo = document.getElementById('caja-card-efectivo');
            if (elEfectivo) elEfectivo.textContent = formatter.format(resumenData.totalEfectivo || 0);

            const elTarjeta = document.getElementById('caja-card-tarjeta');
            if (elTarjeta) elTarjeta.textContent = formatter.format(resumenData.totalTarjeta || 0);

            const elTransferencia = document.getElementById('caja-card-transferencia');
            if (elTransferencia) elTransferencia.textContent = formatter.format(resumenData.totalTransferencia || 0);

            // 3. Poblamos Tabla de Desglose (siempre mostramos los 3 métodos por defecto)
            const tbodyDesglose = document.getElementById('caja-tabla-desglose');
            if (tbodyDesglose) {
                tbodyDesglose.innerHTML = '';

                const metodosDefault = [
                    { nombre: 'Efectivo', iconoClass: 'fas fa-money-bill', spanClass: 'icon-efectivo' },
                    { nombre: 'Tarjeta', iconoClass: 'fas fa-credit-card', spanClass: 'icon-tarjeta' },
                    { nombre: 'Transferencia', iconoClass: 'fas fa-exchange-alt', spanClass: 'icon-transferencia' }
                ];

                // Crear mapa de datos reales del backend indexado por nombre normalizado
                const datosReales = {};
                if (resumenData.desgloseCobros && resumenData.desgloseCobros.length > 0) {
                    resumenData.desgloseCobros.forEach(cobro => {
                        const key = (cobro.metodoPago || '').toLowerCase();
                        datosReales[key] = cobro;
                    });
                }

                let totalOperacionesGlobal = 0;
                let totalGananciasGlobal = 0;

                metodosDefault.forEach(metodo => {
                    const key = metodo.nombre.toLowerCase();
                    const datoReal = datosReales[key] || null;
                    const operaciones = datoReal ? datoReal.cantidadOperaciones : 0;
                    const total = datoReal ? datoReal.totalIngresado : 0;

                    totalOperacionesGlobal += operaciones;
                    totalGananciasGlobal += total;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>
                            <div class="metodo-pago-label">
                                <div class="metodo-icon ${metodo.spanClass}">
                                    <i class="${metodo.iconoClass}"></i>
                                </div>
                                ${metodo.nombre}
                            </div>
                        </td>
                        <td style="text-align: center; font-weight: 600;">${operaciones}</td>
                        <td style="text-align: right; font-weight: 800;">${formatter.format(total)}</td>
                    `;
                    tbodyDesglose.appendChild(tr);
                });

                // Fila de TOTALES
                const trTotal = document.createElement('tr');
                trTotal.style.backgroundColor = '#f8fafc';
                trTotal.innerHTML = `
                    <td>
                        <div style="font-weight: 800; color: #1e293b; padding-left: 10px;">
                            TOTALES
                        </div>
                    </td>
                    <td style="text-align: center; font-weight: 800; color: #1e293b;">${totalOperacionesGlobal}</td>
                    <td style="text-align: right; font-weight: 900; color: #10b981; font-size: 15px;">${formatter.format(totalGananciasGlobal)}</td>
                `;
                tbodyDesglose.appendChild(trTotal);
            }

            // 4. Lógica de Fondo Fijo y Retiro
            const totalEfectivoTeorico = resumenData.saldoEsperado || ((resumenData.montoInicial || 0) + (resumenData.totalEfectivo || 0) + (resumenData.ingresosManuales || 0) - (resumenData.totalComprasEfectivo || 0) - (resumenData.egresosManuales || 0));

            // Popula Efvo Esperado en el sidebar derecho
            const labelEsperado = document.getElementById('caja-sidebar-efectivo-esperado');
            if (labelEsperado) labelEsperado.textContent = formatter.format(totalEfectivoTeorico).replace('$', '').trim();

            // Sugerencia para el monto físico
            if (!silentRefresh && inputMontoFinalFisico) {
                inputMontoFinalFisico.value = '';
            }
            // Sugerencia para dejar el monto inicial como fondo fijo para mañana
            if (!silentRefresh && inputFondoFijo) {
                inputFondoFijo.value = (resumenData.montoInicial || 0).toFixed(2);
            }

            // 5. Cargar Ingresos Recientes
            if (resumenData.fechaApertura) {
                cargarIngresosSesion(resumenData.fechaApertura);
            }

            // Cargar movimientos manuales del turno
            cargarMovimientosManualesTurno();

        } catch (e) {
            console.error("Error al obtener resumen de caja activa:", e);
        }
    }

    if (inputMontoInicial) {
        inputMontoInicial.addEventListener('input', (e) => {
            // Reutilizamos la misma logica de formateo local (asumiendo que function formatNumberInput existe más abajo, 
            // pero js hace hoisting o podemos inlinear la lógica para que no falle si se define después).
            const input = e.target;
            let valueStr = input.value.replace(/\D/g, '');
            if (valueStr === '') {
                input.value = '';
            } else {
                input.value = new Intl.NumberFormat('es-AR').format(parseInt(valueStr, 10));
            }

            const rawValueStr = input.value.replace(/\./g, '');
            const value = parseFloat(rawValueStr) || 0;
            if (Math.abs(value - saldoAnteriorGlobal) > 0.01) {
                warningText.style.display = 'block';
            } else {
                warningText.style.display = 'none';
            }
        });
    }

    const formatNumberInput = (e) => {
        const input = e.target;
        let valueStr = input.value.replace(/\D/g, '');
        if (valueStr === '') {
            input.value = '';
        } else {
            input.value = new Intl.NumberFormat('es-AR').format(parseInt(valueStr, 10));
        }
    };

    if (inputMontoFinalFisico) {
        inputMontoFinalFisico.addEventListener('input', (e) => {
            if (window.limpiarErroresInline) window.limpiarErroresInline('caja-monto-final');
            formatNumberInput(e);
        });
    }

    if (warningFinalText && inputMontoFinalFisico) {
        inputMontoFinalFisico.addEventListener('input', () => {
            const rawValueStr = inputMontoFinalFisico.value.replace(/\./g, '');
            const value = parseFloat(rawValueStr) || 0;
            const esperado = resumenCajaActual ? (resumenCajaActual.saldoEsperado || 0) : 0;

            if (Math.abs(value - esperado) > 0.01) {
                warningFinalText.style.display = 'block';
            } else {
                warningFinalText.style.display = 'none';
            }
        });
    }

    // Counter para observaciones
    const charCountSpan = document.getElementById('char-count-observaciones');
    if (inputObsCierre && charCountSpan) {
        inputObsCierre.addEventListener('input', () => {
            charCountSpan.textContent = inputObsCierre.value.length;
        });
    }

    // Character count para observaciones de apertura
    const inputObsApertura = document.getElementById('caja-observaciones');
    if (inputObsApertura) {
        const charCountAperturaEl = document.getElementById('char-count-obs-apertura');
        inputObsApertura.addEventListener('input', function () {
            if (charCountAperturaEl) {
                charCountAperturaEl.textContent = this.value.length;
            }
        });
    }

    // Bloquear caracteres no válidos en monto inicial (solo enteros positivos)
    if (inputMontoInicial) {
        inputMontoInicial.addEventListener('keydown', (e) => {
            if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                e.preventDefault();
            }
        });
    }

    if (btnAbrirCaja) {
        btnAbrirCaja.addEventListener('click', async () => {
            const rawValueStr = inputMontoInicial.value.replace(/\./g, '');
            const montoInicial = parseFloat(rawValueStr);
            if (isNaN(montoInicial) || montoInicial < 0) {
                showError('El monto es inválido.');
                return;
            }
            if (!Number.isInteger(montoInicial)) {
                showError('El monto debe ser un número entero, sin decimales.');
                return;
            }

            btnAbrirCaja.disabled = true;
            btnAbrirCaja.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
            errorMessage.style.display = 'none';

            try {
                const bodyReq = {
                    idUsuario: usuarioIdActual,
                    montoInicialReal: montoInicial,
                    observacionesApertura: inputObservaciones.value.trim()
                };

                const response = await fetch('/api/caja/abrir', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyReq)
                });

                if (response.ok) {
                    showSuccessBanner('Caja abierta exitosamente. Módulo de operaciones habilitado.');
                    cajaEstaAbierta = true;
                    if (inputObsApertura) {
                        inputObsApertura.value = '';
                        const charCountAperturaEl = document.getElementById('char-count-obs-apertura');
                        if (charCountAperturaEl) charCountAperturaEl.textContent = '0';
                    }
                    verificarEstadoCaja();
                } else {
                    const dataError = await response.json();
                    showError(dataError.error || 'Ocurrió un error al abrir la caja.');
                }
            } catch (error) {
                showError('Error de red al intentar registrar el Punto Cero de la caja.');
            } finally {
                btnAbrirCaja.disabled = false;
                btnAbrirCaja.innerHTML = '<i class="fas fa-lock-open" style="margin-right: 8px;"></i> Iniciar Operaciones';
            }
        });
    }

    // Intercepción de navegación de la SPA para bloquear if caja is closed
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a[data-section]');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const sectionId = this.getAttribute('data-section');
            const subsectionId = this.getAttribute('data-subsection');
            // Solo bloquear las subsecciones de registro (create), no las de listado (list)
            const esRegistro = (subsectionId === 'ventas-create' || subsectionId === 'compras-create');
            if ((sectionId === 'ventas' || sectionId === 'compras') && esRegistro && !cajaEstaAbierta) {
                e.preventDefault();
                e.stopPropagation();
                showErrorBanner('Debe realizar la Apertura de Caja antes de operar.');
                const cajaLink = document.querySelector('.sidebar-menu a[data-subsection="caja-operaciones"]');
                if (cajaLink) {
                    document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
                    cajaLink.classList.add('active');
                    // Abrir el submenú de Caja
                    const parentLi = cajaLink.closest('.has-submenu');
                    if (parentLi) parentLi.classList.add('open');
                    document.querySelectorAll('.spa-section').forEach(section => {
                        section.style.display = 'none';
                    });
                    document.getElementById('caja-section').style.display = 'block';
                    if (typeof window.showCajaSubsection === 'function') {
                        window.showCajaSubsection('caja-operaciones');
                    }
                    const sectionTitle = document.getElementById('section-title');
                    const sectionIcon = document.getElementById('section-icon');
                    if (sectionTitle) sectionTitle.textContent = "Operaciones";
                    if (sectionIcon) sectionIcon.className = "fas fa-cash-register";
                }
            }
        });
    });

    function showError(msg) {
        if (errorMessage) {
            errorMessage.textContent = msg;
            errorMessage.style.display = 'block';
        }
    }

    function showSuccessBanner(msg) {
        const banner = document.getElementById('success-banner') || crearBannerExito();
        document.getElementById('success-banner-text').textContent = msg;
        banner.style.backgroundColor = '#28a745';
        banner.classList.add('show');
        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => { banner.style.backgroundColor = ''; }, 300);
        }, 3500);
    }

    function showErrorBanner(msg) {
        const banner = document.getElementById('success-banner') || crearBannerExito();
        document.getElementById('success-banner-text').textContent = msg;
        const icon = banner.querySelector('i');
        if (icon) icon.className = 'fas fa-times-circle';
        banner.style.backgroundColor = '#dc3545';
        banner.classList.add('show');
        setTimeout(() => {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.style.backgroundColor = '';
                if (icon) icon.className = 'fas fa-check-circle';
            }, 300);
        }, 3500);
    }

    function crearBannerExito() {
        const banner = document.createElement('div');
        banner.id = 'success-banner';
        banner.className = 'success-banner';
        banner.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span id="success-banner-text"></span>
        `;
        document.body.appendChild(banner);
        return banner;
    }

    // Exponer función de error banner globalmente
    window.showErrorBannerCaja = showErrorBanner;

    // ==========================================
    // CIERRE Y GENERACIÓN DE PDF
    // ==========================================
    // ==========================================
    // MODAL DE RESUMEN Y CIERRE
    // ==========================================
    const modalResumen = document.getElementById('modal-resumen-cierre');
    const btnConfirmarCierre = document.getElementById('btn-confirmar-cierre');
    const btnCancelarCierre = document.getElementById('btn-cancelar-cierre');
    const btnPrevisualizarCierre = document.getElementById('btn-previsualizar-cierre');

    // Prevenir el submit por defecto del formulario al presionar Enter
    const formCierreCaja = document.getElementById('form-cierre-caja');
    if (formCierreCaja) {
        formCierreCaja.addEventListener('submit', (e) => {
            e.preventDefault();
            if (btnCerrarCaja) {
                btnCerrarCaja.click();
            }
        });
    }

    // Botón Abrir Modal de Cierre
    if (btnCerrarCaja) {
        btnCerrarCaja.addEventListener('click', async () => {
            // 1. Validaciones iniciales
            if (window.limpiarErroresInline) window.limpiarErroresInline('caja-monto-final');

            const rawMontoFisico = inputMontoFinalFisico.value.trim();
            if (rawMontoFisico === '') {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('caja-monto-final', 'El efectivo físico es obligatorio para cerrar la caja.');
                }
                return;
            }

            const fondoFijoVal = parseFloat(inputFondoFijo.value) || 0;
            const montoFisicoVal = parseFloat(rawMontoFisico.replace(/\./g, '')) || 0;

            if (isNaN(fondoFijoVal) || fondoFijoVal < 0) {
                if (panelErrorCierre) {
                    panelErrorCierre.textContent = 'Por favor ingresa un fondo fijo válido.';
                    panelErrorCierre.style.display = 'block';
                }
                return;
            }

            if (isNaN(montoFisicoVal) || montoFisicoVal < 0) {
                if (panelErrorCierre) {
                    panelErrorCierre.textContent = 'Por favor ingresa el "Efectivo Real (Físico)".';
                    panelErrorCierre.style.display = 'block';
                }
                return;
            }

            // 2. Traer datos FRESCOS del backend antes de abrir el modal
            try {
                const resumenRes = await fetch(`/api/caja/sesion-activa/${usuarioIdActual}`);
                if (resumenRes.ok) {
                    resumenCajaActual = await resumenRes.json();
                }
            } catch (e) {
                console.warn('No se pudieron refrescar datos de sesión:', e);
            }

            // 3. Población dinámica del Modal con datos reales
            const data = resumenCajaActual || {};
            const totalEfTeorico = data.saldoEsperado || ((data.montoInicial || 0) + (data.totalEfectivo || 0) + (data.ingresosManuales || 0) - (data.totalComprasEfectivo || 0) - (data.egresosManuales || 0));
            const diferencia = montoFisicoVal - totalEfTeorico;

            // Header - Responsable y Sesión
            const respNode = document.getElementById('modal-cierre-responsable');
            if (respNode) respNode.textContent = spanOperador ? spanOperador.textContent.split(' (')[0] : 'Usuario';
            const sesionNode = document.getElementById('modal-cierre-sesion');
            if (sesionNode) sesionNode.textContent = `Sesión #${data.idSesion || '---'}`;

            // Tiempos reales
            const horaApertura = data.fechaApertura ? new Date(data.fechaApertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
            const horaCierre = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            const vtEfNode = document.getElementById('modal-resumen-ventas-efectivo');
            if (vtEfNode) vtEfNode.textContent = `+${formatter.format((data.totalEfectivo || 0) + (data.ingresosManuales || 0))}`;
            const gaNode = document.getElementById('modal-resumen-gastos');
            if (gaNode) gaNode.textContent = `-${formatter.format((data.totalComprasEfectivo || 0) + (data.egresosManuales || 0))}`;
            const espNode = document.getElementById('modal-resumen-esperado');
            const apNode = document.getElementById('modal-resumen-apertura');
            if (apNode) apNode.textContent = horaApertura;
            const crNode = document.getElementById('modal-resumen-cierre-hora');
            if (crNode) crNode.textContent = horaCierre;

            // Resultado Arqueo (Ciego) - solo mostramos lo declarado
            const realNode = document.getElementById('modal-resumen-real');
            if (realNode) realNode.textContent = formatter.format(montoFisicoVal);

            // 4. Mostrar Modal
            if (modalResumen) {
                modalResumen.style.display = 'flex';
            } else {
                console.error("No se encontró el modal de cierre (modal-resumen-cierre)");
            }
            if (panelErrorCierre) panelErrorCierre.style.display = 'none';
        });
    }

    // Botón Cancelar del Modal
    if (btnCancelarCierre) {
        btnCancelarCierre.addEventListener('click', () => {
            modalResumen.style.display = 'none';
        });
    }

    // Botón Previsualizar del Modal
    if (btnPrevisualizarCierre) {
        btnPrevisualizarCierre.addEventListener('click', () => {
            const fondoFijoVal = parseFloat(inputFondoFijo.value) || 0;
            const montoFisicoVal = parseFloat(inputMontoFinalFisico.value.replace(/\./g, '')) || 0;
            generarCierrePDF(fondoFijoVal, montoFisicoVal);
        });
    }

    // Botón Confirmar del Modal (LA CIERRE REAL)
    if (btnConfirmarCierre) {
        btnConfirmarCierre.addEventListener('click', async () => {
            const fondoFijoValStr = inputFondoFijo.value;
            const montoFisicoVal = parseFloat(inputMontoFinalFisico.value.replace(/\./g, ''));
            const obsBase = inputObsCierre ? inputObsCierre.value.trim() : "";
            const observacionesCierre = `FF=${parseFloat(fondoFijoValStr).toFixed(2)}; Obs=${obsBase}`;

            const bodyReq = {
                idUsuario: usuarioIdActual,
                montoFinalReal: montoFisicoVal,
                observacionesCierre: observacionesCierre
            };

            btnConfirmarCierre.disabled = true;
            btnConfirmarCierre.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

            try {
                const response = await fetch('/api/caja/cerrar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyReq)
                });

                if (response.ok) {
                    if (modalResumen) modalResumen.style.display = 'none';
                    showSuccessBanner('Caja cerrada exitosamente. Sesión finalizada.');
                    cajaEstaAbierta = false;

                    // MOSTRAR MODAL POST-CIERRE
                    const modalPostCierre = document.getElementById('modal-post-cierre');
                    if (modalPostCierre && resumenCajaActual) {
                        const data = resumenCajaActual;

                        // Poblado de datos
                        const horaAp = data.fechaApertura ? new Date(data.fechaApertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                        const horaCr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                        document.getElementById('post-cierre-operador').textContent = window.usuarioNombreActual || 'Cajero';
                        document.getElementById('post-cierre-apertura').textContent = horaAp;
                        document.getElementById('post-cierre-hora').textContent = horaCr;

                        const inicial = data.montoInicial || 0;
                        const ventasEf = (data.totalEfectivo || 0) + (data.ingresosManuales || 0);
                        const comprasEf = (data.totalComprasEfectivo || 0) + (data.egresosManuales || 0);
                        const efTeorico = data.saldoEsperado || (inicial + ventasEf - comprasEf);

                        document.getElementById('post-cierre-inicial').textContent = formatter.format(inicial);
                        document.getElementById('post-cierre-ingresos-ef').textContent = '+' + formatter.format(ventasEf);
                        document.getElementById('post-cierre-gastos').textContent = '-' + formatter.format(comprasEf);
                        document.getElementById('post-cierre-efectivo-teorico').textContent = formatter.format(efTeorico);

                        document.getElementById('post-cierre-fisico-real').textContent = formatter.format(montoFisicoVal);
                        document.getElementById('post-cierre-esperado-repetido').textContent = formatter.format(efTeorico);

                        const diff = montoFisicoVal - efTeorico;
                        const diffLabel = document.getElementById('post-cierre-diferencia-label');
                        const diffMonto = document.getElementById('post-cierre-diferencia-monto');
                        const diffContainer = document.getElementById('post-cierre-diferencia-container');

                        if (Math.abs(diff) < 0.05) {
                            diffLabel.textContent = "CUADRE EXACTO";
                            diffMonto.textContent = "$0";
                            diffContainer.style.background = "#ecfdf5";
                            diffContainer.style.borderColor = "#a7f3d0";
                            diffLabel.style.color = "#059669";
                            diffMonto.style.color = "#059669";
                        } else if (diff < 0) {
                            diffLabel.textContent = "FALTANTE";
                            diffMonto.textContent = formatter.format(diff);
                            diffContainer.style.background = "#fef2f2";
                            diffContainer.style.borderColor = "#fecaca";
                            diffLabel.style.color = "#dc2626";
                            diffMonto.style.color = "#dc2626";
                        } else {
                            diffLabel.textContent = "SOBRANTE";
                            diffMonto.textContent = '+' + formatter.format(diff);
                            diffContainer.style.background = "#eff6ff";
                            diffContainer.style.borderColor = "#bfdbfe";
                            diffLabel.style.color = "#2563eb";
                            diffMonto.style.color = "#2563eb";
                        }

                        document.getElementById('post-cierre-facturacion-total').textContent = formatter.format(data.totalVentas || 0);
                        document.getElementById('post-cierre-tarjetas').textContent = formatter.format(data.totalTarjeta || 0);
                        document.getElementById('post-cierre-transferencias').textContent = formatter.format(data.totalTransferencia || 0);
                        document.getElementById('post-cierre-efectivo-operado').textContent = formatter.format(ventasEf);

                        // Mostrar Modal con animación
                        modalPostCierre.style.display = 'flex';
                        void modalPostCierre.offsetWidth; // trigger reflow
                        modalPostCierre.classList.add('post-cierre-visible');

                        // Lógica Botones
                        const btnImprimir = document.getElementById('btn-post-cierre-imprimir');
                        if (btnImprimir) {
                            btnImprimir.onclick = () => {
                                generarCierrePDF(parseFloat(fondoFijoValStr), montoFisicoVal);
                            };
                        }

                        const closePostCierre = () => {
                            modalPostCierre.classList.remove('post-cierre-visible');
                            setTimeout(() => {
                                modalPostCierre.style.display = 'none';
                                verificarEstadoCaja();
                            }, 400); // esperar transición
                        };

                        document.getElementById('btn-post-cierre-finalizar').onclick = closePostCierre;
                        const btnCloseCross = document.getElementById('btn-post-cierre-close');
                        if (btnCloseCross) btnCloseCross.onclick = closePostCierre;
                    } else {
                        verificarEstadoCaja();
                    }
                } else {
                    const err = await response.json();
                    throw new Error(err.error || 'Error al cerrar caja.');
                }
            } catch (error) {
                if (modalResumen) modalResumen.style.display = 'none';
                showErrorBanner(error.message);
            } finally {
                btnConfirmarCierre.disabled = false;
                btnConfirmarCierre.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar y Finalizar';
            }
        });
    }

    async function generarCierrePDF(fondoFijo, montoFisicoReal) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.warn("jsPDF no cargado. Saltando impresión de ticket.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: [80, 200] // Formato ticket de 80mm de ancho
        });

        const data = resumenCajaActual || {};

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("CIERRE DE CAJA X", 40, 10, { align: "center" });

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha: ${new Date().toLocaleString('es-AR')}`, 5, 20);

        let y = 30;
        doc.text("RESUMEN DE OPERACIONES", 40, y, { align: "center" });
        doc.line(5, y + 2, 75, y + 2);

        y += 8;
        doc.text(`Monto Apertura: ${formatter.format(data.montoInicial || 0)}`, 5, y);
        y += 6;
        doc.text(`Total Ventas: ${formatter.format(data.totalVentas || 0)}`, 5, y);
        y += 6;
        doc.text(`Cnt. Tickets: ${data.cantidadVentas || 0}`, 5, y);
        y += 6;
        doc.text(`Total Egresos (Comp): ${formatter.format(data.totalCompras || 0)}`, 5, y);

        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text("DESGLOSE POR PAGOS", 40, y, { align: "center" });
        doc.setFont("helvetica", "normal");

        if (data.desgloseCobros && data.desgloseCobros.length > 0) {
            const bodyDatos = data.desgloseCobros.map(p => [
                p.metodoPago,
                formatter.format(p.totalIngresado)
            ]);
            doc.autoTable({
                startY: y + 3,
                head: [['Medio', 'Suma']],
                body: bodyDatos,
                theme: 'plain',
                styles: { fontSize: 8, cellPadding: 1 },
                margin: { left: 5, right: 5 },
                tableWidth: 70
            });
            y = doc.lastAutoTable.finalY;
        } else {
            y += 6;
            doc.text("Sin movimientos", 5, y);
        }

        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text("ARQUEO DE FONDOS", 40, y, { align: "center" });
        doc.line(5, y + 2, 75, y + 2);
        doc.setFont("helvetica", "normal");

        y += 8;
        const totalEfTeorico = data.saldoEsperado || ((data.montoInicial || 0) + (data.totalEfectivo || 0) + (data.ingresosManuales || 0) - (data.totalComprasEfectivo || 0) - (data.egresosManuales || 0));
        doc.text(`Efectivo Esperado: ${formatter.format(totalEfTeorico)}`, 5, y);
        y += 6;
        doc.text(`Efectivo Físico Aud: ${formatter.format(montoFisicoReal)}`, 5, y);

        let diff = montoFisicoReal - totalEfTeorico;
        y += 6;
        if (Math.abs(diff) < 0.05) { // Tolerancia decimal
            doc.text(`Diferencia: EXACTO ($0.00)`, 5, y);
        } else if (diff < 0) {
            doc.text(`Diferencia: FALTANTE ${formatter.format(diff)}`, 5, y);
        } else {
            doc.text(`Diferencia: SOBRANTE ${formatter.format(diff)}`, 5, y);
        }

        y += 6;
        doc.text(`FONDO FIJO prox día: ${formatter.format(fondoFijo)}`, 5, y);

        const retiro = Math.max(0, totalEfTeorico - fondoFijo);
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.text(`RETIRO DE CAJA: ${formatter.format(retiro)}`, 5, y);

        y += 15;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("---------------------------------", 40, y, { align: "center" });
        y += 5;
        doc.text("Firma Responsable", 40, y, { align: "center" });

        doc.save(`CierreCaja_${new Date().toISOString().slice(0, 10)}.pdf`);
    }

    // ==========================================
    // CARGAR INGRESOS DE LA SESION
    // ==========================================
    async function cargarIngresosSesion(fechaApertura) {
        const listaIngresos = document.getElementById('caja-lista-ingresos');
        const filtroSelect = document.getElementById('caja-filtro-ingresos');
        if (!listaIngresos) return;

        try {
            listaIngresos.innerHTML = '<div style="text-align: center; padding: 25px; color: #94a3b8;"><i class="fas fa-spinner fa-spin"></i> Cargando ingresos...</div>';

            const response = await fetch('/api/ventas/all');
            if (!response.ok) throw new Error('Error obteniendo ventas');
            const ventas = await response.json();

            // Filtrar las ventas que sucedieron despues de la apertura de caja y que estén cobradas
            const fechaRef = new Date(fechaApertura).getTime();
            let ingresosSesion = ventas.filter(v => new Date(v.fecha).getTime() >= fechaRef && (!v.estado || v.estado === 'COBRADA'));

            // Ordenar de más reciente a más antigua
            ingresosSesion.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            // Funcion de renderizado
            function renderLista(data) {
                listaIngresos.innerHTML = '';
                if (data.length === 0) {
                    listaIngresos.innerHTML = '<div style="text-align: center; padding: 25px; color: #94a3b8; font-size: 13px;">No hay ingresos que coincidan con el filtro.</div>';
                    return;
                }

                data.forEach(venta => {
                    const item = document.createElement('div');
                    item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #f1f5f9; border-radius: 12px; background: white; transition: all 0.2s;';
                    item.onmouseover = () => item.style.borderColor = '#e2e8f0';
                    item.onmouseout = () => item.style.borderColor = '#f1f5f9';

                    let iconoClass = 'fas fa-money-bill';
                    let iconColor = '#10b981';
                    let iconBg = '#ecfdf5';

                    const mx = venta.metodoPago ? venta.metodoPago.toLowerCase() : '';
                    if (mx.includes('tarjeta')) {
                        iconoClass = 'fas fa-credit-card';
                        iconColor = '#6366f1';
                        iconBg = '#e0e7ff';
                    } else if (mx.includes('transferencia') || mx.includes('mp') || mx.includes('mercado')) {
                        iconoClass = 'fas fa-exchange-alt';
                        iconColor = '#f59e0b';
                        iconBg = '#fffbeb';
                    }

                    // Nombre del producto representativo
                    let nombreDetalle = 'Venta Varios';
                    if (venta.productos && venta.productos.length > 0) {
                        const firstProd = venta.productos[0];
                        nombreDetalle = firstProd.nombreProducto || firstProd.nombre || 'Producto';
                        if (venta.productos.length > 1) nombreDetalle += ` (+${venta.productos.length - 1})`;
                    }

                    const fechaVenta = new Date(venta.fecha);
                    const horaFormatted = fechaVenta.getHours().toString().padStart(2, '0') + ':' + fechaVenta.getMinutes().toString().padStart(2, '0') + ' hrs';

                    item.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: ${iconBg}; color: ${iconColor}; font-size: 16px;">
                                <i class="${iconoClass}"></i>
                            </div>
                            <div>
                                <h5 style="margin: 0 0 4px 0; font-size: 14px; color: #1e293b; font-weight: 700;">${nombreDetalle}</h5>
                                <p style="margin: 0; font-size: 12px; color: #64748b;">${horaFormatted} &bull; ${venta.metodoPago || 'Efectivo'}</p>
                            </div>
                        </div>
                        <div style="font-weight: 800; color: #0f172a; font-size: 15px;">
                            ${formatter.format(venta.total)}
                        </div>
                    `;
                    listaIngresos.appendChild(item);
                });
            }

            // Render Inicial
            renderLista(ingresosSesion);

            // Función combinada de filtrado (método de pago + búsqueda de texto)
            function aplicarFiltros() {
                const filtroEl = document.getElementById('caja-filtro-ingresos');
                const buscarEl = document.getElementById('caja-buscar-ingresos');
                const metodo = filtroEl ? filtroEl.value : 'Todos';
                const texto = buscarEl ? buscarEl.value.toLowerCase().trim() : '';

                let resultado = ingresosSesion;

                // Filtro por método de pago
                if (metodo !== 'Todos') {
                    resultado = resultado.filter(v => v.metodoPago && v.metodoPago.toLowerCase().includes(metodo.toLowerCase()));
                }

                // Filtro por texto (producto, monto, método)
                if (texto) {
                    resultado = resultado.filter(v => {
                        const nombreProd = (v.productos && v.productos.length > 0)
                            ? (v.productos[0].nombreProducto || v.productos[0].nombre || '')
                            : '';
                        const metodoPago = v.metodoPago || '';
                        const monto = v.total ? v.total.toString() : '';
                        const searchable = (nombreProd + ' ' + metodoPago + ' ' + monto).toLowerCase();
                        return searchable.includes(texto);
                    });
                }

                renderLista(resultado);
            }

            // Setup Filtro por método de pago
            if (filtroSelect && filtroSelect.parentNode) {
                const newFiltro = filtroSelect.cloneNode(true);
                filtroSelect.parentNode.replaceChild(newFiltro, filtroSelect);
                newFiltro.addEventListener('change', aplicarFiltros);
            }

            // Setup Búsqueda por texto
            const buscarInput = document.getElementById('caja-buscar-ingresos');
            if (buscarInput) {
                buscarInput.addEventListener('input', aplicarFiltros);
            }

            // Setup Botón Limpiar
            const btnLimpiar = document.getElementById('caja-limpiar-filtros');
            if (btnLimpiar) {
                btnLimpiar.addEventListener('click', () => {
                    const filtroEl = document.getElementById('caja-filtro-ingresos');
                    const buscarEl = document.getElementById('caja-buscar-ingresos');
                    if (filtroEl) filtroEl.value = 'Todos';
                    if (buscarEl) buscarEl.value = '';
                    renderLista(ingresosSesion);
                });
            }

        } catch (e) {
            console.error("Error cargando ingresos", e);
            listaIngresos.innerHTML = '<div style="text-align: center; padding: 25px; color: #ef4444; font-size: 13px;">Error cargando ingresos.</div>';
        }
    }

    verificarEstadoCaja();
    window.cargarDatosCaja = verificarEstadoCaja;
    window.isCajaAbierta = () => cajaEstaAbierta;

    // Polling de 10 segundos para actualizar la caja si la vista está activa y no se está cerrando
    setInterval(() => {
        const modalResumen = document.getElementById('modal-resumen-cierre');
        if (modalResumen && modalResumen.style.display === 'flex') return;
        
        const sectionCaja = document.getElementById('caja-section');
        if (sectionCaja && sectionCaja.style.display !== 'none') {
            verificarEstadoCaja(true);
        }
    }, 10000);

    // ==========================================
    // SUBSECCIONES: Operaciones / Historial
    // ==========================================
    const cajaOperacionesContainer = document.getElementById('caja-operaciones-container');
    const cajaHistorialContainer = document.getElementById('caja-historial-container');

    const historialBusqueda = document.getElementById('historial-busqueda');
    const historialFechaDesde = document.getElementById('historial-fecha-desde');
    const historialFechaHasta = document.getElementById('historial-fecha-hasta');
    const historialFiltroOperador = document.getElementById('historial-filtro-operador');
    const historialFiltroEstado = document.getElementById('historial-filtro-estado');
    const btnHistorialDiferencias = document.getElementById('btn-historial-diferencias');
    const btnHistorialLimpiar = document.getElementById('btn-historial-limpiar');
    const historialBtnBuscar = document.getElementById('historial-btn-buscar');

    let historialCurrentPage = 0;
    let historialTotalPages = 1;
    let historialLoaded = false;
    let todasLasSesiones = [];

    window.showCajaSubsection = function (subsectionId) {
        if (subsectionId === 'caja-operaciones') {
            if (cajaOperacionesContainer) cajaOperacionesContainer.style.display = 'block';
            if (cajaHistorialContainer) cajaHistorialContainer.style.display = 'none';
            verificarEstadoCaja();
        } else if (subsectionId === 'caja-historial') {
            if (cajaOperacionesContainer) cajaOperacionesContainer.style.display = 'none';
            if (cajaHistorialContainer) cajaHistorialContainer.style.display = 'block';
            cargarHistorialSesiones(0);
        }
    };

    // ==========================================
    // HISTORIAL DE SESIONES
    // ==========================================

    function normH(str) {
        return (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    }

    function fmtFecha(fechaStr) {
        if (!fechaStr) return '-';
        const d = new Date(fechaStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function renderHistorialRows(sesiones, offset) {
        const tbody = document.getElementById('tabla-historial-caja-body');
        if (!tbody) return;

        if (!sesiones.length) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">No hay sesiones registradas</td></tr>';
            return;
        }

        function fmtFechaSoloFecha(fechaStr) {
            if (!fechaStr) return '-';
            const d = new Date(fechaStr);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        }

        function fmtHoraSoloHora(fechaStr) {
            if (!fechaStr) return '-';
            const d = new Date(fechaStr);
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} hs`;
        }

        tbody.innerHTML = sesiones.map((sesion, index) => {
            const estadoBadge = sesion.estado === 'ABIERTA'
                ? '<span style="background: #dcfce7; color: #16a34a; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;">ABIERTA</span>'
                : '<span style="background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;">CERRADA</span>';

            let difHtml = '-';
            if (sesion.estado === 'CERRADA') {
                if (sesion.diferencia !== null && sesion.diferencia !== undefined) {
                    if (Math.abs(sesion.diferencia) < 0.01) {
                        difHtml = '<span style="display: inline-block; background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">$0,00</span>';
                    } else if (sesion.diferencia > 0) {
                        difHtml = `<span style="display: inline-block; background: #fffbeb; color: #d97706; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">+${formatter.format(sesion.diferencia)}</span>`;
                    } else {
                        difHtml = `<span style="display: inline-block; background: #fef2f2; color: #dc3545; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;">${formatter.format(sesion.diferencia)}</span>`;
                    }
                }
            }

            // Merged Turno Column
            let fechaAperturaVal = fmtFechaSoloFecha(sesion.fechaApertura);
            let horaAperturaVal = fmtHoraSoloHora(sesion.fechaApertura);
            let horaCierreVal = sesion.fechaCierre ? fmtHoraSoloHora(sesion.fechaCierre) : 'En curso';
            
            let duracionBadge = '';
            if (sesion.estado === 'CERRADA' && sesion.duracion) {
                duracionBadge = `<span style="display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; padding: 2px 6px; background: #e0e7ff; color: #4f46e5; border-radius: 4px; font-size: 10px; font-weight: 600;">
                    <i class="far fa-clock"></i> ${sesion.duracion}
                </span>`;
            }
            
            let turnoDetalleHtml = `
                <div style="font-weight: 600; color: #1e293b;">${fechaAperturaVal}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                    <span>${horaAperturaVal} - ${horaCierreVal}</span>
                    ${duracionBadge}
                </div>
            `;

            // Notes column
            const obsAp = (sesion.observacionesApertura || '').trim();
            const obsMatch = (sesion.observacionesCierre || '').match(/Obs=(.+)$/);
            const obsCi = obsMatch ? obsMatch[1].trim() : '';
            
            let notasHtml = '';
            if (obsAp || obsCi) {
                let tooltipText = '';
                if (obsAp) tooltipText += `<div style="margin-bottom: 6px;"><strong style="color: #fbbf24;"><i class="fas fa-lock-open"></i> Apertura:</strong> ${obsAp}</div>`;
                if (obsCi) tooltipText += `<div><strong style="color: #f87171;"><i class="fas fa-lock"></i> Cierre:</strong> ${obsCi}</div>`;
                
                notasHtml = `
                    <div class="custom-tooltip" style="cursor: help;">
                        <i class="fas fa-sticky-note" style="color: #334155; font-size: 16px; transition: all 0.2s;" 
                           onmouseover="this.style.color='#d97706'; this.style.transform='scale(1.1)';" 
                           onmouseout="this.style.color='#334155'; this.style.transform='scale(1)';"></i>
                        <div class="tooltip-text">${tooltipText}</div>
                    </div>
                `;
            } else {
                notasHtml = '<span style="color: #cbd5e1;">-</span>';
            }

            return `
                <tr>
                    <td style="font-weight: 600; color: #64748b;">#${sesion.idSesion}</td>
                    <td>${turnoDetalleHtml}</td>
                    <td style="font-weight: 700; text-align: right; color: #0f172a;">${formatter.format(sesion.totalFacturado || 0)}</td>
                    <td style="text-align: right;">
                        <span style="font-weight: 600; color: #1e293b;">${sesion.montoFinalReal != null ? formatter.format(sesion.montoFinalReal) : '-'}</span>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Inició: ${sesion.montoInicial != null ? formatter.format(sesion.montoInicial) : '-'}</div>
                    </td>
                    <td style="text-align: right;">${difHtml}</td>
                    <td style="text-align: center;">${notasHtml}</td>
                    <td style="text-align: center;">${estadoBadge}</td>
                    <td style="text-align: center;">-</td>
                </tr>
            `;
        }).join('');
    }

    async function filtrarYRenderHistorial(page) {
        const tbody = document.getElementById('tabla-historial-caja-body');
        if (tbody) {
            tbody.classList.add('loading');
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const texto = normH(historialBusqueda?.value || '');
        const PAGE_SIZE = 10;

        const filtradas = texto
            ? todasLasSesiones.filter(s => {
                const rawCierre = s.observacionesCierre || '';
                const obsMatch = rawCierre.match(/Obs=(.+)$/);
                const campos = normH([s.estado, s.observacionesApertura, obsMatch ? obsMatch[1] : ''].join(' '));
                return campos.includes(texto);
            })
            : todasLasSesiones;

        historialTotalPages = Math.max(Math.ceil(filtradas.length / PAGE_SIZE), 1);
        historialCurrentPage = Math.min(page, historialTotalPages - 1);

        const pageInfo = document.getElementById('historial-caja-page-info');
        if (pageInfo) pageInfo.textContent = `Página ${historialCurrentPage + 1} de ${historialTotalPages}`;
        const prevBtn = document.getElementById('historial-caja-prev');
        const nextBtn = document.getElementById('historial-caja-next');
        if (prevBtn) prevBtn.disabled = historialCurrentPage === 0;
        if (nextBtn) nextBtn.disabled = historialCurrentPage + 1 >= historialTotalPages;

        const offset = historialCurrentPage * PAGE_SIZE;
        renderHistorialRows(filtradas.slice(offset, offset + PAGE_SIZE), offset);

        requestAnimationFrame(() => { if (tbody) tbody.classList.remove('loading'); });
    }

    async function cargarHistorialSesiones(page) {
        const tbody = document.getElementById('tabla-historial-caja-body');
        if (!tbody) return;

        tbody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const params = new URLSearchParams({ page: 0, size: 1000, sort: 'fechaApertura,desc' });
            const fechaDesde = historialFechaDesde?.value;
            const fechaHasta = historialFechaHasta?.value;
            const estado = historialFiltroEstado?.value;
            const soloDiferencias = btnHistorialDiferencias?.dataset.active === 'true';

            if (fechaDesde) params.append('fechaDesde', fechaDesde + 'T00:00:00');
            if (fechaHasta) params.append('fechaHasta', fechaHasta + 'T23:59:59');
            if (estado) params.append('estado', estado);

            // FILTRO ESTRICTO POR USUARIO ACTUAL
            if (usuarioIdActual) params.append('operadorId', usuarioIdActual);

            if (soloDiferencias) params.append('soloDiferencias', 'true');

            const response = await fetch(`/api/caja/historial?${params}`);
            if (!response.ok) throw new Error('Error al obtener historial');

            const data = await response.json();
            todasLasSesiones = data.content || [];

            filtrarYRenderHistorial(page);
            requestAnimationFrame(() => tbody.classList.remove('loading'));

        } catch (error) {
            console.error('Error cargando historial de sesiones:', error);
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #dc3545;">Error al cargar historial</td></tr>';
            requestAnimationFrame(() => tbody.classList.remove('loading'));
        }
    }

    const historialFiltroError = document.getElementById('historial-caja-filtro-error');

    function mostrarErrorHistorial(msg) {
        if (!historialFiltroError) return;
        historialFiltroError.textContent = msg;
        historialFiltroError.style.display = 'block';
        setTimeout(() => { historialFiltroError.style.display = 'none'; }, 4000);
    }

    function validarFechasHistorial() {
        const desde = historialFechaDesde?.value;
        const hasta = historialFechaHasta?.value;
        if (desde && hasta && desde > hasta) {
            mostrarErrorHistorial('La fecha de inicio no puede ser mayor que la fecha de fin');
            return false;
        }
        if (historialFiltroError) historialFiltroError.style.display = 'none';
        return true;
    }

    // Búsqueda en tiempo real (sin llamada al servidor)
    if (historialBusqueda) {
        historialBusqueda.addEventListener('input', () => filtrarYRenderHistorial(0));
    }

    // Lupa: aplica filtros de fecha (requiere fetch al servidor)
    if (historialBtnBuscar) {
        historialBtnBuscar.addEventListener('click', () => {
            if (validarFechasHistorial()) cargarHistorialSesiones(0);
        });
    }

    if (btnHistorialDiferencias) {
        btnHistorialDiferencias.addEventListener('click', () => {
            const isActive = btnHistorialDiferencias.dataset.active === 'true';
            btnHistorialDiferencias.dataset.active = String(!isActive);
            if (!isActive) {
                btnHistorialDiferencias.style.background = '#007bff';
                btnHistorialDiferencias.style.color = '#fff';
                btnHistorialDiferencias.style.borderColor = '#007bff';
            } else {
                btnHistorialDiferencias.style.background = 'white';
                btnHistorialDiferencias.style.color = '#495057';
                btnHistorialDiferencias.style.borderColor = '#ddd';
            }
            cargarHistorialSesiones(0);
        });
    }

    if (btnHistorialLimpiar) {
        btnHistorialLimpiar.addEventListener('click', () => {
            if (historialBusqueda) historialBusqueda.value = '';
            if (historialFechaDesde) historialFechaDesde.value = '';
            if (historialFechaHasta) historialFechaHasta.value = '';
            if (historialFiltroEstado) historialFiltroEstado.value = '';
            if (historialFiltroError) historialFiltroError.style.display = 'none';
            if (btnHistorialDiferencias) {
                btnHistorialDiferencias.dataset.active = 'false';
                btnHistorialDiferencias.style.background = 'white';
                btnHistorialDiferencias.style.color = '#495057';
                btnHistorialDiferencias.style.borderColor = '#ddd';
            }
            cargarHistorialSesiones(0);
        });
    }

    if (historialFiltroEstado) {
        historialFiltroEstado.addEventListener('change', () => cargarHistorialSesiones(0));
    }

    // Paginación local (sin re-fetch)
    const histPrev = document.getElementById('historial-caja-prev');
    const histNext = document.getElementById('historial-caja-next');

    if (histPrev) {
        histPrev.addEventListener('click', () => {
            if (historialCurrentPage > 0) filtrarYRenderHistorial(historialCurrentPage - 1);
        });
    }
    if (histNext) {
        histNext.addEventListener('click', () => {
            if (historialCurrentPage + 1 < historialTotalPages) filtrarYRenderHistorial(historialCurrentPage + 1);
        });
    }

    // ==========================================
    // ESCUCHA EVENTOS DE VENTAS Y COMPRAS PARA ACTUALIZAR CAJA
    // ==========================================
    document.addEventListener('ventaRegistrada', function () {
        if (typeof verificarEstadoCaja === 'function') {
            verificarEstadoCaja();
        }
    });

    document.addEventListener('comprasActualizadas', function () {
        if (typeof verificarEstadoCaja === 'function') {
            verificarEstadoCaja();
        }
    });

    // ==========================================
    // LÓGICA DE COBRANZA DE VENTAS (POS) - PREMIUM MULTI-PAGO
    // ==========================================
    let ventaSeleccionada = null;
    let metodosPagoList = [];
    let cobrosCajero = [];

    // Renderizar la lista de cobros agregados y actualizar saldos
    function renderCobrosCajero() {
        const contenedorPagos = document.getElementById('pos-contenedor-pagos-agregados');
        const listaEl = document.getElementById('pos-lista-cobros');
        const pendienteEl = document.getElementById('pos-saldo-pendiente');
        const vueltoText = document.getElementById('pos-vuelto-display');
        const vueltoContainer = document.getElementById('pos-vuelto-container');

        if (!ventaSeleccionada) return;

        const totalVenta = ventaSeleccionada.total || 0;
        const totalAportado = cobrosCajero.reduce((acc, c) => acc + (c.monto || 0), 0);
        const saldoPendiente = Math.max(0, totalVenta - totalAportado);

        // Actualizar etiqueta de Saldo Pendiente
        if (pendienteEl) {
            if (saldoPendiente > 0.01) {
                pendienteEl.textContent = formatter.format(saldoPendiente);
                pendienteEl.classList.remove('completado');
            } else {
                pendienteEl.textContent = '$0 - COMPLETADO';
                pendienteEl.classList.add('completado');
            }
        }

        // Mostrar / Ocultar el bloque de Pagos Cargados (solo si hay cobros en el array)
        if (contenedorPagos) {
            if (cobrosCajero.length > 0) {
                contenedorPagos.style.display = 'block';
            } else {
                contenedorPagos.style.display = 'none';
            }
        }

        // Renderizar lista de pagos cargados en formato Light Tag Premium
        if (listaEl && cobrosCajero.length > 0) {
            listaEl.innerHTML = cobrosCajero.map((cobro, idx) => `
                <div class="pos-payment-tag-light">
                    <div>
                        <strong style="color: #0f172a;">${cobro.nombreMetodo}</strong>
                        ${cobro.vuelto > 0 ? `<span style="font-size: 11px; color: #059669; margin-left: 6px;">(Vuelto: ${formatter.format(cobro.vuelto)})</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 800; color: #0f172a;">${formatter.format(cobro.monto)}</span>
                        <button type="button" data-idx="${idx}" class="btn-eliminar-cobro-pos btn-remove-cobro" title="Eliminar pago">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `).join('');

            // Event listener para botones de eliminar
            listaEl.querySelectorAll('.btn-eliminar-cobro-pos').forEach(btn => {
                btn.addEventListener('click', function () {
                    const index = parseInt(this.dataset.idx);
                    cobrosCajero.splice(index, 1);
                    renderCobrosCajero();
                });
            });
        }

        // Calcular vuelto acumulado en el array + vuelto en tiempo real del input (si el método es Efectivo)
        let vueltoTotal = 0;
        cobrosCajero.forEach(c => {
            if (c.vuelto) vueltoTotal += c.vuelto;
        });

        const selectMetodo = document.getElementById('pos-metodo-pago');
        const inputRecibido = document.getElementById('pos-monto-recibido');
        if (selectMetodo && inputRecibido && saldoPendiente > 0.01) {
            const nombreMetodo = (selectMetodo.options[selectMetodo.selectedIndex]?.text || '').toLowerCase();
            if (nombreMetodo.includes('efectivo')) {
                const raw = inputRecibido.value.replace(/\D/g, '');
                const montoIngresado = parseFloat(raw) || 0;
                if (montoIngresado > saldoPendiente) {
                    vueltoTotal += (montoIngresado - saldoPendiente);
                }
            }
        }

        // Mostrar / Ocultar tarjeta de Vuelto (solo se muestra si vueltoTotal > 0)
        if (vueltoText && vueltoContainer) {
            if (vueltoTotal > 0.01) {
                vueltoContainer.style.display = 'flex';
                vueltoText.textContent = formatter.format(vueltoTotal);
            } else {
                vueltoContainer.style.display = 'none';
                vueltoText.textContent = '$0';
            }
        }
    }

    // Agregar un pago al array de cobros
    function agregarPagoCajero() {
        const errorMsg = document.getElementById('pos-error-message');
        if (errorMsg) errorMsg.style.display = 'none';

        if (!ventaSeleccionada) return;

        const selectMetodo = document.getElementById('pos-metodo-pago');
        const inputRecibido = document.getElementById('pos-monto-recibido');

        const idMetodo = selectMetodo?.value;
        const nombreMetodo = selectMetodo ? selectMetodo.options[selectMetodo.selectedIndex]?.text || '' : '';
        if (!idMetodo) {
            showErrorPOS('Debe seleccionar un método de pago.');
            return;
        }

        const raw = inputRecibido ? inputRecibido.value.replace(/\D/g, '') : '';
        let montoIngresado = parseFloat(raw);
        if (isNaN(montoIngresado) || montoIngresado <= 0) {
            showErrorPOS('Debe ingresar un monto válido.');
            return;
        }

        const totalVenta = ventaSeleccionada.total || 0;
        const totalAportadoAct = cobrosCajero.reduce((acc, c) => acc + (c.monto || 0), 0);
        const saldoPendienteActual = Math.max(0, totalVenta - totalAportadoAct);

        if (saldoPendienteActual <= 0.01) {
            showErrorPOS('El total de la venta ya ha sido cubierto por los pagos agregados.');
            return;
        }

        const nombreMetodoLower = nombreMetodo.toLowerCase();
        const esEfectivo = nombreMetodoLower.includes('efectivo');

        let tipoTarjeta = null;
        if (nombreMetodoLower.includes('debito') || nombreMetodoLower.includes('débito')) {
            tipoTarjeta = 'Débito';
        } else if (nombreMetodoLower.includes('credito') || nombreMetodoLower.includes('crédito')) {
            tipoTarjeta = 'Crédito';
        } else if (nombreMetodoLower.includes('tarjeta')) {
            tipoTarjeta = 'Débito';
        }

        let montoAplicado = montoIngresado;
        let vueltoCalculado = 0;

        if (esEfectivo) {
            if (montoIngresado > saldoPendienteActual) {
                vueltoCalculado = montoIngresado - saldoPendienteActual;
                montoAplicado = saldoPendienteActual;
            }
        } else {
            if (montoIngresado > saldoPendienteActual + 0.05) {
                showErrorPOS(`El monto ingresado para este método supera el saldo pendiente de ${formatter.format(saldoPendienteActual)}.`);
                return;
            }
        }

        cobrosCajero.push({
            idMetodoPago: parseInt(idMetodo),
            nombreMetodo: nombreMetodo,
            tipoTarjeta: tipoTarjeta,
            monto: montoAplicado,
            montoPagado: montoIngresado,
            vuelto: vueltoCalculado
        });

        if (inputRecibido) inputRecibido.value = '';
        if (selectMetodo) {
            selectMetodo.value = '';
            selectMetodo.dispatchEvent(new Event('change'));
        }
        renderCobrosCajero();
    }

    // Configurar listener para botón agregar pago
    const btnAgregarPago = document.getElementById('btn-pos-agregar-pago');
    if (btnAgregarPago) {
        btnAgregarPago.addEventListener('click', agregarPagoCajero);
    }

    // Cargar métodos de pago activos en el selector del POS
    async function loadMetodosPagoActivos() {
        const select = document.getElementById('pos-metodo-pago');
        if (!select) return;
        try {
            const res = await fetch('/api/metodos-pago/activos');
            if (!res.ok) throw new Error('Error al cargar métodos de pago');
            metodosPagoList = await res.json();
            
            select.innerHTML = '<option value="">Seleccionar método</option>';
            metodosPagoList.forEach(m => {
                if (!m.nombre.toLowerCase().includes('caja') && !m.nombre.toLowerCase().includes('aporte externo')) {
                    const opt = document.createElement('option');
                    opt.value = m.idMetodoPago;
                    opt.textContent = m.nombre;
                    opt.dataset.nombre = m.nombre.toLowerCase();
                    select.appendChild(opt);
                }
            });
        } catch (e) {
            console.error('Error cargando métodos de pago:', e);
        }
    }

    // Cargar ventas pendientes desde el backend
    async function loadVentasPendientes(silent = false) {
        const lista = document.getElementById('cajero-lista-pendientes');
        const countBadge = document.getElementById('cajero-pendientes-count');
        const container = document.getElementById('cajero-ventas-container');
        if (!lista) return;

        // Verificar si la caja está abierta
        const overlayExistente = document.getElementById('pos-caja-cerrada-overlay');
        if (!cajaEstaAbierta) {
            if (container && !overlayExistente) {
                const overlay = document.createElement('div');
                overlay.id = 'pos-caja-cerrada-overlay';
                overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 100; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); background-color: rgba(255, 255, 255, 0.4); display: flex; align-items: center; justify-content: center; border-radius: 16px;';
                overlay.innerHTML = `
                    <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; max-width: 450px; border: 1px solid rgba(0,0,0,0.05);">
                        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);">
                            <i class="fas fa-lock" style="font-size: 32px; color: white;"></i>
                        </div>
                        <h3 style="margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #1e293b;">Caja Cerrada</h3>
                        <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                            Debes abrir la caja desde la sección de <strong>Caja</strong> antes de poder cobrar órdenes de venta.
                        </p>
                    </div>
                `;
                container.appendChild(overlay);
            }
            if (countBadge) countBadge.textContent = '0 Órdenes';
            lista.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px 20px;">Caja cerrada.</div>';
            return;
        } else {
            if (overlayExistente) overlayExistente.remove();
        }

        try {
            if (!silent) {
                lista.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px 20px;"><i class="fas fa-spinner fa-spin" style="font-size: 20px; margin-bottom: 8px;"></i><p style="margin: 0; font-size: 13px;">Buscando órdenes...</p></div>';
            }
            const res = await fetch('/api/ventas/pendientes', { cache: 'no-store' });
            if (!res.ok) throw new Error('Error al cargar pendientes');
            const pendientes = await res.json();
            
            if (countBadge) countBadge.textContent = `${pendientes.length} Órdenes`;

            if (pendientes.length === 0) {
                lista.innerHTML = `
                    <div style="text-align: center; padding: 50px 20px; color: #64748b; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;">
                        <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: #f0fdf4; border-radius: 50%; box-shadow: 0 8px 20px rgba(22, 163, 74, 0.06); animation: pulse 2s infinite;">
                            <i class="fas fa-check" style="font-size: 24px; color: #16a34a; z-index: 2;"></i>
                        </div>
                        <div>
                            <h5 style="margin: 0 0 4px; font-weight: 800; color: #0f172a; font-size: 14px;">¡Cola de espera vacía!</h5>
                            <p style="margin: 0; font-size: 12px; color: #64748b; max-width: 200px; line-height: 1.5;">No hay órdenes pendientes de cobro en este momento.</p>
                        </div>
                    </div>
                `;
                return;
            }

            lista.innerHTML = '';
            pendientes.forEach(venta => {
                const date = new Date(venta.fecha);
                const timeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0') + ' hs';
                
                const card = document.createElement('div');
                card.className = `pos-order-card ${ventaSeleccionada && ventaSeleccionada.idVenta === venta.idVenta ? 'selected' : ''}`;

                const metodoSugerido = venta.metodoPago || 'Efectivo';
                let methodBadgeBg = '#f3f4f6', methodBadgeColor = '#374151';
                if (metodoSugerido.toLowerCase().includes('efectivo')) {
                    methodBadgeBg = '#dcfce7'; methodBadgeColor = '#15803d';
                } else if (metodoSugerido.toLowerCase().includes('tarjeta')) {
                    methodBadgeBg = '#e0e7ff'; methodBadgeColor = '#4338ca';
                } else {
                    methodBadgeBg = '#fffbeb'; methodBadgeColor = '#b45309';
                }

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="color: #0f172a; font-size: 14px;">Orden #${venta.idVenta}</strong>
                            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${timeStr} &bull; Vendedor: ${venta.nombreVendedor || '-'}</div>
                        </div>
                        <span style="font-size: 11px; font-weight: 700; background: ${methodBadgeBg}; color: ${methodBadgeColor}; padding: 2px 8px; border-radius: 20px;">${metodoSugerido}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 8px; border-top: 1px dashed #f1f5f9;">
                        <span style="font-size: 12px; color: #475569;">Cliente: <strong>${venta.nombreCliente || 'N/A'}</strong></span>
                        <strong class="pos-card-price">${formatter.format(venta.total)}</strong>
                    </div>
                `;

                card.addEventListener('click', () => seleccionarVenta(venta));
                lista.appendChild(card);
            });

        } catch (e) {
            console.error('Error cargando ventas pendientes:', e);
            lista.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 40px 20px;">Error al conectar con la base de datos.</div>';
        }
    }

    // Seleccionar una venta de la lista
    function seleccionarVenta(venta) {
        ventaSeleccionada = venta;
        cobrosCajero = [];
        
        // Cargar datos en el panel POS
        document.getElementById('pos-orden-id').textContent = `#${venta.idVenta}`;
        document.getElementById('pos-orden-cliente').textContent = venta.nombreCliente || 'Cliente N/A';
        document.getElementById('pos-orden-vendedor').textContent = venta.nombreVendedor || '-';
        document.getElementById('pos-total-display').textContent = formatter.format(venta.total);
        
        // Mostrar descuento si aplica
        const descDiv = document.getElementById('pos-descuento-detalle');
        const descMonto = document.getElementById('pos-descuento-monto');
        if (venta.descuentoMonto && venta.descuentoMonto > 0) {
            descDiv.style.display = 'block';
            descMonto.textContent = `-${formatter.format(venta.descuentoMonto)}`;
        } else {
            descDiv.style.display = 'none';
        }

        // Renderizar tabla de productos
        const tbody = document.getElementById('pos-productos-body');
        if (tbody) {
            tbody.innerHTML = '';
            if (venta.productos && venta.productos.length > 0) {
                venta.productos.forEach(p => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${p.nombreProducto || p.nombre || 'Producto'}</td>
                        <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; font-weight: bold; color: #475569;">${p.cantidad}</td>
                        <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #475569;">${formatter.format(p.precioUnitario)}</td>
                        <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #1e293b;">${formatter.format(p.precioUnitario * p.cantidad)}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        }

        // Seleccionar método de pago equivalente por defecto
        const selectMetodo = document.getElementById('pos-metodo-pago');
        if (selectMetodo) {
            selectMetodo.value = '';
            
            const cleanStr = str => {
                if (!str) return '';
                return str.toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .trim();
            };

            const targetMethod = cleanStr(venta.metodoPago || 'efectivo');

            for (let i = 0; i < selectMetodo.options.length; i++) {
                const opt = selectMetodo.options[i];
                const optText = cleanStr(opt.text || opt.textContent);
                
                if (optText.includes(targetMethod) || targetMethod.includes(optText)) {
                    selectMetodo.value = opt.value;
                    break;
                }
            }
            selectMetodo.dispatchEvent(new Event('change'));
        }

        // Resetear campos
        const inputRecibido = document.getElementById('pos-monto-recibido');
        if (inputRecibido) inputRecibido.value = '';
        document.getElementById('pos-error-message').style.display = 'none';
        
        // Renderizar cobros y estado financiero
        renderCobrosCajero();

        // Alternar paneles
        document.getElementById('pos-vacio-state').style.display = 'none';
        document.getElementById('pos-activo-panel').style.display = 'flex';

        // Re-render list to highlight selected card
        loadVentasPendientes();
    }

    // Resetear POS a vacío
    function deseleccionarVenta() {
        ventaSeleccionada = null;
        cobrosCajero = [];
        document.getElementById('pos-activo-panel').style.display = 'none';
        document.getElementById('pos-vacio-state').style.display = 'flex';
        loadVentasPendientes();
    }

    // Escuchar cambios de método de pago en el POS
    const selectMetodo = document.getElementById('pos-metodo-pago');
    if (selectMetodo) {
        selectMetodo.addEventListener('change', function () {
            const nombre = (this.options[this.selectedIndex]?.text || this.options[this.selectedIndex]?.textContent || '').toLowerCase();
            const esEfectivo = nombre.includes('efectivo');
            
            const efPanel = document.getElementById('pos-efectivo-panel');
            if (efPanel) efPanel.style.display = esEfectivo ? 'flex' : 'none';
            renderCobrosCajero();
        });
    }

    // Input change listener for money format and real-time change calculation
    const posMontoRecibido = document.getElementById('pos-monto-recibido');
    if (posMontoRecibido) {
        posMontoRecibido.addEventListener('input', function () {
            let raw = this.value.replace(/[^0-9]/g, '');
            if (raw === '') {
                this.value = '';
                renderCobrosCajero();
                return;
            }
            this.value = new Intl.NumberFormat('es-AR').format(parseInt(raw, 10));
            renderCobrosCajero();
        });
    }

    // Billetes Rápidos del POS
    document.querySelectorAll('.btn-pos-bill').forEach(btn => {
        btn.addEventListener('click', function () {
            const bill = parseInt(this.dataset.amount);
            const input = document.getElementById('pos-monto-recibido');
            if (!input) return;

            let currentRaw = input.value.replace(/\D/g, '');
            let current = parseFloat(currentRaw) || 0;
            let nuevo = current + bill;
            input.value = new Intl.NumberFormat('es-AR').format(nuevo);
            renderCobrosCajero();
        });
    });

    // Botón Pago Exacto
    const btnPosExacto = document.getElementById('btn-pos-exacto');
    if (btnPosExacto) {
        btnPosExacto.addEventListener('click', function () {
            const input = document.getElementById('pos-monto-recibido');
            if (!input || !ventaSeleccionada) return;

            const totalAportado = cobrosCajero.reduce((acc, c) => acc + (c.monto || 0), 0);
            const saldoPendiente = Math.max(0, ventaSeleccionada.total - totalAportado);

            input.value = new Intl.NumberFormat('es-AR').format(Math.ceil(saldoPendiente));
            renderCobrosCajero();
        });
    }

    // Botón Descartar (Cerrar vista de detalle POS)
    const btnPosDescartar = document.getElementById('btn-pos-descartar');
    if (btnPosDescartar) {
        btnPosDescartar.addEventListener('click', deseleccionarVenta);
    }

    // Modal de Anulación de Orden
    const modalAnularOrden = document.getElementById('modal-anular-orden');
    const btnPosAnularOrden = document.getElementById('btn-pos-anular-orden');
    const btnCancelarAnularModal = document.getElementById('btn-cancelar-anular-modal');
    const btnConfirmarAnularModal = document.getElementById('btn-confirmar-anular-modal');
    const modalAnularOrdenId = document.getElementById('modal-anular-orden-id');

    const selectAnularMotivo = document.getElementById('anular-motivo-select');
    const txtAnularObs = document.getElementById('anular-obs-text');
    const countAnularObs = document.getElementById('anular-obs-count');
    const errAnularMotivo = document.getElementById('error-anular-motivo');

    function limpiarErrorMotivoAnulacion() {
        if (selectAnularMotivo) {
            selectAnularMotivo.style.borderColor = '#cbd5e1';
            selectAnularMotivo.style.background = '#f8fafc';
        }
        if (errAnularMotivo) {
            errAnularMotivo.style.display = 'none';
        }
    }

    function mostrarErrorMotivoAnulacion() {
        if (selectAnularMotivo) {
            selectAnularMotivo.style.borderColor = '#ef4444';
            selectAnularMotivo.style.background = '#f8fafc';
        }
        if (errAnularMotivo) {
            errAnularMotivo.style.display = 'flex';
        }
    }

    if (selectAnularMotivo) {
        selectAnularMotivo.addEventListener('change', () => {
            if (selectAnularMotivo.value) {
                limpiarErrorMotivoAnulacion();
            }
        });
    }

    if (txtAnularObs && countAnularObs) {
        txtAnularObs.addEventListener('input', () => {
            countAnularObs.textContent = txtAnularObs.value.length;
        });
    }

    if (btnPosAnularOrden) {
        btnPosAnularOrden.addEventListener('click', () => {
            if (!ventaSeleccionada) return;
            if (modalAnularOrdenId) modalAnularOrdenId.textContent = `#${ventaSeleccionada.idVenta}`;
            if (selectAnularMotivo) selectAnularMotivo.value = '';
            if (txtAnularObs) txtAnularObs.value = '';
            if (countAnularObs) countAnularObs.textContent = '0';
            limpiarErrorMotivoAnulacion();
            if (modalAnularOrden) modalAnularOrden.style.display = 'flex';
        });
    }

    if (btnCancelarAnularModal) {
        btnCancelarAnularModal.addEventListener('click', () => {
            limpiarErrorMotivoAnulacion();
            if (modalAnularOrden) modalAnularOrden.style.display = 'none';
        });
    }

    if (btnConfirmarAnularModal) {
        btnConfirmarAnularModal.addEventListener('click', async () => {
            if (!ventaSeleccionada) return;

            const motivo = selectAnularMotivo ? selectAnularMotivo.value : '';
            if (!motivo) {
                mostrarErrorMotivoAnulacion();
                return;
            }
            limpiarErrorMotivoAnulacion();

            btnConfirmarAnularModal.disabled = true;
            btnConfirmarAnularModal.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Anulando...';

            try {
                const res = await fetch(`/api/ventas/${ventaSeleccionada.idVenta}/anular`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        motivoAnulacion: motivo,
                        observacionesAnulacion: txtAnularObs ? txtAnularObs.value.trim() : ''
                    })
                });

                if (!res.ok) {
                    const text = await res.text();
                    let errMsg = `Error ${res.status}`;
                    try { errMsg = JSON.parse(text).message || text; } catch { errMsg = text; }
                    throw new Error(errMsg);
                }

                if (modalAnularOrden) modalAnularOrden.style.display = 'none';
                showSuccessBanner('Orden anulada exitosamente. El stock fue devuelto.');
                
                salesChannel.postMessage({ type: 'venta_anulada', idVenta: ventaSeleccionada.idVenta });

                deseleccionarVenta();
            } catch (err) {
                console.error('Error al anular orden:', err);
                showErrorPOS(err.message);
                if (modalAnularOrden) modalAnularOrden.style.display = 'none';
            } finally {
                btnConfirmarAnularModal.disabled = false;
                btnConfirmarAnularModal.innerHTML = '<i class="fas fa-trash-alt" style="margin-right: 6px;"></i> Confirmar Anulación';
            }
        });
    }

    // Botón Registrar Cobro en POS
    const btnPosCobrar = document.getElementById('btn-pos-cobrar');
    if (btnPosCobrar) {
        btnPosCobrar.addEventListener('click', async function () {
            const errorMsg = document.getElementById('pos-error-message');
            if (errorMsg) errorMsg.style.display = 'none';

            if (!ventaSeleccionada) return;
            if (!cajaEstaAbierta) {
                showErrorPOS('Debe abrir la caja antes de registrar movimientos.');
                return;
            }

            // Si no hay pagos en el arreglo, pero hay un monto e idMetodo seleccionados en el formulario, intentar agregarlo automáticamente
            if (cobrosCajero.length === 0) {
                const selectMetodo = document.getElementById('pos-metodo-pago');
                const inputRecibido = document.getElementById('pos-monto-recibido');
                const idMetodo = selectMetodo?.value;
                const raw = inputRecibido ? inputRecibido.value.replace(/\D/g, '') : '';
                const monto = parseFloat(raw);

                if (idMetodo && !isNaN(monto) && monto > 0) {
                    agregarPagoCajero();
                }
            }

            if (cobrosCajero.length === 0) {
                showErrorPOS('Debe agregar al menos un pago a la orden.');
                return;
            }

            const totalVenta = ventaSeleccionada.total || 0;
            const totalAportado = cobrosCajero.reduce((acc, c) => acc + (c.monto || 0), 0);
            const saldoPendiente = Math.max(0, totalVenta - totalAportado);

            if (saldoPendiente > 0.05) {
                showErrorPOS(`El saldo pendiente debe ser $0 para registrar la venta. Faltan ${formatter.format(saldoPendiente)}`);
                return;
            }

            // Construir el Request Body con cobros múltiples
            const cobroRequest = {
                cobros: cobrosCajero.map(c => ({
                    idMetodoPago: c.idMetodoPago,
                    importe: c.monto,
                    tipoTarjeta: c.tipoTarjeta,
                    montoPagado: c.montoPagado || c.monto,
                    vuelto: c.vuelto || 0
                }))
            };

            btnPosCobrar.disabled = true;
            btnPosCobrar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando Pago...';

            try {
                const res = await fetch(`/api/ventas/${ventaSeleccionada.idVenta}/cobrar`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cobroRequest)
                });

                if (!res.ok) {
                    const text = await res.text();
                    let errMsg = `Error ${res.status}`;
                    try { errMsg = JSON.parse(text).message || text; } catch { errMsg = text; }
                    throw new Error(errMsg);
                }

                const ventaCobrada = await res.json();
                
                showSuccessBanner('Venta cobrada con éxito.');
                cobrosCajero = [];
                
                // Mostrar modal para generar el ticket en PDF opcionalmente
                mostrarModalTicket(ventaCobrada.idVenta);

                // Notificar al dashboard de caja de forma global
                document.dispatchEvent(new CustomEvent('ventaRegistrada'));

                // Notificar al empleado mediante BroadcastChannel
                salesChannel.postMessage({ type: 'venta_cobrada', idVenta: ventaCobrada.idVenta });
 
                // Limpiar estado
                deseleccionarVenta();

            } catch (err) {
                console.error('Error al procesar cobro:', err);
                showErrorPOS(err.message);
            } finally {
                btnPosCobrar.disabled = false;
                btnPosCobrar.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar y Cobrar Venta';
            }
        });
    }

    function showErrorPOS(msg) {
        const errorMsg = document.getElementById('pos-error-message');
        if (errorMsg) {
            errorMsg.textContent = msg;
            errorMsg.style.display = 'block';
            errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // Inicializar métodos de pago y ventas pendientes
    loadMetodosPagoActivos();
    loadVentasPendientes();

    // BroadcastChannel para escuchar nuevas órdenes en tiempo real (otras pestañas)
    salesChannel.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'nueva_orden') {
            if (typeof loadVentasPendientes === 'function') {
                loadVentasPendientes(true); // Actualización silenciosa (sin mostrar spinner de carga)
            }
        }
    });

    // Polling de 5 segundos como respaldo (para múltiples dispositivos/navegadores)
    setInterval(() => {
        if (cajaEstaAbierta && typeof loadVentasPendientes === 'function') {
            loadVentasPendientes(true); // Actualización silenciosa (sin mostrar spinner de carga)
        }
    }, 5000);

    // ==========================================
    // LÓGICA DE MOVIMIENTOS MANUALES DE CAJA
    // ==========================================
    const modalMovCaja = document.getElementById('modal-movimiento-caja');
    const formMovCaja = document.getElementById('form-movimiento-caja');
    const inputMovMonto = document.getElementById('movimiento-monto');
    const selectMovCat = document.getElementById('movimiento-categoria');
    const inputMovRef = document.getElementById('movimiento-referencia');
    const txtMovDesc = document.getElementById('movimiento-descripcion');
    const errorMovMsg = document.getElementById('movimiento-error-msg');
    
    const btnNuevoIngreso = document.getElementById('btn-nuevo-ingreso');
    const btnNuevoEgreso = document.getElementById('btn-nuevo-egreso');
    const btnCerrarModalMov = document.getElementById('btn-cerrar-modal-movimiento');
    const btnCancelarMov = document.getElementById('btn-cancelar-movimiento');
    
    const charCountMovDesc = document.getElementById('char-count-movimiento-desc');

    if (txtMovDesc && charCountMovDesc) {
        txtMovDesc.addEventListener('input', () => {
            charCountMovDesc.textContent = txtMovDesc.value.length;
        });
    }

    // Bloquear caracteres no numéricos excepto un punto decimal
    if (inputMovMonto) {
        inputMovMonto.addEventListener('keydown', (e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
            }
        });
        
        inputMovMonto.addEventListener('input', (e) => {
            let val = e.target.value;
            // Permitir solo números y un punto decimal
            val = val.replace(/[^0-9.]/g, '');
            // Evitar múltiples puntos
            const parts = val.split('.');
            if (parts.length > 2) {
                val = parts[0] + '.' + parts.slice(1).join('');
            }
            e.target.value = val;
        });
    }

    async function abrirModalMovimiento(tipo) {
        if (!modalMovCaja || !formMovCaja) return;
        
        // Reset form
        formMovCaja.reset();
        if (charCountMovDesc) charCountMovDesc.textContent = '0';
        if (errorMovMsg) {
            errorMovMsg.style.display = 'none';
            errorMovMsg.textContent = '';
        }

        document.getElementById('movimiento-tipo').value = tipo;

        const header = document.getElementById('movimiento-modal-header');
        const title = document.getElementById('movimiento-modal-title');
        const confirmBtn = document.getElementById('btn-confirmar-movimiento');

        // Intentar recuperar el resumen si no está cargado
        if (!resumenCajaActual && usuarioIdActual) {
            try {
                const resumenRes = await fetch(`/api/caja/sesion-activa/${usuarioIdActual}`);
                if (resumenRes.ok) {
                    resumenCajaActual = await resumenRes.json();
                }
            } catch (e) {
                console.warn('No se pudieron recuperar datos de sesión activa:', e);
            }
        }

        // Poblar bloque de información de auditoría (solo lectura)
        const infoSesion = document.getElementById('movimiento-info-sesion');
        const infoCajero = document.getElementById('movimiento-info-cajero');
        const infoFecha = document.getElementById('movimiento-info-fecha');

        if (infoSesion) {
            infoSesion.textContent = resumenCajaActual && resumenCajaActual.idSesion 
                ? `#${resumenCajaActual.idSesion}` 
                : 'Sin sesión activa';
        }

        if (infoCajero) {
            infoCajero.textContent = spanOperador ? spanOperador.textContent.trim() : 'No identificado';
        }

        if (infoFecha) {
            infoFecha.textContent = new Date().toLocaleString('es-AR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        if (tipo === 'INGRESO') {
            if (header) header.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            if (title) title.innerHTML = '<i class="fas fa-plus-circle"></i> Nuevo Ingreso de Efectivo';
            if (confirmBtn) {
                confirmBtn.style.background = '#10b981';
                confirmBtn.textContent = 'Guardar Ingreso';
            }
        } else {
            if (header) header.style.background = 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)';
            if (title) title.innerHTML = '<i class="fas fa-minus-circle"></i> Nuevo Retiro / Egreso';
            if (confirmBtn) {
                confirmBtn.style.background = '#e11d48';
                confirmBtn.textContent = 'Guardar Egreso';
            }
        }

        // Cargar categorías correspondientes al tipo
        await cargarCategoriasMovimiento(tipo);

        modalMovCaja.style.display = 'flex';
    }

    function cerrarModalMovimiento() {
        if (modalMovCaja) modalMovCaja.style.display = 'none';
    }

    if (btnNuevoIngreso) btnNuevoIngreso.addEventListener('click', () => abrirModalMovimiento('INGRESO'));
    if (btnNuevoEgreso) btnNuevoEgreso.addEventListener('click', () => abrirModalMovimiento('EGRESO'));
    if (btnCerrarModalMov) btnCerrarModalMov.addEventListener('click', cerrarModalMovimiento);
    if (btnCancelarMov) btnCancelarMov.addEventListener('click', cerrarModalMovimiento);

    const btnPrevMov = document.getElementById('movimientos-caja-prev');
    const btnNextMov = document.getElementById('movimientos-caja-next');
    if (btnPrevMov) btnPrevMov.addEventListener('click', () => {
        if (movimientosPage > 1) {
            movimientosPage--;
            renderizarPaginaMovimientos();
        }
    });
    if (btnNextMov) btnNextMov.addEventListener('click', () => {
        const totalPages = Math.ceil(movimientosManualesList.length / movimientosPageSize);
        if (movimientosPage < totalPages) {
            movimientosPage++;
            renderizarPaginaMovimientos();
        }
    });

    // Cerrar modal con ESC o clic fuera
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalMovCaja && modalMovCaja.style.display !== 'none') {
            cerrarModalMovimiento();
        }
    });

    async function cargarCategoriasMovimiento(tipo) {
        if (!selectMovCat) return;
        try {
            const res = await fetch(`/api/categorias-movimiento/tipo/${tipo}`);
            if (!res.ok) throw new Error('Error al cargar categorías');
            const cats = await res.json();
            
            selectMovCat.innerHTML = '<option value="">Seleccione una categoría...</option>';
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.idCategoriaMovimiento;
                opt.textContent = c.nombre;
                selectMovCat.appendChild(opt);
            });
        } catch (error) {
            console.error(error);
            selectMovCat.innerHTML = '<option value="">Error al cargar categorías</option>';
        }
    }

    let movimientosManualesList = [];
    let movimientosPage = 1;
    const movimientosPageSize = 5;

    async function cargarMovimientosManualesTurno() {
        const tbody = document.getElementById('lista-movimientos-turno-body');
        if (!tbody) return;
        try {
            const res = await fetch('/api/movimientos-caja/sesion/activa');
            if (!res.ok) {
                const msg = cajaEstaAbierta ? "No se pudieron cargar los movimientos." : "No hay una sesión de caja activa. Abra la caja para registrar movimientos.";
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">${msg}</td></tr>`;
                actualizarControlesPaginacionMovimientos(0);
                return;
            }
            movimientosManualesList = await res.json();
            movimientosPage = 1; // Reset to page 1 on new load
            renderizarPaginaMovimientos();
        } catch (error) {
            console.error('Error al cargar movimientos:', error);
        }
    }

    function renderizarPaginaMovimientos() {
        const tbody = document.getElementById('lista-movimientos-turno-body');
        if (!tbody) return;

        if (movimientosManualesList.length === 0) {
            const msg = cajaEstaAbierta ? "No se han registrado movimientos manuales en este turno." : "No hay una sesión de caja activa. Abra la caja para registrar movimientos.";
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">${msg}</td></tr>`;
            actualizarControlesPaginacionMovimientos(0);
            return;
        }

        const totalPages = Math.ceil(movimientosManualesList.length / movimientosPageSize);
        if (movimientosPage > totalPages) {
            movimientosPage = totalPages;
        }
        if (movimientosPage < 1) {
            movimientosPage = 1;
        }

        const start = (movimientosPage - 1) * movimientosPageSize;
        const end = start + movimientosPageSize;
        const pageItems = movimientosManualesList.slice(start, end);

        tbody.innerHTML = '';
        pageItems.forEach(m => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';
            
            const fechaHoraFormatted = new Date(m.fechaHora).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const isIngreso = m.tipo === 'INGRESO';
            const badgeBg = m.estado === 'ANULADO' ? '#f1f5f9' : (isIngreso ? '#ecfdf5' : '#fef2f2');
            const badgeColor = m.estado === 'ANULADO' ? '#64748b' : (isIngreso ? '#059669' : '#e11d48');
            const badgeText = m.estado === 'ANULADO' ? 'ANULADO' : m.tipo;
            const badgeIcon = m.estado === 'ANULADO' ? 'fa-ban' : (isIngreso ? 'fa-arrow-up' : 'fa-arrow-down');
            
            if (m.estado === 'ANULADO') {
                tr.style.opacity = '0.6';
                tr.style.background = '#fafafa';
            }

            tr.innerHTML = `
                <td style="padding: 12px; font-size: 13px; font-weight: 500; color: #334155;">${fechaHoraFormatted}</td>
                <td style="padding: 12px;">
                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas ${badgeIcon}"></i> ${badgeText}
                    </span>
                </td>
                <td style="padding: 12px; font-size: 13px; font-weight: 500; color: #475569;">${m.nombreUsuario || '-'}</td>
                <td style="padding: 12px; font-size: 13px; font-weight: 600; color: #475569;">${m.nombreCategoria}</td>
                <td style="padding: 12px; font-size: 13px; font-weight: 800; color: ${m.estado === 'ANULADO' ? '#64748b' : badgeColor};">${formatter.format(m.monto)}</td>
                <td style="padding: 12px; font-size: 13px; color: #64748b; word-break: break-word;">${m.descripcion}</td>
                <td style="padding: 12px; font-size: 13px; font-weight: 500; color: #94a3b8;">${m.referencia || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

        actualizarControlesPaginacionMovimientos(totalPages);
    }

    function actualizarControlesPaginacionMovimientos(totalPages) {
        const pageInfo = document.getElementById('movimientos-caja-page-info');
        const btnPrev = document.getElementById('movimientos-caja-prev');
        const btnNext = document.getElementById('movimientos-caja-next');

        if (!pageInfo || !btnPrev || !btnNext) return;

        if (totalPages === 0) {
            pageInfo.textContent = 'Página 1 de 1';
            btnPrev.disabled = true;
            btnNext.disabled = true;
            return;
        }

        pageInfo.textContent = `Página ${movimientosPage} de ${totalPages}`;
        btnPrev.disabled = movimientosPage === 1;
        btnNext.disabled = movimientosPage === totalPages;
    }

    if (formMovCaja) {
        formMovCaja.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorMovMsg) {
                errorMovMsg.style.display = 'none';
                errorMovMsg.textContent = '';
            }

            const tipo = document.getElementById('movimiento-tipo').value;
            const monto = parseFloat(inputMovMonto.value);
            const idCategoria = selectMovCat.value;
            const referencia = inputMovRef.value.trim();
            const descripcion = txtMovDesc.value.trim();

            if (isNaN(monto) || monto <= 0) {
                if (errorMovMsg) {
                    errorMovMsg.textContent = 'Por favor ingrese un monto positivo válido.';
                    errorMovMsg.style.display = 'block';
                }
                return;
            }

            if (!idCategoria) {
                if (errorMovMsg) {
                    errorMovMsg.textContent = 'Por favor seleccione una categoría.';
                    errorMovMsg.style.display = 'block';
                }
                return;
            }

            if (!descripcion) {
                if (errorMovMsg) {
                    errorMovMsg.textContent = 'Por favor describa el motivo.';
                    errorMovMsg.style.display = 'block';
                }
                return;
            }



            const btnConfirmar = document.getElementById('btn-confirmar-movimiento');
            btnConfirmar.disabled = true;
            btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

            try {
                const bodyReq = {
                    tipo: tipo,
                    monto: monto,
                    idUsuario: usuarioIdActual,
                    idCategoriaMovimiento: parseInt(idCategoria, 10),
                    referencia: referencia,
                    descripcion: descripcion
                };

                const res = await fetch('/api/movimientos-caja', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyReq)
                });

                if (res.ok) {
                    cerrarModalMovimiento();
                    showSuccessBanner('Movimiento registrado exitosamente.');
                    // Recargar datos
                    await cargarDashboardCierre(true);
                } else {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Error al guardar el movimiento.');
                }
            } catch (err) {
                console.error(err);
                if (errorMovMsg) {
                    errorMovMsg.textContent = err.message || 'Ocurrió un error inesperado al registrar el movimiento.';
                    errorMovMsg.style.display = 'block';
                }
            } finally {
                btnConfirmar.disabled = false;
                btnConfirmar.innerHTML = tipo === 'INGRESO' ? 'Guardar Ingreso' : 'Guardar Egreso';
            }
        });
    }

    // Exponer función de recarga global
    window.loadVentasPendientes = loadVentasPendientes;
    window.cargarMovimientosManualesTurno = cargarMovimientosManualesTurno;

});
