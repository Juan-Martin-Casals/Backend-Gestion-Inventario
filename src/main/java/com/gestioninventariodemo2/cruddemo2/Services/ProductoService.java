package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.ActualizarProductoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoActualizadoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoSelectDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.StockTablaDTO;
import com.gestioninventariodemo2.cruddemo2.Exception.SoftDeleteException;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.ProductoProveedor;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;
import com.gestioninventariodemo2.cruddemo2.Repository.DetalleCompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.DetalleVentaRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoProveedorRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final StockRepository stockRepository;
    private final DetalleVentaRepository detalleVentaRepository;
    private final DetalleCompraRepository detalleCompraRepository;
    private final ProductoProveedorRepository productoProveedorRepository;
    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto) {
    // Validación de campos obligatorios
    if (dto.getNombre() == null || dto.getNombre().isBlank() ||
        dto.getCategoria() == null || dto.getCategoria().isBlank() ||
        dto.getDescripcion() == null || dto.getDescripcion().isBlank()) {
        throw new IllegalArgumentException("Debe completar todos los campos");
    }




        // Crear producto
        Producto producto = Producto.builder()
                .nombre(dto.getNombre())
                .categoria(dto.getCategoria())
                .descripcion(dto.getDescripcion())
                .estado("ACTIVO")
                .build();

        productoRepository.save(producto);


        // 2. Crear registro de Stock inicial con 0
        Stock stockInicial = Stock.builder()
                .producto(producto) // Relaciona el stock con el nuevo producto
                .stockActual(0)     // Stock inicial en 0
                .build();
        
        stockRepository.save(stockInicial);

        return producto;

    }
    
    @Transactional(readOnly = true)
    public List<ProductoResponseDTO> listarProductos() {
    return productoRepository.findAll()
            .stream()
            .map(p -> ProductoResponseDTO.builder()
                    .nombre(p.getNombre())
                    .categoria(p.getCategoria())
                    .descripcion(p.getDescripcion())
                    .precio(p.getPrecio())
                    .build()
            )
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StockTablaDTO> mostrarTablaStock() {
    return productoRepository.findAllByEstado("ACTIVO")
            .stream()
            .map(p -> {
                int stockActual = 0;
                // Si la lista existe y tiene al menos un elemento
                if (p.getStocks() != null && !p.getStocks().isEmpty()) {
                    stockActual = p.getStocks().get(0).getStockActual();
                }
                return StockTablaDTO.builder()
                        .id(p.getIdProducto())
                        .nombre(p.getNombre())
                        .categoria(p.getCategoria())
                        .descripcion(p.getDescripcion())
                        .precio(p.getPrecio())
                        .stock(stockActual)
                        .build();
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductoSelectDTO> listarProductosSelect() {
    return productoRepository.findAllByEstado("ACTIVO")
            .stream()
            .map(p -> {
                return ProductoSelectDTO.builder()
                        .idProducto(p.getIdProducto())
                        .nombreProducto(p.getNombre())
                        .precioVenta(p.getPrecio())

                        .build();
            })
            .toList();
    }


    @Transactional
    public ProductoActualizadoDTO editarProducto(Long id, ActualizarProductoDTO dto) {
    // Validar campos obligatorios
    if (dto.getNombre() == null || dto.getNombre().isBlank() ||
        dto.getCategoria() == null || dto.getCategoria().isBlank() ||
        dto.getDescripcion() == null || dto.getDescripcion().isBlank()) {
        throw new IllegalArgumentException("Todos los campos obligatorios deben estar completos");
    }


    Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado con id: " + id));

    producto.setNombre(dto.getNombre());
    producto.setCategoria(dto.getCategoria());
    producto.setDescripcion(dto.getDescripcion());


    productoRepository.save(producto);

    return ProductoActualizadoDTO.builder()
            .nombre(producto.getNombre())
            .categoria(producto.getCategoria())
            .descripcion(producto.getDescripcion())
            .build();
    }

    @Transactional(noRollbackFor = {IllegalArgumentException.class}) 
    public void eliminarProducto(Long id) {
    
    Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));

    // Validamos el uso en las dos tablas
    boolean usadoEnVenta = detalleVentaRepository.existsByProductoIdProducto(id);
    boolean usadoEnCompra = detalleCompraRepository.existsByProductoIdProducto(id);
    boolean asociadoAProveedor = productoProveedorRepository.existsByProductoIdProducto(id); // <-- ¡LA VALIDACIÓN QUE FALTABA!
    
    // -----------------------------------------------------------
    
   if (usadoEnVenta || usadoEnCompra || asociadoAProveedor) { 
        // CASO 1: ÉXITO LÓGICO (Soft Delete)
        producto.setEstado("INACTIVO");
        productoRepository.save(producto);
        
        // Lanzamos la excepción controlada para el Frontend
        throw new IllegalArgumentException("El producto se marcó como INACTIVO (Está asociado a ventas/compras/proveedores).");

    } else {
        // CASO 2: BORRADO FÍSICO
        
        try {
            // Si no está en uso, intentamos borrarlo
            productoRepository.deleteById(id);
            // Si el DELETE funciona, el método termina aquí y devuelve 204 No Content.

        } catch (Exception e) {
            // Si falla el borrado FÍSICO por alguna razón (ej. restricción oculta)
            // Lanzamos una RuntimeException simple para que el GlobalExceptionHandler
            // lo devuelva como 500. El frontend verá que el borrado falló.
             throw new RuntimeException("Error inesperado al borrar el producto físicamente: " + e.getMessage(), e);
        }
    }
}



    public List<ProductoResponseDTO> buscarPorNombre(String nombre) {
    List<Producto> productos = productoRepository.findByNombreContainingIgnoreCase(nombre);
    return productos.stream()
        .map(this::mapToDTO)
        .toList();
    }

    public ProductoResponseDTO mapToDTO(Producto producto) {
    return ProductoResponseDTO.builder()
        .nombre(producto.getNombre())
        .categoria(producto.getCategoria())
        .descripcion(producto.getDescripcion())
        .precio(producto.getPrecio())
        .build();
    }

    public ProductoSelectDTO mapDto(Producto producto) {
    return ProductoSelectDTO.builder()
        .idProducto(producto.getIdProducto())
        .nombreProducto(producto.getNombre())
        .precioVenta(producto.getPrecio())
        .build();
    }

}
