package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.CompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Services.CompraService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;

    @PostMapping
    public ResponseEntity<Compra> registrarCompra(@RequestBody CompraRequestDTO dto) {
        
        // Llama al servicio. Si algo falla, lanzará una excepción
        // que será capturada por el manejador global.
        Compra compraGuardada = compraService.registrarCompra(dto);
        
        // Si todo sale bien, devuelve 201 CREATED
        return ResponseEntity.status(HttpStatus.CREATED).body(compraGuardada);
    }

    @GetMapping
    public ResponseEntity<List<CompraResponseDTO>> listarTodasLasCompras() {
        List<CompraResponseDTO> compras = compraService.listarTodasLasCompras();
        return ResponseEntity.ok(compras);
    }
}
