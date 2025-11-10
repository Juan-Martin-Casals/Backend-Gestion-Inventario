package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import com.gestioninventariodemo2.cruddemo2.Model.Producto;

public interface ProductoRepository extends JpaRepository<Producto,Long>{

    List<Producto> findByNombreContainingIgnoreCase(String nombre);
    @Modifying // Indica que esta query va a MODIFICAR la base de datos
    @Query("UPDATE Producto p SET p.estado = ?2 WHERE p.idProducto = ?1")
    void actualizarEstado(Long idProducto, String nuevoEstado);

    List<Producto> findAllByEstado(String estado);

    boolean existsByNombreIgnoreCase(String nombre);

    Page<Producto> findAllByEstado(String estado, Pageable pageable);
}
