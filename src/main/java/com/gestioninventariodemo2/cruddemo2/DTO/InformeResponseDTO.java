package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;


import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor



public class InformeResponseDTO {

    private LocalDate inicio;
    private LocalDate fin;
    private Long totalVentas;
    private Long totalCantidad;
    private Double totalImporte;
    private String productoMasVendido;
    
    
    public InformeResponseDTO(LocalDate inicio, LocalDate fin, Long totalVentas, Long totalCantidad,Double totalImporte, String productoMasVendido) {
        this.inicio = inicio;
        this.fin = fin;
        this.totalVentas = totalVentas;
        this.totalCantidad = totalCantidad;
        this.totalImporte = totalImporte;
        this.productoMasVendido = productoMasVendido;
    }

    


    
    




}
