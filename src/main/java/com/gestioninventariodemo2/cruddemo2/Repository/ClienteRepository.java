package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Cliente;

public interface ClienteRepository extends JpaRepository<Cliente,Long>{

    Optional<Cliente> findByDni(String dni);

    boolean existsByDni(String dni);

    
}
