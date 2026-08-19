package com.gestioninventariodemo2.cruddemo2.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.MovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Long> {

    List<MovimientoCaja> findBySesionCajaIdSesion(Long idSesion);

    @Query("SELECT COALESCE(SUM(m.monto), 0.0) FROM MovimientoCaja m WHERE m.sesionCaja.idSesion = :idSesion AND m.tipo = 'INGRESO' AND (m.estado IS NULL OR m.estado = 'ACTIVO')")
    Double sumIngresosBySesion(@Param("idSesion") Long idSesion);

    @Query("SELECT COALESCE(SUM(m.monto), 0.0) FROM MovimientoCaja m WHERE m.sesionCaja.idSesion = :idSesion AND m.tipo = 'EGRESO' AND (m.estado IS NULL OR m.estado = 'ACTIVO')")
    Double sumEgresosBySesion(@Param("idSesion") Long idSesion);

    @Query("SELECT COALESCE(SUM(m.monto), 0.0) FROM MovimientoCaja m WHERE m.tipo = :tipo AND m.fechaHora BETWEEN :inicio AND :fin AND (m.estado IS NULL OR m.estado = 'ACTIVO')")
    Double sumMovimientosEnRango(@Param("tipo") String tipo, @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);

    @Query(value = """
            SELECT DATE(m.fecha_hora) as fecha, COALESCE(SUM(m.monto), 0.0) as total
            FROM movimientos_caja m
            WHERE m.tipo = :tipo AND m.fecha_hora BETWEEN CAST(:inicio AS DATE) AND CAST(:fin AS DATE) AND (m.estado IS NULL OR m.estado = 'ACTIVO')
            GROUP BY DATE(m.fecha_hora)
            ORDER BY DATE(m.fecha_hora)
            """, nativeQuery = true)
    List<Object[]> sumMovimientosPorDiaYTipo(@Param("tipo") String tipo, @Param("inicio") LocalDateTime inicio, @Param("fin") LocalDateTime fin);
}
