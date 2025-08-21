package com.gestioninventariodemo2.cruddemo2.Model;

import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "Proveedor")
public class Proveedor {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idProveedor;

    @Column(name = "Nombre")
    private String nombre;

    @Column(name = "Datos_Contacto")
    private String datosContacto;

    @OneToMany(mappedBy = "Proveedor")
    private List<Compra>compras;

    @OneToMany(mappedBy = "Proveedor")
    private List<ProductoProveedor>productoProveedors;

    public Proveedor() {
    }

    public Proveedor(String nombre, String datosContacto) {
        this.nombre = nombre;
        this.datosContacto = datosContacto;
    }

    public Long getIdProveedor() {
        return idProveedor;
    }

    public void setIdProveedor(Long idProveedor) {
        this.idProveedor = idProveedor;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDatosContacto() {
        return datosContacto;
    }

    public void setDatosContacto(String datosContacto) {
        this.datosContacto = datosContacto;
    }

    public List<Compra> getCompras() {
        return compras;
    }

    public void setCompras(List<Compra> compras) {
        this.compras = compras;
    }

    public List<ProductoProveedor> getProductoProveedors() {
        return productoProveedors;
    }

    public void setProductoProveedors(List<ProductoProveedor> productoProveedors) {
        this.productoProveedors = productoProveedors;
    }

    

}
