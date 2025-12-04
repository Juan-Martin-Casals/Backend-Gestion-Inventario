package com.gestioninventariodemo2.cruddemo2.DTO;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PagoResponseDTO {
    private Long idPago;
    private Long idVenta;
    private String metodoPago;
    private BigDecimal importe;
    private String nroTransaccion;
    private String tipoTarjeta;
    private String ultimosDigitos;
    private LocalDate fechaPago;
    private String nombreUsuario;
}
