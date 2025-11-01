package com.gestioninventariodemo2.cruddemo2.Services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.DetalleVentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoVentaDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Cliente;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleVenta;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;


import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VentaService {





    private final ProductoRepository productoRepository;
    private final VentaRepository ventaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional
    public VentaResponseDTO registrarVenta(VentaRequestDTO dto) {
    // Validar que haya al menos un detalle
        if (dto.getDetalles() == null || dto.getDetalles().isEmpty()) {
        throw new IllegalArgumentException("La venta debe tener al menos un producto");
        }

    // Validar cliente
        if (dto.getCliente() == null ||
        dto.getCliente().getNombre() == null || dto.getCliente().getNombre().isBlank()) {
        throw new IllegalArgumentException("Debe ingresar el nombre del cliente");
        }

    // Validar usuario
        Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
        .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

    // Crear cliente
        Cliente cliente = Cliente.builder()
        .nombre(dto.getCliente().getNombre())
        .apellido(dto.getCliente().getApellido())
        .dni(dto.getCliente().getDni())
        .telefono(dto.getCliente().getTelefono())
        .build();

    // Crear venta
        Venta venta = new Venta();
        venta.setFecha(LocalDate.now());
        venta.setUsuario(usuario);
        venta.setCliente(cliente);

        List<DetalleVenta> detalles = new ArrayList<>();

        for (DetalleVentaRequestDTO detDto : dto.getDetalles()) {
        Producto producto = productoRepository.findById(detDto.getProductoId())
        .orElseThrow(() -> new IllegalArgumentException("Producto no encontrado"));

        // Validar stock disponible
        Stock stock = producto.getStocks().get(0);
        if (detDto.getCantidad() > stock.getStockActual()) {
        throw new IllegalArgumentException("Stock insuficiente para el producto: " + producto.getNombre());
        }

        // Actualizar stock
        stock.setStockActual(stock.getStockActual() - detDto.getCantidad());

        // Crear detalle
        DetalleVenta det = new DetalleVenta();
        det.setProducto(producto);
        det.setCantidad(detDto.getCantidad());
        det.setPrecioUnitario(producto.getPrecio());
        det.setSubtotal(producto.getPrecio() * detDto.getCantidad());
        det.setVenta(venta);

        detalles.add(det);
        }

        venta.setDetalleVentas(detalles);

    // Calcular total
        double total = detalles.stream()
        .mapToDouble(DetalleVenta::getSubtotal)
        .sum();
        venta.setTotal(total);

        ventaRepository.save(venta);

        return toVentaResponseDTO(venta);
    }

    public List<VentaResponseDTO> listarVentas() {
        return ventaRepository.findAll().stream()
                .map(this::toVentaResponseDTO)
                .collect(Collectors.toList());
    }

    private VentaResponseDTO toVentaResponseDTO(Venta venta) {
    return VentaResponseDTO.builder()
        .fecha(venta.getFecha())
        .nombreCliente(venta.getCliente().getNombre())
        .total(venta.getTotal())
        .productos(
            venta.getDetalleVentas().stream()
                .map(det -> ProductoVentaDTO.builder()
                    .nombreProducto(det.getProducto().getNombre())
                    .cantidad(det.getCantidad())
                    .build()
                )
                .collect(Collectors.toList())
        )
        .build();
    }

}