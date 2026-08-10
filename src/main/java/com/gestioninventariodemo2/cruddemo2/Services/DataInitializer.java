package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.Model.CategoriaMovimientoCaja;
import com.gestioninventariodemo2.cruddemo2.Repository.CategoriaMovimientoCajaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final CategoriaMovimientoCajaRepository repository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() == 0) {
            repository.save(CategoriaMovimientoCaja.builder().nombre("Pago a Proveedor").tipo("EGRESO").build());
            repository.save(CategoriaMovimientoCaja.builder().nombre("Retiro a Caja Fuerte").tipo("EGRESO").build());
            repository.save(CategoriaMovimientoCaja.builder().nombre("Gasto Operativo").tipo("EGRESO").build());
            repository.save(CategoriaMovimientoCaja.builder().nombre("Aporte de Cambio").tipo("INGRESO").build());
            repository.save(CategoriaMovimientoCaja.builder().nombre("Ingreso Manual").tipo("INGRESO").build());
        }
    }
}
