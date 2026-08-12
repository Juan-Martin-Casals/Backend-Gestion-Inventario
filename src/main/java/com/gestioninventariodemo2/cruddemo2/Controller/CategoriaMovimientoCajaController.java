package com.gestioninventariodemo2.cruddemo2.Controller;

import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaMovimientoCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CategoriaMovimientoCajaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Services.CategoriaMovimientoCajaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias-movimiento")
@RequiredArgsConstructor
public class CategoriaMovimientoCajaController {

    private final CategoriaMovimientoCajaService service;

    @PostMapping
    public ResponseEntity<?> crear(@Valid @RequestBody CategoriaMovimientoCajaRequestDTO dto) {
        try {
            CategoriaMovimientoCajaResponseDTO response = service.crear(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<CategoriaMovimientoCajaResponseDTO>> listarTodas() {
        return ResponseEntity.ok(service.listarTodas());
    }

    @GetMapping("/tipo/{tipo}")
    public ResponseEntity<List<CategoriaMovimientoCajaResponseDTO>> listarPorTipo(@PathVariable String tipo) {
        return ResponseEntity.ok(service.listarPorTipo(tipo));
    }

    @PutMapping("/{id}/toggle-estado")
    public ResponseEntity<?> toggleEstado(@PathVariable Long id) {
        try {
            service.toggleEstado(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }
}
