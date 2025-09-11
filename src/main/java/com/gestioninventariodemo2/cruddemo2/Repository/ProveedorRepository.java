package com.gestioninventariodemo2.cruddemo2.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;

public interface ProveedorRepository extends JpaRepository<Proveedor,Long>{

    boolean existsByEmail(String email);

}
