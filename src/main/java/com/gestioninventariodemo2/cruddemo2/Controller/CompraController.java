package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.CompraRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.CompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Services.CompraService;
import com.gestioninventariodemo2.cruddemo2.Services.CompraPdfService;

import lombok.RequiredArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/compras")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;
    private final CompraPdfService compraPdfService;

    @PostMapping
    public ResponseEntity<Compra> registrarCompra(@RequestBody CompraRequestDTO dto) {

        // Llama al servicio. Si algo falla, lanzará una excepción
        // que será capturada por el manejador global.
        Compra compraGuardada = compraService.registrarCompra(dto);

        // Si todo sale bien, devuelve 201 CREATED
        return ResponseEntity.status(HttpStatus.CREATED).body(compraGuardada);
    }

    @GetMapping
    // ¡MÉTODO MODIFICADO! Acepta Pageable y devuelve Page
    public ResponseEntity<Page<CompraResponseDTO>> listarTodasLasCompras(Pageable pageable) {
        Page<CompraResponseDTO> compras = compraService.listarTodasLasCompras(pageable);
        return ResponseEntity.ok(compras);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompraResponseDTO> obtenerCompraPorId(@PathVariable Long id) {
        CompraResponseDTO compra = compraService.obtenerCompraPorId(id);
        return ResponseEntity.ok(compra);
    }

    @GetMapping("/exportar-pdf")
    public ResponseEntity<byte[]> exportarPdfCompras(
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fin) {

        LocalDate fechaInicio = inicio != null ? LocalDate.parse(inicio) : null;
        LocalDate fechaFin = fin != null ? LocalDate.parse(fin) : null;

        List<CompraResponseDTO> compras = compraService.obtenerComprasPorRangoFechas(fechaInicio, fechaFin);
        byte[] pdfBytes = compraPdfService.generarPdfCompras(compras, fechaInicio, fechaFin);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Disposition", "attachment; filename=compras.pdf");
        headers.add("Content-Type", "application/pdf");

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
