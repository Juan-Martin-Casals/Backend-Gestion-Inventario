package com.gestioninventariodemo2.cruddemo2.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;

public interface DetalleCompraRepository extends JpaRepository<DetalleCompra,Long>{
    boolean existsByProductoIdProducto(Long idProducto);

    List<DetalleCompra> findByProductoOrderByCompraFechaDesc(Producto producto);

    @org.springframework.data.jpa.repository.Query("SELECT d FROM DetalleCompra d WHERE d.producto.idProducto = :idProducto " +
           "AND (:proveedorId IS NULL OR d.compra.proveedor.idProveedor = :proveedorId) " +
           "AND (cast(:fechaInicio as timestamp) IS NULL OR d.compra.fecha >= :fechaInicio) " +
           "AND (cast(:fechaFin as timestamp) IS NULL OR d.compra.fecha <= :fechaFin)")
    org.springframework.data.domain.Page<DetalleCompra> findHistorialByProductoId(
            @org.springframework.data.repository.query.Param("idProducto") Long idProducto,
            @org.springframework.data.repository.query.Param("proveedorId") Long proveedorId,
            @org.springframework.data.repository.query.Param("fechaInicio") java.time.LocalDateTime fechaInicio,
            @org.springframework.data.repository.query.Param("fechaFin") java.time.LocalDateTime fechaFin,
            org.springframework.data.domain.Pageable pageable);

    DetalleCompra findFirstByProductoIdProductoAndCompraProveedorIdProveedorAndIdDetalleCompraLessThanOrderByIdDetalleCompraDesc(Long idProducto, Long idProveedor, Long idDetalleCompra);
}
