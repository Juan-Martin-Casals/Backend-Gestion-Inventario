package com.gestioninventariodemo2.cruddemo2.Model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "categorias_movimiento_caja")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoriaMovimientoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCategoriaMovimiento;

    @Size(max = 50)
    @Column(name = "nombre", unique = true, nullable = false, length = 50)
    private String nombre;

    @Column(name = "tipo", nullable = false, length = 10) // INGRESO o EGRESO
    private String tipo;
}
