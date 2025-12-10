package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActualizarProductoDTO {

    private String nombre;
    private Long idCategoria;
    private String descripcion;
    private double precio;
    private int cantidadExtraStock;
    private Integer stockMinimo; // Nullable - solo actualizar si se proporciona
    private Integer stockMaximo; // Nullable - solo actualizar si se proporciona

}
