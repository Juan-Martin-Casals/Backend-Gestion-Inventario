package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoVentaDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentaResponseDTO;
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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class VentaPdfService {

        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        private static final DecimalFormat NUMBER_FORMATTER;

        static {
                DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("es", "AR"));
                symbols.setGroupingSeparator('.');
                symbols.setDecimalSeparator(',');
                NUMBER_FORMATTER = new DecimalFormat("#,##0.00", symbols);
        }

        public byte[] generarPdfVentas(List<VentaResponseDTO> ventas, LocalDate inicio, LocalDate fin) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();

                try {
                        PdfWriter writer = new PdfWriter(baos);
                        PdfDocument pdf = new PdfDocument(writer);
                        Document document = new Document(pdf);

                        // ========== ENCABEZADO ==========
                        agregarEncabezado(document, inicio, fin);

                        // ========== RESUMEN ==========
                        if (!ventas.isEmpty()) {
                                agregarResumen(document, ventas);
                                agregarTopProductos(document, ventas);
                                agregarDesglosePorVendedor(document, ventas);
                        }

                        // ========== TABLA DE VENTAS ==========
                        agregarTablaVentas(document, ventas);

                        // ========== PIE DE PÁGINA ==========
                        agregarPiePagina(document);

                        document.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        throw new RuntimeException("Error al generar PDF de ventas", e);
                }
        }

        private void agregarEncabezado(Document document, LocalDate inicio, LocalDate fin) {
                // Título
                Paragraph titulo = new Paragraph("REPORTE DE VENTAS")
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
                                        "Período: " + inicio.format(DATE_FORMATTER) + " - "
                                                        + fin.format(DATE_FORMATTER))
                                        .setFontSize(10)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setMarginBottom(20);
                        document.add(rangoFechas);
                } else {
                        document.add(new Paragraph(" ").setMarginBottom(15));
                }
        }

        private void agregarResumen(Document document, List<VentaResponseDTO> ventas) {
                // Calcular estadísticas
                int totalVentas = ventas.size();
                double ingresosTotal = ventas.stream().mapToDouble(VentaResponseDTO::getTotal).sum();
                double ventaPromedio = totalVentas > 0 ? ingresosTotal / totalVentas : 0;

                // Contar clientes únicos
                Set<String> clientesUnicos = new HashSet<>();
                for (VentaResponseDTO venta : ventas) {
                        clientesUnicos.add(venta.getNombreCliente());
                }

                // Crear tabla de resumen (2x2)
                Table resumenTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                                .setWidth(UnitValue.createPercentValue(100))
                                .setMarginBottom(20);

                DeviceRgb colorFondo = new DeviceRgb(240, 248, 255);

                // Total de Ventas
                Cell cellVentas = new Cell().add(new Paragraph("Total de Ventas\n" + formatNumber(totalVentas))
                                .setFontSize(12)
                                .setTextAlignment(TextAlignment.CENTER))
                                .setBackgroundColor(colorFondo)
                                .setPadding(10);
                resumenTable.addCell(cellVentas);

                // Ingresos Total
                Cell cellIngresos = new Cell().add(new Paragraph("Ingresos Totales\n$" + formatCurrency(ingresosTotal))
                                .setFontSize(12)
                                .setTextAlignment(TextAlignment.CENTER))
                                .setBackgroundColor(colorFondo)
                                .setPadding(10);
                resumenTable.addCell(cellIngresos);

                // Venta Promedio
                Cell cellPromedio = new Cell().add(new Paragraph("Venta Promedio\n$" + formatCurrency(ventaPromedio))
                                .setFontSize(12)
                                .setTextAlignment(TextAlignment.CENTER))
                                .setBackgroundColor(colorFondo)
                                .setPadding(10);
                resumenTable.addCell(cellPromedio);

                // Clientes Únicos
                Cell cellClientes = new Cell()
                                .add(new Paragraph("Clientes Únicos\n" + formatNumber(clientesUnicos.size()))
                                                .setFontSize(12)
                                                .setTextAlignment(TextAlignment.CENTER))
                                .setBackgroundColor(colorFondo)
                                .setPadding(10);
                resumenTable.addCell(cellClientes);

                document.add(resumenTable);
        }

        private void agregarTopProductos(Document document, List<VentaResponseDTO> ventas) {
                // Título de la sección
                Paragraph titulo = new Paragraph("Top 5 Productos Más Vendidos")
                                .setFontSize(14)
                                .setBold()
                                .setMarginBottom(10);
                document.add(titulo);

                // Contar cantidades vendidas por producto
                Map<String, Integer> productoCantidades = new HashMap<>();
                for (VentaResponseDTO venta : ventas) {
                        for (ProductoVentaDTO producto : venta.getProductos()) {
                                String nombreProducto = producto.getNombreProducto();
                                int cantidad = producto.getCantidad();
                                productoCantidades.put(nombreProducto,
                                                productoCantidades.getOrDefault(nombreProducto, 0) + cantidad);
                        }
                }

                // Ordenar y obtener top 5
                List<Map.Entry<String, Integer>> topProductos = productoCantidades.entrySet().stream()
                                .sorted((e1, e2) -> e2.getValue().compareTo(e1.getValue()))
                                .limit(5)
                                .toList();

                // Crear tabla simple con 2 columnas
                Table table = new Table(UnitValue.createPercentArray(new float[] { 3, 1 }))
                                .setWidth(UnitValue.createPercentValue(70))
                                .setMarginBottom(20);

                DeviceRgb colorFondo = new DeviceRgb(255, 250, 240);

                int posicion = 1;
                for (Map.Entry<String, Integer> entry : topProductos) {
                        // Nombre del producto
                        Cell cellProducto = new Cell()
                                        .add(new Paragraph(posicion + ". " + entry.getKey()).setFontSize(11))
                                        .setBackgroundColor(colorFondo)
                                        .setPadding(8);
                        table.addCell(cellProducto);

                        // Cantidad vendida
                        Cell cellCantidad = new Cell()
                                        .add(new Paragraph(formatNumber(entry.getValue()) + " unid.").setFontSize(11))
                                        .setBackgroundColor(colorFondo)
                                        .setTextAlignment(TextAlignment.RIGHT)
                                        .setPadding(8);
                        table.addCell(cellCantidad);

                        posicion++;
                }

                if (topProductos.isEmpty()) {
                        Cell emptyCell = new Cell(1, 2)
                                        .add(new Paragraph("No hay datos de productos")
                                                        .setTextAlignment(TextAlignment.CENTER))
                                        .setPadding(10);
                        table.addCell(emptyCell);
                }

                document.add(table);
        }

        private void agregarDesglosePorVendedor(Document document, List<VentaResponseDTO> ventas) {
                // Título de la sección
                Paragraph titulo = new Paragraph("Desglose por Vendedor")
                                .setFontSize(14)
                                .setBold()
                                .setMarginBottom(10);
                document.add(titulo);

                // Agrupar ventas por vendedor
                Map<String, VendedorStats> vendedorStats = new HashMap<>();
                for (VentaResponseDTO venta : ventas) {
                        String vendedor = venta.getNombreVendedor() != null ? venta.getNombreVendedor() : "N/A";
                        VendedorStats stats = vendedorStats.getOrDefault(vendedor, new VendedorStats());
                        stats.cantidadVentas++;
                        stats.totalIngresos += venta.getTotal();
                        vendedorStats.put(vendedor, stats);
                }

                // Ordenar por total de ingresos descendente
                List<Map.Entry<String, VendedorStats>> vendedoresOrdenados = vendedorStats.entrySet().stream()
                                .sorted((e1, e2) -> Double.compare(e2.getValue().totalIngresos,
                                                e1.getValue().totalIngresos))
                                .toList();

                // Crear tabla con 3 columnas
                Table table = new Table(UnitValue.createPercentArray(new float[] { 3, 1, 2 }))
                                .setWidth(UnitValue.createPercentValue(70))
                                .setMarginBottom(20);

                DeviceRgb colorHeader = new DeviceRgb(102, 126, 234);
                DeviceRgb colorFondo = new DeviceRgb(245, 245, 250);

                // Encabezados
                table.addHeaderCell(
                                new Cell().add(new Paragraph("Vendedor").setBold().setFontColor(ColorConstants.WHITE))
                                                .setBackgroundColor(colorHeader).setPadding(5));
                table.addHeaderCell(new Cell().add(new Paragraph("Ventas").setBold().setFontColor(ColorConstants.WHITE))
                                .setBackgroundColor(colorHeader).setTextAlignment(TextAlignment.CENTER).setPadding(5));
                table.addHeaderCell(new Cell().add(new Paragraph("Total").setBold().setFontColor(ColorConstants.WHITE))
                                .setBackgroundColor(colorHeader).setTextAlignment(TextAlignment.RIGHT).setPadding(5));

                // Datos
                for (Map.Entry<String, VendedorStats> entry : vendedoresOrdenados) {
                        // Vendedor
                        table.addCell(new Cell().add(new Paragraph(entry.getKey()).setFontSize(11))
                                        .setBackgroundColor(colorFondo).setPadding(8));

                        // Cantidad de ventas
                        table.addCell(new Cell()
                                        .add(new Paragraph(String.valueOf(entry.getValue().cantidadVentas))
                                                        .setFontSize(11))
                                        .setBackgroundColor(colorFondo).setTextAlignment(TextAlignment.CENTER)
                                        .setPadding(8));

                        // Total ingresos
                        table.addCell(new Cell()
                                        .add(new Paragraph("$" + formatCurrency(entry.getValue().totalIngresos))
                                                        .setFontSize(11))
                                        .setBackgroundColor(colorFondo).setTextAlignment(TextAlignment.RIGHT)
                                        .setPadding(8));
                }

                if (vendedoresOrdenados.isEmpty()) {
                        Cell emptyCell = new Cell(1, 3)
                                        .add(new Paragraph("No hay datos de vendedores")
                                                        .setTextAlignment(TextAlignment.CENTER))
                                        .setPadding(10);
                        table.addCell(emptyCell);
                }

                document.add(table);
        }

        // Clase auxiliar para estadísticas de vendedor
        private static class VendedorStats {
                int cantidadVentas = 0;
                double totalIngresos = 0.0;
        }

        private void agregarTablaVentas(Document document, List<VentaResponseDTO> ventas) {
                // Título de la sección
                Paragraph tituloTabla = new Paragraph("Detalle de Ventas")
                                .setFontSize(14)
                                .setBold()
                                .setMarginBottom(10);
                document.add(tituloTabla);

                // Ordenar ventas por fecha descendente (más reciente primero)
                List<VentaResponseDTO> ventasOrdenadas = ventas.stream()
                                .sorted((v1, v2) -> v2.getFecha().compareTo(v1.getFecha()))
                                .toList();

                // Crear tabla con 5 columnas: Fecha, Cliente, Productos, Total, Vendedor
                Table table = new Table(UnitValue.createPercentArray(new float[] { 2, 3, 4, 2, 2 }))
                                .setWidth(UnitValue.createPercentValue(100));

                // Encabezados de la tabla
                DeviceRgb colorHeader = new DeviceRgb(102, 126, 234);
                String[] headers = { "Fecha", "Cliente", "Productos", "Total", "Vendedor" };

                for (String header : headers) {
                        Cell cell = new Cell().add(new Paragraph(header).setBold().setFontColor(ColorConstants.WHITE))
                                        .setBackgroundColor(colorHeader)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setPadding(5);
                        table.addHeaderCell(cell);
                }

                // Datos de las ventas
                for (VentaResponseDTO venta : ventasOrdenadas) {
                        // Fecha
                        String fechaStr = formatFecha(venta.getFecha());
                        table.addCell(new Cell().add(new Paragraph(fechaStr).setFontSize(10)).setPadding(5));

                        // Cliente
                        String nombreCliente = venta.getNombreCliente() != null ? venta.getNombreCliente() : "N/A";
                        table.addCell(new Cell().add(new Paragraph(nombreCliente).setFontSize(10)).setPadding(5));

                        // Productos (mostrar máximo 2, luego resumir)
                        StringBuilder productos = new StringBuilder();
                        List<ProductoVentaDTO> productosVendidos = venta.getProductos();
                        int maxProductosAMostrar = 2;
                        int totalProductos = productosVendidos.size();

                        for (int i = 0; i < Math.min(maxProductosAMostrar, totalProductos); i++) {
                                ProductoVentaDTO detalle = productosVendidos.get(i);
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

                        table.addCell(new Cell().add(new Paragraph(productos.toString().trim()).setFontSize(10))
                                        .setPadding(5));

                        // Total
                        table.addCell(new Cell()
                                        .add(new Paragraph("$" + formatCurrency(venta.getTotal())).setFontSize(10))
                                        .setTextAlignment(TextAlignment.RIGHT)
                                        .setPadding(5));

                        // Vendedor
                        String nombreVendedor = venta.getNombreVendedor() != null ? venta.getNombreVendedor() : "N/A";
                        table.addCell(new Cell().add(new Paragraph(nombreVendedor).setFontSize(10)).setPadding(5));
                }

                // Mensaje si no hay ventas
                if (ventas.isEmpty()) {
                        Cell emptyCell = new Cell(1, 5)
                                        .add(new Paragraph("No hay ventas registradas en este período")
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
