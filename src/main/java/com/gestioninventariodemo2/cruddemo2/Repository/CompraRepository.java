package com.gestioninventariodemo2.cruddemo2.Repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gestioninventariodemo2.cruddemo2.Model.Compra;

public interface CompraRepository extends JpaRepository<Compra, Long> {

    // ==========================================================
    // QUERIES PARA DASHBOARD DE INFORMES
    // ==========================================================

    @Query("SELECT SUM(c.total) FROM Compra c WHERE c.fecha BETWEEN :inicio AND :fin")
    Double sumTotalComprasEnRango(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query(value = """
            SELECT DATE(c.fecha) as fecha, COALESCE(SUM(c.total), 0) as total
            FROM compras c
            WHERE c.fecha BETWEEN CAST(:inicio AS DATE) AND CAST(:fin AS DATE)
            GROUP BY DATE(c.fecha)
            ORDER BY DATE(c.fecha)
            """, nativeQuery = true)
    List<Object[]> sumComprasPorDia(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    // Query para obtener compras completas en un rango
    List<Compra> findByFechaBetween(LocalDate inicio, LocalDate fin);
}
