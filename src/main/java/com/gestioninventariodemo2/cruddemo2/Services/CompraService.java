package com.gestioninventariodemo2.cruddemo2.Services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.CompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleCompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleCompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;
import com.gestioninventariodemo2.cruddemo2.Repository.CompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProveedorRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CompraService {

    private final CompraRepository compraRepository;
    private final StockRepository stockRepository;
    private final ProductoRepository productoRepository;
    private final ProveedorRepository proveedorRepository;

@Transactional
    public Compra registrarCompra(CompraRequestDTO dto) {
        
        // 1. Crear la entidad Compra
        Compra compra = new Compra();

        // 2. Asignar Proveedor (buscándolo por ID)
        Proveedor proveedor = proveedorRepository.findById(dto.getIdProveedor())
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado con ID: " + dto.getIdProveedor()));
        compra.setProveedor(proveedor);

        // 3. Asignar fecha (con la lógica que preferiste)
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
                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + detalleDto.getIdProducto()));
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

        // 7. Actualizar Stock y Precio de Venta (usando los DTOs)
        // (Este paso se hace después de guardar para asegurar la transacción)
        for (DetalleCompraRequestDTO detalleDto : dto.getDetalleCompras()) {
            
            // --- A. Actualizar Precio de Venta ---
            if (detalleDto.getNuevoPrecioVenta() > 0) {
                // Volvemos a buscar el producto (o podríamos haberlo guardado en un map)
                Producto productoDB = productoRepository.findById(detalleDto.getIdProducto()).get();
                productoDB.setPrecio(detalleDto.getNuevoPrecioVenta());
                productoRepository.save(productoDB); // Guarda en 'Producto'
            }

            // --- B. Actualizar Stock ---
            Producto productoAfectado = new Producto(); // Solo necesitamos el ID para la búsqueda
            productoAfectado.setIdProducto(detalleDto.getIdProducto());
            
            Stock stockDelProducto = stockRepository.findByProducto(productoAfectado)
                .orElseThrow(() -> new RuntimeException("Stock no encontrado para producto: " + detalleDto.getIdProducto()));
            
            int stockNuevo = stockDelProducto.getStockActual() + detalleDto.getCantidad();
            stockDelProducto.setStockActual(stockNuevo);
            stockRepository.save(stockDelProducto); // Guarda en 'Stock'
        }

        return compraGuardada; // Devuelve la entidad completa
    }


    public List<CompraResponseDTO> listarTodasLasCompras() {
        return compraRepository.findAll()
                .stream()
                .map(this::mapToCompraDTO) 
                .collect(Collectors.toList());
    }


    // --- MÉTODO HELPER (AYUDANTE) ACTUALIZADO ---

    private CompraResponseDTO mapToCompraDTO(Compra compra) {
        
        // 1. Mapear los detalles (ahora simplificados)
        List<DetalleCompraResponseDTO> detalleDTO = compra.getDetalleCompras().stream()
                .map(detalle -> DetalleCompraResponseDTO.builder()
                        .cantidad(detalle.getCantidad())
                        .nombreProducto(detalle.getProducto().getNombre())
                        // Quitamos los otros campos
                        .build()
                ).collect(Collectors.toList());

        // 2. Mapear la compra principal (ahora simplificada)
        return CompraResponseDTO.builder()
                .fecha(compra.getFecha())
                .total(compra.getTotal())
                .nombreProveedor(compra.getProveedor().getNombre())
                .productosComprados(detalleDTO) // Usamos el nuevo nombre de lista
                // Quitamos idCompra
                .build();
    }

}
