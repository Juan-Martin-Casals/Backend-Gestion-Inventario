package com.gestioninventariodemo2.cruddemo2.DTO;

import java.io.Serializable;

public class DetalleVentaRequestDTO implements Serializable{

    private Long productoId;
    private int cantidad;
    
    public DetalleVentaRequestDTO() {
    }

    public DetalleVentaRequestDTO(Long productoId, int cantidad) {
        this.productoId = productoId;
        this.cantidad = cantidad;
    }

    public Long getProductoId() {
        return productoId;
    }

    public void setProductoId(Long productoId) {
        this.productoId = productoId;
    }

    public int getCantidad() {
        return cantidad;
    }

    public void setCantidad(int cantidad) {
        this.cantidad = cantidad;
    }

    

    

}
