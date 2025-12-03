package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.DetalleVentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoVentaDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Exception.StockInsuficienteException;
import com.gestioninventariodemo2.cruddemo2.Model.Cliente;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleVenta;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.ClienteRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VentaService {

    private final ProductoRepository productoRepository;
    private final VentaRepository ventaRepository;
    private final StockRepository stockRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public VentaResponseDTO registrarVenta(VentaRequestDTO ventaRequestDTO, UserDetails userDetails) {

        // 1. Buscar al Vendedor (Usuario)
        String userEmail = userDetails.getUsername();
        Usuario usuario = usuarioRepository.findByEmail(userEmail)
                .orElseThrow(() -> new EntityNotFoundException("Vendedor no encontrado: " + userEmail));

        // 2. Validar que el ID del cliente fue enviado
        if (ventaRequestDTO.getIdCliente() == null) {
            throw new IllegalArgumentException("Debe seleccionar un cliente");
        }

        // 3. Buscar el cliente en la BD
        Cliente cliente = clienteRepository.findById(ventaRequestDTO.getIdCliente())
                .orElseThrow(() -> new EntityNotFoundException(
                        "Cliente no encontrado con ID: " + ventaRequestDTO.getIdCliente()));

        // 4. Crear la Venta y asignar los participantes
        Venta venta = new Venta();
        venta.setFecha(ventaRequestDTO.getFecha());
        venta.setCliente(cliente);
        venta.setUsuario(usuario); // <-- ¡Guardamos al vendedor!

        double totalVenta = 0;
        List<DetalleVenta> detalles = new ArrayList<>();

        // 5. Validar stock ANTES de procesar
        for (DetalleVentaRequestDTO detalleDTO : ventaRequestDTO.getDetalles()) {
            Stock stock = stockRepository.findByProductoIdProducto(detalleDTO.getProductoId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Stock no encontrado para producto ID: " + detalleDTO.getProductoId()));

            if (stock.getStockActual() < detalleDTO.getCantidad()) {
                throw new StockInsuficienteException("Stock insuficiente para: " + stock.getProducto().getNombre()
                        + ". Stock actual: " + stock.getStockActual());
            }
        }

        // 6. Procesar la venta y descontar stock
        for (DetalleVentaRequestDTO detalleDTO : ventaRequestDTO.getDetalles()) {
            Producto producto = productoRepository.findById(detalleDTO.getProductoId())
                    .orElseThrow(() -> new EntityNotFoundException(
                            "Producto no encontrado con ID: " + detalleDTO.getProductoId()));

            DetalleVenta detalleVenta = new DetalleVenta();
            detalleVenta.setProducto(producto);
            detalleVenta.setCantidad(detalleDTO.getCantidad());
            detalleVenta.setPrecioUnitario(producto.getPrecio());
            detalleVenta.setVenta(venta);

            detalles.add(detalleVenta);
            totalVenta += (producto.getPrecio() * detalleDTO.getCantidad());

            // Descontar stock
            Stock stock = stockRepository.findByProducto(producto)
                    .orElseThrow(
                            () -> new EntityNotFoundException("Stock no encontrado para: " + producto.getNombre()));
            stock.setStockActual(stock.getStockActual() - detalleDTO.getCantidad());
            stockRepository.save(stock);
        }

        venta.setDetalleVentas(detalles);
        venta.setTotal(totalVenta);

        Venta ventaGuardada = ventaRepository.save(venta);

        return mapToVentaDTO(ventaGuardada);
    }

    public Page<VentaResponseDTO> listarVentas(Pageable pageable) {
        // Usa findAll(Pageable) y luego mapea la Page<Venta> a Page<VentaResponseDTO>
        return ventaRepository.findAll(pageable)
                .map(this::mapToVentaDTO);
    }

    public List<VentaResponseDTO> listarTodasLasVentas() {
        // Obtener todas las ventas y mapearlas a DTOs
        return ventaRepository.findAll().stream()
                .map(this::mapToVentaDTO)
                .collect(Collectors.toList());
    }

    public VentaResponseDTO obtenerVentaPorId(Long id) {
        Venta venta = ventaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Venta no encontrada con ID: " + id));
        return mapToVentaDTO(venta);
    }

    private VentaResponseDTO mapToVentaDTO(Venta venta) {
        List<ProductoVentaDTO> productosDTO = venta.getDetalleVentas().stream()
                .map(detalle -> ProductoVentaDTO.builder()
                        .nombreProducto(detalle.getProducto().getNombre())
                        .cantidad(detalle.getCantidad())
                        .build())
                .collect(Collectors.toList());

        // Lógica segura para el cliente
        String nombreCliente = venta.getCliente().getNombre();
        if (venta.getCliente().getApellido() != null && !venta.getCliente().getApellido().isBlank()) {
            nombreCliente += " " + venta.getCliente().getApellido();
        }

        // --- ¡LÓGICA SEGURA AÑADIDA PARA EL VENDEDOR! ---
        String nombreVendedor = "N/A"; // O "Sistema", o lo que prefieras
        if (venta.getUsuario() != null) {
            nombreVendedor = venta.getUsuario().getNombre();
        }
        // --- FIN DE LA LÓGICA SEGURA ---

        return VentaResponseDTO.builder()
                .idVenta(venta.getIdVenta())
                .fecha(venta.getFecha())
                .nombreCliente(nombreCliente)
                .nombreVendedor(nombreVendedor) // <-- Usamos la variable segura
                .total(venta.getTotal())
                .productos(productosDTO)
                .build();
    }

}