package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.Usuario;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario,Long>{

    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);

}
