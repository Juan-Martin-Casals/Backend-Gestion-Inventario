package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DesglosePagoDTO {
    private String metodoPago;
    private Long cantidadOperaciones;
    private Double totalIngresado;
}
