package com.gestioninventariodemo2.cruddemo2.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.CategoriaMovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface CategoriaMovimientoCajaRepository extends JpaRepository<CategoriaMovimientoCaja, Long> {
    @Query("SELECT c FROM CategoriaMovimientoCaja c WHERE LOWER(TRIM(c.nombre)) = LOWER(TRIM(:nombre))")
    Optional<CategoriaMovimientoCaja> buscarPorNombreExacto(@org.springframework.data.repository.query.Param("nombre") String nombre);

    List<CategoriaMovimientoCaja> findByTipo(String tipo);
    List<CategoriaMovimientoCaja> findByTipoAndActivoTrue(String tipo);
}
