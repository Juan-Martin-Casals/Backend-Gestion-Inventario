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
public class VentaRequestDTO{


    private ClienteRequestDTO cliente;
    private List<DetalleVentaRequestDTO> detalles;
    private LocalDate fecha;

    

}
