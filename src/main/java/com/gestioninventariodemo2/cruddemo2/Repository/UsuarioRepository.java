package com.gestioninventariodemo2.cruddemo2.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.Usuario;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario,Long>{

}
