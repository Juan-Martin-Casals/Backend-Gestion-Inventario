package com.gestioninventariodemo2.cruddemo2.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimientoCajaResponseDTO {
    private Long idMovimiento;
    private String tipo;
    private Double monto;
    private String descripcion;
    private String referencia;
    private LocalDateTime fechaHora;
    private Long idSesion;
    private String nombreUsuario;
    private String nombreCategoria;
    private String estado;
    private String nombreUsuarioModificador;
    private LocalDateTime fechaModificacion;
}
