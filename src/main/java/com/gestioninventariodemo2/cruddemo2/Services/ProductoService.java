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
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final StockRepository stockRepository;

    @Transactional
    public Producto crearProducto(ProductoRequestDTO dto) {
    // Validación de campos obligatorios
    if (dto.getNombre() == null || dto.getNombre().isBlank() ||
        dto.getCategoria() == null || dto.getCategoria().isBlank() ||
        dto.getDescripcion() == null || dto.getDescripcion().isBlank()) {
        throw new IllegalArgumentException("Debe completar todos los campos");
    }

    // Validación de precio
    if (dto.getPrecio() <= 0) {
        throw new IllegalArgumentException("El precio debe ser un valor numérico válido");
    }


        // Crear producto
        Producto producto = Producto.builder()
                .nombre(dto.getNombre())
                .categoria(dto.getCategoria())
                .descripcion(dto.getDescripcion())
                .precio(dto.getPrecio())
                .build();

        productoRepository.save(producto);

        // Crear stock asociado
        Stock stock = Stock.builder()
                .stockMinimo(5)
                .stockMaximo(100)
                .stockActual(dto.getStockActual())
                .producto(producto)
                .build();

        stockRepository.save(stock);

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
    return productoRepository.findAll()
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
    return productoRepository.findAll()
            .stream()
            .map(p -> {
                return ProductoSelectDTO.builder()
                        .id(p.getIdProducto())
                        .nombre(p.getNombre())

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

    // Validar precio
    if (dto.getPrecio() <= 0) {
        throw new IllegalArgumentException("El precio debe ser un valor numérico válido");
    }

    // Validar cantidad extra de stock
    if (dto.getCantidadExtraStock() < 0) {
        throw new IllegalArgumentException("La cantidad de stock no puede ser negativa");
    }

    Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado con id: " + id));

    producto.setNombre(dto.getNombre());
    producto.setCategoria(dto.getCategoria());
    producto.setDescripcion(dto.getDescripcion());
    producto.setPrecio(dto.getPrecio());

    Stock stock = producto.getStocks().get(0);
    stock.setStockActual(stock.getStockActual() + dto.getCantidadExtraStock());

    productoRepository.save(producto);

    return ProductoActualizadoDTO.builder()
            .nombre(producto.getNombre())
            .categoria(producto.getCategoria())
            .descripcion(producto.getDescripcion())
            .precio(producto.getPrecio())
            .stockActual(stock.getStockActual())
            .build();
    }

    @Transactional
    public void eliminarProducto(Long id) {
        if (!productoRepository.existsById(id)) {
            throw new RuntimeException("No se puede eliminar. Producto no encontrado con id: " + id);
        }
        productoRepository.deleteById(id);
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
        .id(producto.getIdProducto())
        .nombre(producto.getNombre())
        .build();
    }

}
