package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.ClienteRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ClienteSelectDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Cliente;
import com.gestioninventariodemo2.cruddemo2.Repository.ClienteRepository;

import lombok.RequiredArgsConstructor;
@Service
@RequiredArgsConstructor
public class ClienteService {

    private final ClienteRepository clienteRepository;

    /**
     * Normaliza un DNI eliminando todo carácter que no sea dígito.
     * Así "36.222.999", "36-222-999" y "36222999" se tratan como iguales.
     */
    private String normalizeDni(String dni) {
        if (dni == null) return null;
        return dni.replaceAll("[^0-9]", "");
    }

    /**
     * Crea un nuevo cliente. Usado por el nuevo modal.
     */
    @Transactional
    public Cliente crearCliente(ClienteRequestDTO dto) {
        if (dto.getNombre() == null || dto.getNombre().isBlank() ||
            dto.getDni() == null || dto.getDni().isBlank()) {
            throw new IllegalArgumentException("El nombre y el DNI son obligatorios.");
        }

        String dniNormalizado = normalizeDni(dto.getDni());

        if (clienteRepository.existsByDni(dniNormalizado)) {
            throw new IllegalArgumentException("Ya existe un cliente con el DNI: " + dto.getDni());
        }

        Cliente cliente = Cliente.builder()
                .nombre(dto.getNombre())
                .apellido(dto.getApellido())
                .dni(dniNormalizado)
                .telefono(dto.getTelefono())
                .build();
        
        return clienteRepository.save(cliente); 
    }

    /**
     * Lista clientes para el buscador de 'Ventas'.
     */
    @Transactional(readOnly = true)
    public List<ClienteSelectDTO> listarClientesSelect() {
        return clienteRepository.findAll() 
                .stream()
                .map(c -> new ClienteSelectDTO(
                        c.getIdCliente(), 
                        c.getNombre(), 
                        c.getApellido(), 
                        c.getDni()
                ))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public boolean existeDni(String dni) {
        return clienteRepository.existsByDni(normalizeDni(dni));
    }

}
