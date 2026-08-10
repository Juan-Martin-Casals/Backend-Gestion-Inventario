package com.gestioninventariodemo2.cruddemo2.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.MovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MovimientoCajaRepository extends JpaRepository<MovimientoCaja, Long> {

    List<MovimientoCaja> findBySesionCajaIdSesion(Long idSesion);

    @Query("SELECT COALESCE(SUM(m.monto), 0.0) FROM MovimientoCaja m WHERE m.sesionCaja.idSesion = :idSesion AND m.tipo = 'INGRESO' AND (m.estado IS NULL OR m.estado = 'ACTIVO')")
    Double sumIngresosBySesion(@Param("idSesion") Long idSesion);

    @Query("SELECT COALESCE(SUM(m.monto), 0.0) FROM MovimientoCaja m WHERE m.sesionCaja.idSesion = :idSesion AND m.tipo = 'EGRESO' AND (m.estado IS NULL OR m.estado = 'ACTIVO')")
    Double sumEgresosBySesion(@Param("idSesion") Long idSesion);
}
