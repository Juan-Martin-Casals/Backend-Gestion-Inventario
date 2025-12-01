package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.CompraResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.DetalleCompraResponseDTO;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class CompraPdfService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DecimalFormat NUMBER_FORMATTER;

    static {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("es", "AR"));
        symbols.setGroupingSeparator('.');
        symbols.setDecimalSeparator(',');
        NUMBER_FORMATTER = new DecimalFormat("#,##0.00", symbols);
    }

    public byte[] generarPdfCompras(List<CompraResponseDTO> compras, LocalDate inicio, LocalDate fin) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // ========== ENCABEZADO ==========
            agregarEncabezado(document, inicio, fin);

            // ========== RESUMEN ==========
            if (!compras.isEmpty()) {
                agregarResumen(document, compras);
            }

            // ========== TABLA DE COMPRAS ==========
            agregarTablaCompras(document, compras);

            // ========== PIE DE PÁGINA ==========
            agregarPiePagina(document);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Error al generar PDF de compras", e);
        }
    }

    private void agregarEncabezado(Document document, LocalDate inicio, LocalDate fin) {
        // Título
        Paragraph titulo = new Paragraph("REPORTE DE COMPRAS")
                .setFontSize(20)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(5);
        document.add(titulo);

        // Nombre del negocio
        Paragraph negocio = new Paragraph("Gestión Inventario")
                .setFontSize(14)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(5);
        document.add(negocio);

        // Fecha de generación
        Paragraph fechaGeneracion = new Paragraph("Generado: " + LocalDate.now().format(DATE_FORMATTER))
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(5);
        document.add(fechaGeneracion);

        // Rango de fechas (si se especificó)
        if (inicio != null && fin != null) {
            Paragraph rangoFechas = new Paragraph(
                    "Período: " + inicio.format(DATE_FORMATTER) + " - " + fin.format(DATE_FORMATTER))
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(rangoFechas);
        } else {
            document.add(new Paragraph(" ").setMarginBottom(15));
        }
    }

    private void agregarResumen(Document document, List<CompraResponseDTO> compras) {
        // Calcular estadísticas
        int totalCompras = compras.size();
        double inversionTotal = compras.stream().mapToDouble(CompraResponseDTO::getTotal).sum();
        int totalProductos = compras.stream()
                .flatMap(c -> c.getProductosComprados().stream())
                .mapToInt(DetalleCompraResponseDTO::getCantidad)
                .sum();

        // Obtener proveedor principal
        Map<String, Integer> proveedoresCount = new HashMap<>();
        for (CompraResponseDTO compra : compras) {
            String proveedor = compra.getNombreProveedor();
            proveedoresCount.put(proveedor, proveedoresCount.getOrDefault(proveedor, 0) + 1);
        }
        String proveedorPrincipal = proveedoresCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");

        // Crear tabla de resumen (2x2)
        Table resumenTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(20);

        DeviceRgb colorFondo = new DeviceRgb(240, 248, 255);

        // Total de Compras
        Cell cellCompras = new Cell().add(new Paragraph("Total de Compras\n" + formatNumber(totalCompras))
                .setFontSize(12)
                .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(colorFondo)
                .setPadding(10);
        resumenTable.addCell(cellCompras);

        // Inversión Total
        Cell cellInversion = new Cell().add(new Paragraph("Inversión Total\n$" + formatCurrency(inversionTotal))
                .setFontSize(12)
                .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(colorFondo)
                .setPadding(10);
        resumenTable.addCell(cellInversion);

        // Total de Productos
        Cell cellProductos = new Cell().add(new Paragraph("Total de Productos\n" + formatNumber(totalProductos))
                .setFontSize(12)
                .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(colorFondo)
                .setPadding(10);
        resumenTable.addCell(cellProductos);

        // Proveedor Principal
        Cell cellProveedor = new Cell().add(new Paragraph("Proveedor Principal\n" + proveedorPrincipal)
                .setFontSize(12)
                .setTextAlignment(TextAlignment.CENTER))
                .setBackgroundColor(colorFondo)
                .setPadding(10);
        resumenTable.addCell(cellProveedor);

        document.add(resumenTable);
    }

    private void agregarTablaCompras(Document document, List<CompraResponseDTO> compras) {
        // Título de la sección
        Paragraph tituloTabla = new Paragraph("Detalle de Compras")
                .setFontSize(14)
                .setBold()
                .setMarginBottom(10);
        document.add(tituloTabla);

        // Crear tabla con 4 columnas
        Table table = new Table(UnitValue.createPercentArray(new float[] { 2, 3, 4, 2 }))
                .setWidth(UnitValue.createPercentValue(100));

        // Encabezados de la tabla
        DeviceRgb colorHeader = new DeviceRgb(102, 126, 234);
        String[] headers = { "Fecha", "Proveedor", "Productos", "Total" };

        for (String header : headers) {
            Cell cell = new Cell().add(new Paragraph(header).setBold().setFontColor(ColorConstants.WHITE))
                    .setBackgroundColor(colorHeader)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(5);
            table.addHeaderCell(cell);
        }

        // Datos de las compras
        for (CompraResponseDTO compra : compras) {
            // Fecha
            String fechaStr = formatFecha(compra.getFecha());
            table.addCell(new Cell().add(new Paragraph(fechaStr).setFontSize(10)).setPadding(5));

            // Proveedor
            table.addCell(new Cell().add(new Paragraph(compra.getNombreProveedor()).setFontSize(10)).setPadding(5));

            // Productos (mostrar máximo 2, luego resumir)
            StringBuilder productos = new StringBuilder();
            List<DetalleCompraResponseDTO> productosComprados = compra.getProductosComprados();
            int maxProductosAMostrar = 2;
            int totalProductos = productosComprados.size();

            for (int i = 0; i < Math.min(maxProductosAMostrar, totalProductos); i++) {
                DetalleCompraResponseDTO detalle = productosComprados.get(i);
                productos.append(detalle.getNombreProducto())
                        .append(" (x")
                        .append(detalle.getCantidad())
                        .append(")\n");
            }

            // Si hay más productos, agregar resumen
            if (totalProductos > maxProductosAMostrar) {
                int productosRestantes = totalProductos - maxProductosAMostrar;
                productos.append("... y ")
                        .append(productosRestantes)
                        .append(" producto")
                        .append(productosRestantes > 1 ? "s" : "")
                        .append(" más");
            }

            table.addCell(new Cell().add(new Paragraph(productos.toString().trim()).setFontSize(10)).setPadding(5));

            // Total
            table.addCell(new Cell().add(new Paragraph("$" + formatCurrency(compra.getTotal())).setFontSize(10))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setPadding(5));
        }

        // Mensaje si no hay compras
        if (compras.isEmpty()) {
            Cell emptyCell = new Cell(1, 4)
                    .add(new Paragraph("No hay compras registradas en este período")
                            .setTextAlignment(TextAlignment.CENTER))
                    .setPadding(10);
            table.addCell(emptyCell);
        }

        document.add(table);
    }

    private void agregarPiePagina(Document document) {
        Paragraph piePagina = new Paragraph("Documento generado automáticamente - Gestión Inventario")
                .setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(20);
        document.add(piePagina);
    }

    private String formatFecha(LocalDate fecha) {
        if (fecha == null) {
            return "N/A";
        }
        return fecha.format(DATE_FORMATTER);
    }

    private String formatNumber(int number) {
        return String.format("%,d", number).replace(',', '.');
    }

    private String formatCurrency(double amount) {
        return NUMBER_FORMATTER.format(amount);
    }
}
