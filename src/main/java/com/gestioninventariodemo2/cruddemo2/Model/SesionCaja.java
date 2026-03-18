package com.gestioninventariodemo2.cruddemo2.Model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sesiones_caja")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SesionCaja {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idSesion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private LocalDateTime fechaApertura;

    private LocalDateTime fechaCierre;

    @Column(nullable = false)
    private Double saldoAnterior;

    @Column(nullable = false)
    private Double montoInicialReal;

    private Double montoFinalReal;

    @Column(nullable = false)
    private Boolean diferenciaApertura;

    @Column(columnDefinition = "TEXT")
    private String observacionesApertura;

    @Column(columnDefinition = "TEXT")
    private String observacionesCierre;

    @Column(nullable = false)
    private String estado;
}
