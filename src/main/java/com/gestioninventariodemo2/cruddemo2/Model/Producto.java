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
@Table(name = "Productos")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idProducto;

    @Column(name = "Nombre")
    private String nombre;

    @Column(name = "descripción")
    private String descripcion;

    @Column(name = "categoria")
    private String categoria;

    @Column(name = "precio")
    private double precio;

    @OneToMany(mappedBy = "producto")
    private List<DetalleVenta> detalleVentas;

    @OneToMany(mappedBy = "producto")
    private List<DetalleCompra> detalleCompras;

    @OneToMany(mappedBy = "producto")
    private List<Stock> stocks;

    @OneToMany(mappedBy = "producto")
    private List<ProductoProveedor> productoProveedores;

    public Producto() {}

    public Producto(String nombre, String descripcion, String categoria, double precio) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.categoria = categoria;
        this.precio = precio;
    }

    public Long getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(Long idProducto) {
        this.idProducto = idProducto;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public double getPrecio() {
        return precio;
    }

    public void setPrecio(double precio) {
        this.precio = precio;
    }

    public List<DetalleVenta> getDetalleVentas() {
        return detalleVentas;
    }

    public void setDetalleVentas(List<DetalleVenta> detalleVentas) {
        this.detalleVentas = detalleVentas;
    }

    public List<DetalleCompra> getDetalleCompras() {
        return detalleCompras;
    }

    public void setDetalleCompras(List<DetalleCompra> detalleCompras) {
        this.detalleCompras = detalleCompras;
    }

    public List<Stock> getStocks() {
        return stocks;
    }

    public void setStocks(List<Stock> stocks) {
        this.stocks = stocks;
    }

    public List<ProductoProveedor> getProductoProveedores() {
        return productoProveedores;
    }

    public void setProductoProveedores(List<ProductoProveedor> productoProveedores) {
        this.productoProveedores = productoProveedores;
    }

    

}
