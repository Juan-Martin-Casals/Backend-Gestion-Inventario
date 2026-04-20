package com.gestioninventariodemo2.cruddemo2.Services;

import java.io.ByteArrayOutputStream;
import java.util.List;

import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoInventarioDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.PdfReportRequestDTO;
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
import com.itextpdf.layout.borders.Border;
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

    public byte[] generarReporteInventarioPdf(PdfReportRequestDTO request) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            // Documento A4
            Document document = new Document(pdf, PageSize.A4);
            
            // Margenes: top, right, bottom, left
            document.setMargins(36, 36, 50, 36);

            // Numerador de páginas en el pie original (IEventHandler)
            pdf.addEventHandler(PdfDocumentEvent.END_PAGE, new PageEvent());

            // 1. Encabezado de la librería
            Paragraph titulo = new Paragraph("Librería Don Bosco - Reporte de Inventario")
                    .setBold()
                    .setFontSize(18)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(5);
            document.add(titulo);

            // 2. Filtros aplicados
            String textoFiltros = (request.getFiltrosAplicados() == null || request.getFiltrosAplicados().trim().isEmpty()) 
                                    ? "Todos" : request.getFiltrosAplicados();
            Paragraph subtitulo = new Paragraph("Filtros aplicados: " + textoFiltros)
                    .setFontSize(11)
                    .setFontColor(ColorConstants.DARK_GRAY)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(15);
            document.add(subtitulo);

            // 3. Tabla: Nombre, Categoría, Stock Actual, Stock Mínimo, Proveedor
            float[] columnWidths = {3, 2, 1.5f, 1.5f, 2};
            Table table = new Table(UnitValue.createPercentArray(columnWidths))
                                .useAllAvailableWidth();

            // Asegurar que los encabezados se repitan
            // En iText7 esto se logra automáticamente al definir encabezados de tabla, 
            // pero podemos asegurarlo con setSkipFirstHeader y addHeaderCell
            
            // Colores
            DeviceRgb headerGray = new DeviceRgb(230, 230, 230);
            
            // Construir encabezados
            String[] headers = {"Nombre", "Categoría", "Stock Actual", "Stock Mínimo", "Proveedor"};
            for (String h : headers) {
                Cell headerCell = new Cell()
                        .add(new Paragraph(h).setBold().setFontSize(10))
                        .setBackgroundColor(headerGray)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE)
                        .setPadding(5);
                table.addHeaderCell(headerCell);
            }

            // Filas
            List<ProductoInventarioDTO> list = request.getProductos();
            if (list == null || list.isEmpty()) {
                Cell emptyCell = new Cell(1, 5)
                        .add(new Paragraph("No se encontraron productos con los filtros seleccionados."))
                        .setTextAlignment(TextAlignment.CENTER)
                        .setPadding(10);
                table.addCell(emptyCell);
            } else {
                for (ProductoInventarioDTO p : list) {
                    // Nombre
                    table.addCell(new Cell().add(new Paragraph(p.getNombre() != null ? p.getNombre() : "-").setFontSize(9)).setPadding(4));
                    // Categoría
                    table.addCell(new Cell().add(new Paragraph(p.getCategoria() != null ? p.getCategoria() : "-").setFontSize(9)).setPadding(4));
                    // Stock Actual (Centrado)
                    table.addCell(new Cell().add(new Paragraph(String.valueOf(p.getStockActual())).setFontSize(9))
                            .setTextAlignment(TextAlignment.CENTER).setPadding(4));
                    // Stock Mínimo (Centrado)
                    table.addCell(new Cell().add(new Paragraph(String.valueOf(p.getStockMinimo())).setFontSize(9))
                            .setTextAlignment(TextAlignment.CENTER).setPadding(4));
                    // Proveedor
                    table.addCell(new Cell().add(new Paragraph(p.getProveedorNombre() != null ? p.getProveedorNombre() : "-").setFontSize(9)).setPadding(4));
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
