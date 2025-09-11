package com.gestioninventariodemo2.cruddemo2.Repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;

public interface VentaRepository extends JpaRepository<Venta,Long>{

    @Query("""
    SELECT new com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO(
        :inicio,
        :fin,
        COUNT(DISTINCT v.id),
        SUM(dv.cantidad),
        SUM(v.total),
        null
    )
    FROM Venta v
    JOIN v.detalleVentas dv
    WHERE v.fecha BETWEEN :inicio AND :fin
    """)
    InformeResponseDTO obtenerResumenVentas(
    @Param("inicio") LocalDate inicio,
    @Param("fin") LocalDate fin
    );

    
    @Query(value = """
    SELECT p.nombre
    FROM detalle_venta dv
    JOIN productos p ON dv.id_producto = p.id_producto
    JOIN ventas v ON dv.id_venta = v.id_venta
    WHERE v.fecha BETWEEN :inicio AND :fin
    GROUP BY p.id_producto, p.nombre
    ORDER BY SUM(dv.cantidad) DESC
    LIMIT 1
    """, nativeQuery = true)
    String obtenerProductoMasVendido(
    @Param("inicio") LocalDate inicio,
    @Param("fin") LocalDate fin
    );

    @Query("SELECT COUNT(v) FROM Venta v WHERE v.fecha BETWEEN :inicio AND :fin")
    Long countVentasEnRango(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("SELECT SUM(dv.cantidad) FROM DetalleVenta dv JOIN dv.venta v WHERE v.fecha BETWEEN :inicio AND :fin")
    Long sumProductosEnRango(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("SELECT SUM(v.total) FROM Venta v WHERE v.fecha BETWEEN :inicio AND :fin")
    Double sumRecaudacionEnRango(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("""
    SELECT p.nombre
    FROM DetalleVenta dv
    JOIN dv.producto p
    JOIN dv.venta v
    WHERE v.fecha BETWEEN :inicio AND :fin
    GROUP BY p.id, p.nombre
    ORDER BY SUM(dv.cantidad) DESC
    """)
    List<String> obtenerProductoMasVendidoEnRango(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("""
    SELECT p.nombre
    FROM DetalleVenta dv
    JOIN dv.producto p
    JOIN dv.venta v
    WHERE v.fecha BETWEEN :inicio AND :fin
    GROUP BY p.id, p.nombre
    ORDER BY SUM(dv.cantidad) ASC
    """)
    List<String> obtenerProductoMenosVendidoEnRango(@Param("inicio") LocalDate inicio, @Param("fin") LocalDate fin);

    @Query("SELECT COUNT(v) FROM Venta v")
    Long countVentasHistoricas();

    @Query("SELECT SUM(dv.cantidad) FROM DetalleVenta dv")
    Long sumProductosHistoricos();
}
