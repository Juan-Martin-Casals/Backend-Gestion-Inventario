package com.gestioninventariodemo2.cruddemo2.DTO;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClienteRequestDTO{
    @Size(max = 70)
    private String nombre;
    @Size(max = 70)
    private String apellido;
    @Size(max = 10)
    private String dni;
    @Size(max = 20)
    private String telefono;
    @Size(max = 200)
    private String direccion;
    @Size(max = 255)
    private String email;
    
}
