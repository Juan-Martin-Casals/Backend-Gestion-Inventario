package com.gestioninventariodemo2.cruddemo2.Controller;

import java.time.LocalDate;
import java.util.List;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.EstadoStockDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.InformeDashboardDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.KPIsDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ResumenStockDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.StockTablaDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.TopProductoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentasComprasDiariasDTO;
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
        } else {
            InformeDashboardDTO dashboard = informeService.obtenerDashboard();
            return ResponseEntity.ok(dashboard);
        }
    }

    @GetMapping("/low-stock")
    public ResponseEntity<Page<StockTablaDTO>> getProductosConStockBajo(
            // Spring automáticamente construirá el objeto Pageable a partir de los
            // parámetros page, size y sort
            Pageable pageable) {

        // Ya no necesitamos PageRequest.of(), le pasamos el Pageable directo al
        // servicio.
        Page<StockTablaDTO> productos = informeService.obtenerProductosConStockBajo(pageable);
        return ResponseEntity.ok(productos);
    }

    // --- ¡AÑADÍ ESTE MÉTODO! ---
    @GetMapping("/resumen-stock")
    public ResponseEntity<ResumenStockDTO> getResumenStock() {
        ResumenStockDTO resumenStock = informeService.obtenerResumenStock();
        return ResponseEntity.ok(resumenStock);
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

    // ==========================================================
    // NUEVOS ENDPOINTS PARA DASHBOARD DE INFORMES
    // ==========================================================

    @GetMapping("/kpis")
    public ResponseEntity<KPIsDTO> getKPIs(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin) {
        KPIsDTO kpis = informeService.obtenerKPIs(inicio, fin);
        return ResponseEntity.ok(kpis);
    }

    @GetMapping("/ventas-compras-diarias")
    public ResponseEntity<List<VentasComprasDiariasDTO>> getVentasComprasDiarias(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin) {
        List<VentasComprasDiariasDTO> datos = informeService.obtenerVentasComprasDiarias(inicio, fin);
        return ResponseEntity.ok(datos);
    }

    @GetMapping("/top-productos")
    public ResponseEntity<List<TopProductoDTO>> getTopProductos(
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fin,
            @RequestParam(defaultValue = "5") Integer limit) {
        List<TopProductoDTO> topProductos = informeService.obtenerTopProductos(inicio, fin, limit);
        return ResponseEntity.ok(topProductos);
    }

    @GetMapping("/estado-stock")
    public ResponseEntity<EstadoStockDTO> getEstadoStock() {
        EstadoStockDTO estadoStock = informeService.obtenerEstadoStock();
        return ResponseEntity.ok(estadoStock);
    }

}
