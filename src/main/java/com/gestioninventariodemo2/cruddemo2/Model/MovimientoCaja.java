package com.gestioninventariodemo2.cruddemo2.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "movimientos_caja")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MovimientoCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idMovimiento;

    @Column(nullable = false, length = 10)
    private String tipo; // INGRESO o EGRESO

    @Column(nullable = false)
    private Double monto;

    @Column(length = 255)
    private String descripcion;

    @Column(length = 50)
    private String referencia;

    @Column(nullable = false)
    private LocalDateTime fechaHora;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_sesion", nullable = false)
    private SesionCaja sesionCaja;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_categoria_movimiento", nullable = false)
    private CategoriaMovimientoCaja categoriaMovimiento;

    @Column(length = 20)
    @Builder.Default
    private String estado = "ACTIVO"; // ACTIVO, ANULADO

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_modificador")
    private Usuario usuarioModificador;

    @Column
    private LocalDateTime fechaModificacion;
}
