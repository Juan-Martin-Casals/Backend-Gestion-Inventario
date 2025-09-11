package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Producto;

public interface ProductoRepository extends JpaRepository<Producto,Long>{

    List<Producto> findByNombreContainingIgnoreCase(String nombre);

}
