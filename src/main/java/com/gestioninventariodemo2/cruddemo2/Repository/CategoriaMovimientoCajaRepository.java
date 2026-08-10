package com.gestioninventariodemo2.cruddemo2.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.CategoriaMovimientoCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoriaMovimientoCajaRepository extends JpaRepository<CategoriaMovimientoCaja, Long> {
    Optional<CategoriaMovimientoCaja> findByNombre(String nombre);
    List<CategoriaMovimientoCaja> findByTipo(String tipo);
}
