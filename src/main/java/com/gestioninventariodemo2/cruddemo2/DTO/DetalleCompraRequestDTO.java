package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.Data;

@Data
public class DetalleCompraRequestDTO {
    
    private int cantidad;
    private double precioUnitario; // El costo de compra
    private double nuevoPrecioVenta; // El precio al que se venderá
    private Long idProducto; // Solo necesitamos el ID del producto
}