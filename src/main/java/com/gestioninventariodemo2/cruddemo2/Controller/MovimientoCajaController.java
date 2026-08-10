package com.gestioninventariodemo2.cruddemo2.Controller;

import com.gestioninventariodemo2.cruddemo2.DTO.MovimientoCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.MovimientoCajaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Services.MovimientoCajaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movimientos-caja")
@RequiredArgsConstructor
public class MovimientoCajaController {

    private final MovimientoCajaService service;

    @PostMapping
    public ResponseEntity<?> registrarMovimiento(@Valid @RequestBody MovimientoCajaRequestDTO dto) {
        try {
            MovimientoCajaResponseDTO response = service.registrarMovimiento(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/sesion/{idSesion}")
    public ResponseEntity<List<MovimientoCajaResponseDTO>> listarMovimientosDeSesion(@PathVariable Long idSesion) {
        return ResponseEntity.ok(service.listarMovimientosDeSesion(idSesion));
    }

    @GetMapping("/sesion/activa")
    public ResponseEntity<?> listarMovimientosSesionActiva() {
        try {
            return ResponseEntity.ok(service.listarMovimientosSesionActiva());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/sesion/activa/saldo")
    public ResponseEntity<?> obtenerSaldoEfectivoSesionActiva() {
        try {
            Double saldo = service.obtenerSaldoEfectivoSesionActiva();
            return ResponseEntity.ok(Map.of("saldoEfectivo", saldo));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}/anular")
    public ResponseEntity<?> anularMovimiento(@PathVariable Long id, @RequestParam Long idAdmin) {
        try {
            MovimientoCajaResponseDTO response = service.anularMovimiento(id, idAdmin);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editarMovimiento(@PathVariable Long id, @RequestParam Long idAdmin, @Valid @RequestBody MovimientoCajaRequestDTO dto) {
        try {
            MovimientoCajaResponseDTO response = service.editarMovimiento(id, dto, idAdmin);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }
}
