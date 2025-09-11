package com.gestioninventariodemo2.cruddemo2.Controller;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<VentaResponseDTO> registrarVenta(@RequestBody VentaRequestDTO dto){
        VentaResponseDTO nuevaVenta = ventaService.registrarVenta(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevaVenta);
    }

}
