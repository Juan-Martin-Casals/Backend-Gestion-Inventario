package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaMovimientoCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaMovimientoCajaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.CategoriaMovimientoCaja;
import com.gestioninventariodemo2.cruddemo2.Repository.CategoriaMovimientoCajaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoriaMovimientoCajaService {

    private final CategoriaMovimientoCajaRepository repository;

    @Transactional
    public CategoriaMovimientoCajaResponseDTO crear(CategoriaMovimientoCajaRequestDTO dto) {
        String nombreNormalizado = dto.getNombre().trim();
        if (repository.buscarPorNombreExacto(nombreNormalizado).isPresent()) {
            throw new IllegalArgumentException("Ya existe una categoría de movimiento con ese nombre");
        }

        CategoriaMovimientoCaja cat = CategoriaMovimientoCaja.builder()
                .nombre(dto.getNombre().trim())
                .tipo(dto.getTipo().toUpperCase())
                .build();

        CategoriaMovimientoCaja guardada = repository.save(cat);
        return mapToDTO(guardada);
    }

    @Transactional(readOnly = true)
    public List<CategoriaMovimientoCajaResponseDTO> listarTodas() {
        return repository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CategoriaMovimientoCajaResponseDTO> listarPorTipo(String tipo) {
        return repository.findByTipoAndActivoTrue(tipo.toUpperCase()).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void toggleEstado(Long id) {
        CategoriaMovimientoCaja cat = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Categoría no encontrada"));
        cat.setActivo(!cat.getActivo());
        repository.save(cat);
    }

    private CategoriaMovimientoCajaResponseDTO mapToDTO(CategoriaMovimientoCaja cat) {
        return CategoriaMovimientoCajaResponseDTO.builder()
                .idCategoriaMovimiento(cat.getIdCategoriaMovimiento())
                .nombre(cat.getNombre())
                .tipo(cat.getTipo())
                .activo(cat.getActivo())
                .build();
    }
}
