package com.gestioninventariodemo2.cruddemo2.Services;




import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorUpdateDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Model.ProductoProveedor;
import com.gestioninventariodemo2.cruddemo2.Model.Proveedor;
import com.gestioninventariodemo2.cruddemo2.Repository.ProductoRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.ProveedorRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProveedorService {

    private final ProveedorRepository proveedorRepository;
    private final ProductoRepository productoRepository;

    @Transactional
    public Proveedor registrarProveedor(ProveedorRequestDTO dto) {
    // Validar campos obligatorios
    if (dto.getNombre() == null || dto.getNombre().isBlank() ||
        dto.getTelefono() == null || dto.getTelefono().isBlank() ||
        dto.getEmail() == null || dto.getEmail().isBlank() ||
        dto.getDireccion() == null || dto.getDireccion().isBlank()) {
        throw new IllegalArgumentException("Todos los campos son obligatorios");
    }

    // Validar formato de email
    if (!dto.getEmail().matches("^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
        throw new IllegalArgumentException("El email debe tener un formato válido");
    }

    // Verificar si ya existe un proveedor con ese email
    if (proveedorRepository.existsByEmail(dto.getEmail())) {
        throw new IllegalArgumentException("Ya existe un proveedor registrado con ese email");
    }

    try {
        Proveedor proveedor = Proveedor.builder()
            .nombre(dto.getNombre())
            .telefono(dto.getTelefono())
            .email(dto.getEmail())
            .direccion(dto.getDireccion())
            .build();

        proveedor.setProductoProveedor(new ArrayList<>());

        if (dto.getProductosId() != null && !dto.getProductosId().isEmpty()) {
            for (Long idProd : dto.getProductosId()) {
                Producto producto = productoRepository.findById(idProd)
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + idProd));

                ProductoProveedor pp = ProductoProveedor.builder()
                    .producto(producto)
                    .proveedor(proveedor)
                    .build();

                proveedor.getProductoProveedor().add(pp);
            }
        }

        return proveedorRepository.save(proveedor);

    } catch (Exception e) {
        throw new RuntimeException("Error al registrar el proveedor, intente nuevamente");
    }
    }


    public List<ProveedorResponseDTO> listarProveedores() {
    return proveedorRepository.findAll().stream()
        .map(this::mapToDTO) // usamos el mapper que ya tenés
        .collect(Collectors.toList());
    }

    @Transactional
    public ProveedorResponseDTO updateProveedor(Long id, ProveedorUpdateDTO dto) {
    Proveedor proveedor = proveedorRepository.findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + id));

    // 🔹 Actualizar datos básicos
    if (dto.getNombre() != null) proveedor.setNombre(dto.getNombre());
    if (dto.getTelefono() != null) proveedor.setTelefono(dto.getTelefono());
    if (dto.getEmail() != null) proveedor.setEmail(dto.getEmail());
    if (dto.getDireccion() != null) proveedor.setDireccion(dto.getDireccion());

    // 🔹 Agregar productos
    if (dto.getProductosAgregar() != null) {
        for (Long productoId : dto.getProductosAgregar()) {
            Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new EntityNotFoundException("Producto no encontrado con id: " + productoId));

            boolean yaAsociado = proveedor.getProductoProveedor().stream()
                .anyMatch(pp -> pp.getProducto().getIdProducto().equals(productoId));

            if (!yaAsociado) {
                ProductoProveedor pp = new ProductoProveedor();
                pp.setProveedor(proveedor);
                pp.setProducto(producto);
                proveedor.getProductoProveedor().add(pp);
            }
        }
    }

    // 🔹 Quitar productos
    if (dto.getProductosQuitar() != null) {
        proveedor.getProductoProveedor().removeIf(pp ->
            dto.getProductosQuitar().contains(pp.getProducto().getIdProducto())
        );
    }

    Proveedor actualizado = proveedorRepository.save(proveedor);
    return mapToDTO(actualizado); // tu mapper que devuelve solo nombres
    }


    @Transactional
    public void deleteProveedor(Long id) {
        Proveedor proveedor = proveedorRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + id));
            proveedorRepository.delete(proveedor);
    }


    public ProveedorResponseDTO mapToDTO(Proveedor proveedor) {
    List<String> nombresProductos = proveedor.getProductoProveedor().stream()
        .map(pp -> pp.getProducto().getNombre()) // solo el nombre
        .collect(Collectors.toList());

    return ProveedorResponseDTO.builder()
        .nombre(proveedor.getNombre())
        .telefono(proveedor.getTelefono())
        .email(proveedor.getEmail())
        .direccion(proveedor.getDireccion())
        .productos(nombresProductos)
        .build();
}
}



