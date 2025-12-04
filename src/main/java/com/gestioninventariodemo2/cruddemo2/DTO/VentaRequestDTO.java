package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VentaRequestDTO {
    private Long idCliente;
    private LocalDate fecha;
    private List<DetalleVentaRequestDTO> detalles;

    // NUEVO: Datos del pago
    private Long idMetodoPago; // Obligatorio
    private String nroTransaccion; // Opcional
    private String tipoTarjeta; // Opcional ('Débito' o 'Crédito')
    private String ultimosDigitos; // Opcional (4 dígitos)
}
