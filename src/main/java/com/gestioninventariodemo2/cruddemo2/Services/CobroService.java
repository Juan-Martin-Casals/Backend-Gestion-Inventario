package com.gestioninventariodemo2.cruddemo2.Services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.CobroResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.MetodoPago;
import com.gestioninventariodemo2.cruddemo2.Model.Cobro;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.CobroRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CobroService {

    private final CobroRepository cobroRepository;

    /**
     * Registrar un nuevo cobro
     */
    @Transactional
    public Cobro registrarCobro(Venta venta, MetodoPago metodoPago, BigDecimal importe,
            String nroTransaccion, String tipoTarjeta, String ultimosDigitos,
            BigDecimal montoPagado, BigDecimal vuelto, Usuario usuario) {

        Cobro cobro = new Cobro();
        cobro.setVenta(venta);
        cobro.setMetodoPago(metodoPago);
        cobro.setImporte(importe);
        cobro.setNroTransaccion(nroTransaccion);
        cobro.setTipoTarjeta(tipoTarjeta);
        cobro.setUltimosDigitos(ultimosDigitos);
        cobro.setMontoPagado(montoPagado);
        cobro.setVuelto(vuelto);
        cobro.setFechaCobro(LocalDateTime.now());
        cobro.setUsuario(usuario);

        return cobroRepository.save(cobro);
    }

    /**
     * Obtener cobro por ID de venta
     */
    public CobroResponseDTO obtenerCobroPorVenta(Long idVenta) {
        Cobro cobro = cobroRepository.findByVentaIdVenta(idVenta);
        return cobro != null ? convertirADTO(cobro) : null;
    }

    /**
     * Obtener todos los cobros por método de pago
     */
    public List<CobroResponseDTO> listarPorMetodoPago(Long idMetodoPago) {
        return cobroRepository.findByMetodoPagoIdMetodoPago(idMetodoPago).stream()
                .map(this::convertirADTO)
                .collect(Collectors.toList());
    }

    /**
     * Obtener reporte de totales por método de pago
     */
    public List<Object[]> obtenerReporteTotalesPorMetodo() {
        return cobroRepository.obtenerTotalPorMetodoPago();
    }

    /**
     * Obtener reporte de totales por método de pago entre fechas
     */
    public List<Object[]> obtenerReporteTotalesPorMetodoEntreFechas(LocalDate inicio, LocalDate fin) {
        LocalDateTime inicioDateTime = inicio.atStartOfDay();
        LocalDateTime finDateTime = fin.atTime(23, 59, 59);
        return cobroRepository.obtenerTotalPorMetodoPagoEntreFechas(inicioDateTime, finDateTime);
    }

    /**
     * Convertir entidad a DTO
     */
    private CobroResponseDTO convertirADTO(Cobro cobro) {
        return CobroResponseDTO.builder()
                .idCobro(cobro.getIdCobro())
                .idVenta(cobro.getVenta().getIdVenta())
                .metodoPago(cobro.getMetodoPago().getNombre())
                .importe(cobro.getImporte())
                .montoPagado(cobro.getMontoPagado())
                .vuelto(cobro.getVuelto())
                .nroTransaccion(cobro.getNroTransaccion())
                .tipoTarjeta(cobro.getTipoTarjeta())
                .ultimosDigitos(cobro.getUltimosDigitos())
                .fechaCobro(cobro.getFechaCobro().toLocalDate())
                .nombreUsuario(cobro.getUsuario() != null ? cobro.getUsuario().getNombre() : "N/A")
                .build();
    }
}
