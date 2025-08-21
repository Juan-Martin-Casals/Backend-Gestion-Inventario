package com.gestioninventariodemo2.cruddemo2.DTO;

public class UsuarioDTOFront {
    
    private String nombre;
    private String apellido;
    private String email;
    private String descripcionRol;
    
    public UsuarioDTOFront() {
    }

    public UsuarioDTOFront(String nombre, String apellido, String email, String descripcionRol) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.descripcionRol = descripcionRol;
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

    public String getDescripcionRol() {
        return descripcionRol;
    }

    public void setDescripcionRol(String descripcionRol) {
        this.descripcionRol = descripcionRol;
    }

    

}
