package com.gestioninventariodemo2.cruddemo2.DTO;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ProveedorRequestDTO {

    private String nombre;
    private String telefono;
    private String email;
    private String direccion;
    private List<Long> productosIds;

}
