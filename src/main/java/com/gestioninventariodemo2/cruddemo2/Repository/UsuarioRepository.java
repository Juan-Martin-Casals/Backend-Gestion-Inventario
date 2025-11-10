package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.Usuario;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario,Long>{

    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);

    List<Usuario> findAllByEstado(String estado);
    Page<Usuario> findAllByEstado(String estado, Pageable pageable);

}
