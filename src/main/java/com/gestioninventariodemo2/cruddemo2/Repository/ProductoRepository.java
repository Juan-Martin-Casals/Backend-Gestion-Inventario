package com.gestioninventariodemo2.cruddemo2.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Producto;

public interface ProductoRepository extends JpaRepository<Producto,Long>{

}
