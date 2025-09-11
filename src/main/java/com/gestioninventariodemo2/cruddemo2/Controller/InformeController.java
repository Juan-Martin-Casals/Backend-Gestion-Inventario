package com.gestioninventariodemo2.cruddemo2.Controller;

import java.time.LocalDate;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.InformeDashboardDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Services.InformeService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/informes")
@RequiredArgsConstructor
public class InformeController {

    private final InformeService informeService;


    @GetMapping("/resumen")
    public ResponseEntity<?> getResumen(
            @RequestParam(required = false) LocalDate inicio,
            @RequestParam(required = false) LocalDate fin) {
        if (inicio != null && fin != null) {
            // Caso con fechas → Informe detallado
            InformeResponseDTO informe = informeService.generarInforme(inicio, fin);
            return ResponseEntity.ok(informe);
        }else{
            InformeDashboardDTO dashboard = informeService.obtenerDashboard();
            return ResponseEntity.ok(dashboard);
        }
    }


    @GetMapping("/exportar-pdf")
    public ResponseEntity<byte[]> exportarInformePDF(
        @RequestParam LocalDate inicio,
        @RequestParam LocalDate fin) {
    try {
        InformeResponseDTO informe = informeService.generarInforme(inicio, fin);
        byte[] pdfBytes = informeService.generarInformePDF(informe);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.builder("attachment")
            .filename("informe_ventas_" + inicio + "_a_" + fin + ".pdf")
            .build());

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);

    } catch (Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
    }
    }

}
