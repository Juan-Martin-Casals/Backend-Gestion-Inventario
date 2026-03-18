package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CompraResponseDTO {

    private Long id;
    private LocalDateTime fecha;
    private double total;
    private String nombreProveedor;

    // Anidamos la lista de DTOs de detalle
    private List<DetalleCompraResponseDTO> productosComprados;
}