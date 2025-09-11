package com.gestioninventariodemo2.cruddemo2.DTO;

import java.util.List;

import lombok.Data;

@Data
public class ProveedorRequestDTO {

    private String nombre;
    private String telefono;
    private String email;
    private String direccion;
    private List<Long> productosId;

}
