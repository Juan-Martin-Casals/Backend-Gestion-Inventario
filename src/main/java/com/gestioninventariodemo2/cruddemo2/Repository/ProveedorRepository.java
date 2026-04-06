package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;

public interface ProveedorRepository extends JpaRepository<Proveedor, Long> {

    boolean existsByEmail(String email);

    boolean existsByNombreIgnoreCase(String nombre);

    @Query("SELECT DISTINCT p FROM Proveedor p LEFT JOIN FETCH p.productoProveedor pp LEFT JOIN FETCH pp.producto WHERE p.idProveedor = :id")
    Optional<Proveedor> findByIdWithProductos(@Param("id") Long id);

}
