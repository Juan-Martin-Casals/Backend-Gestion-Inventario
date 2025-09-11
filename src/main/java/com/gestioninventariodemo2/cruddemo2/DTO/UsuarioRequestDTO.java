package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioRequestDTO{

    private String nombre;
    private String apellido;
    private String email;
    private String contrasena;
    private String confirmacionContrasena;
    private Long idRol;
    


    

}

