package com.gestioninventariodemo2.cruddemo2.Services;




import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoSimpleDTO;
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
    // CORRECCIÓN 1: El método ahora devuelve el DTO de respuesta.
    public ProveedorResponseDTO registrarProveedor(ProveedorRequestDTO dto) {
        // Tu lógica de validación (está bien como la tenías)
        if (dto.getNombre() == null || dto.getNombre().isBlank() ||
            dto.getTelefono() == null || dto.getTelefono().isBlank() ||
            dto.getEmail() == null || dto.getEmail().isBlank() ||
            dto.getDireccion() == null || dto.getDireccion().isBlank()) {
            throw new IllegalArgumentException("Todos los campos son obligatorios");
        }
        if (!dto.getEmail().matches("^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
            throw new IllegalArgumentException("El email debe tener un formato válido");
        }
        if (proveedorRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("Ya existe un proveedor registrado con ese email");
        }

        Proveedor proveedor = Proveedor.builder()
                .nombre(dto.getNombre())
                .telefono(dto.getTelefono())
                .email(dto.getEmail())
                .direccion(dto.getDireccion())
                .build();

        proveedor.setProductoProveedor(new ArrayList<>());

        // Usamos el nombre de campo corregido 'productosIds'
        if (dto.getProductosIds() != null && !dto.getProductosIds().isEmpty()) {
            for (Long idProd : dto.getProductosIds()) {
                Producto producto = productoRepository.findById(idProd)
                        .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + idProd));

                ProductoProveedor pp = ProductoProveedor.builder()
                        .producto(producto)
                        .proveedor(proveedor)
                        .build();

                proveedor.getProductoProveedor().add(pp);
            }
        }

        Proveedor proveedorGuardado = proveedorRepository.save(proveedor);

        // CORRECCIÓN 2: Devolvemos el DTO mapeado.
        return mapToDTO(proveedorGuardado);
    }

@Transactional(readOnly = true)
    public Page<ProveedorResponseDTO> listarProveedores(Pageable pageable) {
        
        // 1. Obtenemos la página del repositorio
        Page<Proveedor> paginaProveedores = proveedorRepository.findAll(pageable);
        
        // 2. Mapeamos la página a DTO usando el método que ya tenías
        return paginaProveedores.map(this::mapToDTO);
    }


    @Transactional(readOnly = true)
    public List<ProveedorResponseDTO> listarTodosProveedores() {
        return proveedorRepository.findAll().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    @Transactional
    public ProveedorResponseDTO actualizarProveedor(Long id, ProveedorUpdateDTO dto) {
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
    return mapToDTO(actualizado);
    }


    @Transactional
    public void eliminarProveedor(Long id) {
        Proveedor proveedor = proveedorRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + id));
            proveedorRepository.delete(proveedor);
    }


public ProveedorResponseDTO mapToDTO(Proveedor proveedor) {
        // Ahora mapeamos a ProductoSimpleDTO
        List<ProductoSimpleDTO> productosDTO = proveedor.getProductoProveedor().stream()
            .map(pp -> ProductoSimpleDTO.builder()
                .idProducto(pp.getProducto().getIdProducto())
                .nombreProducto(pp.getProducto().getNombre())
                .build()
            )
            .collect(Collectors.toList());

        return ProveedorResponseDTO.builder()
            .id(proveedor.getIdProveedor())
            .nombre(proveedor.getNombre())
            .telefono(proveedor.getTelefono())
            .email(proveedor.getEmail())
            .direccion(proveedor.getDireccion())
            .productos(productosDTO) // <-- DTO modificado
            .build();
    }

    @Transactional(readOnly = true)
    public ProveedorResponseDTO buscarPorId(Long id) {
        Proveedor proveedor = proveedorRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Proveedor no encontrado con id: " + id));
        return mapToDTO(proveedor);
    }
}



