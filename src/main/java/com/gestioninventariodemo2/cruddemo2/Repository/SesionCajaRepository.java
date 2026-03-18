package com.gestioninventariodemo2.cruddemo2.Repository;

import com.gestioninventariodemo2.cruddemo2.Model.SesionCaja;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SesionCajaRepository extends JpaRepository<SesionCaja, Long> {

    // Buscar si el usuario tiene una caja abierta
    Optional<SesionCaja> findByUsuarioIdUsuarioAndEstado(Long idUsuario, String estado);

    // Obtener la última caja cerrada globalmente para sacar el saldo anterior
    Optional<SesionCaja> findFirstByEstadoOrderByFechaCierreDesc(String estado);

}
