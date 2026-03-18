package com.gestioninventariodemo2.cruddemo2.Controller;

import com.gestioninventariodemo2.cruddemo2.DTO.AperturaCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CajaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Services.CajaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/caja")
@RequiredArgsConstructor
public class CajaController {

    private final CajaService cajaService;

    @GetMapping("/estado/{idUsuario}")
    public ResponseEntity<Map<String, Object>> estadoCaja(@PathVariable Long idUsuario) {
        boolean estaAbierta = cajaService.verificarCajaActiva(idUsuario);
        Double saldoAnterior = cajaService.obtenerSaldoUltimoCierre();

        Map<String, Object> response = new HashMap<>();
        response.put("abierta", estaAbierta);
        response.put("saldoAnterior", saldoAnterior);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/abrir")
    public ResponseEntity<?> abrirCaja(@RequestBody AperturaCajaRequestDTO request) {
        try {
            CajaResponseDTO sesion = cajaService.abrirCaja(request);
            return ResponseEntity.ok(sesion);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
    @GetMapping("/sesion-activa/{idUsuario}")
    public ResponseEntity<com.gestioninventariodemo2.cruddemo2.DTO.CajaDetalleDTO> resumenCaja(@PathVariable Long idUsuario) {
        try {
            return ResponseEntity.ok(cajaService.obtenerResumenCaja(idUsuario));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/cerrar")
    public ResponseEntity<?> cerrarCaja(@RequestBody com.gestioninventariodemo2.cruddemo2.DTO.CierreCajaRequestDTO request) {
        try {
            CajaResponseDTO sesionCerrada = cajaService.cerrarCaja(request);
            return ResponseEntity.ok(sesionCerrada);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
}
