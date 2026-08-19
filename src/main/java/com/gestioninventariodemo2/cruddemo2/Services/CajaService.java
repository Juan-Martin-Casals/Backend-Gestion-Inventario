package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.AperturaCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CajaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CierreCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CajaDetalleDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DesgloseCobroDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.HistorialSesionDTO;
import com.gestioninventariodemo2.cruddemo2.Model.SesionCaja;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Repository.SesionCajaRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.CompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.CobroRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.PagoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.MovimientoCajaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CajaService {

    private final SesionCajaRepository sesionCajaRepository;
    private final UsuarioRepository usuarioRepository;
    private final VentaRepository ventaRepository;
    private final CompraRepository compraRepository;
    private final CobroRepository cobroRepository;
    private final PagoRepository pagoRepository;
    private final MovimientoCajaRepository movimientoCajaRepository;

    /**
     * Verifica si existe alguna caja ABIERTA a nivel global
     */
    public boolean verificarCajaActiva(Long idUsuario) {
        return sesionCajaRepository.findFirstByEstado("ABIERTA").isPresent();
    }

    /**
     * Devuelve el monto final de la última caja cerrada globalmente para usarlo de
     * referencia.
     */
    public Double obtenerSaldoUltimoCierre() {
        return sesionCajaRepository.findFirstByEstadoOrderByFechaCierreDesc("CERRADA")
                .map(sesion -> {
                    if (sesion.getFondoProximaApertura() != null) {
                        return sesion.getFondoProximaApertura();
                    }
                    return sesion.getMontoFinalReal() != null ? sesion.getMontoFinalReal() : 0.0;
                })
                .orElse(0.0);
    }

    /**
     * Devuelve información detallada del último cierre de caja (saldo, operador, rol, fecha).
     */
    public Map<String, Object> obtenerDetalleUltimoCierre() {
        return sesionCajaRepository.findFirstByEstadoOrderByFechaCierreDesc("CERRADA")
                .map(sesion -> {
                    Map<String, Object> detalle = new HashMap<>();
                    Double saldo = 0.0;
                    boolean esFondoFijo = false;
                    
                    if (sesion.getFondoProximaApertura() != null) {
                        saldo = sesion.getFondoProximaApertura();
                        esFondoFijo = true;
                    } else if (sesion.getMontoFinalReal() != null) {
                        saldo = sesion.getMontoFinalReal();
                    }

                    detalle.put("saldo", saldo);
                    detalle.put("esFondoFijo", esFondoFijo);
                    detalle.put("fecha", sesion.getFechaCierre() != null ? sesion.getFechaCierre().toString() : null);
                    if (sesion.getUsuario() != null) {
                        detalle.put("operador", sesion.getUsuario().getNombre() + " " + sesion.getUsuario().getApellido());
                        detalle.put("rol", sesion.getUsuario().getRol() != null ? sesion.getUsuario().getRol().getDescripcion() : "N/A");
                    } else {
                        detalle.put("operador", "Desconocido");
                        detalle.put("rol", "N/A");
                    }
                    
                    if (sesion.getUsuarioCierre() != null) {
                        detalle.put("operadorCierre", sesion.getUsuarioCierre().getNombre() + " " + sesion.getUsuarioCierre().getApellido());
                        detalle.put("rolCierre", sesion.getUsuarioCierre().getRol() != null ? sesion.getUsuarioCierre().getRol().getDescripcion() : "N/A");
                    } else {
                        detalle.put("operadorCierre", detalle.get("operador"));
                        detalle.put("rolCierre", detalle.get("rol"));
                    }
                    return detalle;
                })
                .orElseGet(() -> {
                    Map<String, Object> vacio = new HashMap<>();
                    vacio.put("saldo", 0.0);
                    return vacio;
                });
    }

    /**
     * Ejecuta la apertura de una nueva sesión de caja.
     */
    public CajaResponseDTO abrirCaja(AperturaCajaRequestDTO request) {
        Usuario usuario = usuarioRepository.findById(request.getIdUsuario())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + request.getIdUsuario()));

        // 1. Verificación de Rol
        String rol = usuario.getRol() != null ? usuario.getRol().getDescripcion() : "";
        if (!"CAJERO".equalsIgnoreCase(rol) && !"ADMINISTRADOR".equalsIgnoreCase(rol)) {
            throw new RuntimeException("No tiene permisos para abrir la caja. Solo CAJERO o ADMINISTRADOR.");
        }

        // 2. Verificación de Seguridad (Global)
        if (sesionCajaRepository.findFirstByEstado("ABIERTA").isPresent()) {
            throw new RuntimeException("Ya existe un turno de caja abierto en el sistema. Debe cerrarlo antes de abrir uno nuevo.");
        }

        // 3. Traer Saldo Anterior
        Double saldoAnteriorRef = obtenerSaldoUltimoCierre();

        // 4. Evaluar Diferencias de Auditoría
        boolean diferencia = !saldoAnteriorRef.equals(request.getMontoInicialReal());

        // 5. Instanciar y Guardar
        SesionCaja nuevaSesion = SesionCaja.builder()
                .usuario(usuario)
                .fechaApertura(LocalDateTime.now())
                .saldoAnterior(saldoAnteriorRef)
                .montoInicialReal(request.getMontoInicialReal())
                .diferenciaApertura(diferencia)
                .observacionesApertura(request.getObservacionesApertura())
                .estado("ABIERTA")
                // Inicializamos los otros aunque sean null (se llenan en el cierre)
                .montoFinalReal(null)
                .fechaCierre(null)
                .build();

        SesionCaja guardada = sesionCajaRepository.save(nuevaSesion);
        return mapToDTO(guardada);
    }

    public CajaDetalleDTO obtenerResumenCaja(Long idUsuario) {
        SesionCaja sesion = sesionCajaRepository.findFirstByEstado("ABIERTA")
                .orElseThrow(() -> new RuntimeException("No hay un turno de caja abierto en el sistema."));

        LocalDateTime inicio = sesion.getFechaApertura();
        LocalDateTime fin = LocalDateTime.now();

        Double totalVentas = ventaRepository.sumTotalVentasEnRango(inicio, fin);
        if (totalVentas == null)
            totalVentas = 0.0;

        Long cantidadVentas = ventaRepository.countVentasEnRango(inicio, fin);
        if (cantidadVentas == null)
            cantidadVentas = 0L;

        Double totalCompras = compraRepository.sumTotalComprasEnRango(inicio, fin);
        if (totalCompras == null)
            totalCompras = 0.0;

        // Desglose por Método de Pago (Cobros -> Ingresos por Ventas)
        List<Object[]> resultadosCobros = cobroRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
        List<DesgloseCobroDTO> desglose = new ArrayList<>();

        Double calcEfectivo = 0.0;
        Double calcTarjeta = 0.0;
        Double calcTransferencia = 0.0;

        for (Object[] row : resultadosCobros) {
            String metodo = (String) row[0];
            Double sumImporte = 0.0;
            if (row[1] instanceof BigDecimal) {
                sumImporte = ((BigDecimal) row[1]).doubleValue();
            } else if (row[1] instanceof Double) {
                sumImporte = (Double) row[1];
            }
            Long countOp = ((Number) row[2]).longValue();

            desglose.add(DesgloseCobroDTO.builder()
                    .metodoPago(metodo)
                    .cantidadOperaciones(countOp)
                    .totalIngresado(sumImporte)
                    .build());

            if (metodo != null) {
                String m = metodo.toLowerCase();
                if (m.contains("efectivo") && !m.contains("aporte externo")) {
                    calcEfectivo += sumImporte;
                } else if (m.contains("tarjeta")) {
                    calcTarjeta += sumImporte;
                } else if (m.contains("transferencia") || m.contains("mp") || m.contains("mercado")) {
                    calcTransferencia += sumImporte;
                }
            }
        }

        // Obtener Total por tipo de Pago de Compras
        List<Object[]> resultadosPagos = pagoRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
        Double calcEfectivoCajaPagos = 0.0;
        for (Object[] row : resultadosPagos) {
            String metodo = (String) row[0];
            Double sumImporte = 0.0;
            if (row[1] instanceof BigDecimal) {
                sumImporte = ((BigDecimal) row[1]).doubleValue();
            } else if (row[1] instanceof Double) {
                sumImporte = (Double) row[1];
            }

            if (metodo != null) {
                String m = metodo.toLowerCase();
                // Solo sustrae de caja si se pago con "efectivo (caja)" o el "efectivo" viejo.
                if (m.contains("efectivo") && !m.contains("aporte externo")) {
                    calcEfectivoCajaPagos += sumImporte;
                }
            }
        }

        // Movimientos manuales
        Double ingresosManuales = movimientoCajaRepository.sumIngresosBySesion(sesion.getIdSesion());
        Double egresosManuales = movimientoCajaRepository.sumEgresosBySesion(sesion.getIdSesion());
        if (ingresosManuales == null) ingresosManuales = 0.0;
        if (egresosManuales == null) egresosManuales = 0.0;

        // Saldo esperado en caja = Monto inicial + Ventas cobradas por Efectivo - Compras pagadas por Efectivo + Ingresos manuales - Egresos manuales
        Double saldoEsperado = sesion.getMontoInicialReal() + calcEfectivo - calcEfectivoCajaPagos + ingresosManuales - egresosManuales;

        return CajaDetalleDTO.builder()
                .idSesion(sesion.getIdSesion())
                .montoInicial(sesion.getMontoInicialReal())
                .totalVentas(totalVentas)
                .totalCompras(totalCompras)
                .totalComprasEfectivo(calcEfectivoCajaPagos)
                .saldoEsperado(saldoEsperado)
                .fechaApertura(sesion.getFechaApertura())
                .cantidadVentas(cantidadVentas)
                .totalEfectivo(calcEfectivo)
                .totalTarjeta(calcTarjeta)
                .totalTransferencia(calcTransferencia)
                .desgloseCobros(desglose)
                .ingresosManuales(ingresosManuales)
                .egresosManuales(egresosManuales)
                .build();
    }

    public CajaDetalleDTO obtenerResumenGlobalActivo() {
        List<SesionCaja> sesionesAbiertas = sesionCajaRepository.findAllByEstado("ABIERTA");

        Double totalVentasGlobal = 0.0;
        Long cantidadVentasGlobal = 0L;
        Double totalComprasGlobal = 0.0;
        Double calcEfectivoGlobal = 0.0;
        Double calcDebitoGlobal = 0.0;
        Double calcCreditoGlobal = 0.0;
        Double calcTransferenciaGlobal = 0.0;
        Double calcEfectivoCajaPagosGlobal = 0.0;
        Double totalIngresosManualesGlobal = 0.0;
        Double totalEgresosManualesGlobal = 0.0;
        Double totalMontoInicialGlobal = 0.0;
        
        LocalDateTime fechaAperturaGlobal = null;
        Map<String, DesgloseCobroDTO> desgloseGlobalMap = new LinkedHashMap<>();

        for (SesionCaja sesion : sesionesAbiertas) {
            LocalDateTime inicio = sesion.getFechaApertura();
            if (fechaAperturaGlobal == null || inicio.isBefore(fechaAperturaGlobal)) {
                fechaAperturaGlobal = inicio;
            }
            if (sesion.getMontoInicialReal() != null) {
                totalMontoInicialGlobal += sesion.getMontoInicialReal();
            }

            Double ingMan = movimientoCajaRepository.sumIngresosBySesion(sesion.getIdSesion());
            Double egMan = movimientoCajaRepository.sumEgresosBySesion(sesion.getIdSesion());
            if (ingMan != null) totalIngresosManualesGlobal += ingMan;
            if (egMan != null) totalEgresosManualesGlobal += egMan;

            List<Object[]> resultadosCobros = cobroRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
            for (Object[] row : resultadosCobros) {
                String metodo = (String) row[0];
                Double sumImporte = 0.0;
                if (row[1] instanceof BigDecimal) {
                    sumImporte = ((BigDecimal) row[1]).doubleValue();
                } else if (row[1] instanceof Double) {
                    sumImporte = (Double) row[1];
                }
                Long countOp = ((Number) row[2]).longValue();

                DesgloseCobroDTO existente = desgloseGlobalMap.getOrDefault(metodo, 
                    DesgloseCobroDTO.builder().metodoPago(metodo).cantidadOperaciones(0L).totalIngresado(0.0).build());
                
                existente.setCantidadOperaciones(existente.getCantidadOperaciones() + countOp);
                existente.setTotalIngresado(existente.getTotalIngresado() + sumImporte);
                desgloseGlobalMap.put(metodo, existente);

                if (metodo != null) {
                    String m = metodo.toLowerCase();
                    if (m.contains("efectivo") && !m.contains("aporte externo")) {
                        calcEfectivoGlobal += sumImporte;
                    } else if (m.contains("debito") || m.contains("débito")) {
                        calcDebitoGlobal += sumImporte;
                    } else if (m.contains("credito") || m.contains("crédito")) {
                        calcCreditoGlobal += sumImporte;
                    } else if (m.contains("transferencia") || m.contains("mp") || m.contains("mercado")) {
                        calcTransferenciaGlobal += sumImporte;
                    }
                }
            }

            List<Object[]> resultadosPagos = pagoRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
            for (Object[] row : resultadosPagos) {
                String metodo = (String) row[0];
                Double sumImporte = 0.0;
                if (row[1] instanceof BigDecimal) {
                    sumImporte = ((BigDecimal) row[1]).doubleValue();
                } else if (row[1] instanceof Double) {
                    sumImporte = (Double) row[1];
                }

                if (metodo != null) {
                    String m = metodo.toLowerCase();
                    if (m.contains("efectivo") && !m.contains("aporte externo")) {
                        calcEfectivoCajaPagosGlobal += sumImporte;
                    }
                }
            }
        }

        if (fechaAperturaGlobal != null) {
            LocalDateTime fin = LocalDateTime.now();

            Double totalVentas = ventaRepository.sumTotalVentasEnRango(fechaAperturaGlobal, fin);
            if (totalVentas != null) totalVentasGlobal = totalVentas;

            Long cantidadVentas = ventaRepository.countVentasEnRango(fechaAperturaGlobal, fin);
            if (cantidadVentas != null) cantidadVentasGlobal = cantidadVentas;

            Double totalCompras = compraRepository.sumTotalComprasEnRango(fechaAperturaGlobal, fin);
            if (totalCompras != null) totalComprasGlobal = totalCompras;
        }

        Double saldoEsperadoGlobal = totalMontoInicialGlobal + calcEfectivoGlobal - calcEfectivoCajaPagosGlobal + totalIngresosManualesGlobal - totalEgresosManualesGlobal;

        return CajaDetalleDTO.builder()
                .idSesion(null)
                .montoInicial(totalMontoInicialGlobal)
                .totalVentas(totalVentasGlobal)
                .totalCompras(totalComprasGlobal)
                .totalComprasEfectivo(calcEfectivoCajaPagosGlobal)
                .saldoEsperado(saldoEsperadoGlobal)
                .fechaApertura(fechaAperturaGlobal)
                .cantidadVentas(cantidadVentasGlobal)
                .totalEfectivo(calcEfectivoGlobal)
                .totalDebito(calcDebitoGlobal)
                .totalCredito(calcCreditoGlobal)
                .totalTarjeta(calcDebitoGlobal + calcCreditoGlobal)
                .totalTransferencia(calcTransferenciaGlobal)
                .ingresosManuales(totalIngresosManualesGlobal)
                .egresosManuales(totalEgresosManualesGlobal)
                .desgloseCobros(new ArrayList<>(desgloseGlobalMap.values()))
                .build();
    }

    public CajaResponseDTO cerrarCaja(CierreCajaRequestDTO request) {
        Usuario usuario = usuarioRepository.findById(request.getIdUsuario())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + request.getIdUsuario()));

        // 1. Verificación de Rol
        String rol = usuario.getRol() != null ? usuario.getRol().getDescripcion() : "";
        if (!"CAJERO".equalsIgnoreCase(rol) && !"ADMINISTRADOR".equalsIgnoreCase(rol)) {
            throw new RuntimeException("No tiene permisos para cerrar la caja. Solo CAJERO o ADMINISTRADOR.");
        }

        // 2. Buscar turno de caja global abierto
        SesionCaja sesion = sesionCajaRepository.findFirstByEstado("ABIERTA")
                .orElseThrow(() -> new RuntimeException("No hay un turno de caja abierto en el sistema."));

        sesion.setEstado("CERRADA");
        sesion.setFechaCierre(LocalDateTime.now());
        sesion.setMontoFinalReal(request.getMontoFinalReal());
        sesion.setObservacionesCierre(request.getObservacionesCierre());
        sesion.setFondoProximaApertura(request.getFondoProximaApertura());
        sesion.setUsuarioCierre(usuario);

        Double saldoEsperado = calcularSaldoEsperado(sesion);
        sesion.setDiferenciaCierre(request.getMontoFinalReal() - saldoEsperado);

        SesionCaja guardada = sesionCajaRepository.save(sesion);
        return mapToDTO(guardada);
    }

    private Double calcularSaldoEsperado(SesionCaja sesion) {
        Double calcEfectivo = 0.0;
        List<Object[]> resultadosCobros = cobroRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
        for (Object[] row : resultadosCobros) {
            String metodo = (String) row[0];
            Double sumImporte = 0.0;
            if (row[1] instanceof BigDecimal) {
                sumImporte = ((BigDecimal) row[1]).doubleValue();
            } else if (row[1] instanceof Double) {
                sumImporte = (Double) row[1];
            }
            if (metodo != null) {
                String m = metodo.toLowerCase();
                if (m.contains("efectivo") && !m.contains("aporte externo")) {
                    calcEfectivo += sumImporte;
                }
            }
        }

        Double calcEfectivoCajaPagos = 0.0;
        List<Object[]> resultadosPagos = pagoRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
        for (Object[] row : resultadosPagos) {
            String metodo = (String) row[0];
            Double sumImporte = 0.0;
            if (row[1] instanceof BigDecimal) {
                sumImporte = ((BigDecimal) row[1]).doubleValue();
            } else if (row[1] instanceof Double) {
                sumImporte = (Double) row[1];
            }
            if (metodo != null) {
                String m = metodo.toLowerCase();
                if (m.contains("efectivo") && !m.contains("aporte externo")) {
                    calcEfectivoCajaPagos += sumImporte;
                }
            }
        }

        Double ingresosManuales = movimientoCajaRepository.sumIngresosBySesion(sesion.getIdSesion());
        Double egresosManuales = movimientoCajaRepository.sumEgresosBySesion(sesion.getIdSesion());
        if (ingresosManuales == null) ingresosManuales = 0.0;
        if (egresosManuales == null) egresosManuales = 0.0;

        Double montoInicial = sesion.getMontoInicialReal() != null ? sesion.getMontoInicialReal() : 0.0;
        return montoInicial + calcEfectivo - calcEfectivoCajaPagos + ingresosManuales - egresosManuales;
    }

    private CajaResponseDTO mapToDTO(SesionCaja caja) {
        return CajaResponseDTO.builder()
                .idSesion(caja.getIdSesion())
                .idUsuario(caja.getUsuario().getIdUsuario())
                .nombreUsuario(caja.getUsuario().getNombre() + " " + caja.getUsuario().getApellido())
                .rolUsuario(caja.getUsuario().getRol() != null ? capitalizar(caja.getUsuario().getRol().getDescripcion()) : "N/A")
                .idUsuarioCierre(caja.getUsuarioCierre() != null ? caja.getUsuarioCierre().getIdUsuario() : null)
                .nombreUsuarioCierre(caja.getUsuarioCierre() != null ? caja.getUsuarioCierre().getNombre() + " " + caja.getUsuarioCierre().getApellido() : null)
                .rolUsuarioCierre(caja.getUsuarioCierre() != null && caja.getUsuarioCierre().getRol() != null ? capitalizar(caja.getUsuarioCierre().getRol().getDescripcion()) : null)
                .fechaApertura(caja.getFechaApertura())
                .fechaCierre(caja.getFechaCierre())
                .saldoAnterior(caja.getSaldoAnterior())
                .montoInicialReal(caja.getMontoInicialReal())
                .montoFinalReal(caja.getMontoFinalReal())
                .diferenciaApertura(caja.getDiferenciaApertura())
                .observacionesApertura(caja.getObservacionesApertura())
                .observacionesCierre(caja.getObservacionesCierre())
                .estado(caja.getEstado())
                .build();
    }

    private String capitalizar(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String t = text.trim();
        if (t.equalsIgnoreCase("N/A")) {
            return "N/A";
        }
        return t.substring(0, 1).toUpperCase() + t.substring(1).toLowerCase();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerOperadores() {
        return sesionCajaRepository.findDistinctOperadores().stream()
                .filter(u -> u.getRol() == null || (!"empleado".equalsIgnoreCase(u.getRol().getDescripcion()) && !"rol_empleado".equalsIgnoreCase(u.getRol().getDescripcion())))
                .sorted((a, b) -> a.getNombre().compareToIgnoreCase(b.getNombre()))
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getIdUsuario());
                    m.put("nombre", u.getNombre() + " " + u.getApellido());
                    m.put("rol", u.getRol() != null ? capitalizar(u.getRol().getDescripcion()) : "Cajero");
                    return m;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<HistorialSesionDTO> obtenerHistorialSesiones(
            java.time.LocalDate fechaApertura, java.time.LocalDate fechaCierre,
            String estado, Long operadorId, boolean soloDiferencias, String busqueda,
            org.springframework.data.domain.Pageable pageable) {
        String busquedaParam = (busqueda != null && !busqueda.isBlank())
                ? "%" + busqueda.toLowerCase() + "%"
                : null;
        String estadoParam = (estado != null && !estado.isBlank()) ? estado : null;
        
        LocalDateTime fechaAperturaInicio = fechaApertura != null ? fechaApertura.atStartOfDay() : null;
        LocalDateTime fechaAperturaFin = fechaApertura != null ? fechaApertura.atTime(23, 59, 59) : null;
        LocalDateTime fechaCierreInicio = fechaCierre != null ? fechaCierre.atStartOfDay() : null;
        LocalDateTime fechaCierreFin = fechaCierre != null ? fechaCierre.atTime(23, 59, 59) : null;

        org.springframework.data.domain.Page<SesionCaja> sesiones = soloDiferencias
                ? sesionCajaRepository.findFilteredConDiferencias(fechaAperturaInicio, fechaAperturaFin, fechaCierreInicio, fechaCierreFin, estadoParam, operadorId, busquedaParam, pageable)
                : sesionCajaRepository.findFiltered(fechaAperturaInicio, fechaAperturaFin, fechaCierreInicio, fechaCierreFin, estadoParam, operadorId, busquedaParam, pageable);

        return sesiones.map(sesion -> {
            String operador = sesion.getUsuario().getNombre() + " " + sesion.getUsuario().getApellido();
            String rolOperador = sesion.getUsuario().getRol() != null 
                    ? capitalizar(sesion.getUsuario().getRol().getDescripcion()) 
                    : "N/A";
            String operadorCierre = sesion.getUsuarioCierre() != null 
                    ? sesion.getUsuarioCierre().getNombre() + " " + sesion.getUsuarioCierre().getApellido()
                    : operador;
            String rolCierre = sesion.getUsuarioCierre() != null && sesion.getUsuarioCierre().getRol() != null 
                    ? capitalizar(sesion.getUsuarioCierre().getRol().getDescripcion()) 
                    : rolOperador;

            // Calcular duración
            String duracion = "-";
            if (sesion.getFechaApertura() != null && sesion.getFechaCierre() != null) {
                java.time.Duration dur = java.time.Duration.between(sesion.getFechaApertura(),
                        sesion.getFechaCierre());
                long horas = dur.toHours();
                long minutos = dur.toMinutesPart();
                duracion = horas + "h " + minutos + "m";
            }

            // Calcular desglose de ingresos y egresos
            Double ingresosEfectivo = 0.0;
            Double ventasDebito = 0.0;
            Double ventasCredito = 0.0;
            Double ventasTransferencia = 0.0;

            List<Object[]> resultadosCobros = cobroRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
            for (Object[] row : resultadosCobros) {
                String metodo = (String) row[0];
                Double sumImporte = 0.0;
                if (row[1] instanceof java.math.BigDecimal) {
                    sumImporte = ((java.math.BigDecimal) row[1]).doubleValue();
                } else if (row[1] instanceof Double) {
                    sumImporte = (Double) row[1];
                }

                if (metodo != null) {
                    String m = metodo.toLowerCase();
                    if (m.contains("efectivo") && !m.contains("aporte externo")) {
                        ingresosEfectivo += sumImporte;
                    } else if (m.contains("debito") || m.contains("débito")) {
                        ventasDebito += sumImporte;
                    } else if (m.contains("credito") || m.contains("crédito")) {
                        ventasCredito += sumImporte;
                    } else if (m.contains("transferencia") || m.contains("mp") || m.contains("mercado")) {
                        ventasTransferencia += sumImporte;
                    }
                }
            }
            Double ventasTarjeta = ventasDebito + ventasCredito;

            Double egresosEfectivo = 0.0;
            List<Object[]> resultadosPagos = pagoRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
            for (Object[] row : resultadosPagos) {
                String metodo = (String) row[0];
                Double sumImporte = 0.0;
                if (row[1] instanceof java.math.BigDecimal) {
                    sumImporte = ((java.math.BigDecimal) row[1]).doubleValue();
                } else if (row[1] instanceof Double) {
                    sumImporte = (Double) row[1];
                }

                if (metodo != null) {
                    String m = metodo.toLowerCase();
                    if (m.contains("efectivo") && !m.contains("aporte externo")) {
                        egresosEfectivo += sumImporte;
                    }
                }
            }

            Double ingresosManuales = movimientoCajaRepository.sumIngresosBySesion(sesion.getIdSesion());
            Double egresosManuales = movimientoCajaRepository.sumEgresosBySesion(sesion.getIdSesion());
            if (ingresosManuales == null) ingresosManuales = 0.0;
            if (egresosManuales == null) egresosManuales = 0.0;

            Double saldoEsperado = sesion.getMontoInicialReal() + ingresosEfectivo - egresosEfectivo + ingresosManuales - egresosManuales;

            // Calcular diferencia (solo si la sesión está cerrada y tiene monto final)
            Double diferencia = null;
            if ("CERRADA".equals(sesion.getEstado()) && sesion.getMontoFinalReal() != null) {
                if (sesion.getDiferenciaCierre() != null) {
                    diferencia = sesion.getDiferenciaCierre();
                } else {
                    diferencia = sesion.getMontoFinalReal() - saldoEsperado;
                }
            }

            // Calcular total facturado (ventas) en el rango de la sesión
            LocalDateTime inicio = sesion.getFechaApertura();
            LocalDateTime fin = sesion.getFechaCierre() != null ? sesion.getFechaCierre() : LocalDateTime.now();
            Double totalFacturado = ventaRepository.sumTotalVentasEnRango(inicio, fin);
            if (totalFacturado == null) {
                totalFacturado = 0.0;
            }

            return HistorialSesionDTO.builder()
                    .idSesion(sesion.getIdSesion())
                    .operador(operador)
                    .rolOperador(rolOperador)
                    .operadorCierre(operadorCierre)
                    .rolCierre(rolCierre)
                    .fechaApertura(sesion.getFechaApertura())
                    .fechaCierre(sesion.getFechaCierre())
                    .montoInicial(sesion.getMontoInicialReal())
                    .montoFinalReal(sesion.getMontoFinalReal())
                    .estado(sesion.getEstado())
                    .duracion(duracion)
                    .diferencia(diferencia)
                    .totalFacturado(totalFacturado)
                    .ingresosEfectivo(ingresosEfectivo)
                    .egresosEfectivo(egresosEfectivo)
                    .saldoEsperado(saldoEsperado)
                    .ventasTarjeta(ventasTarjeta)
                    .ventasDebito(ventasDebito)
                    .ventasCredito(ventasCredito)
                    .ventasTransferencia(ventasTransferencia)
                    .observacionesApertura(sesion.getObservacionesApertura())
                    .observacionesCierre(sesion.getObservacionesCierre())
                    .ingresosManuales(ingresosManuales)
                    .egresosManuales(egresosManuales)
                    .build();
        });
    }
}
