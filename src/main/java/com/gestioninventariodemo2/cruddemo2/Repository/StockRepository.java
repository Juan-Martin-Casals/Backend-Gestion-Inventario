package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
    // Solo cuentan productos con estado ACTIVO para consistencia
    // ==========================================================

    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual < s.stockMinimo AND s.stockActual > 0 AND s.producto.estado = 'ACTIVO'")
    Integer countProductosConStockBajo();

    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual >= s.stockMinimo AND s.producto.estado = 'ACTIVO'")
    Integer countStockOptimo();

    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual < s.stockMinimo AND s.stockActual > 0 AND s.producto.estado = 'ACTIVO'")
    Integer countStockBajo();

    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual = 0 AND s.producto.estado = 'ACTIVO'")
    Integer countStockAgotado();

    // Query usada por obtenerResumenStock() del KPI principal
    // Solo cuenta como "agotado" a productos que tienen stockMinimo > 0
    // (omite productos que tienen stockMinimo = 0, ya que técnicamente no necesitan
    // reposición)
    @Query("SELECT COUNT(s) FROM Stock s WHERE s.stockActual = 0 AND s.stockMinimo > 0 AND s.producto.estado = 'ACTIVO'")
    Long countAgotadosActivos();

    // Query para tabla de reposición: mismo criterio que las tarjetas del dashboard
    // Muestra agotados (stockActual=0 Y stockMinimo>0) + bajo stock (0 <
    // stockActual < stockMinimo)
    @Query("SELECT s FROM Stock s WHERE s.producto.estado = :estado AND (" +
            "(s.stockActual = 0 AND s.stockMinimo > 0) OR " +
            "(s.stockActual > 0 AND s.stockActual < s.stockMinimo)" +
            ") ORDER BY s.stockActual ASC")
    Page<Stock> findProductosQueNecesitanReposicion(String estado, Pageable pageable);

    @Query("SELECT s FROM Stock s WHERE s.producto.estado = :estado AND s.stockActual = 0 AND s.stockMinimo > 0 ORDER BY s.producto.nombre ASC")
    Page<Stock> findAgotadosActivos(String estado, Pageable pageable);

}
