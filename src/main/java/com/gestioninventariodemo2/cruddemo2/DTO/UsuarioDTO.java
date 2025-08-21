package com.gestioninventariodemo2.cruddemo2.DTO;

import java.io.Serializable;

public class UsuarioDTO implements Serializable{

    private String nombre;
    private String apellido;
    private String email;
    private String contrasena;
    private Long idRol;
    
    public UsuarioDTO(String nombre, String apellido, String email, String contrasena,Long idRol) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.contrasena = contrasena;
        this.idRol = idRol;
    }

    

    public UsuarioDTO() {
    }



    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Long getIdRol() {
        return idRol;
    }

    public void setIdRol(Long idRol) {
        this.idRol = idRol;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    
    

    

}
