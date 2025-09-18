package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder



public class InformeResponseDTO {

    private LocalDate inicio;
    private LocalDate fin;
    private Long totalVentas;
    private Long totalCantidad;
    private Double totalImporte;
    private String productoMasVendido;
    

    


    
    




}
