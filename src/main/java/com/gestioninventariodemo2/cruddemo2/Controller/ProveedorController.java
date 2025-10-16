package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProveedorUpdateDTO;
import com.gestioninventariodemo2.cruddemo2.Services.ProveedorService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/proveedores")
@RequiredArgsConstructor
public class ProveedorController {

    private final ProveedorService proveedorService;

@PostMapping
public ResponseEntity<ProveedorResponseDTO> registrarProveedor(@RequestBody ProveedorRequestDTO dto) {
    // 1. Llama al servicio y guarda el resultado directamente en una variable del tipo correcto.
    ProveedorResponseDTO responseDTO = proveedorService.registrarProveedor(dto);
    
    // 2. Devuelve ese DTO en la respuesta.
    return ResponseEntity.status(HttpStatus.CREATED).body(responseDTO);
}
    @GetMapping
    public ResponseEntity<List<ProveedorResponseDTO>> listarProveedores() {
    List<ProveedorResponseDTO> proveedores = proveedorService.listarProveedores();
    return ResponseEntity.ok(proveedores);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProveedorResponseDTO> actualizarProveedor(@PathVariable Long id,@RequestBody ProveedorUpdateDTO dto) {

    ProveedorResponseDTO actualizado = proveedorService.actualizarProveedor(id, dto);
    return ResponseEntity.ok(actualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarProveedor(@PathVariable Long id) {
    proveedorService.eliminarProveedor(id);
    return ResponseEntity.noContent().build();
    }





}
