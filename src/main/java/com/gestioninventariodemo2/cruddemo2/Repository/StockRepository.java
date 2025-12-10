package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;

public interface StockRepository extends JpaRepository<Stock, Long> {
    Optional<Stock> findByProducto(Producto producto);

    boolean existsByProductoIdProducto(Long idProducto);

    long countByStockActualEquals(int stock);

    long countByStockActualGreaterThanAndStockActualLessThanEqual(int min, int max);

    Page<Stock> findByStockActualLessThanEqualAndProductoEstado(int stockNivel, String estado, Pageable pageable);

    Optional<Stock> findByProductoIdProducto(Long idProducto);

    // ==========================================================
    // NUEVAS QUERIES PARA DASHBOARD DE INFORMES
    // ==========================================================

    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual < s.stockMinimo AND s.stockActual > 0")
    Integer countProductosConStockBajo();

    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual >= s.stockMinimo")
    Integer countStockOptimo();

    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual < s.stockMinimo AND s.stockActual > 0 AND s.producto.estado = 'ACTIVO'")
    Integer countStockBajo();

    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual = 0 AND s.stockMinimo > 0 AND s.producto.estado = 'ACTIVO'")
    Integer countStockAgotado();

    // Query personalizada para encontrar productos donde stockActual < stockMinimo
    // (incluye agotados pero excluye óptimos)
    @Query("SELECT s FROM Stock s WHERE s.stockActual < s.stockMinimo AND s.producto.estado = :estado")
    Page<Stock> findByStockActualLessThanStockMinimoAndProductoEstado(@Param("estado") String estado,
            Pageable pageable);

}
