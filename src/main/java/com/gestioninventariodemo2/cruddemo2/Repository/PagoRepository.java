package com.gestioninventariodemo2.cruddemo2.Repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.Pago;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {

    // Encontrar pago por ID de venta (relación 1:1)
    Pago findByVentaIdVenta(Long idVenta);

    // Obtener pagos por método de pago
    List<Pago> findByMetodoPagoIdMetodoPago(Long idMetodoPago);

    // Obtener pagos entre fechas
    List<Pago> findByFechaPagoBetween(LocalDateTime inicio, LocalDateTime fin);

    // Consulta personalizada para reportes: total por método de pago
    @Query("SELECT p.metodoPago.nombre, SUM(p.importe), COUNT(p) " +
            "FROM Pago p " +
            "GROUP BY p.metodoPago.nombre")
    List<Object[]> obtenerTotalPorMetodoPago();

    // Total por método de pago entre fechas
    @Query("SELECT p.metodoPago.nombre, SUM(p.importe), COUNT(p) " +
            "FROM Pago p " +
            "WHERE p.fechaPago BETWEEN :inicio AND :fin " +
            "GROUP BY p.metodoPago.nombre")
    List<Object[]> obtenerTotalPorMetodoPagoEntreFechas(
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin);
}
