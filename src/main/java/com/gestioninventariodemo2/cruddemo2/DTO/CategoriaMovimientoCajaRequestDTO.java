package com.gestioninventariodemo2.cruddemo2.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CategoriaMovimientoCajaRequestDTO {
    @NotBlank(message = "El nombre no puede estar vacío")
    @Size(max = 50, message = "El nombre no puede superar los 50 caracteres")
    private String nombre;

    @NotBlank(message = "El tipo no puede estar vacío")
    @Size(max = 10, message = "El tipo no puede superar los 10 caracteres")
    private String tipo; // INGRESO o EGRESO
}
