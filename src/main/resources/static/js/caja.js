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

    // Drawer elements
    const drawerOverlay = document.getElementById('caja-drawer-overlay');
    const drawerPanel = document.getElementById('caja-drawer-cierre');
    const btnAbrirDrawer = document.getElementById('btn-abrir-drawer-cierre');
    const btnCerrarDrawer = document.getElementById('btn-cerrar-drawer');

    // Ingresos collapsible
    const ingresosToggleBtn = document.getElementById('caja-ingresos-toggle-btn');
    const ingresosBody = document.getElementById('caja-ingresos-body');

    let saldoAnteriorGlobal = 0.0;
    let usuarioIdActual = null;
    let cajaEstaAbierta = false;
    let resumenCajaActual = null; // Almacenamos el DTO de respuesta para cálculos locales y PDF

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

            spanOperador.textContent = `${usuarioObj.nombreCompleto} (${usuarioObj.rol})`;
            // Also populate the KPI hero operator name
            const kpiOperador = document.getElementById('caja-kpi-operador');
            if (kpiOperador) kpiOperador.textContent = usuarioObj.nombreCompleto;

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
                    let text = `Abierta por ${info.operador} (${info.rol})`;
                    if (info.operadorCierre && info.operadorCierre !== info.operador) {
                        text += ` | Cerrada por ${info.operadorCierre} (${info.rolCierre})`;
                    }
                    contextoOperador.innerHTML = `<i class="fas fa-user-clock" style="font-size: 10px;"></i> <span>${text} el ${fechaStr}</span>`;
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

            const btnAdminNuevoIngreso = document.getElementById('btn-admin-nuevo-ingreso');
            const btnAdminNuevoEgreso = document.getElementById('btn-admin-nuevo-egreso');
            if (btnAdminNuevoIngreso) {
                btnAdminNuevoIngreso.disabled = !cajaEstaAbierta;
                btnAdminNuevoIngreso.style.opacity = cajaEstaAbierta ? '1' : '0.6';
                btnAdminNuevoIngreso.style.cursor = cajaEstaAbierta ? 'pointer' : 'not-allowed';
            }
            if (btnAdminNuevoEgreso) {
                btnAdminNuevoEgreso.disabled = !cajaEstaAbierta;
                btnAdminNuevoEgreso.style.opacity = cajaEstaAbierta ? '1' : '0.6';
                btnAdminNuevoEgreso.style.cursor = cajaEstaAbierta ? 'pointer' : 'not-allowed';
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
            if (elInicial) elInicial.textContent = formatter.format(resumenData.montoInicial || 0);
            if (elIngresos) elIngresos.textContent = formatter.format(resumenData.totalVentas || 0);
            if (elEgresos) elEgresos.textContent = formatter.format(resumenData.totalCompras || 0);
            if (elEsperado) elEsperado.textContent = formatter.format(resumenData.saldoEsperado || 0);

            // 2. Poblamos Tarjetas del Nuevo Dashboard Analítico
            const elTVentas = document.getElementById('caja-card-total-ventas');
            if (elTVentas) elTVentas.textContent = formatter.format(resumenData.totalVentas || 0);
            const elCVentas = document.getElementById('caja-card-cantidad-ventas');
            if (elCVentas) elCVentas.textContent = resumenData.cantidadVentas || 0;
            const elCEfectivo = document.getElementById('caja-card-efectivo');
            if (elCEfectivo) elCEfectivo.textContent = formatter.format(resumenData.totalEfectivo || 0);
            const elCTarjeta = document.getElementById('caja-card-tarjeta');
            if (elCTarjeta) elCTarjeta.textContent = formatter.format(resumenData.totalTarjeta || 0);
            const elCTransferencia = document.getElementById('caja-card-transferencia');
            if (elCTransferencia) elCTransferencia.textContent = formatter.format(resumenData.totalTransferencia || 0);

            // 3. Poblamos Tabla de Desglose (siempre mostramos los 3 métodos por defecto)
            const tbodyDesglose = document.getElementById('caja-tabla-desglose');
            if (tbodyDesglose) {
                tbodyDesglose.innerHTML = '';

                const metodosDefault = [
                    { nombre: 'Efectivo', iconoClass: 'fas fa-money-bill', spanClass: 'icon-efectivo' },
                    { nombre: 'Tarjeta', iconoClass: 'fas fa-credit-card', spanClass: 'icon-tarjeta' },
                    { nombre: 'Transferencia', iconoClass: 'fas fa-exchange-alt', spanClass: 'icon-transferencia' }
                ];

                let totalOperacionesGlobal = 0;
                let totalGananciasGlobal = 0;

                if (resumenData.desgloseCobros && resumenData.desgloseCobros.length > 0) {
                    resumenData.desgloseCobros.forEach(cobro => {
                        const nombre = cobro.metodoPago || 'Desconocido';
                        const operaciones = cobro.cantidadOperaciones || 0;
                        const total = cobro.totalIngresado || 0;

                        totalOperacionesGlobal += operaciones;
                        totalGananciasGlobal += total;

                        let iconoClass = 'fas fa-wallet';
                        let spanClass = '';
                        const mLower = nombre.toLowerCase();

                        if (mLower.includes('efectivo')) {
                            iconoClass = 'fas fa-money-bill';
                            spanClass = 'icon-efectivo';
                        } else if (mLower.includes('tarjeta')) {
                            iconoClass = 'fas fa-credit-card';
                            spanClass = 'icon-tarjeta';
                        } else if (mLower.includes('transferencia') || mLower.includes('mp') || mLower.includes('mercado')) {
                            iconoClass = 'fas fa-exchange-alt';
                            spanClass = 'icon-transferencia';
                        } else {
                            spanClass = 'icon-transferencia'; // default style
                        }

                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                        <td>
                            <div class="metodo-pago-label">
                                <div class="metodo-icon ${spanClass}">
                                    <i class="${iconoClass}"></i>
                                </div>
                                ${nombre}
                            </div>
                        </td>
                        <td style="text-align: center; font-weight: 600;">${operaciones}</td>
                        <td style="text-align: right; font-weight: 800;">${formatter.format(total)}</td>
                    `;
                        tbodyDesglose.appendChild(tr);
                    });
                } else {
                    metodosDefault.forEach(metodo => {
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
                        <td style="text-align: center; font-weight: 600;">0</td>
                        <td style="text-align: right; font-weight: 800;">${formatter.format(0)}</td>
                    `;
                        tbodyDesglose.appendChild(tr);
                    });
                }

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
            const totalEfectivoTeorico = resumenData.saldoEsperado || ((resumenData.montoInicial || 0) + (resumenData.totalEfectivo || 0) - (resumenData.totalComprasEfectivo || 0));

            // Popula Efvo Esperado en el KPI hero
            const labelEsperado = document.getElementById('caja-sidebar-efectivo-esperado');
            if (labelEsperado) labelEsperado.textContent = formatter.format(totalEfectivoTeorico);
            // Also populate the drawer copy
            const drawerEsperado = document.getElementById('drawer-efectivo-esperado');
            if (drawerEsperado) {
                const roundedEsperado = Math.round(totalEfectivoTeorico);
                drawerEsperado.textContent = "$ " + new Intl.NumberFormat('es-AR').format(roundedEsperado);
            }

            // Sugerencia para el monto físico
            if (!silentRefresh && inputMontoFinalFisico) {
                inputMontoFinalFisico.value = '';
            }
            // Sugerencia para dejar el monto inicial como fondo fijo para mañana
            if (!silentRefresh && inputFondoFijo) {
                const sugerido = Math.round(resumenData.montoInicial || 0);
                inputFondoFijo.value = new Intl.NumberFormat('es-AR').format(sugerido);
            }

            // 5. Cargar Ingresos Recientes
            if (resumenData.fechaApertura) {
                cargarIngresosSesion(resumenData.fechaApertura);
            }

        } catch (e) {
            console.error("Error al obtener resumen de caja activa:", e);
        }
    }

    if (inputMontoInicial) {
        inputMontoInicial.addEventListener('input', (e) => {
            formatNumberInput(e);
            const rawValueStr = inputMontoInicial.value.replace(/\./g, '');
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
        // Solo permitimos dígitos
        let value = input.value.replace(/\D/g, '');
        if (value === '') {
            input.value = '';
            return;
        }
        input.value = new Intl.NumberFormat('es-AR').format(parseInt(value, 10));
    };

    if (inputFondoFijo) {
        inputFondoFijo.addEventListener('input', (e) => {
            if (window.limpiarErroresInline) window.limpiarErroresInline('caja-fondo-fijo');
            formatNumberInput(e);
        });
    }

    if (inputMontoFinalFisico) {
        inputMontoFinalFisico.addEventListener('input', (e) => {
            if (window.limpiarErroresInline) window.limpiarErroresInline('caja-monto-final');
            formatNumberInput(e);
        });
    }

    if (warningFinalText && inputMontoFinalFisico) {
        inputMontoFinalFisico.addEventListener('input', () => {
            const rawValueStr = inputMontoFinalFisico.value.replace(/\./g, '');
            const value = parseFloat(rawValueStr);
            const esperado = resumenCajaActual ? (resumenCajaActual.saldoEsperado || 0) : 0;

            if (!isNaN(value) && Math.abs(value - esperado) > 0.01) {
                warningFinalText.style.display = 'block';
            } else {
                warningFinalText.style.display = 'none';
            }
        });
    }

    // Botón Limpiar Cierre
    const btnLimpiarCierre = document.getElementById('btn-limpiar-cierre');
    if (btnLimpiarCierre) {
        btnLimpiarCierre.addEventListener('click', () => {
            // 1. Limpiar Efectivo
            if (inputMontoFinalFisico) {
                inputMontoFinalFisico.value = '';
                if (warningFinalText) warningFinalText.style.display = 'none';
            }

            // 2. Limpiar Observaciones
            if (inputObsCierre) {
                inputObsCierre.value = '';
                const charCountEl = document.getElementById('char-count-observaciones');
                if (charCountEl) charCountEl.textContent = '0';
            }

            // 3. Restaurar Fondo Fijo predeterminado
            if (inputFondoFijo) {
                const sugerido = Math.round(resumenCajaActual?.montoInicial || 0);
                inputFondoFijo.value = new Intl.NumberFormat('es-AR').format(sugerido);
            }

            // 4. Limpiar Errores Inline
            if (window.limpiarErroresInline) {
                window.limpiarErroresInline('caja-monto-final');
                window.limpiarErroresInline('caja-fondo-fijo');
            }
            if (panelErrorCierre) panelErrorCierre.style.display = 'none';
        });
    }

    // Character count para observaciones
    if (inputObsCierre) {
        const charCountEl = document.getElementById('char-count-observaciones');
        inputObsCierre.addEventListener('input', function () {
            if (charCountEl) {
                charCountEl.textContent = this.value.length;
            }
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



    // Botón Abrir Modal de Cierre
    if (btnCerrarCaja) {
        btnCerrarCaja.addEventListener('click', async () => {
            // 1. Validaciones iniciales
            if (window.limpiarErroresInline) {
                window.limpiarErroresInline('caja-monto-final');
                window.limpiarErroresInline('caja-fondo-fijo');
            }
            if (panelErrorCierre) panelErrorCierre.style.display = 'none';

            const parseAmount = (valStr) => {
                if (valStr === null || valStr === undefined || valStr === '') return 0;
                let cleanStr = String(valStr).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
                let parsed = parseFloat(cleanStr);
                return isNaN(parsed) ? 0 : parsed;
            };

            const rawMontoFisico = inputMontoFinalFisico.value.trim();
            if (rawMontoFisico === '') {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('caja-monto-final', 'El efectivo físico es obligatorio para cerrar la caja.');
                }
                inputMontoFinalFisico.focus();
                return;
            }

            const montoFisicoVal = parseAmount(rawMontoFisico);
            if (isNaN(montoFisicoVal) || montoFisicoVal < 0) {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('caja-monto-final', 'Por favor ingresa un monto válido para el efectivo físico.');
                }
                inputMontoFinalFisico.focus();
                return;
            }

            const rawFondoFijo = inputFondoFijo.value.trim();
            if (rawFondoFijo === '') {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('caja-fondo-fijo', 'El fondo fijo es obligatorio para continuar.');
                }
                inputFondoFijo.focus();
                return;
            }

            const fondoFijoRaw = parseAmount(rawFondoFijo);
            if (isNaN(fondoFijoRaw) || fondoFijoRaw < 0) {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('caja-fondo-fijo', 'Por favor ingresa un fondo fijo válido.');
                }
                inputFondoFijo.focus();
                return;
            }

            const fondoFijoVal = fondoFijoRaw || 0;

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

            const getNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
            const saldoEsp = getNum(data.saldoEsperado);
            const montoIni = getNum(data.montoInicial);
            const totEf = getNum(data.totalEfectivo);
            const totComp = getNum(data.totalComprasEfectivo);

            const totalEfTeorico = (data.saldoEsperado !== undefined && data.saldoEsperado !== null)
                ? saldoEsp
                : (montoIni + totEf - totComp);

            const diferencia = montoFisicoVal - totalEfTeorico;

            // Header - Responsable y Sesión
            const respNode = document.getElementById('modal-cierre-responsable');
            if (respNode) respNode.textContent = spanOperador ? spanOperador.textContent.split(' (')[0] : 'Usuario';
            const sesionNode = document.getElementById('modal-cierre-sesion');
            if (sesionNode) sesionNode.textContent = `Sesión #${data.idSesion || '---'}`;

            // Tiempos reales
            const horaApertura = data.fechaApertura ? new Date(data.fechaApertura).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
            const horaCierre = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            const apNode = document.getElementById('modal-resumen-apertura');
            if (apNode) apNode.textContent = horaApertura;
            const crNode = document.getElementById('modal-resumen-cierre-hora');
            if (crNode) crNode.textContent = horaCierre;

            // Card Efectivo - datos reales del backend
            const iniNode = document.getElementById('modal-resumen-inicial');
            if (iniNode) iniNode.textContent = formatter.format(data.montoInicial || 0);
            const vtEfNode = document.getElementById('modal-resumen-ventas-efectivo');
            if (vtEfNode) vtEfNode.textContent = `+${formatter.format(data.totalEfectivo || 0)}`;
            const gaNode = document.getElementById('modal-resumen-gastos');
            if (gaNode) gaNode.textContent = `-${formatter.format(data.totalComprasEfectivo || 0)}`;
            const espNode = document.getElementById('modal-resumen-esperado');
            if (espNode) espNode.textContent = formatter.format(totalEfTeorico);

            // Card Digital - datos reales del backend
            const trjNode = document.getElementById('modal-resumen-tarjeta');
            if (trjNode) trjNode.textContent = formatter.format(data.totalTarjeta || 0);
            const trfNode = document.getElementById('modal-resumen-transferencia');
            if (trfNode) trfNode.textContent = formatter.format(data.totalTransferencia || 0);

            // Resultado Arqueo - datos del usuario + cálculos
            const realNode = document.getElementById('modal-resumen-real');
            if (realNode) realNode.textContent = formatter.format(montoFisicoVal);

            const diffSpan = document.getElementById('modal-resumen-diferencia');
            if (diffSpan) {
                if (Math.abs(diferencia) < 0.01) {
                    diffSpan.textContent = `$0,00 (Cuadrado)`;
                    diffSpan.className = 'diff-pill ok';
                } else {
                    const tipo = diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
                    diffSpan.textContent = `${formatter.format(diferencia)} (${tipo})`;
                    diffSpan.className = diferencia > 0 ? 'diff-pill warning' : 'diff-pill error';
                }
            }

            // Fondo y Retiro - cálculos basados en datos reales
            const pxNode = document.getElementById('modal-resumen-fondo-proximo');
            if (pxNode) pxNode.textContent = formatter.format(fondoFijoVal);
            const retiro = Math.max(0, montoFisicoVal - fondoFijoVal);
            const retNode = document.getElementById('modal-resumen-retiro');
            if (retNode) retNode.textContent = formatter.format(retiro);

            // 4. Mostrar Modal
            if (modalResumen) {
                modalResumen.style.display = 'flex';
                setTimeout(() => {
                    modalResumen.classList.add('post-cierre-visible');
                }, 50);
                document.addEventListener('keydown', handleResumenEsc);
            } else {
                console.error("No se encontró el modal de cierre (modal-resumen-cierre)");
            }
            if (panelErrorCierre) panelErrorCierre.style.display = 'none';
        });
    }

    // Lógica para cerrar el Modal de Resumen
    const closeModalResumen = () => {
        if (modalResumen) {
            modalResumen.classList.remove('post-cierre-visible');
            setTimeout(() => {
                modalResumen.style.display = 'none';
            }, 400);
        }
        document.removeEventListener('keydown', handleResumenEsc);
    };
    const handleResumenEsc = (e) => { if (e.key === 'Escape') closeModalResumen(); };

    // Botón Cancelar del Modal
    if (btnCancelarCierre) {
        btnCancelarCierre.addEventListener('click', closeModalResumen);
    }

    // Botón X (cerrar flotante)
    const btnCierreCloseX = document.getElementById('modal-cierre-close-x');
    if (btnCierreCloseX) {
        btnCierreCloseX.addEventListener('click', closeModalResumen);
    }

    // Click afuera del modal
    if (modalResumen) {
        modalResumen.addEventListener('click', (e) => {
            if (e.target === modalResumen) closeModalResumen();
        });
    }

    // Botón Previsualizar del Modal
    if (btnPrevisualizarCierre) {
        btnPrevisualizarCierre.addEventListener('click', () => {
            const fondoFijoVal = parseFloat(inputFondoFijo.value) || 0;
            const montoFisicoVal = parseFloat(inputMontoFinalFisico.value) || 0;
            generarCierrePDF(fondoFijoVal, montoFisicoVal);
        });
    }

    // Botón Confirmar del Modal (LA CIERRE REAL)
    if (btnConfirmarCierre) {
        btnConfirmarCierre.addEventListener('click', async () => {
            const parseAmount = (valStr) => {
                if (valStr === null || valStr === undefined || valStr === '') return 0;
                let cleanStr = String(valStr).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
                let parsed = parseFloat(cleanStr);
                return isNaN(parsed) ? 0 : parsed;
            };

            const fondoFijoValStr = parseAmount(inputFondoFijo.value).toFixed(2);
            const montoFisicoVal = parseAmount(inputMontoFinalFisico.value);
            const obsBase = inputObsCierre ? inputObsCierre.value.trim() : "";
            const observacionesCierre = `FF=${fondoFijoValStr}; Obs=${obsBase}`;

            const bodyReq = {
                idUsuario: usuarioIdActual,
                montoFinalReal: montoFisicoVal,
                observacionesCierre: observacionesCierre,
                fondoProximaApertura: parseAmount(inputFondoFijo.value)
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
                    closeModalResumen();
                    closeDrawer();
                    showSuccessBanner('Caja cerrada exitosamente. Sesión finalizada.');
                    cajaEstaAbierta = false;
                    verificarEstadoCaja();
                } else {
                    const err = await response.json();
                    throw new Error(err.error || 'Error al cerrar caja.');
                }
            } catch (error) {
                closeModalResumen();
                closeDrawer();
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
        const totalEfTeorico = data.saldoEsperado || ((data.montoInicial || 0) + (data.totalEfectivo || 0) - (data.totalComprasEfectivo || 0));
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

            // Filtrar las ventas que sucedieron despues de la apertura de caja
            const fechaRef = new Date(fechaApertura).getTime();
            let ingresosSesion = ventas.filter(v => new Date(v.fecha).getTime() >= fechaRef);

            // Ordenar de más reciente a más antigua
            ingresosSesion.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            async function renderLista(data) {
                const scrollPosition = window.scrollY || document.documentElement.scrollTop;
                listaIngresos.classList.add('loading');
                await new Promise(resolve => setTimeout(resolve, 200));

                listaIngresos.innerHTML = '';
                if (data.length === 0) {
                    listaIngresos.innerHTML = '<div style="text-align: center; padding: 25px; color: #94a3b8; font-size: 13px;">No hay ingresos que coincidan con el filtro.</div>';
                    requestAnimationFrame(() => {
                        window.scrollTo(0, scrollPosition);
                        listaIngresos.classList.remove('loading');
                    });
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

                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPosition);
                    listaIngresos.classList.remove('loading');
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
    // DRAWER: Open / Close
    // ==========================================
    const handleDrawerEsc = (e) => { if (e.key === 'Escape') closeDrawer(); };

    function openDrawer() {
        // Drawer has been removed. Logic migrated to inline form.
    }

    function closeDrawer() {
        // Drawer has been removed. Logic migrated to inline form.
    }

    // ==========================================
    // INGRESOS COLLAPSIBLE TOGGLE
    // ==========================================
    if (ingresosToggleBtn && ingresosBody) {
        ingresosToggleBtn.addEventListener('click', () => {
            const isOpen = ingresosBody.classList.contains('expanded');
            if (isOpen) {
                ingresosBody.classList.remove('expanded');
                ingresosToggleBtn.classList.remove('open');
            } else {
                ingresosBody.classList.add('expanded');
                ingresosToggleBtn.classList.add('open');
            }
        });
    }

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

    // window.showCajaSubsection is declared below to handle all tabs including global dashboard

    // ==========================================
    // HISTORIAL DE SESIONES
    // ==========================================
    let todasLasSesiones = [];

    function normH(str) {
        return (str || '').toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
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
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 30px; color: #94a3b8;">No hay sesiones registradas</td></tr>';
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

            // Operator column
            let alertCerrador = '';
            if (sesion.estado === 'CERRADA' && sesion.operadorCierre && sesion.operadorCierre !== sesion.operador) {
                alertCerrador = `
                    <div style="font-size: 11px; color: #d97706; margin-top: 2px; display: flex; align-items: center; gap: 4px;" title="Cerrado por: ${sesion.operadorCierre} (${sesion.rolCierre || 'N/A'})">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Cerrado por ${sesion.operadorCierre} (${sesion.rolCierre || 'N/A'})</span>
                    </div>
                `;
            }
            let operadorHtml = `
                <div style="font-weight: 500; color: #334155;">${sesion.operador || '-'}</div>
                <div style="font-size: 11px; color: #64748b;">${sesion.rolOperador || 'N/A'}</div>
                ${alertCerrador}
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
                    <div class="custom-tooltip btn-ver-detalles" data-id="${sesion.idSesion}" data-tab="tab-observaciones" style="cursor: pointer;">
                        <i class="fas fa-sticky-note" style="color: #334155; font-size: 16px; transition: all 0.2s;" 
                           onmouseover="this.style.color='#d97706'; this.style.transform='scale(1.1)';" 
                           onmouseout="this.style.color='#334155'; this.style.transform='scale(1)';"></i>
                        <div class="tooltip-text">${tooltipText}</div>
                    </div>
                `;
            } else {
                notasHtml = '<span style="color: #cbd5e1;">-</span>';
            }

            // Button to open modal
            const btnDetalles = `<button type="button" class="btn-icon btn-ver-detalles" data-id="${sesion.idSesion}" title="Ver Detalles">
                <i class="fas fa-eye"></i>
            </button>`;

            return `
                <tr>
                    <td style="font-weight: 600; color: #64748b;">#${sesion.idSesion}</td>
                    <td>${turnoDetalleHtml}</td>
                    <td>${operadorHtml}</td>
                    <td style="font-weight: 700; text-align: right; color: #0f172a;">${formatter.format(sesion.totalFacturado || 0)}</td>
                    <td style="text-align: right;">
                        <span style="font-weight: 600; color: #1e293b;">${sesion.montoFinalReal != null ? formatter.format(sesion.montoFinalReal) : '-'}</span>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Inició: ${sesion.montoInicial != null ? formatter.format(sesion.montoInicial) : '-'}</div>
                    </td>
                    <td style="text-align: right;">${difHtml}</td>
                    <td style="text-align: center;">${notasHtml}</td>
                    <td style="text-align: center;">${estadoBadge}</td>
                    <td style="text-align: center;">${btnDetalles}</td>
                </tr>
            `;
        }).join('');

        // Attach event listeners to the "Ver Detalles" buttons
        const botonesDetalle = tbody.querySelectorAll('.btn-ver-detalles');
        botonesDetalle.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idSesion = parseInt(e.currentTarget.getAttribute('data-id'), 10);
                const initialTab = e.currentTarget.getAttribute('data-tab') || 'tab-arqueo';
                const sesionData = todasLasSesiones.find(s => s.idSesion === idSesion);
                if (sesionData) {
                    abrirModalDetalles(sesionData, initialTab);
                }
            });
        });
    }

    // Lógica del Modal de Detalles
    const modalDetalles = document.getElementById('modal-detalles-sesion');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-detalles');
    const btnEntendidoModal = document.getElementById('btn-entendido-modal-detalles');

    function abrirModalDetalles(sesion, initialTab = 'tab-arqueo') {
        if (!modalDetalles) return;

        // Resetear pestañas al abrir (mostrar la seleccionada por defecto)
        const targetBtn = document.querySelector(`#modal-detalles-sesion .tab-btn[onclick*="${initialTab}"]`);
        cambiarTabModalSesion(initialTab, targetBtn);

        // Header (Operador y Estado)
        if (sesion.operadorCierre && sesion.operadorCierre !== sesion.operador) {
            document.getElementById('detalle-sesion-operador').innerHTML = `
                <div style="font-size: 13px; line-height: 1.4;">
                    <span style="opacity: 0.85; font-weight: 500;">Apertura:</span> ${sesion.operador} <small style="opacity: 0.8; font-weight: normal;">(${sesion.rolOperador || 'N/A'})</small>
                </div>
                <div style="font-size: 13px; line-height: 1.4; margin-top: 2px;">
                    <span style="opacity: 0.85; font-weight: 500;">Cierre:</span> ${sesion.operadorCierre} <small style="opacity: 0.8; font-weight: normal;">(${sesion.rolCierre || 'N/A'})</small>
                </div>
            `;
        } else {
            document.getElementById('detalle-sesion-operador').innerHTML = `
                ${sesion.operador || 'Desconocido'} <small style="opacity: 0.8; font-weight: normal;">(${sesion.rolOperador || 'N/A'})</small>
            `;
        }
        const elEstado = document.getElementById('detalle-sesion-estado');
        if (sesion.estado === 'ABIERTA') {
            elEstado.innerHTML = '<i class="fas fa-door-open" style="font-size: 10px;"></i> ABIERTA';
            elEstado.style.background = 'rgba(16, 185, 129, 0.2)'; // Verde translucido
            elEstado.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            elEstado.style.color = '#fff';
        } else {
            elEstado.innerHTML = '<i class="fas fa-door-closed" style="font-size: 10px;"></i> CERRADA';
            elEstado.style.background = 'rgba(255, 255, 255, 0.1)';
            elEstado.style.border = '1px solid rgba(255, 255, 255, 0.15)';
            elEstado.style.color = 'rgba(255, 255, 255, 0.9)';
        }

        // Formatear Fechas y Duración
        document.getElementById('detalle-sesion-apertura').textContent = sesion.fechaApertura ? new Date(sesion.fechaApertura).toLocaleString('es-AR') : '-';
        document.getElementById('detalle-sesion-cierre').textContent = sesion.fechaCierre ? new Date(sesion.fechaCierre).toLocaleString('es-AR') : 'Aún abierta';
        document.getElementById('detalle-sesion-duracion').textContent = sesion.duracion || '-';

        // Formatear Montos y Cálculos de Efectivo
        document.getElementById('detalle-sesion-inicial').textContent = sesion.montoInicial != null ? formatter.format(sesion.montoInicial) : '$0,00';
        const totalIngresosEfectivo = (sesion.ingresosEfectivo || 0) + (sesion.ingresosManuales || 0);
        const totalEgresosEfectivo = (sesion.egresosEfectivo || 0) + (sesion.egresosManuales || 0);
        document.getElementById('detalle-sesion-ingresos-efectivo').textContent = totalIngresosEfectivo > 0 ? `+${formatter.format(totalIngresosEfectivo)}` : '+$0,00';
        document.getElementById('detalle-sesion-egresos-efectivo').textContent = totalEgresosEfectivo > 0 ? `-${formatter.format(totalEgresosEfectivo)}` : '-$0,00';
        document.getElementById('detalle-sesion-esperado').textContent = sesion.saldoEsperado != null ? formatter.format(sesion.saldoEsperado) : '$0,00';
        document.getElementById('detalle-sesion-fisico').textContent = sesion.montoFinalReal != null ? formatter.format(sesion.montoFinalReal) : 'En curso';

        // Rendimiento Comercial (Facturación)
        document.getElementById('detalle-sesion-total-facturado').textContent = sesion.totalFacturado != null ? formatter.format(sesion.totalFacturado) : '$0,00';
        document.getElementById('detalle-sesion-ventas-efectivo').textContent = sesion.ingresosEfectivo != null ? formatter.format(sesion.ingresosEfectivo) : '$0,00';

        const elDebito = document.getElementById('detalle-sesion-ventas-debito');
        if (elDebito) elDebito.textContent = sesion.ventasDebito != null ? formatter.format(sesion.ventasDebito) : '$0,00';

        const elCredito = document.getElementById('detalle-sesion-ventas-credito');
        if (elCredito) elCredito.textContent = sesion.ventasCredito != null ? formatter.format(sesion.ventasCredito) : '$0,00';

        document.getElementById('detalle-sesion-ventas-transferencia').textContent = sesion.ventasTransferencia != null ? formatter.format(sesion.ventasTransferencia) : '$0,00';

        // Diferencia de Arqueo Estilizada
        const elDif = document.getElementById('detalle-sesion-diferencia');
        if (sesion.diferencia !== null && sesion.diferencia !== undefined && sesion.estado === 'CERRADA') {
            if (Math.abs(sesion.diferencia) < 0.01) {
                elDif.textContent = '$0,00';
                elDif.style.background = '#dcfce7';
                elDif.style.color = '#15803d';
            } else if (sesion.diferencia > 0) {
                elDif.textContent = `+${formatter.format(sesion.diferencia)}`;
                elDif.style.background = '#fffbeb';
                elDif.style.color = '#b45309';
            } else {
                elDif.textContent = formatter.format(sesion.diferencia);
                elDif.style.background = '#fee2e2';
                elDif.style.color = '#b91c1c';
            }
        } else {
            elDif.textContent = '-';
            elDif.style.background = '#f1f5f9';
            elDif.style.color = '#475569';
        }

        // Observaciones
        const obsAp = (sesion.observacionesApertura || '').trim();
        const obsMatch = (sesion.observacionesCierre || '').match(/Obs=(.+)$/);
        const obsCi = obsMatch ? obsMatch[1].trim() : '';

        document.getElementById('detalle-sesion-obs-apertura').textContent = obsAp || 'Sin observaciones de apertura registradas.';
        document.getElementById('detalle-sesion-obs-cierre').textContent = obsCi || 'Sin observaciones de cierre registradas.';

        // Mostrar Modal
        modalDetalles.style.display = 'flex';
    }

    function cambiarTabModalSesion(tabId, btn) {
        // Ocultar todos los contenidos de pestaña
        const contents = document.querySelectorAll('#modal-detalles-sesion .tab-content');
        contents.forEach(content => content.classList.remove('active'));

        // Desactivar todos los botones de pestaña
        const buttons = document.querySelectorAll('#modal-detalles-sesion .tab-btn');
        buttons.forEach(button => button.classList.remove('active'));

        // Activar el seleccionado
        document.getElementById(tabId).classList.add('active');
        if (btn) btn.classList.add('active');
    }
    window.cambiarTabModalSesion = cambiarTabModalSesion;

    function cerrarModalDetalles() {
        if (modalDetalles) modalDetalles.style.display = 'none';
    }

    if (btnCerrarModal) btnCerrarModal.addEventListener('click', cerrarModalDetalles);
    if (btnEntendidoModal) btnEntendidoModal.addEventListener('click', cerrarModalDetalles);
    if (modalDetalles) {
        modalDetalles.addEventListener('click', (e) => {
            if (e.target === modalDetalles) cerrarModalDetalles();
        });
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
                const campos = normH([String(s.idSesion || ''), s.operador, s.estado, s.observacionesApertura, obsMatch ? obsMatch[1] : '', s.duracion].join(' '));
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

    async function cargarOperadores() {
        if (!historialFiltroOperador) return;
        try {
            const res = await fetch('/api/caja/historial/operadores');
            if (!res.ok) return;
            const operadores = await res.json();
            const valorActual = historialFiltroOperador.value;
            historialFiltroOperador.innerHTML = '<option value="">Todos los operadores</option>';
            operadores.forEach(op => {
                const opt = document.createElement('option');
                opt.value = op.id;
                opt.textContent = `${op.nombre} (${op.rol || 'Cajero'})`;
                historialFiltroOperador.appendChild(opt);
            });
            historialFiltroOperador.value = valorActual;
        } catch (e) { /* silencioso */ }
    }

    async function cargarHistorialSesiones(page) {
        const tbody = document.getElementById('tabla-historial-caja-body');
        if (!tbody) return;

        tbody.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 200));

        try {
            const params = new URLSearchParams({
                page: 0,
                size: 1000,
                sort: 'fechaApertura,desc',
                _t: new Date().getTime()
            });
            const fechaApertura = document.getElementById('historial-fecha-apertura')?.value;
            const fechaCierre = document.getElementById('historial-fecha-cierre')?.value;
            const estado = historialFiltroEstado?.value;
            const operadorId = historialFiltroOperador?.value;
            const soloDiferencias = btnHistorialDiferencias?.dataset.active === 'true';

            if (fechaApertura) params.append('fechaApertura', fechaApertura);
            if (fechaCierre) params.append('fechaCierre', fechaCierre);
            if (estado) params.append('estado', estado);
            if (operadorId) params.append('operadorId', operadorId);
            if (soloDiferencias) params.append('soloDiferencias', 'true');

            const response = await fetch(`/api/caja/historial?${params}`, {
                cache: 'no-store'
            });
            if (!response.ok) throw new Error('Error al obtener historial');

            const data = await response.json();
            todasLasSesiones = data.content || [];

            filtrarYRenderHistorial(page);
            requestAnimationFrame(() => tbody.classList.remove('loading'));

        } catch (error) {
            console.error('Error cargando historial de sesiones:', error);
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 30px; color: #dc3545;">Error al cargar historial</td></tr>';
            requestAnimationFrame(() => tbody.classList.remove('loading'));
        }
    }

    const historialFiltroError = document.getElementById('historial-caja-filtro-error');

    function mostrarErrorHistorial(msg) {
        if (!historialFiltroError) return;
        const textSpan = document.getElementById('historial-caja-filtro-error-text');
        if (textSpan) textSpan.textContent = msg;
        else historialFiltroError.textContent = msg;
        historialFiltroError.style.display = 'flex';
        setTimeout(() => { historialFiltroError.style.display = 'none'; }, 4000);
    }

    function validarFechasHistorial() {
        const apertura = document.getElementById('historial-fecha-apertura')?.value;
        const cierre = document.getElementById('historial-fecha-cierre')?.value;
        if (apertura && cierre && apertura > cierre) {
            mostrarErrorHistorial('La fecha de apertura no puede ser posterior a la fecha de cierre');
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
            if (historialBusqueda) {
                historialBusqueda.value = '';
                if (window.limpiarErroresInline) window.limpiarErroresInline('historial-busqueda');
            }
            const historialFechaApertura = document.getElementById('historial-fecha-apertura');
            const historialFechaCierre = document.getElementById('historial-fecha-cierre');
            if (historialFechaApertura) historialFechaApertura.value = '';
            if (historialFechaCierre) historialFechaCierre.value = '';
            if (historialFiltroEstado) historialFiltroEstado.value = '';
            if (historialFiltroOperador) historialFiltroOperador.value = '';
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
    if (historialFiltroOperador) {
        historialFiltroOperador.addEventListener('change', () => cargarHistorialSesiones(0));
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

    window.showCajaSubsection = function (subsectionId) {
        const globalContainer = document.getElementById('caja-global-container');
        const operacionesContainer = document.getElementById('caja-operaciones-container');
        const movimientosContainer = document.getElementById('caja-movimientos-container');
        const historialContainer = document.getElementById('caja-historial-container');
        const ventasCobrarContainer = document.getElementById('ventas-cobrar-container');

        if (globalContainer) globalContainer.style.display = 'none';
        if (operacionesContainer) operacionesContainer.style.display = 'none';
        if (movimientosContainer) movimientosContainer.style.display = 'none';
        if (historialContainer) historialContainer.style.display = 'none';
        if (ventasCobrarContainer) ventasCobrarContainer.style.display = 'none';

        if (subsectionId === 'caja-dashboard' && globalContainer) {
            globalContainer.style.display = 'block';
            cargarDashboardGlobal();
        } else if (subsectionId === 'caja-operaciones' && operacionesContainer) {
            operacionesContainer.style.display = 'block';
            verificarEstadoCaja();
        } else if (subsectionId === 'caja-movimientos' && movimientosContainer) {
            movimientosContainer.style.display = 'block';
            verificarEstadoCaja();
            cargarMovimientosManualesCaja();
        } else if (subsectionId === 'caja-historial' && historialContainer) {
            historialContainer.style.display = 'block';
            cargarOperadores();
            cargarHistorialSesiones(0);
        } else if (subsectionId === 'ventas-cobrar' && ventasCobrarContainer) {
            ventasCobrarContainer.style.display = 'block';
            if (typeof window.loadVentasPendientes === 'function') {
                window.loadVentasPendientes();
            }
        }
    };

    window.cargarDatosCaja = function () {
        // Solo mostramos el dashboard por defecto si no hay ninguna subsección visible actualmente
        const globalContainer = document.getElementById('caja-global-container');
        const operacionesContainer = document.getElementById('caja-operaciones-container');
        const movimientosContainer = document.getElementById('caja-movimientos-container');
        const historialContainer = document.getElementById('caja-historial-container');
        const ventasCobrarContainer = document.getElementById('ventas-cobrar-container');

        const isAnyVisible =
            (globalContainer && globalContainer.style.display === 'block') ||
            (operacionesContainer && operacionesContainer.style.display === 'block') ||
            (movimientosContainer && movimientosContainer.style.display === 'block') ||
            (historialContainer && historialContainer.style.display === 'block') ||
            (ventasCobrarContainer && ventasCobrarContainer.style.display === 'block');

        if (!isAnyVisible) {
            window.showCajaSubsection('caja-dashboard');
        }
    };

    async function cargarDashboardGlobal() {
        try {
            const res = await fetch('/api/caja/resumen-global');
            if (!res.ok) throw new Error('Error al cargar dashboard global');
            const data = await res.json();

            const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 });

            // 1. KPI Cards
            const elSaldo = document.getElementById('caja-global-saldo-esperado');
            if (elSaldo) elSaldo.textContent = formatter.format(data.saldoEsperado || 0);

            const elVentas = document.getElementById('caja-global-total-ventas');
            if (elVentas) elVentas.textContent = formatter.format(data.totalVentas || 0);

            const elCantVentas = document.getElementById('caja-global-cantidad-ventas');
            if (elCantVentas) elCantVentas.textContent = data.cantidadVentas || 0;

            const netManuales = (data.ingresosManuales || 0) - (data.egresosManuales || 0);
            const elManuales = document.getElementById('caja-global-manuales');
            if (elManuales) {
                if (netManuales > 0) {
                    elManuales.textContent = `+${formatter.format(netManuales)}`;
                    elManuales.style.color = '#10b981';
                } else if (netManuales < 0) {
                    elManuales.textContent = formatter.format(netManuales);
                    elManuales.style.color = '#ef4444';
                } else {
                    elManuales.textContent = '$0,00';
                    elManuales.style.color = '#0f172a';
                }
            }

            const elManualesSub = document.getElementById('caja-global-manuales-sub');
            if (elManualesSub) {
                elManualesSub.innerHTML = `<i class="fas fa-arrow-up" style="color:#10b981;"></i> +${formatter.format(data.ingresosManuales || 0)} | <i class="fas fa-arrow-down" style="color:#ef4444;"></i> -${formatter.format(data.egresosManuales || 0)}`;
            }

            // 2. Composición por Método de Pago
            const totalEfectivo = data.totalEfectivo || 0;
            const totalDebito = data.totalDebito || 0;
            const totalCredito = data.totalCredito || 0;
            const totalTransferencia = data.totalTransferencia || 0;
            const totalMetodosSum = totalEfectivo + totalDebito + totalCredito + totalTransferencia;

            const elTotalMetodos = document.getElementById('caja-global-total-metodos');
            if (elTotalMetodos) elTotalMetodos.textContent = `Total: ${formatter.format(totalMetodosSum)}`;

            const elEf = document.getElementById('caja-global-efectivo');
            if (elEf) elEf.textContent = formatter.format(totalEfectivo);
            const elDeb = document.getElementById('caja-global-debito');
            if (elDeb) elDeb.textContent = formatter.format(totalDebito);
            const elCred = document.getElementById('caja-global-credito');
            if (elCred) elCred.textContent = formatter.format(totalCredito);
            const elTrans = document.getElementById('caja-global-transferencia');
            if (elTrans) elTrans.textContent = formatter.format(totalTransferencia);

            // Animar la barra segmentada
            const barEf = document.getElementById('bar-metodo-efectivo');
            const barDeb = document.getElementById('bar-metodo-debito');
            const barCred = document.getElementById('bar-metodo-credito');
            const barTrans = document.getElementById('bar-metodo-transferencia');

            if (totalMetodosSum > 0) {
                if (barEf) barEf.style.width = `${((totalEfectivo / totalMetodosSum) * 100).toFixed(1)}%`;
                if (barDeb) barDeb.style.width = `${((totalDebito / totalMetodosSum) * 100).toFixed(1)}%`;
                if (barCred) barCred.style.width = `${((totalCredito / totalMetodosSum) * 100).toFixed(1)}%`;
                if (barTrans) barTrans.style.width = `${((totalTransferencia / totalMetodosSum) * 100).toFixed(1)}%`;
            } else {
                if (barEf) barEf.style.width = '0%';
                if (barDeb) barDeb.style.width = '0%';
                if (barCred) barCred.style.width = '0%';
                if (barTrans) barTrans.style.width = '0%';
            }

            // 3. Cargar Feed de Movimientos Globales
            cargarIngresosGlobales(data.fechaApertura);

        } catch (e) {
            console.error('Error dashboard global:', e);
        }
    }

    async function cargarIngresosGlobales(fechaAperturaGlobal) {
        const listaIngresosGlobal = document.getElementById('caja-global-lista-ingresos');
        const filtroSelect = document.getElementById('caja-global-filtro-ingresos');
        const filtroRol = document.getElementById('caja-global-filtro-rol');
        const filtroTipoMov = document.getElementById('caja-global-filtro-tipo-mov');
        const buscarInput = document.getElementById('caja-global-buscar-ingresos');

        if (!listaIngresosGlobal) return;

        if (!fechaAperturaGlobal) {
            listaIngresosGlobal.innerHTML = '<div style="text-align: center; padding: 25px; color: #94a3b8; font-size: 13px;">No hay sesión de caja activa actualmente.</div>';
            listaIngresosGlobal.classList.remove('loading');
            return;
        }

        try {
            listaIngresosGlobal.innerHTML = '<div style="text-align: center; padding: 25px; color: #94a3b8;"><i class="fas fa-spinner fa-spin"></i> Cargando movimientos globales...</div>';

            // Cargar metodos de pago activos para el dropdown
            if (filtroSelect && filtroSelect.options.length <= 1) {
                try {
                    const metodosRes = await fetch('/api/metodos-pago/activos');
                    if (metodosRes.ok) {
                        const metodosData = await metodosRes.json();
                        filtroSelect.innerHTML = '<option value="Todos">Todos los métodos</option>';
                        metodosData.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.nombre;
                            opt.textContent = m.nombre;
                            filtroSelect.appendChild(opt);
                        });
                    }
                } catch (e) {
                    console.error("Error cargando métodos de pago para filtro", e);
                }
            }

            // Cargar roles activos para el dropdown
            if (filtroRol && filtroRol.options.length <= 1) {
                try {
                    const rolesResponse = await fetch('/api/roles');
                    if (rolesResponse.ok) {
                        const rolesData = await rolesResponse.json();
                        filtroRol.innerHTML = '<option value="Todos">Todos los roles</option>';
                        rolesData.forEach(r => {
                            const option = document.createElement('option');
                            const capRole = r.descripcion ? r.descripcion.charAt(0).toUpperCase() + r.descripcion.slice(1) : '';
                            option.value = r.descripcion;
                            option.textContent = capRole;
                            filtroRol.appendChild(option);
                        });
                    }
                } catch (e) {
                    console.error("Error cargando roles para el filtro", e);
                }
            }

            // 1. Obtener ventas
            let ventasData = [];
            try {
                const resVentas = await fetch('/api/ventas/all');
                if (resVentas.ok) ventasData = await resVentas.json();
            } catch (e) { }
            const ventas = Array.isArray(ventasData) ? ventasData : (ventasData && Array.isArray(ventasData.content) ? ventasData.content : []);

            // 2. Obtener compras
            let comprasData = [];
            try {
                const resCompras = await fetch('/api/compras');
                if (resCompras.ok) comprasData = await resCompras.json();
            } catch (e) { }
            const compras = Array.isArray(comprasData) ? comprasData : (comprasData && Array.isArray(comprasData.content) ? comprasData.content : []);

            // 3. Obtener movimientos manuales
            let movsData = [];
            try {
                const resMovs = await fetch('/api/movimientos-caja');
                if (resMovs.ok) movsData = await resMovs.json();
            } catch (e) { }
            const movsManuales = Array.isArray(movsData) ? movsData : (movsData && Array.isArray(movsData.content) ? movsData.content : []);

            let fechaFiltro = new Date();
            fechaFiltro.setHours(0, 0, 0, 0);
            if (fechaAperturaGlobal) {
                fechaFiltro = new Date(fechaAperturaGlobal);
            }

            const movimientosUnificados = [];

            // Mapear ventas (Ingresos - 🛍️)
            ventas.forEach(v => {
                const dt = new Date(v.fecha);
                if (dt.getTime() >= fechaFiltro.getTime() && (!v.estado || v.estado === 'COBRADA')) {
                    let titulo = 'Venta';
                    if (v.productos && v.productos.length > 0) {
                        const fp = v.productos[0];
                        titulo = fp.nombreProducto || fp.nombre || 'Venta';
                        if (v.productos.length > 1) titulo += ` (+${v.productos.length - 1})`;
                    } else if (v.idVenta || v.id) {
                        titulo = `Venta #${v.idVenta || v.id}`;
                    }

                    movimientosUnificados.push({
                        tipo: 'VENTA',
                        titulo: titulo,
                        monto: v.total,
                        metodo: v.metodoPago || 'Efectivo',
                        fecha: dt,
                        usuario: v.nombreVendedor || 'Vendedor',
                        rol: v.rolVendedor || 'N/A',
                        cliente: v.nombreCliente || null
                    });
                }
            });

            // Mapear compras (Egresos - 🚚)
            compras.forEach(c => {
                const dt = new Date(c.fecha || c.fechaCompra);
                if (dt.getTime() >= fechaFiltro.getTime()) {
                    let titulo = `Compra #${c.idCompra || c.id || ''}`;
                    if (c.proveedorNombre || c.nombreProveedor) {
                        titulo += ` - ${c.proveedorNombre || c.nombreProveedor}`;
                    }

                    movimientosUnificados.push({
                        tipo: 'COMPRA',
                        titulo: titulo,
                        monto: c.total || c.montoTotal || 0,
                        metodo: c.metodoPago || 'Efectivo',
                        fecha: dt,
                        usuario: c.nombreUsuario || c.usuario || 'Comprador',
                        rol: c.rolUsuario || 'N/A',
                        cliente: null
                    });
                }
            });

            // Mapear movimientos manuales (Ingresos ➕ / Retiros ➖)
            movsManuales.forEach(m => {
                const dt = new Date(m.fechaHora || m.fecha);
                if (dt.getTime() >= fechaFiltro.getTime()) {
                    movimientosUnificados.push({
                        tipo: m.tipo === 'INGRESO' ? 'INGRESO_MANUAL' : 'EGRESO_MANUAL',
                        titulo: m.concepto || (m.tipo === 'INGRESO' ? 'Ingreso Manual' : 'Retiro / Egreso'),
                        monto: m.monto,
                        metodo: m.metodoPago || 'Efectivo',
                        fecha: dt,
                        usuario: m.nombreUsuario || m.usuario || 'Operador',
                        rol: m.rolUsuario || 'N/A',
                        cliente: null
                    });
                }
            });

            // Ordenar cronológicamente (más reciente primero)
            movimientosUnificados.sort((a, b) => b.fecha - a.fecha);
            const ultimosMovimientos = movimientosUnificados.slice(0, 50);

            async function renderLista(data) {
                const scrollPosition = window.scrollY || document.documentElement.scrollTop;
                listaIngresosGlobal.classList.add('loading');
                await new Promise(resolve => setTimeout(resolve, 200));

                listaIngresosGlobal.innerHTML = '';
                if (data.length === 0) {
                    listaIngresosGlobal.innerHTML = '<div style="text-align: center; padding: 25px; color: #94a3b8; font-size: 13px;">No hay movimientos que coincidan con los filtros.</div>';
                    requestAnimationFrame(() => {
                        window.scrollTo(0, scrollPosition);
                        listaIngresosGlobal.classList.remove('loading');
                    });
                    return;
                }

                const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 });

                data.forEach(item => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border: 1px solid #f1f5f9; border-radius: 12px; background: white; transition: all 0.2s; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);';
                    row.onmouseover = () => row.style.borderColor = '#cbd5e1';
                    row.onmouseout = () => row.style.borderColor = '#f1f5f9';

                    let iconoClass = 'fas fa-shopping-bag';
                    let iconColor = '#10b981';
                    let iconBg = '#ecfdf5';
                    let isIngreso = true;
                    let badgeBg = '#ecfdf5';
                    let badgeColor = '#047857';

                    const mx = (item.metodo || '').toLowerCase();
                    if (mx.includes('debito') || mx.includes('débito')) {
                        badgeBg = '#e0f2fe';
                        badgeColor = '#0284c7';
                    } else if (mx.includes('credito') || mx.includes('crédito')) {
                        badgeBg = '#ffe4e6';
                        badgeColor = '#e11d48';
                    } else if (mx.includes('transferencia') || mx.includes('mp') || mx.includes('mercado')) {
                        badgeBg = '#fef3c7';
                        badgeColor = '#d97706';
                    }

                    if (item.tipo === 'COMPRA') {
                        isIngreso = false;
                        iconoClass = 'fas fa-truck';
                        iconColor = '#ef4444';
                        iconBg = '#fef2f2';
                    } else if (item.tipo === 'EGRESO_MANUAL') {
                        isIngreso = false;
                        iconoClass = 'fas fa-arrow-up';
                        iconColor = '#ef4444';
                        iconBg = '#fef2f2';
                    } else if (item.tipo === 'INGRESO_MANUAL') {
                        iconoClass = 'fas fa-hand-holding-usd';
                        iconColor = '#f59e0b';
                        iconBg = '#fff7ed';
                    }

                    const fechaStr = item.fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    const horaStr = item.fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    const hora = `${fechaStr} ${horaStr} hs`;

                    row.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div style="width: 42px; height: 42px; border-radius: 12px; background: ${iconBg}; color: ${iconColor}; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
                                <i class="${iconoClass}"></i>
                            </div>
                            <div>
                                <h5 style="margin: 0 0 4px 0; font-size: 14px; color: #1e293b; font-weight: 700;">${item.titulo}</h5>
                                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <span style="color: #64748b; font-size: 12px;"><i class="far fa-clock" style="margin-right: 4px;"></i>${hora}</span>
                                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">${item.metodo}</span>
                                </div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="display: block; font-weight: 800; color: ${isIngreso ? '#10b981' : '#ef4444'}; font-size: 16px;">
                                ${isIngreso ? '+' : '-'}${formatter.format(item.monto)}
                            </span>
                            ${item.cliente ? `<span style="display: block; font-size: 11px; color: #94a3b8; margin-top: 2px;"><i class="far fa-user" style="margin-right:3px;"></i>Cliente: ${item.cliente}</span>` : ''}
                            ${item.usuario ? `<span style="display: block; font-size: 11px; color: #64748b; margin-top: 2px;"><i class="fas fa-user-tag" style="margin-right:3px;"></i>${item.usuario} (${item.rol})</span>` : ''}
                        </div>
                    `;
                    listaIngresosGlobal.appendChild(row);
                });

                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPosition);
                    listaIngresosGlobal.classList.remove('loading');
                });
            }

            renderLista(ultimosMovimientos);

            function aplicarFiltros() {
                if (buscarInput && window.checkMaxLength) {
                    window.checkMaxLength(buscarInput, 100);
                }

                const metodo = filtroSelect ? filtroSelect.value : 'Todos';
                const rol = filtroRol ? filtroRol.value : 'Todos';
                const tipoMov = filtroTipoMov ? filtroTipoMov.value : 'Todos';
                const texto = buscarInput ? normH(buscarInput.value) : '';

                let resultado = ultimosMovimientos;

                if (tipoMov !== 'Todos') {
                    resultado = resultado.filter(v => v.tipo === tipoMov);
                }

                if (metodo !== 'Todos') {
                    resultado = resultado.filter(v => v.metodo && v.metodo.toLowerCase().includes(metodo.toLowerCase()));
                }

                if (rol !== 'Todos') {
                    resultado = resultado.filter(v => v.rol && v.rol.toLowerCase() === rol.toLowerCase());
                }

                if (texto) {
                    resultado = resultado.filter(v => {
                        const tituloMatch = v.titulo && normH(v.titulo).includes(texto);
                        const clienteMatch = v.cliente && normH(v.cliente).includes(texto);
                        const usuarioMatch = v.usuario && normH(v.usuario).includes(texto);
                        return tituloMatch || clienteMatch || usuarioMatch;
                    });
                }

                renderLista(resultado);
            }

            if (filtroSelect) {
                filtroSelect.removeEventListener('change', aplicarFiltros);
                filtroSelect.addEventListener('change', aplicarFiltros);
            }

            if (filtroRol) {
                filtroRol.removeEventListener('change', aplicarFiltros);
                filtroRol.addEventListener('change', aplicarFiltros);
            }

            if (filtroTipoMov) {
                filtroTipoMov.removeEventListener('change', aplicarFiltros);
                filtroTipoMov.addEventListener('change', aplicarFiltros);
            }

            if (buscarInput) {
                buscarInput.removeEventListener('input', aplicarFiltros);
                buscarInput.addEventListener('input', aplicarFiltros);
            }

            const btnLimpiar = document.getElementById('caja-global-limpiar-ingresos');
            if (btnLimpiar) {
                btnLimpiar.onclick = () => {
                    if (filtroSelect) filtroSelect.value = 'Todos';
                    if (filtroRol) filtroRol.value = 'Todos';
                    if (filtroTipoMov) filtroTipoMov.value = 'Todos';
                    if (buscarInput) buscarInput.value = '';
                    aplicarFiltros();
                };
            }

        } catch (e) {
            listaIngresosGlobal.innerHTML = '<div style="text-align: center; padding: 25px; color: #ef4444; font-size: 13px;">Error al cargar movimientos globales.</div>';
            console.error('Error cargando movimientos globales:', e);
        }
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
    // LÓGICA DE MOVIMIENTOS MANUALES DE CAJA (ADMIN)
    // ==========================================
    const modalMovCaja = document.getElementById('modal-movimiento-caja');
    const formMovCaja = document.getElementById('form-movimiento-caja');
    const inputMovMonto = document.getElementById('movimiento-monto');
    const selectMovCat = document.getElementById('movimiento-categoria');
    const inputMovRef = document.getElementById('movimiento-referencia');
    const txtMovDesc = document.getElementById('movimiento-descripcion');
    const errorMovMsg = document.getElementById('movimiento-error-msg');
    const inputMovIdEdit = document.getElementById('movimiento-id-edit');

    const btnAdminNuevoIngreso = document.getElementById('btn-admin-nuevo-ingreso');
    const btnAdminNuevoEgreso = document.getElementById('btn-admin-nuevo-egreso');
    const btnCerrarModalMov = document.getElementById('btn-cerrar-modal-movimiento');
    const btnCancelarMov = document.getElementById('btn-cancelar-movimiento');
    const charCountMovDesc = document.getElementById('char-count-movimiento-desc');

    const charCountMovRef = document.getElementById('char-count-movimiento-ref');
    const errorMovRef = document.getElementById('error-movimiento-referencia');
    const saldoDisponibleContainer = document.getElementById('movimiento-saldo-disponible-container');
    const saldoDisponibleValor = document.getElementById('movimiento-saldo-disponible-valor');
    let saldoEfectivoDisponible = 0.0;
    let tipoMovimientoActual = 'INGRESO';

    const errorMovMonto = document.getElementById('error-movimiento-monto');
    const errorMovCat = document.getElementById('error-movimiento-categoria');
    const errorMovDesc = document.getElementById('error-movimiento-descripcion');

    if (txtMovDesc && charCountMovDesc) {
        txtMovDesc.addEventListener('input', () => {
            const len = txtMovDesc.value.length;
            charCountMovDesc.textContent = len;
            if (len >= 125) {
                if (window.mostrarErrorInline) window.mostrarErrorInline('movimiento-descripcion', 'Has alcanzado el límite máximo de 125 caracteres.');
            } else if (len > 0) {
                if (window.limpiarErroresInline) window.limpiarErroresInline('movimiento-descripcion');
            }
        });
    }

    if (selectMovCat) {
        selectMovCat.addEventListener('change', () => {
            if (selectMovCat.value) {
                if (window.limpiarErroresInline) window.limpiarErroresInline('movimiento-categoria');
            }
        });
    }

    if (inputMovRef) {
        inputMovRef.addEventListener('input', () => {
            if (charCountMovRef) charCountMovRef.textContent = inputMovRef.value.length;
            if (inputMovRef.value.length >= 50) {
                if (window.mostrarErrorInline) window.mostrarErrorInline('movimiento-referencia', 'Has alcanzado el límite máximo de 50 caracteres.');
            } else {
                if (window.limpiarErroresInline) window.limpiarErroresInline('movimiento-referencia');
            }
        });
    }

    function validarSaldoEgreso() {
        if (tipoMovimientoActual !== 'EGRESO') return true;
        const montoIngresado = parseFloat(inputMovMonto.value) || 0;
        const confirmBtn = document.getElementById('btn-confirmar-movimiento');

        if (montoIngresado > saldoEfectivoDisponible) {
            if (window.mostrarErrorInline) {
                window.mostrarErrorInline('movimiento-monto', `El monto a retirar no puede superar el saldo disponible en caja ($${saldoEfectivoDisponible.toLocaleString('es-AR')}).`);
            }
            if (confirmBtn) confirmBtn.disabled = true;
            return false;
        } else {
            if (window.limpiarErroresInline) window.limpiarErroresInline('movimiento-monto');
            if (confirmBtn) confirmBtn.disabled = false;
            return true;
        }
    }

    if (inputMovMonto) {
        inputMovMonto.addEventListener('keydown', (e) => {
            if (['e', 'E', '+', '-'].includes(e.key)) {
                e.preventDefault();
            }
        });

        inputMovMonto.addEventListener('input', (e) => {
            let val = e.target.value;
            val = val.replace(/[^0-9.]/g, '');
            const parts = val.split('.');
            if (parts.length > 2) {
                val = parts[0] + '.' + parts.slice(1).join('');
            }
            e.target.value = val;

            const confirmBtn = document.getElementById('btn-confirmar-movimiento');
            if (confirmBtn) confirmBtn.disabled = false;

            if (val.length >= 10) {
                if (window.mostrarErrorInline) window.mostrarErrorInline('movimiento-monto', 'Límite de 10 caracteres alcanzado.');
            } else {
                if (window.limpiarErroresInline) window.limpiarErroresInline('movimiento-monto');
            }
        });
    }

    async function abrirModalMovimiento(tipo, editId = null) {
        console.log("abrirModalMovimiento called with tipo:", tipo, "editId:", editId);
        if (!modalMovCaja || !formMovCaja) {
            console.error("modalMovCaja or formMovCaja is null!", { modalMovCaja, formMovCaja });
            return;
        }

        formMovCaja.reset();
        if (charCountMovDesc) charCountMovDesc.textContent = '0';
        if (charCountMovRef) charCountMovRef.textContent = '0';
        if (window.limpiarErroresInline) {
            window.limpiarErroresInline('movimiento-monto');
            window.limpiarErroresInline('movimiento-categoria');
            window.limpiarErroresInline('movimiento-referencia');
            window.limpiarErroresInline('movimiento-descripcion');
        }
        if (errorMovMsg) {
            errorMovMsg.style.display = 'none';
            errorMovMsg.textContent = '';
        }

        document.getElementById('movimiento-tipo').value = tipo;
        inputMovIdEdit.value = editId || '';

        const header = document.getElementById('movimiento-modal-header');
        const title = document.getElementById('movimiento-modal-title');
        const confirmBtn = document.getElementById('btn-confirmar-movimiento');

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
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        }

        await cargarCategoriasMovimiento(tipo);

        tipoMovimientoActual = tipo;
        if (confirmBtn) confirmBtn.disabled = false;

        if (inputMovRef) inputMovRef.style.borderColor = '#cbd5e1';
        if (errorMovRef) errorMovRef.style.display = 'none';
        if (charCountMovRef) charCountMovRef.textContent = inputMovRef ? inputMovRef.value.length : '0';

        if (tipo === 'EGRESO') {
            if (saldoDisponibleContainer) saldoDisponibleContainer.style.display = 'block';
            try {
                const saldoRes = await fetch('/api/movimientos-caja/sesion/activa/saldo');
                if (saldoRes.ok) {
                    const saldoData = await saldoRes.json();
                    saldoEfectivoDisponible = saldoData.saldoEfectivo || 0.0;
                } else {
                    saldoEfectivoDisponible = 0.0;
                }
            } catch (err) {
                console.error("Error al obtener saldo disponible:", err);
                saldoEfectivoDisponible = 0.0;
            }
            if (saldoDisponibleValor) {
                saldoDisponibleValor.textContent = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(saldoEfectivoDisponible);
            }
        } else {
            if (saldoDisponibleContainer) saldoDisponibleContainer.style.display = 'none';
        }

        if (editId) {
            if (header) header.style.background = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
            if (title) title.innerHTML = '<i class="fas fa-edit"></i> Editar Transacción';
            if (confirmBtn) {
                confirmBtn.style.background = '#d97706';
                confirmBtn.textContent = 'Guardar Cambios';
            }

            const mov = movimientosManualesList.find(m => m.idMovimiento === editId);
            if (mov) {
                inputMovMonto.value = mov.monto;
                txtMovDesc.value = mov.descripcion;
                inputMovRef.value = mov.referencia || '';
                const catOption = Array.from(selectMovCat.options).find(opt => opt.text === mov.nombreCategoria);
                if (catOption) {
                    selectMovCat.value = catOption.value;
                }
                if (charCountMovDesc) charCountMovDesc.textContent = mov.descripcion.length;
            }
        } else {
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
        }

        modalMovCaja.style.setProperty('display', 'flex', 'important');
        modalMovCaja.style.setProperty('z-index', '99999', 'important');
        modalMovCaja.classList.add('modal-visible');


    }

    function cerrarModalMovimiento() {
        if (modalMovCaja) {
            modalMovCaja.style.setProperty('display', 'none', 'important');
            modalMovCaja.classList.remove('modal-visible');
        }
    }

    window.abrirModalMovimientoAdmin = abrirModalMovimiento;
    window.cerrarModalMovimientoAdmin = cerrarModalMovimiento;

    if (btnCerrarModalMov) btnCerrarModalMov.addEventListener('click', cerrarModalMovimiento);
    if (btnCancelarMov) btnCancelarMov.addEventListener('click', cerrarModalMovimiento);

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
    let movimientosFiltradosList = [];
    let movimientoIdParaAnular = null;
    let movSortDir = 'desc'; // por defecto: más reciente primero
    let movimientosPage = 1;
    const movimientosPageSize = 5;

    async function cargarMovimientosManualesCaja() {
        const tbody = document.getElementById('lista-movimientos-admin-body');
        if (!tbody) return;
        // Loading state (punto 5)
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 24px;"><i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>Cargando movimientos...</td></tr>`;
        try {
            const res = await fetch('/api/movimientos-caja');
            if (!res.ok) {
                const msg = "No se pudieron cargar los movimientos.";
                tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 20px; font-style: italic;">${msg}</td></tr>`;
                actualizarControlesPaginacionMovimientos(0);
                return;
            }
            movimientosManualesList = await res.json();
            movimientosPage = 1;
            await poblarDropdownsFiltrosMovimientos();
            aplicarFiltrosMovimientos();
        } catch (error) {
            console.error('Error al cargar movimientos:', error);
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #ef4444; padding: 24px;"><i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>Error al cargar movimientos.</td></tr>`;
        }
    }

    async function renderizarPaginaMovimientos() {
        const tbody = document.getElementById('lista-movimientos-admin-body');
        if (!tbody) return;

        // 1. GUARDAR scroll y preparar animación (Fade Out)
        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
        tbody.classList.add('loading');

        // Esperar fade-out
        await new Promise(resolve => setTimeout(resolve, 200));

        // Actualizar contador de resultados (punto 4)
        const contador = document.getElementById('movimientos-contador');
        if (contador) {
            if (movimientosManualesList.length === 0) {
                contador.textContent = '';
            } else {
                const total = movimientosManualesList.length;
                const filtrados = movimientosFiltradosList.length;
                contador.textContent = filtrados === total
                    ? `${total} movimiento${total !== 1 ? 's' : ''} en total`
                    : `Mostrando ${filtrados} de ${total} movimientos`;
            }
        }

        if (movimientosFiltradosList.length === 0) {
            let msgHtml;
            if (movimientosManualesList.length === 0) {
                // Sin datos reales
                const msg = "No se han registrado movimientos manuales en el historial.";
                msgHtml = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 30px; font-style: italic;">${msg}</td></tr>`;
            } else {
                // Filtro aplicado sin resultados
                const filtroCategoria = document.getElementById('movimientos-filtro-categoria');
                const catValue = filtroCategoria ? filtroCategoria.value : '';
                let extraMsg = 'Ningún movimiento coincide con los filtros aplicados.';
                if (catValue) {
                    extraMsg = 'No hay movimientos registrados para esta categoría.';
                }
                msgHtml = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 30px;">
                    <i class="fas fa-filter" style="font-size: 22px; opacity: 0.4; display: block; margin-bottom: 10px;"></i>
                    <span style="font-style: italic; display: block;">${extraMsg}</span>
                </td></tr>`;
            }
            tbody.innerHTML = msgHtml;
            actualizarControlesPaginacionMovimientos(0);

            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
                tbody.classList.remove('loading');
            });
            return;
        }

        const totalPages = Math.ceil(movimientosFiltradosList.length / movimientosPageSize);
        if (movimientosPage > totalPages) movimientosPage = totalPages;
        if (movimientosPage < 1) movimientosPage = 1;

        const start = (movimientosPage - 1) * movimientosPageSize;
        const end = start + movimientosPageSize;
        const pageItems = movimientosFiltradosList.slice(start, end);

        tbody.innerHTML = '';
        pageItems.forEach(m => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #f1f5f9';

            const fechaHoraFormatted = new Date(m.fechaHora).toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const isIngreso = m.tipo === 'INGRESO';
            const badgeBg = isIngreso ? '#ecfdf5' : '#fef2f2';
            const badgeColor = isIngreso ? '#059669' : '#e11d48';

            let auditoriaHtml = '<span style="color: #94a3b8; font-style: italic;">-</span>';
            if (m.estado === 'ANULADO') {
                const fMod = m.fechaModificacion ? new Date(m.fechaModificacion).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                auditoriaHtml = `<span style="color: #ef4444; font-size: 11px; font-weight: 700; line-height: 1.3; display: block;"><i class="fas fa-ban"></i> Anulado por:<br>${m.nombreUsuarioModificador || 'Admin'}<br>${fMod}</span>`;
            } else if (m.nombreUsuarioModificador) {
                const fMod = m.fechaModificacion ? new Date(m.fechaModificacion).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                auditoriaHtml = `<span style="color: #d97706; font-size: 11px; font-weight: 700; line-height: 1.3; display: block;"><i class="fas fa-edit"></i> Modif. por:<br>${m.nombreUsuarioModificador}<br>${fMod}</span>`;
            }

            let accionesHtml = '';
            if (m.estado === 'ANULADO') {
                accionesHtml = `
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button type="button" class="btn-icon" disabled style="opacity: 0.3; cursor: not-allowed;"><i class="fas fa-edit"></i></button>
                        <button type="button" class="btn-icon" disabled style="opacity: 0.3; cursor: not-allowed;"><i class="fas fa-ban"></i></button>
                    </div>
                `;
            } else {
                accionesHtml = `
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button type="button" class="btn-icon btn-editar-mov" data-id="${m.idMovimiento}" title="Editar" style="color: #d97706;"><i class="fas fa-edit"></i></button>
                        <button type="button" class="btn-icon btn-anular-mov" data-id="${m.idMovimiento}" title="Anular" style="color: #ef4444;"><i class="fas fa-ban"></i></button>
                    </div>
                `;
            }

            if (m.estado === 'ANULADO') {
                tr.style.opacity = '0.6';
                tr.style.background = '#fafafa';
            }

            const sesionBadge = m.idSesion ? `<span style="background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; border: 1px solid #cbd5e1;">#${m.idSesion}</span>` : '<span style="color: #cbd5e1;">-</span>';

            tr.innerHTML = `
                <td style="padding: 12px; font-size: 13px; font-weight: 500; color: #334155;">${fechaHoraFormatted}</td>
                <td style="padding: 12px;">${sesionBadge}</td>
                <td style="padding: 12px;">
                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fas ${isIngreso ? 'fa-arrow-up' : 'fa-arrow-down'}"></i> ${m.tipo}
                    </span>
                </td>
                <td style="padding: 12px; font-size: 13px; font-weight: 500; color: #475569;">${m.nombreUsuario || '-'}</td>
                <td style="padding: 12px; font-size: 13px; font-weight: 600; color: #475569;">${m.nombreCategoria}</td>
                <td style="padding: 12px; font-size: 13px; font-weight: 800; color: ${badgeColor};">${formatter.format(m.monto)}</td>
                <td style="padding: 12px; font-size: 13px; color: #64748b; word-break: break-word;">${m.descripcion}</td>
                <td style="padding: 12px; font-size: 13px; font-weight: 500; color: #94a3b8;">${m.referencia || '-'}</td>
                <td style="padding: 8px 12px;">${auditoriaHtml}</td>
                <td style="padding: 12px; text-align: center;">${accionesHtml}</td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-editar-mov').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
                const mov = movimientosManualesList.find(m => m.idMovimiento === id);
                if (mov) abrirModalMovimiento(mov.tipo, id);
            });
        });

        tbody.querySelectorAll('.btn-anular-mov').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.getAttribute('data-id'), 10);
                abrirModalConfirmarAnular(id);
            });
        });

        actualizarControlesPaginacionMovimientos(totalPages);

        requestAnimationFrame(() => {
            window.scrollTo(0, scrollPosition);
            tbody.classList.remove('loading');
        });
    }

    function actualizarControlesPaginacionMovimientos(totalPages) {
        const pageInfo = document.getElementById('movimientos-admin-page-info');
        const btnPrev = document.getElementById('movimientos-admin-prev');
        const btnNext = document.getElementById('movimientos-admin-next');

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

    const btnPrevMov = document.getElementById('movimientos-admin-prev');
    const btnNextMov = document.getElementById('movimientos-admin-next');
    if (btnPrevMov) btnPrevMov.addEventListener('click', () => {
        if (movimientosPage > 1) {
            movimientosPage--;
            renderizarPaginaMovimientos();
        }
    });
    if (btnNextMov) btnNextMov.addEventListener('click', () => {
        const totalPages = Math.ceil(movimientosFiltradosList.length / movimientosPageSize);
        if (movimientosPage < totalPages) {
            movimientosPage++;
            renderizarPaginaMovimientos();
        }
    });

    // ==========================================
    // FILTROS DE MOVIMIENTOS MANUALES (punto 1)
    // ==========================================

    async function poblarDropdownsFiltrosMovimientos() {
        const selectCategoria = document.getElementById('movimientos-filtro-categoria');
        const selectUsuario = document.getElementById('movimientos-filtro-usuario');

        if (selectCategoria) {
            try {
                const res = await fetch('/api/categorias-movimiento');
                if (res.ok) {
                    const categorias = await res.json();
                    const currentCat = selectCategoria.value;
                    selectCategoria.innerHTML = '<option value="">Todas las categorías</option>';
                    categorias.filter(c => c.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(cat => {
                        const opt = document.createElement('option');
                        opt.value = cat.nombre;
                        opt.textContent = cat.nombre;
                        selectCategoria.appendChild(opt);
                    });
                    if (currentCat) selectCategoria.value = currentCat;
                }
            } catch (error) {
                console.error('Error al cargar categorias para filtro:', error);
            }
        }

        if (selectUsuario) {
            try {
                const res = await fetch('/api/usuarios/select');
                if (res.ok) {
                    const usuarios = await res.json();
                    const currentUser = selectUsuario.value;
                    selectUsuario.innerHTML = '<option value="">Todos los usuarios</option>';
                    usuarios
                        .filter(user => {
                            const rol = (user.descripcionRol || '').toLowerCase();
                            return rol.includes('cajero') || rol.includes('administrador') || rol.includes('admin');
                        })
                        .forEach(user => {
                            const opt = document.createElement('option');
                            const nombreCompleto = `${user.nombre} ${user.apellido || ''}`.trim();
                            opt.value = user.nombre;
                            opt.textContent = nombreCompleto;
                            selectUsuario.appendChild(opt);
                        });
                    if (currentUser) selectUsuario.value = currentUser;
                }
            } catch (error) {
                console.error('Error al cargar usuarios para filtro:', error);
            }
        }
    }

    function aplicarFiltrosMovimientos() {
        const searchInput = document.getElementById('movimientos-search-input');
        const filtroTipo = document.getElementById('movimientos-filtro-tipo');
        const filtroCategoria = document.getElementById('movimientos-filtro-categoria');
        const filtroUsuario = document.getElementById('movimientos-filtro-usuario');
        const filtroFechaDesde = document.getElementById('movimientos-filtro-fecha-desde');
        const filtroFechaHasta = document.getElementById('movimientos-filtro-fecha-hasta');

        const texto = searchInput ? normH(searchInput.value.trim()) : '';
        const tipo = filtroTipo ? filtroTipo.value : '';
        const categoria = filtroCategoria ? filtroCategoria.value : '';
        const usuario = filtroUsuario ? filtroUsuario.value : '';
        const fechaDesde = filtroFechaDesde && filtroFechaDesde.value ? new Date(filtroFechaDesde.value + 'T00:00:00') : null;
        const fechaHasta = filtroFechaHasta && filtroFechaHasta.value ? new Date(filtroFechaHasta.value + 'T23:59:59') : null;

        let resultado = movimientosManualesList;

        if (tipo) resultado = resultado.filter(m => m.tipo === tipo);
        if (categoria) resultado = resultado.filter(m => m.nombreCategoria === categoria);
        if (usuario) resultado = resultado.filter(m => m.nombreUsuario === usuario);
        if (fechaDesde) resultado = resultado.filter(m => new Date(m.fechaHora) >= fechaDesde);
        if (fechaHasta) resultado = resultado.filter(m => new Date(m.fechaHora) <= fechaHasta);
        if (texto) {
            resultado = resultado.filter(m =>
                normH(m.descripcion || '').includes(texto) ||
                normH(m.referencia || '').includes(texto)
            );
        }

        // Aplicar ordenamiento por fecha
        resultado = [...resultado].sort((a, b) => {
            const da = new Date(a.fechaHora);
            const db = new Date(b.fechaHora);
            return movSortDir === 'desc' ? db - da : da - db;
        });

        movimientosFiltradosList = resultado;
        movimientosPage = 1;
        renderizarPaginaMovimientos();
    }

    function actualizarIconoSortFecha() {
        const icon = document.getElementById('mov-sort-fecha-icon');
        const btn = document.getElementById('mov-sort-fecha-btn');
        if (icon) {
            icon.className = `fas fa-sort-${movSortDir === 'desc' ? 'down' : 'up'} sort-arrow`;
        }
        if (btn) {
            btn.classList.add('active');
        }
    }

    window.limpiarFiltrosMovimientos = function () {
        const searchInput = document.getElementById('movimientos-search-input');
        const filtroTipo = document.getElementById('movimientos-filtro-tipo');
        const filtroCategoria = document.getElementById('movimientos-filtro-categoria');
        const filtroUsuario = document.getElementById('movimientos-filtro-usuario');
        const filtroFechaDesde = document.getElementById('movimientos-filtro-fecha-desde');
        const filtroFechaHasta = document.getElementById('movimientos-filtro-fecha-hasta');
        if (searchInput) searchInput.value = '';
        if (filtroTipo) filtroTipo.value = '';
        if (filtroCategoria) filtroCategoria.value = '';
        if (filtroUsuario) filtroUsuario.value = '';
        if (filtroFechaDesde) filtroFechaDesde.value = '';
        if (filtroFechaHasta) filtroFechaHasta.value = '';
        aplicarFiltrosMovimientos();
    };

    // Event listeners para filtros de movimientos
    const movSearchInput = document.getElementById('movimientos-search-input');
    const movFiltroTipo = document.getElementById('movimientos-filtro-tipo');
    const movFiltroCategoria = document.getElementById('movimientos-filtro-categoria');
    const movFiltroUsuario = document.getElementById('movimientos-filtro-usuario');
    const movBtnLimpiar = document.getElementById('movimientos-btn-limpiar');
    const movFiltroFechaDesde = document.getElementById('movimientos-filtro-fecha-desde');
    const movFiltroFechaHasta = document.getElementById('movimientos-filtro-fecha-hasta');
    const movSortFechaBtn = document.getElementById('mov-sort-fecha-btn');

    const movBtnBuscar = document.getElementById('movimientos-btn-buscar');

    if (movSearchInput) movSearchInput.addEventListener('input', aplicarFiltrosMovimientos);
    if (movFiltroTipo) movFiltroTipo.addEventListener('change', aplicarFiltrosMovimientos);
    if (movFiltroCategoria) movFiltroCategoria.addEventListener('change', aplicarFiltrosMovimientos);
    if (movFiltroUsuario) movFiltroUsuario.addEventListener('change', aplicarFiltrosMovimientos);

    if (movBtnBuscar) {
        movBtnBuscar.addEventListener('click', () => {
            const fDesde = movFiltroFechaDesde ? movFiltroFechaDesde.value : '';
            const fHasta = movFiltroFechaHasta ? movFiltroFechaHasta.value : '';
            const errorFechas = document.getElementById('error-movimientos-fechas');

            if (errorFechas) errorFechas.style.display = 'none';

            if (fDesde && fHasta && new Date(fDesde) > new Date(fHasta)) {
                if (errorFechas) {
                    errorFechas.textContent = 'La fecha de inicio no puede ser mayor que la fecha de fin';
                    errorFechas.style.display = 'block';
                    setTimeout(() => errorFechas.style.display = 'none', 3000);
                }
                return;
            }

            aplicarFiltrosMovimientos();
        });
    }

    if (movBtnLimpiar) movBtnLimpiar.addEventListener('click', window.limpiarFiltrosMovimientos);

    // Click en botón Fecha para toggle asc/desc
    if (movSortFechaBtn) {
        movSortFechaBtn.addEventListener('click', () => {
            movSortDir = movSortDir === 'desc' ? 'asc' : 'desc';
            actualizarIconoSortFecha();
            aplicarFiltrosMovimientos();
        });
    }

    // Inicializar ícono en estado desc (por defecto)
    actualizarIconoSortFecha();

    // ==========================================
    // MODAL CONFIRMACIÓN: ANULAR MOVIMIENTO (punto 6)
    // ==========================================

    const modalConfirmarAnular = document.getElementById('modal-confirmar-anular-mov');
    const btnConfirmAnular = document.getElementById('confirm-anular-mov');
    const btnCancelAnular = document.getElementById('cancel-anular-mov');
    const btnCancelAnularX = document.getElementById('cancel-anular-mov-x');

    function abrirModalConfirmarAnular(id) {
        movimientoIdParaAnular = id;
        if (modalConfirmarAnular) modalConfirmarAnular.style.display = 'flex';
    }

    function cerrarModalConfirmarAnular() {
        movimientoIdParaAnular = null;
        if (modalConfirmarAnular) modalConfirmarAnular.style.display = 'none';
    }

    if (btnCancelAnular) btnCancelAnular.addEventListener('click', cerrarModalConfirmarAnular);
    if (btnCancelAnularX) btnCancelAnularX.addEventListener('click', cerrarModalConfirmarAnular);

    if (btnConfirmAnular) {
        btnConfirmAnular.addEventListener('click', async () => {
            if (!movimientoIdParaAnular) return;
            const id = movimientoIdParaAnular;
            cerrarModalConfirmarAnular();
            try {
                const res = await fetch(`/api/movimientos-caja/${id}/anular?idAdmin=${usuarioIdActual}`, {
                    method: 'PUT'
                });
                if (res.ok) {
                    showSuccessBanner('Movimiento anulado correctamente.');
                    await cargarMovimientosManualesCaja();
                    await verificarEstadoCaja(true);
                } else {
                    const err = await res.json();
                    alert(err.message || 'Error al anular movimiento.');
                }
            } catch (error) {
                console.error('Error al anular movimiento:', error);
                alert('Ocurri\u00f3 un error al intentar anular el movimiento.');
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalConfirmarAnular && modalConfirmarAnular.style.display !== 'none') {
            cerrarModalConfirmarAnular();
        }
    });

    if (formMovCaja) {
        formMovCaja.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorMovMsg) {
                errorMovMsg.style.display = 'none';
                errorMovMsg.textContent = '';
            }

            const tipo = document.getElementById('movimiento-tipo').value;
            const editId = inputMovIdEdit.value;
            const monto = parseFloat(inputMovMonto.value);
            const idCategoria = selectMovCat.value;
            const referencia = inputMovRef.value.trim();
            const descripcion = txtMovDesc.value.trim();

            let esValido = true;
            if (window.limpiarErroresInline) {
                window.limpiarErroresInline('movimiento-monto');
                window.limpiarErroresInline('movimiento-categoria');
                window.limpiarErroresInline('movimiento-descripcion');
            }

            if (isNaN(monto) || monto <= 0) {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('movimiento-monto', isNaN(monto) ? 'El monto de efectivo es obligatorio.' : 'Por favor ingrese un monto positivo válido.');
                }
                esValido = false;
            }

            if (!idCategoria) {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('movimiento-categoria', 'La categoría es obligatoria.');
                }
                esValido = false;
            }

            if (!descripcion) {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('movimiento-descripcion', 'Las observaciones son obligatorias.');
                }
                esValido = false;
            }

            if (!esValido) return;

            if (tipo === 'EGRESO' && !validarSaldoEgreso()) {
                return;
            }

            const btnConfirmar = document.getElementById('btn-confirmar-movimiento');
            btnConfirmar.disabled = true;
            const originalText = btnConfirmar.textContent;
            btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            try {
                const bodyReq = {
                    tipo: tipo,
                    monto: monto,
                    idUsuario: usuarioIdActual,
                    idCategoriaMovimiento: parseInt(idCategoria, 10),
                    referencia: referencia,
                    descripcion: descripcion
                };

                let res;
                if (editId) {
                    res = await fetch(`/api/movimientos-caja/${editId}?idAdmin=${usuarioIdActual}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bodyReq)
                    });
                } else {
                    res = await fetch('/api/movimientos-caja', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bodyReq)
                    });
                }

                if (res.ok) {
                    cerrarModalMovimiento();
                    showSuccessBanner(editId ? 'Movimiento actualizado exitosamente.' : 'Movimiento registrado exitosamente.');
                    await cargarMovimientosManualesCaja();
                    await verificarEstadoCaja(true);
                } else {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Error al procesar el movimiento.');
                }
            } catch (err) {
                console.error(err);
                if (errorMovMsg) {
                    errorMovMsg.textContent = err.message || 'Ocurrió un error inesperado.';
                    errorMovMsg.style.display = 'block';
                }
            } finally {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = originalText;
            }
        });
    }

    // ==========================================
    // GESTIÓN DE CATEGORÍAS (ADMIN)
    // ==========================================
    const modalCategorias = document.getElementById('modal-gestionar-categorias');
    const btnGestionarCategorias = document.getElementById('btn-admin-gestionar-categorias');
    const btnCerrarModalCat = document.getElementById('btn-cerrar-modal-categorias');
    const formCrearCat = document.getElementById('form-crear-categoria');
    const selectTipoCat = document.getElementById('categoria-nueva-tipo');
    const inputNombreCat = document.getElementById('categoria-nueva-nombre');
    const errorCatMsg = document.getElementById('categoria-error-msg');
    const listaCategoriasDiv = document.getElementById('lista-categorias-existentes');
    const inputFiltroCat = document.getElementById('filtro-categorias');
    const selectFiltroTipoCat = document.getElementById('filtro-tipo-categoria');
    const btnLimpiarCat = document.getElementById('btn-limpiar-categoria');
    const charCountCatSpan = document.getElementById('categoria-char-count');
    let categoriasModalList = [];

    async function abrirModalCategorias() {
        if (!modalCategorias) return;
        formCrearCat.reset();
        if (inputFiltroCat) inputFiltroCat.value = '';
        if (selectFiltroTipoCat) selectFiltroTipoCat.value = 'TODOS';
        if (charCountCatSpan) charCountCatSpan.textContent = '0/50';
        if (errorCatMsg) {
            errorCatMsg.style.display = 'none';
            errorCatMsg.textContent = '';
        }
        if (window.limpiarErroresInline) {
            window.limpiarErroresInline('categoria-nueva-nombre');
        }
        await cargarCategoriasModal();
        modalCategorias.style.display = 'flex';
        setTimeout(() => {
            if (inputNombreCat) inputNombreCat.focus();
        }, 100);
    }

    function cerrarModalCategorias() {
        if (modalCategorias) modalCategorias.style.display = 'none';
    }

    if (btnGestionarCategorias) btnGestionarCategorias.addEventListener('click', abrirModalCategorias);
    if (btnCerrarModalCat) btnCerrarModalCat.addEventListener('click', cerrarModalCategorias);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalCategorias && modalCategorias.style.display !== 'none') {
            cerrarModalCategorias();
        }
    });

    async function cargarCategoriasModal() {
        if (!listaCategoriasDiv) return;
        try {
            listaCategoriasDiv.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 13px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
            const res = await fetch('/api/categorias-movimiento');
            if (!res.ok) throw new Error('Error al cargar categorías');
            categoriasModalList = await res.json();

            filtrarCategoriasModal();
        } catch (error) {
            console.error(error);
            listaCategoriasDiv.innerHTML = '<div style="text-align: center; color: #ef4444; font-size: 13px;">Error al cargar categorías</div>';
        }
    }

    function filtrarCategoriasModal() {
        const texto = inputFiltroCat ? normH(inputFiltroCat.value) : '';
        const tipo = selectFiltroTipoCat ? selectFiltroTipoCat.value : 'TODOS';

        let filtradas = categoriasModalList;

        if (texto) {
            filtradas = filtradas.filter(c => normH(c.nombre).includes(texto));
        }

        if (tipo !== 'TODOS') {
            filtradas = filtradas.filter(c => c.tipo === tipo);
        }

        renderListaCategoriasModal(filtradas);
    }

    function renderListaCategoriasModal(cats) {
        if (!listaCategoriasDiv) return;
        listaCategoriasDiv.innerHTML = '';

        if (cats.length === 0) {
            listaCategoriasDiv.innerHTML = `
                <div style="text-align: center; padding: 30px 10px; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <i class="fas fa-tags" style="font-size: 24px; opacity: 0.5;"></i>
                    <span style="font-size: 13px; font-weight: 500;">No se encontraron categorías</span>
                </div>
            `;
            return;
        }

        cats.forEach(c => {
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 5px;';

            const isIngreso = c.tipo === 'INGRESO';
            const badgeBg = isIngreso ? '#ecfdf5' : '#fef2f2';
            const badgeColor = isIngreso ? '#059669' : '#e11d48';

            const nombreEstilo = c.activo !== false ? 'color: #334155; font-weight: 600; transition: all 0.3s;' : 'color: #94a3b8; font-weight: 600; text-decoration: line-through; transition: all 0.3s;';

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span id="nombre-cat-${c.idCategoriaMovimiento}" style="${nombreEstilo}">${c.nombre}</span>
                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">
                        ${c.tipo}
                    </span>
                </div>
                <label class="switch-caja" title="${c.activo !== false ? 'Desactivar' : 'Activar'}" style="display: flex; align-items: center;">
                    <input type="checkbox" class="input-toggle-cat" data-id="${c.idCategoriaMovimiento}" ${c.activo !== false ? 'checked' : ''}>
                    <span class="slider-caja"></span>
                </label>
            `;
            listaCategoriasDiv.appendChild(item);
        });

        listaCategoriasDiv.querySelectorAll('.input-toggle-cat').forEach(input => {
            input.addEventListener('change', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const isChecked = e.currentTarget.checked;
                const nombreSpan = document.getElementById(`nombre-cat-${id}`);
                const labelContainer = e.currentTarget.parentElement;
                const originalColor = nombreSpan.style.color;
                const originalDecoration = nombreSpan.style.textDecoration;

                // Optimistic UI: Cambiar estilos al instante
                if (isChecked) {
                    nombreSpan.style.color = '#334155';
                    nombreSpan.style.textDecoration = 'none';
                    if (labelContainer) labelContainer.setAttribute('title', 'Desactivar');
                } else {
                    nombreSpan.style.color = '#94a3b8';
                    nombreSpan.style.textDecoration = 'line-through';
                    if (labelContainer) labelContainer.setAttribute('title', 'Activar');
                }

                // Actualizar localmente el estado en el array
                const localCat = categoriasModalList.find(c => c.idCategoriaMovimiento == id);
                if (localCat) localCat.activo = isChecked;

                try {
                    const res = await fetch('/api/categorias-movimiento/' + id + '/toggle-estado', { method: 'PUT' });
                    if (res.ok) {
                        showSuccessBanner('Estado de la categoría actualizado.');
                    } else {
                        // Revertir si la API responde error
                        e.currentTarget.checked = !isChecked;
                        nombreSpan.style.color = originalColor;
                        nombreSpan.style.textDecoration = originalDecoration;
                        if (labelContainer) labelContainer.setAttribute('title', !isChecked ? 'Desactivar' : 'Activar');
                        if (localCat) localCat.activo = !isChecked;
                        const errData = await res.text();
                        alert(errData || 'Error al actualizar estado.');
                    }
                } catch (err) {
                    console.error(err);
                    // Revertir si falla la conexión
                    e.currentTarget.checked = !isChecked;
                    nombreSpan.style.color = originalColor;
                    nombreSpan.style.textDecoration = originalDecoration;
                    if (labelContainer) labelContainer.setAttribute('title', !isChecked ? 'Desactivar' : 'Activar');
                    if (localCat) localCat.activo = !isChecked;
                    alert('Error de conexión al actualizar estado.');
                }
            });
        });
    }

    const ocultarErrorSoft = () => {
        if (errorCatMsg && errorCatMsg.style.display !== 'none') {
            errorCatMsg.style.opacity = '0';
            errorCatMsg.style.transform = 'translateY(-5px)';
            setTimeout(() => {
                errorCatMsg.style.display = 'none';
                errorCatMsg.innerHTML = '';
            }, 300);
        }
    };

    const mostrarErrorSoft = (msg) => {
        if (errorCatMsg) {
            errorCatMsg.innerHTML = `<i class="fas fa-exclamation-circle" style="font-size: 14px;"></i> <span>${msg}</span>`;
            errorCatMsg.style.display = 'flex';
            setTimeout(() => {
                errorCatMsg.style.opacity = '1';
                errorCatMsg.style.transform = 'translateY(0)';
            }, 10);
        }
    };

    if (inputNombreCat) {
        inputNombreCat.addEventListener('input', () => {
            inputNombreCat.style.borderColor = '#cbd5e1';
            ocultarErrorSoft();
            if (window.checkMaxLength) {
                window.checkMaxLength(inputNombreCat, 50);
            }
            if (charCountCatSpan) {
                charCountCatSpan.textContent = `${inputNombreCat.value.length}/50`;
            }
        });
    }

    if (inputFiltroCat) {
        inputFiltroCat.addEventListener('input', filtrarCategoriasModal);
    }

    if (selectFiltroTipoCat) {
        selectFiltroTipoCat.addEventListener('change', filtrarCategoriasModal);
    }

    if (btnLimpiarCat) {
        btnLimpiarCat.addEventListener('click', () => {
            formCrearCat.reset();
            if (inputFiltroCat) inputFiltroCat.value = '';
            if (selectFiltroTipoCat) selectFiltroTipoCat.value = 'TODOS';
            if (charCountCatSpan) charCountCatSpan.textContent = '0/50';
            if (errorCatMsg) {
                errorCatMsg.style.display = 'none';
                errorCatMsg.textContent = '';
            }
            if (window.limpiarErroresInline) {
                window.limpiarErroresInline('categoria-nueva-nombre');
            }
            filtrarCategoriasModal();
            setTimeout(() => {
                if (inputNombreCat) inputNombreCat.focus();
            }, 50);
        });
    }

    if (formCrearCat) {
        formCrearCat.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorCatMsg) {
                errorCatMsg.style.display = 'none';
                errorCatMsg.style.opacity = '0';
                errorCatMsg.style.transform = 'translateY(-5px)';
                errorCatMsg.innerHTML = '';
            }
            if (inputNombreCat) {
                inputNombreCat.style.borderColor = '#cbd5e1';
            }

            const nombre = inputNombreCat.value.trim();
            const tipo = selectTipoCat.value;

            if (!nombre) {
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('categoria-nueva-nombre', 'El nombre de la categoría no puede estar vacío.');
                } else {
                    if (inputNombreCat) inputNombreCat.style.borderColor = '#ef4444';
                    mostrarErrorSoft('El nombre de la categoría no puede estar vacío.');
                }
                return;
            }

            const btnCrear = formCrearCat.querySelector('button[type="submit"]');
            btnCrear.disabled = true;
            btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

            try {
                const res = await fetch('/api/categorias-movimiento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre: nombre, tipo: tipo })
                });

                if (res.ok) {
                    inputNombreCat.value = '';
                    if (charCountCatSpan) charCountCatSpan.textContent = '0/50';
                    if (window.limpiarErroresInline) {
                        window.limpiarErroresInline('categoria-nueva-nombre');
                    }
                    showSuccessBanner('Categoría creada exitosamente.');
                    await cargarCategoriasModal();
                } else {
                    const text = await res.text();
                    throw new Error(text || 'Error al crear la categoría.');
                }
            } catch (err) {
                console.error(err);
                if (window.mostrarErrorInline) {
                    window.mostrarErrorInline('categoria-nueva-nombre', err.message || 'Error al guardar la categoría.');
                } else {
                    if (inputNombreCat) inputNombreCat.style.borderColor = '#ef4444';
                    mostrarErrorSoft(err.message || 'Error al guardar la categoría.');
                }
            } finally {
                btnCrear.disabled = false;
                btnCrear.textContent = 'Crear';
            }
        });
    }

    window.cargarMovimientosManualesCaja = cargarMovimientosManualesCaja;

    window.addEventListener('click', (e) => {
        if (e.target === modalMovCaja) cerrarModalMovimiento();
        if (e.target === modalCategorias) cerrarModalCategorias();
    });

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

    // ==========================================================
    // LÓGICA DE COBRANZA DE VENTAS (POS) - ADAPTADO DE CAJERO
    // ==========================================================
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

        // Mostrar / Ocultar el bloque de Pagos Cargados
        if (contenedorPagos) {
            if (cobrosCajero.length > 0) {
                contenedorPagos.style.display = 'block';
            } else {
                contenedorPagos.style.display = 'none';
            }
        }

        // Renderizar lista de pagos
        if (listaEl && cobrosCajero.length > 0) {
            listaEl.innerHTML = cobrosCajero.map((cobro, idx) => `
                <div class="pos-payment-tag-light">
                    <div>
                        <strong style="color: #0f172a;">${cobro.nombreMetodo}</strong>
                        ${cobro.vuelto > 0 ? `<span id="vuelto-label-${idx}" style="font-size: 11px; color: #059669; margin-left: 6px;">(Vuelto: ${formatter.format(cobro.vuelto)})</span>` : ''}
                    </div>
                    <!-- MODO VISTA -->
                    <div id="view-mode-${idx}" style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 800; color: #0f172a;">${formatter.format(cobro.monto)}</span>
                        <button type="button" data-idx="${idx}" class="btn-editar-cobro-pos btn-edit-cobro" title="Editar monto">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button type="button" data-idx="${idx}" class="btn-eliminar-cobro-pos btn-remove-cobro" title="Eliminar cobro">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <!-- MODO EDICIÓN -->
                    <div id="edit-mode-${idx}" style="display: none; flex-direction: column; gap: 4px; align-items: flex-end;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="text" id="input-edit-monto-${idx}" class="pos-edit-input" value="${new Intl.NumberFormat('es-AR').format(cobro.montoPagado || cobro.monto)}" maxlength="10">
                            <button type="button" data-idx="${idx}" class="btn-confirmar-edit-pos btn-confirm-cobro" title="Confirmar">
                                <i class="fas fa-check"></i>
                            </button>
                            <button type="button" data-idx="${idx}" class="btn-cancelar-edit-pos btn-cancel-cobro" title="Cancelar">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="error-message" id="error-input-edit-monto-${idx}" style="display: none; font-size: 10px;"></div>
                    </div>
                </div>
            `).join('');

            listaEl.querySelectorAll('.btn-eliminar-cobro-pos').forEach(btn => {
                btn.addEventListener('click', function () {
                    const index = parseInt(this.dataset.idx);
                    cobrosCajero.splice(index, 1);
                    renderCobrosCajero();
                });
            });

            listaEl.querySelectorAll('.btn-editar-cobro-pos').forEach(btn => {
                btn.addEventListener('click', function () {
                    clearErrorPOS();
                    const index = parseInt(this.dataset.idx);
                    const viewMode = document.getElementById(`view-mode-${index}`);
                    const editMode = document.getElementById(`edit-mode-${index}`);
                    const inputEdit = document.getElementById(`input-edit-monto-${index}`);

                    if (viewMode && editMode && inputEdit) {
                        cobrosCajero.forEach((_, i) => {
                            if (i !== index) {
                                const vm = document.getElementById(`view-mode-${i}`);
                                const em = document.getElementById(`edit-mode-${i}`);
                                if (vm) vm.style.display = 'flex';
                                if (em) em.style.display = 'none';
                            }
                        });

                        viewMode.style.display = 'none';
                        editMode.style.display = 'flex';
                        inputEdit.focus();
                        inputEdit.select();
                    }
                });
            });

            listaEl.querySelectorAll('.btn-cancelar-edit-pos').forEach(btn => {
                btn.addEventListener('click', function () {
                    clearErrorPOS();
                    const index = parseInt(this.dataset.idx);
                    const viewMode = document.getElementById(`view-mode-${index}`);
                    const editMode = document.getElementById(`edit-mode-${index}`);
                    if (viewMode && editMode) {
                        viewMode.style.display = 'flex';
                        editMode.style.display = 'none';
                    }
                });
            });

            listaEl.querySelectorAll('.pos-edit-input').forEach(input => {
                input.addEventListener('input', function () {
                    clearErrorPOS();
                    let raw = this.value.replace(/\D/g, '');
                    if (raw === '') {
                        this.value = '';
                        if (window.limpiarErroresInline) window.limpiarErroresInline(this.id);
                        return;
                    }
                    this.value = new Intl.NumberFormat('es-AR').format(parseFloat(raw));

                    if (this.value.length >= 10) {
                        if (window.mostrarErrorInline) window.mostrarErrorInline(this.id, "Límite de 10 caracteres alcanzado.");
                    } else {
                        if (window.limpiarErroresInline) window.limpiarErroresInline(this.id);
                    }
                });

                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        const index = this.id.split('-').pop();
                        const confirmBtn = listaEl.querySelector(`.btn-confirmar-edit-pos[data-idx="${index}"]`);
                        if (confirmBtn) confirmBtn.click();
                    } else if (e.key === 'Escape') {
                        const index = this.id.split('-').pop();
                        const cancelBtn = listaEl.querySelector(`.btn-cancelar-edit-pos[data-idx="${index}"]`);
                        if (cancelBtn) cancelBtn.click();
                    }
                });
            });

            listaEl.querySelectorAll('.btn-confirmar-edit-pos').forEach(btn => {
                btn.addEventListener('click', function () {
                    const index = parseInt(this.dataset.idx);
                    const inputEdit = document.getElementById(`input-edit-monto-${index}`);
                    if (!inputEdit) return;

                    const raw = inputEdit.value.replace(/\D/g, '');
                    const nuevoMonto = parseFloat(raw);

                    if (isNaN(nuevoMonto) || nuevoMonto <= 0) {
                        showErrorPOS('Debe ingresar un monto válido.');
                        return;
                    }

                    const cobro = cobrosCajero[index];
                    const esEfectivo = cobro.nombreMetodo.toLowerCase().includes('efectivo');
                    const totalVenta = ventaSeleccionada.total || 0;
                    const totalAportadoOtros = cobrosCajero.reduce((acc, c, i) => acc + (i !== index ? (c.monto || 0) : 0), 0);
                    const saldoPendienteSinEste = Math.max(0, totalVenta - totalAportadoOtros);

                    let montoAplicado = nuevoMonto;
                    let vueltoCalculado = 0;

                    if (esEfectivo) {
                        if (nuevoMonto > saldoPendienteSinEste) {
                            vueltoCalculado = nuevoMonto - saldoPendienteSinEste;
                            montoAplicado = saldoPendienteSinEste;
                        }
                    } else {
                        if (nuevoMonto > saldoPendienteSinEste + 0.05) {
                            showErrorPOS(`El monto ingresado supera el saldo pendiente de ${formatter.format(saldoPendienteSinEste)}.`);
                            return;
                        }
                    }

                    cobro.monto = montoAplicado;
                    cobro.montoPagado = nuevoMonto;
                    cobro.vuelto = vueltoCalculado;

                    renderCobrosCajero();
                });
            });
        }

        // Calcular vuelto
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

    // Agregar un pago
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

        const indexExistente = cobrosCajero.findIndex(c => c.idMetodoPago === parseInt(idMetodo));
        if (indexExistente !== -1) {
            cobrosCajero[indexExistente].monto += montoAplicado;
            cobrosCajero[indexExistente].montoPagado += montoIngresado;
            cobrosCajero[indexExistente].vuelto += vueltoCalculado;
        } else {
            cobrosCajero.push({
                idMetodoPago: parseInt(idMetodo),
                nombreMetodo: nombreMetodo,
                tipoTarjeta: tipoTarjeta,
                monto: montoAplicado,
                montoPagado: montoIngresado,
                vuelto: vueltoCalculado
            });
        }

        if (inputRecibido) inputRecibido.value = '';
        if (selectMetodo) {
            selectMetodo.value = '';
            selectMetodo.dispatchEvent(new Event('change'));
        }
        renderCobrosCajero();
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

    // Cargar ventas pendientes
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
                            Debes abrir la caja antes de poder cobrar órdenes de venta.
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

    // Seleccionar una venta
    function seleccionarVenta(venta) {
        ventaSeleccionada = venta;
        cobrosCajero = [];

        document.getElementById('pos-orden-id').textContent = `#${venta.idVenta}`;
        document.getElementById('pos-orden-cliente').textContent = venta.nombreCliente || 'Cliente N/A';
        document.getElementById('pos-orden-vendedor').textContent = venta.nombreVendedor || '-';
        document.getElementById('pos-total-display').textContent = formatter.format(venta.total);

        const descDiv = document.getElementById('pos-descuento-detalle');
        const descMonto = document.getElementById('pos-descuento-monto');
        if (venta.descuentoMonto && venta.descuentoMonto > 0) {
            descDiv.style.display = 'block';
            descMonto.textContent = `-${formatter.format(venta.descuentoMonto)}`;
        } else {
            descDiv.style.display = 'none';
        }

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

        const inputRecibido = document.getElementById('pos-monto-recibido');
        if (inputRecibido) inputRecibido.value = '';
        document.getElementById('pos-error-message').style.display = 'none';

        renderCobrosCajero();

        document.getElementById('pos-vacio-state').style.display = 'none';
        document.getElementById('pos-activo-panel').style.display = 'flex';

        loadVentasPendientes(true);
    }

    // Deseleccionar una venta
    function deseleccionarVenta() {
        ventaSeleccionada = null;
        cobrosCajero = [];
        document.getElementById('pos-activo-panel').style.display = 'none';
        document.getElementById('pos-vacio-state').style.display = 'flex';
        loadVentasPendientes(true);
    }

    function showErrorPOS(msg) {
        const errorMsg = document.getElementById('pos-error-message');
        if (errorMsg) {
            errorMsg.textContent = msg;
            errorMsg.style.display = 'block';
            errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function clearErrorPOS() {
        const errorMsg = document.getElementById('pos-error-message');
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }
        if (window.limpiarErroresInline) {
            window.limpiarErroresInline('pos-monto-recibido');
        }
    }

    // Set up DOM Event Listeners for POS Cobros inside caja.js
    const selectMetodoPos = document.getElementById('pos-metodo-pago');
    if (selectMetodoPos) {
        selectMetodoPos.addEventListener('change', function () {
            clearErrorPOS();
            const nombre = (this.options[this.selectedIndex]?.text || '').toLowerCase();
            const esEfectivo = nombre.includes('efectivo');
            const efPanel = document.getElementById('pos-efectivo-panel');
            if (efPanel) efPanel.style.display = esEfectivo ? 'flex' : 'none';
            renderCobrosCajero();
        });
    }

    const posMontoRecibidoInput = document.getElementById('pos-monto-recibido');
    if (posMontoRecibidoInput) {
        posMontoRecibidoInput.addEventListener('input', function () {
            clearErrorPOS();
            let raw = this.value.replace(/[^0-9]/g, '');
            if (raw === '') {
                this.value = '';
                if (window.limpiarErroresInline) window.limpiarErroresInline(this.id);
                renderCobrosCajero();
                return;
            }
            this.value = new Intl.NumberFormat('es-AR').format(parseInt(raw, 10));

            if (this.value.length >= 10) {
                if (window.mostrarErrorInline) window.mostrarErrorInline(this.id, "Límite de 10 caracteres alcanzado.");
            } else {
                if (window.limpiarErroresInline) window.limpiarErroresInline(this.id);
            }
            renderCobrosCajero();
        });
    }

    document.querySelectorAll('.btn-pos-bill').forEach(btn => {
        btn.addEventListener('click', function () {
            clearErrorPOS();
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

    const btnPosExactoEl = document.getElementById('btn-pos-exacto');
    if (btnPosExactoEl) {
        btnPosExactoEl.addEventListener('click', function () {
            clearErrorPOS();
            const input = document.getElementById('pos-monto-recibido');
            if (!input || !ventaSeleccionada) return;

            const totalAportado = cobrosCajero.reduce((acc, c) => acc + (c.monto || 0), 0);
            const saldoPendiente = Math.max(0, ventaSeleccionada.total - totalAportado);

            input.value = new Intl.NumberFormat('es-AR').format(Math.ceil(saldoPendiente));
            renderCobrosCajero();
        });
    }

    const btnPosAgregarPagoEl = document.getElementById('btn-pos-agregar-pago');
    if (btnPosAgregarPagoEl) {
        btnPosAgregarPagoEl.addEventListener('click', agregarPagoCajero);
    }

    const btnPosLimpiarCamposEl = document.getElementById('btn-pos-limpiar-campos');
    if (btnPosLimpiarCamposEl) {
        btnPosLimpiarCamposEl.addEventListener('click', function () {
            const selectMetodo = document.getElementById('pos-metodo-pago');
            const inputRecibido = document.getElementById('pos-monto-recibido');
            if (inputRecibido) inputRecibido.value = '';
            if (selectMetodo) {
                selectMetodo.value = '';
                selectMetodo.dispatchEvent(new Event('change'));
            }
            clearErrorPOS();
        });
    }

    // Modal Anular Orden Event Listeners
    const modalAnularOrden = document.getElementById('modal-anular-orden');
    const btnPosAnularOrden = document.getElementById('btn-pos-anular-orden');
    const btnCancelarAnularModal = document.getElementById('btn-cancelar-anular-modal');
    const btnConfirmarAnularModal = document.getElementById('btn-confirmar-anular-modal');
    const selectAnularMotivo = document.getElementById('anular-motivo-select');
    const txtAnularObs = document.getElementById('anular-obs-text');
    const countAnularObs = document.getElementById('anular-obs-count');
    const errAnularMotivo = document.getElementById('error-anular-motivo');

    function limpiarErrorMotivoAnulacion() {
        if (selectAnularMotivo) {
            selectAnularMotivo.style.borderColor = '#cbd5e1';
            selectAnularMotivo.style.background = '#f8fafc';
        }
        if (errAnularMotivo) errAnularMotivo.style.display = 'none';
    }

    function mostrarErrorMotivoAnulacion() {
        if (selectAnularMotivo) {
            selectAnularMotivo.style.borderColor = '#ef4444';
            selectAnularMotivo.style.background = '#f8fafc';
        }
        if (errAnularMotivo) errAnularMotivo.style.display = 'flex';
    }

    if (selectAnularMotivo) {
        selectAnularMotivo.addEventListener('change', () => {
            if (selectAnularMotivo.value) limpiarErrorMotivoAnulacion();
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
            const modalAnularOrdenId = document.getElementById('modal-anular-orden-id');
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

    // Botón Registrar Cobro
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

                if (typeof window.mostrarModalTicket === 'function') {
                    window.mostrarModalTicket(ventaCobrada.idVenta);
                }

                document.dispatchEvent(new CustomEvent('ventaRegistrada'));
                salesChannel.postMessage({ type: 'venta_cobrada', idVenta: ventaCobrada.idVenta });

                deseleccionarVenta();

            } catch (err) {
                console.error('Error al procesar cobro:', err);
                showErrorPOS(err.message);
            } finally {
                btnPosCobrar.disabled = false;
                btnPosCobrar.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar y Registrar Cobro';
            }
        });
    }

    // Exponer globalmente para la carga desde el menú
    window.loadVentasPendientes = loadVentasPendientes;

    // BroadcastChannel para cambios de órdenes en tiempo real
    salesChannel.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'nueva_orden') {
            loadVentasPendientes(true);
        }
    });

    // Polling backup
    setInterval(() => {
        const ventasCobrarContainer = document.getElementById('ventas-cobrar-container');
        const isVisible = ventasCobrarContainer && ventasCobrarContainer.style.display === 'block';
        if (cajaEstaAbierta && isVisible) {
            loadVentasPendientes(true);
        }
    }, 5000);

    // Cargar métodos al inicio
    loadMetodosPagoActivos();

    document.addEventListener('comprasActualizadas', function () {
        if (typeof verificarEstadoCaja === 'function') {
            verificarEstadoCaja();
        }
    });

});
