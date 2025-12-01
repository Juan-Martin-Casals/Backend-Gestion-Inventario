package com.gestioninventariodemo2.cruddemo2.Services;

// Importaciones de DTOs
import com.gestioninventariodemo2.cruddemo2.DTO.CompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleCompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleCompraResponseDTO;

// Importaciones de Modelos (Entidades)
import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra;
import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;

// Importaciones de Repositorios
import com.gestioninventariodemo2.cruddemo2.Repository.CompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProveedorRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;

// Importaciones de Spring y Java
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor // Inyecta los repositorios finales
@Transactional // Aplica transaccionalidad a todos los métodos públicos
public class CompraService {

    // Inyección de dependencias (se hacen automáticamente por
    // @RequiredArgsConstructor)
    private final CompraRepository compraRepository;
    private final ProveedorRepository proveedorRepository;
    private final ProductoRepository productoRepository;
    private final StockRepository stockRepository;

    /**
     * Registra una nueva compra, sus detalles, y actualiza el stock y precios.
     */
    public Compra registrarCompra(CompraRequestDTO dto) {

        // 1. Crear la entidad Compra
        Compra compra = new Compra();

        // 2. Asignar Proveedor (buscándolo por ID)
        Proveedor proveedor = proveedorRepository.findById(dto.getIdProveedor())
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado con ID: " + dto.getIdProveedor()));
        compra.setProveedor(proveedor);

        // 3. Asignar fecha (con la lógica de @JsonFormat o LocalDate.now())
        compra.setFecha(dto.getFecha() != null ? dto.getFecha() : LocalDate.now());

        // 4. Mapear DTOs de Detalle a Entidades de Detalle
        List<DetalleCompra> detallesEntidad = new ArrayList<>();
        double totalCompra = 0.0;

        for (DetalleCompraRequestDTO detalleDto : dto.getDetalleCompras()) {
            DetalleCompra detalle = new DetalleCompra();
            detalle.setCantidad(detalleDto.getCantidad());
            detalle.setPrecioUnitario(detalleDto.getPrecioUnitario());

            // Enlazar el producto (buscándolo por ID)
            Producto producto = productoRepository.findById(detalleDto.getIdProducto())
                    .orElseThrow(
                            () -> new RuntimeException("Producto no encontrado con ID: " + detalleDto.getIdProducto()));
            detalle.setProducto(producto);

            // Enlazar el detalle a la compra 'padre'
            detalle.setCompra(compra);

            // Calcular total
            totalCompra += (detalle.getCantidad() * detalle.getPrecioUnitario());

            detallesEntidad.add(detalle);
        }

        // 5. Asignar el total y la lista de detalles a la compra
        compra.setTotal(totalCompra);
        compra.setDetalleCompras(detallesEntidad);

        // 6. Guardar la Compra y sus Detalles (¡Cascade hace la magia!)
        Compra compraGuardada = compraRepository.save(compra);

        // 7. Actualizar Stock y Precio de Venta (¡¡CÓDIGO CORREGIDO!!)
        for (DetalleCompraRequestDTO detalleDto : dto.getDetalleCompras()) {

            // --- 1. BUSCAMOS EL PRODUCTO REAL UNA SOLA VEZ ---
            Producto productoDB = productoRepository.findById(detalleDto.getIdProducto())
                    .orElseThrow(() -> new RuntimeException(
                            "Producto (para stock/precio) no encontrado con ID: " + detalleDto.getIdProducto()));

            // --- 2. Actualizar Precio de Venta ---
            // Solo actualiza si se envió un precio de venta válido
            if (detalleDto.getNuevoPrecioVenta() > 0) {
                productoDB.setPrecio(detalleDto.getNuevoPrecioVenta());
                productoRepository.save(productoDB); // Guarda el precio actualizado en 'Producto'
            }

            // --- 3. Actualizar Stock ---
            // Buscamos el stock usando el producto REAL (productoDB)
            Stock stockDelProducto = stockRepository.findByProducto(productoDB)
                    .orElseThrow(
                            () -> new RuntimeException("Stock no encontrado para producto: " + productoDB.getNombre()));

            int stockNuevo = stockDelProducto.getStockActual() + detalleDto.getCantidad();
            stockDelProducto.setStockActual(stockNuevo);
            stockRepository.save(stockDelProducto); // Guarda el stock actualizado en 'Stock'
        }

        return compraGuardada; // Devuelve la entidad completa
    }

    /**
     * Lista todas las compras registradas con un formato simplificado.
     */
    public Page<CompraResponseDTO> listarTodasLasCompras(Pageable pageable) {

        // 1. Obtenemos la página del repositorio
        Page<Compra> paginaCompras = compraRepository.findAll(pageable); // findAll(Pageable) existe en JpaRepository

        // 2. Mapeamos la página a DTO usando el mapper que ya tenías
        return paginaCompras.map(this::mapToCompraDTO);
    }

    /**
     * Obtiene una compra específica por su ID.
     */
    public CompraResponseDTO obtenerCompraPorId(Long id) {
        Compra compra = compraRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Compra no encontrada con ID: " + id));
        return mapToCompraDTO(compra);
    }

    /**
     * Método helper para convertir la Entidad Compra a CompraResponseDTO.
     */

    // 1. Mapear los detalles
    private CompraResponseDTO mapToCompraDTO(Compra compra) {

        // 1. Mapear los detalles
        List<DetalleCompraResponseDTO> detalleDTO = compra.getDetalleCompras().stream()
                .map(detalle -> DetalleCompraResponseDTO.builder()
                        .cantidad(detalle.getCantidad())
                        .nombreProducto(detalle.getProducto().getNombre())
                        .precioUnitario(detalle.getPrecioUnitario()) // <-- ¡LÍNEA AÑADIDA PARA EL COSTO UNITARIO!
                        .build())
                .collect(Collectors.toList());

        // 2. Mapear la compra principal
        return CompraResponseDTO.builder()
                .id(compra.getIdCompra())
                .fecha(compra.getFecha())
                .total(compra.getTotal())
                .nombreProveedor(compra.getProveedor().getNombre())
                .productosComprados(detalleDTO)
                .build();

    }

    /**
     * Obtiene compras filtradas por rango de fechas.
     */
    public List<CompraResponseDTO> obtenerComprasPorRangoFechas(LocalDate inicio, LocalDate fin) {
        List<Compra> compras;

        if (inicio != null && fin != null) {
            compras = compraRepository.findAll().stream()
                    .filter(c -> !c.getFecha().isBefore(inicio) && !c.getFecha().isAfter(fin))
                    .collect(Collectors.toList());
        } else {
            compras = compraRepository.findAll();
        }

        return compras.stream()
                .map(this::mapToCompraDTO)
                .collect(Collectors.toList());
    }
}