package com.gestioninventariodemo2.cruddemo2.Services;

import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.InformeDashboardDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;
import com.itextpdf.io.exceptions.IOException;
import com.itextpdf.io.source.ByteArrayOutputStream;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InformeService {

    private final VentaRepository ventaRepository;

    public InformeResponseDTO generarInforme(LocalDate inicio, LocalDate fin) {
    InformeResponseDTO resumen = ventaRepository.obtenerResumenVentas(inicio, fin);
    String top = ventaRepository.obtenerProductoMasVendido(inicio, fin);
    resumen.setProductoMasVendido(top);
    return resumen;
    }

    public InformeDashboardDTO obtenerDashboard() {
        LocalDate primerDiaMes = LocalDate.now().withDayOfMonth(1);
        LocalDate hoy = LocalDate.now();

        return InformeDashboardDTO.builder()
            .ventasMes(ventaRepository.countVentasEnRango(primerDiaMes, hoy))
            .ventasHistoricas(ventaRepository.countVentasHistoricas())
            .productoMes(ventaRepository.sumProductosEnRango(primerDiaMes, hoy))
            .productoHistoricos(ventaRepository.sumProductosHistoricos())
            .recaudacionMes(ventaRepository.sumRecaudacionEnRango(primerDiaMes, hoy))
            .productoMasVendidoMes(
                ventaRepository.obtenerProductoMasVendidoEnRango(primerDiaMes, hoy)
                            .stream().findFirst().orElse(null)
            )
            .productoMenosVendidoMes(
                ventaRepository.obtenerProductoMenosVendidoEnRango(primerDiaMes, hoy)
                            .stream().findFirst().orElse(null)
            )
            .build();
    }

    public byte[] generarInformePDF(InformeResponseDTO informe) throws IOException {
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    PdfWriter writer = new PdfWriter(baos);
    PdfDocument pdf = new PdfDocument(writer);
    Document document = new Document(pdf);

    document.add(new Paragraph("📊 Informe de Ventas").setBold().setFontSize(16));
    document.add(new Paragraph("Periodo: " + informe.getInicio() + " a " + informe.getFin()));
    document.add(new Paragraph("Cantidad de ventas: " + informe.getTotalVentas()));
    document.add(new Paragraph("Total de productos vendidos: " + informe.getTotalCantidad()));
    document.add(new Paragraph("Recaudación total: $" + informe.getTotalImporte()));
    document.add(new Paragraph("Producto más vendido: " + informe.getProductoMasVendido()));

    document.close();
    return baos.toByteArray();
    }


}
