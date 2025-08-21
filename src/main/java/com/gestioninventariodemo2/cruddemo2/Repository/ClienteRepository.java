package com.gestioninventariodemo2.cruddemo2.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Cliente;

public interface ClienteRepository extends JpaRepository<Cliente,Long>{

}
