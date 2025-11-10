package com.gestioninventariodemo2.cruddemo2.Services;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    // 1. Validación de campos obligatorios (esta ya la tenías)
    if (dto.getNombre() == null || dto.getNombre().isBlank() ||
        dto.getCategoria() == null || dto.getCategoria().isBlank() ||
        dto.getDescripcion() == null || dto.getDescripcion().isBlank()) {
        throw new IllegalArgumentException("Debe completar todos los campos");
    }

    // --- ¡VALIDACIÓN DE DUPLICADO AÑADIDA! ---
    // 2. Usamos el nuevo método del repositorio (trim() quita espacios)
    if (productoRepository.existsByNombreIgnoreCase(dto.getNombre().trim())) {
        // Si ya existe, lanzamos un error que el frontend mostrará
        throw new IllegalArgumentException("Ya existe un producto con el nombre: " + dto.getNombre());
    }
    // --- FIN DE LA VALIDACIÓN ---

    // 3. Crear producto (tu código original)
    Producto producto = Producto.builder()
            .nombre(dto.getNombre())
            .categoria(dto.getCategoria())
            .descripcion(dto.getDescripcion())
            .estado("ACTIVO")
            .fechaCreacion(LocalDate.now())
            .build();

    productoRepository.save(producto);

    // 4. Crear stock asociado (tu código original)
Stock stockInicial = Stock.builder()
.producto(producto)
.stockActual(0) // El stock inicial siempre es 0
.stockMinimo(dto.getStockMinimo()) // <-- ¡NUEVO!
.stockMaximo(dto.getStockMaximo()) // <-- ¡NUEVO!
.build();
    
    stockRepository.save(stockInicial);

    return producto;
}
    
@Transactional(readOnly = true)
    public Page<ProductoResponseDTO> listarProductos(Pageable pageable) {
        
        Page<Producto> paginaProductos = productoRepository.findAllByEstado("ACTIVO", pageable);

        return paginaProductos.map(p -> {
            
            // --- ¡LÓGICA AÑADIDA! ---
            // Valores por defecto
            int stockMin = 0;
            int stockMax = 0;

            // Buscamos el stock (igual que en tu lógica de StockTablaDTO)
            if (p.getStocks() != null && !p.getStocks().isEmpty()) {
                Stock stock = p.getStocks().get(0); // Tomamos el primer registro de stock
                stockMin = stock.getStockMinimo();
                stockMax = stock.getStockMaximo();
            }
            // --- FIN DE LÓGICA AÑADIDA ---

            return ProductoResponseDTO.builder()
                    .nombre(p.getNombre())
                    .categoria(p.getCategoria())
                    .descripcion(p.getDescripcion())
                    .precio(p.getPrecio())
                    .fechaCreacion(p.getFechaCreacion()) // (Este ya lo tenías)
                    .stockMinimo(stockMin) // <-- ¡NUEVO!
                    .stockMaximo(stockMax) // <-- ¡NUEVO!
                    .build();
        });
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
    // --- 1. VALIDACIONES ---
    // (Estas eran de tu versión anterior, las volvemos a poner)
    if (dto.getNombre() == null || dto.getNombre().isBlank() ||
        dto.getCategoria() == null || dto.getCategoria().isBlank() ||
        dto.getDescripcion() == null || dto.getDescripcion().isBlank()) {
        throw new IllegalArgumentException("Todos los campos obligatorios deben estar completos");
    }

    // Validación de precio (que faltaba)
    if (dto.getPrecio() <= 0) {
        throw new IllegalArgumentException("El precio debe ser un valor numérico válido");
    }

    // Validación de cantidad extra de stock (que faltaba)
    if (dto.getCantidadExtraStock() < 0) {
        throw new IllegalArgumentException("La cantidad de stock no puede ser negativa");
    }

    // --- 2. BUSCAR ENTIDADES ---
    Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Producto no encontrado con id: " + id));

    // --- 3. ACTUALIZAR DATOS DEL PRODUCTO ---
    producto.setNombre(dto.getNombre());
    producto.setCategoria(dto.getCategoria());
    producto.setDescripcion(dto.getDescripcion());
    producto.setPrecio(dto.getPrecio()); // <-- ¡ESTO FALTABA!

    // --- 4. ACTUALIZAR DATOS DEL STOCK ---
    // (Asumiendo que siempre hay un registro de stock)
    Stock stock = producto.getStocks().get(0);
    stock.setStockActual(stock.getStockActual() + dto.getCantidadExtraStock());

    // --- 5. GUARDAR AMBAS ENTIDADES ---
    productoRepository.save(producto);
    stockRepository.save(stock); // <-- ¡ESTA ERA LA LÍNEA CRÍTICA QUE FALTABA!

    // --- 6. DEVOLVER EL DTO COMPLETO ---
    return ProductoActualizadoDTO.builder()
            .nombre(producto.getNombre())
            .categoria(producto.getCategoria())
            .descripcion(producto.getDescripcion())
            .precio(producto.getPrecio()) // <-- ¡AÑADIDO!
            .stockActual(stock.getStockActual()) // <-- ¡AÑADIDO!
            .build();
}

    @Transactional(noRollbackFor = {IllegalArgumentException.class}) 
public void eliminarProducto(Long id) {
 
    Producto producto = productoRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + id));

    // Validamos el uso en TODAS las tablas
    boolean usadoEnVenta = detalleVentaRepository.existsByProductoIdProducto(id);
    boolean usadoEnCompra = detalleCompraRepository.existsByProductoIdProducto(id);
    boolean asociadoAProveedor = productoProveedorRepository.existsByProductoIdProducto(id);
    
    // --- ¡LA LÍNEA QUE FALTABA! ---
    boolean tieneStockAsociado = stockRepository.existsByProductoIdProducto(id);
    
    // -----------------------------------------------------------
    
    // ¡AÑADIMOS EL NUEVO CHEQUEO AL IF!
    if (usadoEnVenta || usadoEnCompra || asociadoAProveedor || tieneStockAsociado) { 
        // CASO 1: ÉXITO LÓGICO (Soft Delete)
        // (Si está en uso O SIQUIERA TIENE UN REGISTRO DE STOCK)
        producto.setEstado("INACTIVO");
        productoRepository.save(producto);
        
        throw new IllegalArgumentException("El producto se marcó como INACTIVO (Está asociado a ventas/compras/proveedores o stock).");

    } else {
        // CASO 2: BORRADO FÍSICO
        // (Solo si no tiene ventas, ni compras, ni proveedores, NI stock)
        try {
            productoRepository.deleteById(id);
        } catch (Exception e) {
             throw new RuntimeException("Error inesperado al borrar el producto físicamente.", e);
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
        .fechaCreacion(producto.getFechaCreacion())
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
