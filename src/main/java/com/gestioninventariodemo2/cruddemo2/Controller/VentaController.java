package com.gestioninventariodemo2.cruddemo2.Controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.VentaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Services.VentaPdfService;
import com.gestioninventariodemo2.cruddemo2.Services.VentaService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/ventas")
@RequiredArgsConstructor
public class VentaController {

    private final VentaService ventaService;
    private final VentaPdfService ventaPdfService;

    @PostMapping
    public ResponseEntity<VentaResponseDTO> registrarVenta(@RequestBody VentaRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        VentaResponseDTO nuevaVenta = ventaService.registrarVenta(dto, userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevaVenta);
    }

    // MÉTODO MODIFICADO PARA PAGINACIÓN
    @GetMapping
    public ResponseEntity<Page<VentaResponseDTO>> listarVentas(Pageable pageable) {
        Page<VentaResponseDTO> ventas = ventaService.listarVentas(pageable);
        return ResponseEntity.ok(ventas);
    }

    // ENDPOINT PARA OBTENER TODAS LAS VENTAS (SIN PAGINACIÓN) - Para filtros
    @GetMapping("/all")
    public ResponseEntity<List<VentaResponseDTO>> listarTodasLasVentas() {
        List<VentaResponseDTO> ventas = ventaService.listarTodasLasVentas();
        return ResponseEntity.ok(ventas);
    }

    // ENDPOINT PARA OBTENER UNA VENTA POR ID
    @GetMapping("/{id}")
    public ResponseEntity<VentaResponseDTO> obtenerVentaPorId(@PathVariable Long id) {
        VentaResponseDTO venta = ventaService.obtenerVentaPorId(id);
        return ResponseEntity.ok(venta);
    }

    // ENDPOINT PARA EXPORTAR PDF DE VENTAS
    @GetMapping("/pdf")
    public ResponseEntity<byte[]> exportarVentasPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fin) {

        List<VentaResponseDTO> ventas = ventaService.listarTodasLasVentas();

        // Si se especificaron fechas, filtrar
        if (inicio != null && fin != null) {
            ventas = ventas.stream()
                    .filter(v -> !v.getFecha().isBefore(inicio) && !v.getFecha().isAfter(fin))
                    .toList();
        }

        byte[] pdfBytes = ventaPdfService.generarPdfVentas(ventas, inicio, fin);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData(
                "attachment",
                "reporte_ventas_" + LocalDate.now() + ".pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

}
