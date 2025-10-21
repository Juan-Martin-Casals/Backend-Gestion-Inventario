package com.gestioninventariodemo2.cruddemo2.DTO;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class CompraResponseDTO {


    private LocalDate fecha;
    private double total;
    private String nombreProveedor;
    
    // Anidamos la lista de DTOs de detalle
    private List<DetalleCompraResponseDTO> productosComprados;
}