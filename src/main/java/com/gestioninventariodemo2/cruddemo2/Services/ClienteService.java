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
     * Crea un nuevo cliente. Usado por el nuevo modal.
     */
    @Transactional
    public Cliente crearCliente(ClienteRequestDTO dto) {
        if (dto.getNombre() == null || dto.getNombre().isBlank() ||
            dto.getDni() == null || dto.getDni().isBlank()) {
            throw new IllegalArgumentException("El nombre y el DNI son obligatorios.");
        }
        
        // (Este método 'existsByDni' AÚN DEBE SER AÑADIDO AL REPOSITORIO)
        if (clienteRepository.existsByDni(dto.getDni().trim())) {
            throw new IllegalArgumentException("Ya existe un cliente con el DNI: " + dto.getDni());
        }

        Cliente cliente = Cliente.builder()
                .nombre(dto.getNombre())
                .apellido(dto.getApellido())
                .dni(dto.getDni().trim())
                .telefono(dto.getTelefono())
                // .estado("ACTIVO") <-- LÍNEA ELIMINADA
                .build();
        
        return clienteRepository.save(cliente); 
    }

    /**
     * Lista clientes para el buscador de 'Ventas'.
     * (MODIFICADO para usar findAll())
     */
    @Transactional(readOnly = true)
    public List<ClienteSelectDTO> listarClientesSelect() {
        // Llama a findAll() ya que no hay 'estado'
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

}
