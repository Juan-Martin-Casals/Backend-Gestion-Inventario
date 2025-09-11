package com.gestioninventariodemo2.cruddemo2.DTO;



import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VentaRequestDTO{


    private ClienteRequestDTO cliente;
    private List<DetalleVentaRequestDTO> detalles;
    private Long usuarioId;

    

}
