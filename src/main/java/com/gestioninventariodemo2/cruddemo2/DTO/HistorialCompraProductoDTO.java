package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HistorialCompraProductoDTO {
    private Long idCompra;
    private LocalDateTime fechaCompra;
    private String proveedorNombre;
    private int cantidadComprada;
    private double precioUnitario;
    private double subtotal;
    private Double porcentajeVariacion;
}
