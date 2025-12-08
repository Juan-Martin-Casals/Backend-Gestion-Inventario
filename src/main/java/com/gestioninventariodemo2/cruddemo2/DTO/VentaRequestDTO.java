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
    private List<DetalleVentaRequestDTO> detalles;
    private LocalDate fecha;

    // Datos del pago (NUEVO)
    private Long idMetodoPago; // Obligatorio
    private String nroTransaccion; // Opcional para Tarjeta/Transferencia
    private String tipoTarjeta; // Opcional: 'Débito' o 'Crédito'
    private String ultimosDigitos; // Opcional: últimos 4 dígitos
}
