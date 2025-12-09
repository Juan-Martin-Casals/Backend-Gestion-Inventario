package com.gestioninventariodemo2.cruddemo2.DTO;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO para la vista de Gestión de Inventario que combina información de
 * Producto y Stock.
 * Incluye todos los datos necesarios para mostrar en la tabla y en el modal de
 * detalles.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductoInventarioDTO {

    // ID del producto
    private Long idProducto;

    // Información básica del producto
    private String nombre;
    private String categoria;
    private String descripcion;

    // Información comercial
    private double precio;
    private LocalDate fechaCreacion;

    // Gestión de stock
    private int stockActual;
    private int stockMinimo;
    private int stockMaximo;

    // Estado calculado del stock
    private String estadoStock; // "BUENO", "BAJO", "AGOTADO"
}
