package com.gestioninventariodemo2.cruddemo2.Repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    // ==========================================================
    // QUERIES PARA ORDENAMIENTO POR PRODUCTO Y COSTO UNITARIO
    // ==========================================================

    // Ordenar por nombre de producto (ASC)
    @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
            "GROUP BY c ORDER BY MIN(p.nombre) ASC")
    Page<Compra> findAllOrderByProductoNombreAsc(Pageable pageable);

    // Ordenar por nombre de producto (DESC)
    @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc LEFT JOIN dc.producto p " +
            "GROUP BY c ORDER BY MIN(p.nombre) DESC")
    Page<Compra> findAllOrderByProductoNombreDesc(Pageable pageable);

    // Ordenar por costo unitario (ASC)
    @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc " +
            "GROUP BY c ORDER BY MIN(dc.precioUnitario) ASC")
    Page<Compra> findAllOrderByPrecioUnitarioAsc(Pageable pageable);

    // Ordenar por costo unitario (DESC)
    @Query("SELECT c FROM Compra c LEFT JOIN c.detalleCompras dc " +
            "GROUP BY c ORDER BY MIN(dc.precioUnitario) DESC")
    Page<Compra> findAllOrderByPrecioUnitarioDesc(Pageable pageable);
}
