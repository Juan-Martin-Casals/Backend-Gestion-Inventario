package com.gestioninventariodemo2.cruddemo2.Services;

import java.time.LocalDate;
import java.util.stream.Collectors;
import java.util.List;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.VentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Cliente;
import com.gestioninventariodemo2.cruddemo2.Model.DetalleVenta;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.ClienteRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;

@Service
public class VentaService {

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private VentaRepository ventaRepository;

    public Venta registrarVenta(VentaRequestDTO ventaRequestDTO){
// 1️⃣ Cliente
        Cliente cliente = clienteRepository.findByDni(ventaRequestDTO.getCliente().getDni())
                .orElseGet(() -> {
                    Cliente nuevoCliente = new Cliente();
                    nuevoCliente.setDni(ventaRequestDTO.getCliente().getDni());
                    nuevoCliente.setNombre(ventaRequestDTO.getCliente().getNombre());
                    nuevoCliente.setApellido(ventaRequestDTO.getCliente().getApellido());
                    nuevoCliente.setTelefono(ventaRequestDTO.getCliente().getTelefono());
                    return clienteRepository.save(nuevoCliente);
                });

        // 2️⃣ Venta
        Venta venta = new Venta();
        venta.setFecha(LocalDate.now());
        venta.setCliente(cliente);

        // 3️⃣ Detalles de venta
        List<DetalleVenta> detalles = ventaRequestDTO.getDetalles().stream().map(det -> {
            Producto producto = productoRepository.findById(det.getProductoId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado con id: " + det.getProductoId()));

            DetalleVenta detalle = new DetalleVenta();
            detalle.setProducto(producto);
            detalle.setCantidad(det.getCantidad());
            detalle.setSubtotal(producto.getPrecio() * det.getCantidad());
            detalle.setVenta(venta);

            return detalle;
        }).collect(Collectors.toList());

        venta.setDetalleVentas(detalles);

        // 4️⃣ Calcular total
        double total = detalles.stream().mapToDouble(DetalleVenta::getSubtotal).sum();
        venta.setTotal(total);

        // 5️⃣ Guardar venta completa
        return ventaRepository.save(venta);
    }
}