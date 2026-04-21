document.addEventListener('DOMContentLoaded', function () {
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

    const formatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

    // Verificar el estado de la caja de forma automática al cargar
    async function verificarEstadoCaja() {
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

            if (!cajaEstaAbierta) {
                // CONFIGURACIÓN PARA APERTURA
                saldoAnteriorGlobal = data.saldoAnterior || 0.0;

                spanSaldoAnterior.textContent = formatter.format(saldoAnteriorGlobal);
                inputMontoInicial.value = saldoAnteriorGlobal.toFixed(2);

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

                cargarDashboardCierre();
            }

        } catch (error) {
            console.error('Error verificando la caja:', error);
        }
    }

    async function cargarDashboardCierre() {
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
            document.getElementById('caja-card-total-ventas').textContent = formatter.format(resumenData.totalVentas || 0);
            document.getElementById('caja-card-cantidad-ventas').textContent = resumenData.cantidadVentas || 0;
            document.getElementById('caja-card-efectivo').textContent = formatter.format(resumenData.totalEfectivo || 0);
            document.getElementById('caja-card-tarjeta').textContent = formatter.format(resumenData.totalTarjeta || 0);
            document.getElementById('caja-card-transferencia').textContent = formatter.format(resumenData.totalTransferencia || 0);

            // 3. Poblamos Tabla de Desglose (siempre mostramos los 3 métodos por defecto)
            const tbodyDesglose = document.getElementById('caja-tabla-desglose');
            tbodyDesglose.innerHTML = '';

            const metodosDefault = [
                { nombre: 'Efectivo',      iconoClass: 'fas fa-money-bill',   spanClass: 'icon-efectivo' },
                { nombre: 'Tarjeta',       iconoClass: 'fas fa-credit-card',  spanClass: 'icon-tarjeta' },
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

            // 4. Lógica de Fondo Fijo y Retiro
            const totalEfectivoTeorico = resumenData.saldoEsperado || ((resumenData.montoInicial || 0) + (resumenData.totalEfectivo || 0) - (resumenData.totalCompras || 0));
            
            // Popula Efvo Esperado en el sidebar derecho
            const labelEsperado = document.getElementById('caja-sidebar-efectivo-esperado');
            if(labelEsperado) labelEsperado.textContent = formatter.format(totalEfectivoTeorico).replace('$', '').trim();
            
            // Sugerencia para el monto físico
            if(inputMontoFinalFisico) {
                inputMontoFinalFisico.value = '';
            }
            // Sugerencia para dejar el monto inicial como fondo fijo para mañana
            if(inputFondoFijo) {
                inputFondoFijo.value = (resumenData.montoInicial || 0).toFixed(2);
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
        inputMontoInicial.addEventListener('input', () => {
            const value = parseFloat(inputMontoInicial.value) || 0;
            if (Math.abs(value - saldoAnteriorGlobal) > 0.01) {
                warningText.style.display = 'block';
            } else {
                warningText.style.display = 'none';
            }
        });
    }

    if (warningFinalText && inputMontoFinalFisico) {
        inputMontoFinalFisico.addEventListener('input', () => {
            const value = parseFloat(inputMontoFinalFisico.value);
            const esperado = resumenCajaActual ? (resumenCajaActual.saldoEsperado || 0) : 0;
            
            if (!isNaN(value) && Math.abs(value - esperado) > 0.01) {
                warningFinalText.style.display = 'block';
            } else {
                warningFinalText.style.display = 'none';
            }
        });
    }

    // Bloquear caracteres no numéricos en inputs de cierre
    [inputMontoFinalFisico, inputFondoFijo].forEach(input => {
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (['e', 'E', '+', '-'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }
    });

    if (btnAbrirCaja) {
        btnAbrirCaja.addEventListener('click', async () => {
            const montoInicial = parseFloat(inputMontoInicial.value);
            if (isNaN(montoInicial) || montoInicial < 0) {
                showError('Por favor, ingresa un monto físico válido.');
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
            const fondoFijoVal = parseFloat(inputFondoFijo.value) || 0;
            const montoFisicoVal = parseFloat(inputMontoFinalFisico.value) || 0;

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
            const totalEfTeorico = data.saldoEsperado || ((data.montoInicial || 0) + (data.totalEfectivo || 0) - (data.totalCompras || 0));
            const diferencia = montoFisicoVal - totalEfTeorico;

            // Header - Responsable y Sesión
            const respNode = document.getElementById('modal-cierre-responsable');
            if (respNode) respNode.textContent = spanOperador ? spanOperador.textContent.split(' (')[0] : 'Usuario';
            const sesionNode = document.getElementById('modal-cierre-sesion');
            if (sesionNode) sesionNode.textContent = `Sesión #${data.idSesion || '---'}`;
            
            // Tiempos reales
            const horaApertura = data.fechaApertura ? new Date(data.fechaApertura).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'}) : '--:--';
            const horaCierre = new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
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
            if (gaNode) gaNode.textContent = `-${formatter.format(data.totalCompras || 0)}`;
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
                    diffSpan.className = 'diff-pill error';
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
            const montoFisicoVal = parseFloat(inputMontoFinalFisico.value) || 0;
            generarCierrePDF(fondoFijoVal, montoFisicoVal);
        });
    }

    // Botón Confirmar del Modal (LA CIERRE REAL)
    if (btnConfirmarCierre) {
        btnConfirmarCierre.addEventListener('click', async () => {
            const fondoFijoValStr = inputFondoFijo.value;
            const montoFisicoVal = parseFloat(inputMontoFinalFisico.value);
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
                    verificarEstadoCaja();
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
        if(!window.jspdf || !window.jspdf.jsPDF) {
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
        doc.text("CIERRE DE CAJA X", 40, 10, {align: "center"});
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha: ${new Date().toLocaleString('es-AR')}`, 5, 20);
        
        let y = 30;
        doc.text("RESUMEN DE OPERACIONES", 40, y, {align: "center"});
        doc.line(5, y+2, 75, y+2);
        
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
        doc.text("DESGLOSE POR PAGOS", 40, y, {align: "center"});
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
        doc.text("ARQUEO DE FONDOS", 40, y, {align: "center"});
        doc.line(5, y+2, 75, y+2);
        doc.setFont("helvetica", "normal");
        
        y += 8;
        const totalEfTeorico = data.saldoEsperado || ((data.montoInicial || 0) + (data.totalEfectivo || 0) - (data.totalCompras || 0));
        doc.text(`Efectivo Esperado: ${formatter.format(totalEfTeorico)}`, 5, y);
        y += 6;
        doc.text(`Efectivo Físico Aud: ${formatter.format(montoFisicoReal)}`, 5, y);
        
        let diff = montoFisicoReal - totalEfTeorico;
        y += 6;
        if(Math.abs(diff) < 0.05) { // Tolerancia decimal
            doc.text(`Diferencia: EXACTO ($0.00)`, 5, y);
        } else if(diff < 0) {
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
        doc.text("---------------------------------", 40, y, {align: "center"});
        y += 5;
        doc.text("Firma Responsable", 40, y, {align: "center"});

        doc.save(`CierreCaja_${new Date().toISOString().slice(0,10)}.pdf`);
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
            if(!response.ok) throw new Error('Error obteniendo ventas');
            const ventas = await response.json();

            // Filtrar las ventas que sucedieron despues de la apertura de caja
            const fechaRef = new Date(fechaApertura).getTime();
            let ingresosSesion = ventas.filter(v => new Date(v.fecha).getTime() >= fechaRef);
            
            // Ordenar de más reciente a más antigua
            ingresosSesion.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

            // Funcion de renderizado
            function renderLista(data) {
                listaIngresos.innerHTML = '';
                if(data.length === 0) {
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
                    if(venta.productos && venta.productos.length > 0) {
                        const firstProd = venta.productos[0];
                        nombreDetalle = firstProd.nombreProducto || firstProd.nombre || 'Producto';
                        if(venta.productos.length > 1) nombreDetalle += ` (+${venta.productos.length - 1})`;
                    }

                    const fechaVenta = new Date(venta.fecha);
                    const horaFormatted = fechaVenta.getHours().toString().padStart(2, '0') + ':' + fechaVenta.getMinutes().toString().padStart(2,'0') + ' hrs';

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
            if(filtroSelect && filtroSelect.parentNode) {
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

    window.showCajaSubsection = function(subsectionId) {
        if (cajaOperacionesContainer) cajaOperacionesContainer.style.display = 'block';
        verificarEstadoCaja();
    };

});
