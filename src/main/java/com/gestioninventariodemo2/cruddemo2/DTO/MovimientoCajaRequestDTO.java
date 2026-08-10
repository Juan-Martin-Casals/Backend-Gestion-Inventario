package com.gestioninventariodemo2.cruddemo2.DTO;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MovimientoCajaRequestDTO {

    @NotNull(message = "El tipo de movimiento es obligatorio")
    private String tipo; // INGRESO o EGRESO

    @NotNull(message = "El monto es obligatorio")
    @Positive(message = "El monto debe ser un valor positivo")
    private Double monto;

    @Size(max = 255, message = "La descripción no puede superar los 255 caracteres")
    private String descripcion;

    @Size(max = 50, message = "La referencia no puede superar los 50 caracteres")
    private String referencia;

    @NotNull(message = "El ID de usuario es obligatorio")
    private Long idUsuario;

    @NotNull(message = "El ID de categoría de movimiento es obligatorio")
    private Long idCategoriaMovimiento;
}
