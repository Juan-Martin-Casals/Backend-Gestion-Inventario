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
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoProveedorRepository;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Model.ProductoProveedor;

// Importaciones de Spring y Java
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
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
    private final UsuarioRepository usuarioRepository;
    private final ProductoProveedorRepository productoProveedorRepository;
    private final CajaService cajaService;
    private final PagoService pagoService;
    private final MetodoPagoService metodoPagoService;

    /**
     * Registra una nueva compra, sus detalles, y actualiza el stock y precios.
     */
    public Compra registrarCompra(CompraRequestDTO dto, org.springframework.security.core.userdetails.UserDetails userDetails) {
        
        // 0. Autenticación y Validación de Caja Abierta
        String userEmail = userDetails.getUsername();
        Usuario usuario = usuarioRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + userEmail));

        if (!cajaService.verificarCajaActiva(usuario.getIdUsuario())) {
            throw new RuntimeException("Debe abrir la caja antes de registrar movimientos.");
        }

        // 1. Crear la entidad Compra
        Compra compra = new Compra();

        // 2. Asignar Proveedor (buscándolo por ID)
        Proveedor proveedor = proveedorRepository.findById(dto.getIdProveedor())
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado con ID: " + dto.getIdProveedor()));
        compra.setProveedor(proveedor);

        // 3. Asignar fecha (con la lógica de @JsonFormat o LocalDate.now())
        compra.setFecha(dto.getFecha() != null ? dto.getFecha().atTime(LocalTime.now()) : LocalDateTime.now());

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

            // --- 4. ASOCIACIÓN ORGÁNICA: Vincular Producto y Proveedor si no existe la relación ---
            boolean yaExiste = productoProveedorRepository.existsByProductoIdProductoAndProveedorIdProveedor(
                    productoDB.getIdProducto(), proveedor.getIdProveedor());
            if (!yaExiste) {
                ProductoProveedor nuevaRelacion = ProductoProveedor.builder()
                        .producto(productoDB)
                        .proveedor(proveedor)
                        .build();
                productoProveedorRepository.save(nuevaRelacion);
            }
        }

        // 8. Registrar el pago de la compra
        registrarPagoCompra(dto, compraGuardada, usuario);

        return compraGuardada; // Devuelve la entidad completa
    }

    /**
     * Registrar el pago asociado a una compra
     */
    private void registrarPagoCompra(CompraRequestDTO dto, Compra compra, Usuario usuario) {
        if (dto.getIdMetodoPago() == null) {
            throw new IllegalArgumentException("Debe seleccionar un método de pago");
        }

        var metodoPago = metodoPagoService.obtenerPorId(dto.getIdMetodoPago());

        pagoService.registrarPago(
                compra,
                metodoPago,
                java.math.BigDecimal.valueOf(compra.getTotal()),
                dto.getTipoTarjeta(),
                dto.getEstadoPago(),
                dto.getFechaVencimientoPago(),
                usuario);
    }

    /**
     * Lista todas las compras registradas con un formato simplificado.
     * Maneja campos de ordenamiento custom (productos, costoUnitario)
     * que requieren queries con JOIN.
     * Soporta búsqueda global y filtro por rango de fechas.
     */
    public Page<CompraResponseDTO> listarTodasLasCompras(Pageable pageable, String customSort,
            String customDirection, String search, LocalDate fechaInicio, LocalDate fechaFin) {

        Page<Compra> paginaCompras;
        boolean asc = "asc".equalsIgnoreCase(customDirection);
        boolean hasSearch = search != null && !search.trim().isEmpty();
        boolean hasDates = fechaInicio != null && fechaFin != null;

        // Convertimos a LocalDateTime
        LocalDateTime start = hasDates ? fechaInicio.atStartOfDay() : null;
        LocalDateTime end = hasDates ? fechaFin.atTime(LocalTime.MAX) : null;

        // Crear pageable SIN sort (para queries con ORDER BY en la query)
        Pageable pageableWithoutSort = org.springframework.data.domain.PageRequest.of(
                pageable.getPageNumber(), pageable.getPageSize());

        if (customSort != null) {
            // Custom sort fields que requieren JOINs
            if (hasSearch && hasDates) {
                // Búsqueda + fechas + sort custom
                paginaCompras = switch (customSort) {
                    case "productos" -> asc
                            ? compraRepository.searchComprasConFechasOrderByProductoNombreAsc(search, start,
                                    end, pageableWithoutSort)
                            : compraRepository.searchComprasConFechasOrderByProductoNombreDesc(search, start,
                                    end, pageableWithoutSort);
                    case "costoUnitario" -> asc
                            ? compraRepository.searchComprasConFechasOrderByPrecioUnitarioAsc(search, start,
                                    end, pageableWithoutSort)
                            : compraRepository.searchComprasConFechasOrderByPrecioUnitarioDesc(search, start,
                                    end, pageableWithoutSort);
                    default -> compraRepository.searchComprasConFechas(search, start, end, pageable);
                };
            } else if (hasSearch) {
                // Solo búsqueda + sort custom
                paginaCompras = switch (customSort) {
                    case "productos" -> asc
                            ? compraRepository.searchComprasOrderByProductoNombreAsc(search, pageableWithoutSort)
                            : compraRepository.searchComprasOrderByProductoNombreDesc(search, pageableWithoutSort);
                    case "costoUnitario" -> asc
                            ? compraRepository.searchComprasOrderByPrecioUnitarioAsc(search, pageableWithoutSort)
                            : compraRepository.searchComprasOrderByPrecioUnitarioDesc(search, pageableWithoutSort);
                    default -> compraRepository.searchCompras(search, pageable);
                };
            } else if (hasDates) {
                // Solo fechas + sort custom
                paginaCompras = switch (customSort) {
                    case "productos" -> asc
                            ? compraRepository.findByFechaBetweenOrderByProductoNombreAsc(start, end,
                                    pageableWithoutSort)
                            : compraRepository.findByFechaBetweenOrderByProductoNombreDesc(start, end,
                                    pageableWithoutSort);
                    case "costoUnitario" -> asc
                            ? compraRepository.findByFechaBetweenOrderByPrecioUnitarioAsc(start, end,
                                    pageableWithoutSort)
                            : compraRepository.findByFechaBetweenOrderByPrecioUnitarioDesc(start, end,
                                    pageableWithoutSort);
                    default -> compraRepository.findByFechaBetween(start, end, pageable);
                };
            } else {
                // Solo sort custom (comportamiento original)
                paginaCompras = switch (customSort) {
                    case "productos" -> asc
                            ? compraRepository.findAllOrderByProductoNombreAsc(pageableWithoutSort)
                            : compraRepository.findAllOrderByProductoNombreDesc(pageableWithoutSort);
                    case "costoUnitario" -> asc
                            ? compraRepository.findAllOrderByPrecioUnitarioAsc(pageableWithoutSort)
                            : compraRepository.findAllOrderByPrecioUnitarioDesc(pageableWithoutSort);
                    default -> compraRepository.findAll(pageable);
                };
            }
        } else {
            // Sin sort custom - usar sort del Pageable
            if (hasSearch && hasDates) {
                paginaCompras = compraRepository.searchComprasConFechas(search, start, end, pageable);
            } else if (hasSearch) {
                paginaCompras = compraRepository.searchCompras(search, pageable);
            } else if (hasDates) {
                paginaCompras = compraRepository.findByFechaBetween(start, end, pageable);
            } else {
                paginaCompras = compraRepository.findAll(pageable);
            }
        }

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

        // 2. Obtener método de pago y estado
        String metodoPagoNombre = "-";
        String estadoPago = "PAGADO";
        LocalDate fechaVencimiento = null;
        try {
            var pago = pagoService.obtenerPagoPorCompra(compra.getIdCompra());
            if (pago != null) {
                if (pago.getMetodoPago() != null) {
                    metodoPagoNombre = pago.getMetodoPago().getNombre();
                }
                estadoPago = pago.getEstado() != null ? pago.getEstado() : "PAGADO";
                fechaVencimiento = pago.getFechaVencimiento();
            }
        } catch (Exception e) {
            // Ignorar si no se encuentra
        }

        // 3. Mapear la compra principal
        return CompraResponseDTO.builder()
                .id(compra.getIdCompra())
                .fecha(compra.getFecha())
                .total(compra.getTotal())
                .nombreProveedor(compra.getProveedor().getNombre())
                .metodoPago(metodoPagoNombre)
                .estadoPago(estadoPago)
                .fechaVencimientoPago(fechaVencimiento)
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
                    .filter(c -> !c.getFecha().toLocalDate().isBefore(inicio) && !c.getFecha().toLocalDate().isAfter(fin))
                    .collect(Collectors.toList());
        } else {
            compras = compraRepository.findAll();
        }

        return compras.stream()
                .map(this::mapToCompraDTO)
                .collect(Collectors.toList());
    }
}