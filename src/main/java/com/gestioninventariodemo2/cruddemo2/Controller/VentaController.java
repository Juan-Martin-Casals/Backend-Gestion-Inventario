package com.gestioninventariodemo2.cruddemo2.Controller;


import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.VentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;

import com.gestioninventariodemo2.cruddemo2.Services.VentaService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ventas")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;

    @PostMapping
    public ResponseEntity<VentaResponseDTO> registrarVenta(@RequestBody VentaRequestDTO dto, @AuthenticationPrincipal UserDetails userDetails ){
        VentaResponseDTO nuevaVenta = ventaService.registrarVenta(dto,userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevaVenta);
    }

// MÉTODO MODIFICADO PARA PAGINACIÓN
    @GetMapping
    public ResponseEntity<Page<VentaResponseDTO>> listarVentas(Pageable pageable) {
        Page<VentaResponseDTO> ventas = ventaService.listarVentas(pageable);
        return ResponseEntity.ok(ventas);
    }

}
