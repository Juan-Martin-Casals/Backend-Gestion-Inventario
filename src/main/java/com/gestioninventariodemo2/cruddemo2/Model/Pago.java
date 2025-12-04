package com.gestioninventariodemo2.cruddemo2.Model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pago")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idPago;

    @OneToOne
    @JoinColumn(name = "id_venta", unique = true)
    private Venta venta;

    @ManyToOne
    @JoinColumn(name = "id_metodo_pago")
    private MetodoPago metodoPago;

    private BigDecimal importe;
    private String nroTransaccion;
    private String tipoTarjeta;
    private String ultimosDigitos;

    private LocalDateTime fechaPago;

    @ManyToOne
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;
}
