package com.gestioninventariodemo2.cruddemo2.Model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ProductoProveedor")
public class ProductoProveedor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idProductoProveedor;

    @ManyToOne
    @JoinColumn(name = "idProducto")
    private Producto producto;

    @ManyToOne
    @JoinColumn(name = "idProveedor")
    private Proveedor proveedor;

    public ProductoProveedor() {
    }

    public ProductoProveedor(Producto producto, Proveedor proveedor) {
        this.producto = producto;
        this.proveedor = proveedor;
    }

    public Long getIdProductoProveedor() {
        return idProductoProveedor;
    }

    public void setIdProductoProveedor(Long idProductoProveedor) {
        this.idProductoProveedor = idProductoProveedor;
    }

    public Producto getProducto() {
        return producto;
    }

    public void setProducto(Producto producto) {
        this.producto = producto;
    }

    public Proveedor getProveedor() {
        return proveedor;
    }

    public void setProveedor(Proveedor proveedor) {
        this.proveedor = proveedor;
    }

    

}
