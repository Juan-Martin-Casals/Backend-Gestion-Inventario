package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;

public interface StockRepository extends JpaRepository<Stock,Long>{
    Optional<Stock> findByProducto(Producto producto);
    boolean existsByProductoIdProducto(Long idProducto);

    long countByStockActualEquals(int stock);
    
    long countByStockActualGreaterThanAndStockActualLessThanEqual(int min, int max);

    Page<Stock> findByStockActualLessThanEqualAndProductoEstado(int stockNivel, String estado, Pageable pageable);

    Optional<Stock> findByProductoIdProducto(Long idProducto);

    
}
