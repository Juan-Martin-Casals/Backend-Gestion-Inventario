package com.gestioninventariodemo2.cruddemo2.Services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.PagoResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.MetodoPago;
import com.gestioninventariodemo2.cruddemo2.Model.Pago;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.PagoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PagoService {

    private final PagoRepository pagoRepository;

    /**
     * Registrar un nuevo pago
     */
    @Transactional
    public Pago registrarPago(Venta venta, MetodoPago metodoPago, BigDecimal importe,
            String nroTransaccion, String tipoTarjeta, String ultimosDigitos,
            Usuario usuario) {

        Pago pago = new Pago();
        pago.setVenta(venta);
        pago.setMetodoPago(metodoPago);
        pago.setImporte(importe);
        pago.setNroTransaccion(nroTransaccion);
        pago.setTipoTarjeta(tipoTarjeta);
        pago.setUltimosDigitos(ultimosDigitos);
        pago.setFechaPago(LocalDateTime.now());
        pago.setUsuario(usuario);

        return pagoRepository.save(pago);
    }

    /**
     * Obtener pago por ID de venta
     */
    public PagoResponseDTO obtenerPagoPorVenta(Long idVenta) {
        Pago pago = pagoRepository.findByVentaIdVenta(idVenta);
        return pago != null ? convertirADTO(pago) : null;
    }

    /**
     * Obtener todos los pagos por método de pago
     */
    public List<PagoResponseDTO> listarPorMetodoPago(Long idMetodoPago) {
        return pagoRepository.findByMetodoPagoIdMetodoPago(idMetodoPago).stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    /**
     * Obtener reporte de totales por método de pago
     */
    public List<Object[]> obtenerReporteTotalesPorMetodo() {
        return pagoRepository.obtenerTotalPorMetodoPago();
    }

    /**
     * Obtener reporte de totales por método de pago entre fechas
     */
    public List<Object[]> obtenerReporteTotalesPorMetodoEntreFechas(LocalDate inicio, LocalDate fin) {
        LocalDateTime inicioDateTime = inicio.atStartOfDay();
        LocalDateTime finDateTime = fin.atTime(23, 59, 59);
        return pagoRepository.obtenerTotalPorMetodoPagoEntreFechas(inicioDateTime, finDateTime);
    }

    /**
     * Convertir entidad a DTO
     */
    private PagoResponseDTO convertirADTO(Pago pago) {
        return PagoResponseDTO.builder()
                .idPago(pago.getIdPago())
                .idVenta(pago.getVenta().getIdVenta())
                .metodoPago(pago.getMetodoPago().getNombre())
                .importe(pago.getImporte())
                .nroTransaccion(pago.getNroTransaccion())
                .tipoTarjeta(pago.getTipoTarjeta())
                .ultimosDigitos(pago.getUltimosDigitos())
                .fechaPago(pago.getFechaPago().toLocalDate())
                .nombreUsuario(pago.getUsuario() != null ? pago.getUsuario().getNombre() : "N/A")
                .build();
    }
}
