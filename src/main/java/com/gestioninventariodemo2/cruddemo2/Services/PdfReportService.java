package com.gestioninventariodemo2.cruddemo2.Services;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoInventarioDTO;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.events.Event;
import com.itextpdf.kernel.events.IEventHandler;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.itextpdf.layout.Canvas;
import com.itextpdf.kernel.geom.Rectangle;

@Service
public class PdfReportService {

    public byte[] generarReporteInventarioPdf(List<ProductoInventarioDTO> productos, String filtrosAplicados, String sortDescripcion) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);
            document.setMargins(36, 36, 50, 36);
            pdf.addEventHandler(PdfDocumentEvent.END_PAGE, new PageEvent());

            // 1. Título
            document.add(new Paragraph("Librería - Reporte de Inventario")
                    .setBold().setFontSize(18)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(4));

            // 2. Filtros aplicados
            String textoFiltros = (filtrosAplicados == null || filtrosAplicados.isBlank()) ? "Todos" : filtrosAplicados;
            document.add(new Paragraph("Filtros aplicados: " + textoFiltros)
                    .setFontSize(10).setFontColor(ColorConstants.DARK_GRAY)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2));

            // 3. Ordenamiento activo
            if (sortDescripcion != null && !sortDescripcion.isBlank()) {
                document.add(new Paragraph(sortDescripcion)
                        .setFontSize(10).setFontColor(ColorConstants.DARK_GRAY)
                        .setTextAlignment(TextAlignment.CENTER).setMarginBottom(2));
            }

            // 4. Fecha y hora de generación
            String fechaHora = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
            document.add(new Paragraph("Generado el: " + fechaHora)
                    .setFontSize(9).setFontColor(ColorConstants.GRAY)
                    .setTextAlignment(TextAlignment.CENTER).setMarginBottom(14));

            // 5. Tabla: 7 columnas
            float[] columnWidths = {2.5f, 1.5f, 1.2f, 1.2f, 1.5f, 1.3f, 1.3f};
            Table table = new Table(UnitValue.createPercentArray(columnWidths)).useAllAvailableWidth();

            DeviceRgb headerGray = new DeviceRgb(230, 230, 230);
            String[] headers = {"Nombre", "Categoría", "Stock Actual", "Stock Mín.", "Proveedor / Tel.", "Precio Venta", "Costo Uni."};
            for (String h : headers) {
                table.addHeaderCell(new Cell()
                        .add(new Paragraph(h).setBold().setFontSize(9))
                        .setBackgroundColor(headerGray)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE)
                        .setPadding(4));
            }

            if (productos == null || productos.isEmpty()) {
                table.addCell(new Cell(1, 7)
                        .add(new Paragraph("No se encontraron productos con los filtros seleccionados."))
                        .setTextAlignment(TextAlignment.CENTER).setPadding(10));
            } else {
                for (ProductoInventarioDTO p : productos) {
                    String prov = p.getProveedorNombre() != null ? p.getProveedorNombre() : "-";
                    if (p.getProveedorTelefono() != null && !p.getProveedorTelefono().isBlank()) {
                        prov += "\nTel: " + p.getProveedorTelefono();
                    }
                    String precioVenta = p.getPrecio() > 0 ? String.format("$%.2f", p.getPrecio()) : "-";
                    String costo = p.getPrecioCosto() != null ? String.format("$%.2f", p.getPrecioCosto()) : "-";

                    table.addCell(new Cell().setKeepTogether(true).add(new Paragraph(p.getNombre() != null ? p.getNombre() : "-").setFontSize(8)).setPadding(3));
                    table.addCell(new Cell().setKeepTogether(true).add(new Paragraph(p.getCategoria() != null ? p.getCategoria() : "-").setFontSize(8)).setPadding(3));
                    table.addCell(new Cell().setKeepTogether(true).add(new Paragraph(String.valueOf(p.getStockActual())).setFontSize(8)).setTextAlignment(TextAlignment.CENTER).setPadding(3));
                    table.addCell(new Cell().setKeepTogether(true).add(new Paragraph(String.valueOf(p.getStockMinimo())).setFontSize(8)).setTextAlignment(TextAlignment.CENTER).setPadding(3));
                    table.addCell(new Cell().setKeepTogether(true).add(new Paragraph(prov).setFontSize(8)).setPadding(3));
                    table.addCell(new Cell().setKeepTogether(true).add(new Paragraph(precioVenta).setFontSize(8)).setTextAlignment(TextAlignment.RIGHT).setPadding(3));
                    table.addCell(new Cell().setKeepTogether(true).add(new Paragraph(costo).setFontSize(8)).setTextAlignment(TextAlignment.RIGHT).setPadding(3));
                }
            }

            document.add(table);
            document.close();

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error generando el PDF", e);
        }

        return baos.toByteArray();
    }

    // Manejador de eventos para el pie de página
    private static class PageEvent implements IEventHandler {
        @Override
        public void handleEvent(Event event) {
            PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
            PdfDocument pdfDoc = docEvent.getDocument();
            PdfPage page = docEvent.getPage();
            int pageNumber = pdfDoc.getPageNumber(page);
            Rectangle pageSize = page.getPageSize();
            
            PdfCanvas canvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdfDoc);
            // El número final de páginas no está disponible aquí normalmente al vuelo en iText 7 sin un placeholder, 
            // pero como se pide "Página X" o podemos intentarlo:
            Paragraph pageNumberParagraph = new Paragraph("Página " + pageNumber)
                    .setFontSize(9)
                    .setFontColor(ColorConstants.GRAY);
            
            Canvas htmlCanvas = new Canvas(canvas, new Rectangle(36, 20, pageSize.getWidth() - 72, 30));
            htmlCanvas.showTextAligned(pageNumberParagraph, pageSize.getWidth() / 2, 20, TextAlignment.CENTER);
            htmlCanvas.close();
        }
    }
}
