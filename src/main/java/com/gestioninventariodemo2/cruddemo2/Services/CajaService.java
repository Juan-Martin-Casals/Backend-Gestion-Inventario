package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.AperturaCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CajaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CierreCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CajaDetalleDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DesglosePagoDTO;
import com.gestioninventariodemo2.cruddemo2.Model.SesionCaja;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Repository.SesionCajaRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.CompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.PagoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CajaService {

    private final SesionCajaRepository sesionCajaRepository;
    private final UsuarioRepository usuarioRepository;
    private final VentaRepository ventaRepository;
    private final CompraRepository compraRepository;
    private final PagoRepository pagoRepository;

    /**
     * Verifica estadísticamente si el usuario actual tiene una caja ABIERTA
     */
    public boolean verificarCajaActiva(Long idUsuario) {
        return sesionCajaRepository.findByUsuarioIdUsuarioAndEstado(idUsuario, "ABIERTA").isPresent();
    }

    /**
     * Devuelve el monto final de la última caja cerrada globalmente para usarlo de
     * referencia.
     */
    public Double obtenerSaldoUltimoCierre() {
        return sesionCajaRepository.findFirstByEstadoOrderByFechaCierreDesc("CERRADA")
                .map(sesion -> sesion.getMontoFinalReal() != null ? sesion.getMontoFinalReal() : 0.0)
                .orElse(0.0);
    }

    /**
     * Ejecuta la apertura de una nueva sesión de caja.
     */
    public CajaResponseDTO abrirCaja(AperturaCajaRequestDTO request) {
        // 1. Verificación de Seguridad
        if (verificarCajaActiva(request.getIdUsuario())) {
            throw new RuntimeException("El usuario ya tiene una sesión de caja abierta.");
        }

        Usuario usuario = usuarioRepository.findById(request.getIdUsuario())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + request.getIdUsuario()));

        // 2. Traer Saldo Anterior
        Double saldoAnteriorRef = obtenerSaldoUltimoCierre();

        // 3. Evaluar Diferencias de Auditoría
        boolean diferencia = !saldoAnteriorRef.equals(request.getMontoInicialReal());

        // 4. Instanciar y Guardar
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
        SesionCaja sesion = sesionCajaRepository.findByUsuarioIdUsuarioAndEstado(idUsuario, "ABIERTA")
                .orElseThrow(() -> new RuntimeException("No hay una caja abierta para este usuario."));

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

        Double saldoEsperado = sesion.getMontoInicialReal() + totalVentas - totalCompras;

        // Desglose por Método de Pago
        List<Object[]> resultadosPagos = pagoRepository.obtenerTotalPorMetodoPagoEntreFechas(inicio, fin);
        List<DesglosePagoDTO> desglose = new ArrayList<>();

        Double calcEfectivo = 0.0;
        Double calcTarjeta = 0.0;
        Double calcTransferencia = 0.0;

        for (Object[] row : resultadosPagos) {
            String metodo = (String) row[0];
            Double sumImporte = 0.0;
            if (row[1] instanceof BigDecimal) {
                sumImporte = ((BigDecimal) row[1]).doubleValue();
            } else if (row[1] instanceof Double) {
                sumImporte = (Double) row[1];
            }
            Long countOp = ((Number) row[2]).longValue();

            desglose.add(DesglosePagoDTO.builder()
                    .metodoPago(metodo)
                    .cantidadOperaciones(countOp)
                    .totalIngresado(sumImporte)
                    .build());

            if (metodo != null) {
                String m = metodo.toLowerCase();
                if (m.contains("efectivo")) {
                    calcEfectivo += sumImporte;
                } else if (m.contains("tarjeta")) {
                    calcTarjeta += sumImporte;
                } else if (m.contains("transferencia") || m.contains("mp") || m.contains("mercado")) {
                    calcTransferencia += sumImporte;
                }
            }
        }

        return CajaDetalleDTO.builder()
                .idSesion(sesion.getIdSesion())
                .montoInicial(sesion.getMontoInicialReal())
                .totalVentas(totalVentas)
                .totalCompras(totalCompras)
                .saldoEsperado(saldoEsperado)
                .fechaApertura(sesion.getFechaApertura())
                .cantidadVentas(cantidadVentas)
                .totalEfectivo(calcEfectivo)
                .totalTarjeta(calcTarjeta)
                .totalTransferencia(calcTransferencia)
                .desglosePagos(desglose)
                .build();
    }

    public CajaResponseDTO cerrarCaja(CierreCajaRequestDTO request) {
        SesionCaja sesion = sesionCajaRepository.findByUsuarioIdUsuarioAndEstado(request.getIdUsuario(), "ABIERTA")
                .orElseThrow(() -> new RuntimeException("No hay una caja abierta para este usuario."));

        sesion.setEstado("CERRADA");
        sesion.setFechaCierre(LocalDateTime.now());
        sesion.setMontoFinalReal(request.getMontoFinalReal());
        sesion.setObservacionesCierre(request.getObservacionesCierre());

        SesionCaja guardada = sesionCajaRepository.save(sesion);
        return mapToDTO(guardada);
    }

    private CajaResponseDTO mapToDTO(SesionCaja caja) {
        return CajaResponseDTO.builder()
                .idSesion(caja.getIdSesion())
                .idUsuario(caja.getUsuario().getIdUsuario())
                .nombreUsuario(caja.getUsuario().getNombre() + " " + caja.getUsuario().getApellido())
                .rolUsuario(caja.getUsuario().getRol().getDescripcion())
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
}
