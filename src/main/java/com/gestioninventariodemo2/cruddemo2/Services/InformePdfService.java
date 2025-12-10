package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.*;
import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Model.Venta;
import com.gestioninventariodemo2.cruddemo2.Repository.CompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.VentaRepository;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class InformePdfService {

        private final InformeService informeService;
        private final VentaRepository ventaRepository;
        private final CompraRepository compraRepository;

        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        private static final DecimalFormat NUMBER_FORMATTER;

        static {
                DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("es", "AR"));
                symbols.setGroupingSeparator('.');
                symbols.setDecimalSeparator(',');
                NUMBER_FORMATTER = new DecimalFormat("#,##0.00", symbols);
        }

        public byte[] generarPdfInformeCompleto(LocalDate inicio, LocalDate fin) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();

                try {
                        PdfWriter writer = new PdfWriter(baos);
                        PdfDocument pdf = new PdfDocument(writer);
                        Document document = new Document(pdf);

                        // ========== PORTADA (PÁGINA 1 INDEPENDIENTE) ==========
                        agregarPortada(document, inicio, fin);

                        // ========== KPIs ==========
                        KPIsDTO kpis = informeService.obtenerKPIs(inicio, fin);
                        agregarSeccionKPIs(document, kpis);

                        // =========== TOP 5 PRODUCTOS ==========
                        List<TopProductoDTO> topProductos = informeService.obtenerTopProductos(inicio, fin, 5);
                        agregarSeccionTopProductos(document, topProductos);

                        // ========== TABLA DE VENTAS CON PRODUCTOS ==========
                        List<Venta> ventas = ventaRepository.findByFechaBetween(inicio, fin);
                        agregarSeccionVentas(document, ventas, inicio, fin);

                        // ========== TABLA DE COMPRAS CON PRODUCTOS ==========
                        List<Compra> compras = compraRepository.findByFechaBetween(inicio, fin);
                        agregarSeccionCompras(document, compras, inicio, fin);

                        // ========== PIE DE PÁGINA ==========
                        agregarPiePagina(document);

                        document.close();
                        return baos.toByteArray();

                } catch (Exception e) {
                        throw new RuntimeException("Error al generar PDF de informe completo", e);
                }
        }

        private void agregarPortada(Document document, LocalDate inicio, LocalDate fin) {
                // Título Principal
                Paragraph titulo = new Paragraph("INFORME COMPLETO")
                                .setFontSize(28)
                                .setBold()
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginTop(100)
                                .setMarginBottom(20);
                document.add(titulo);

                // Subtítulo
                Paragraph subtitulo = new Paragraph("Reporte Ejecutivo de Gestión")
                                .setFontSize(16)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(40);
                document.add(subtitulo);

                // Nombre del negocio
                Paragraph negocio = new Paragraph("Gestión Inventario")
                                .setFontSize(20)
                                .setBold()
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(60);
                document.add(negocio);

                // Período
                Paragraph periodo = new Paragraph("Período del Informe")
                                .setFontSize(14)
                                .setBold()
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(10);
                document.add(periodo);

                Paragraph fechas = new Paragraph(
                                inicio.format(DATE_FORMATTER) + " - " + fin.format(DATE_FORMATTER))
                                .setFontSize(16)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(60);
                document.add(fechas);

                // Fecha de generación
                Paragraph fechaGeneracion = new Paragraph(
                                "Generado: " + LocalDate.now().format(DATE_FORMATTER))
                                .setFontSize(12)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginBottom(20);
                document.add(fechaGeneracion);

                // SALTO DE PÁGINA EXPLÍCITO - Portada sola en página 1
                document.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
        }

        private void agregarSeccionKPIs(Document document, KPIsDTO kpis) {
                // Título de sección
                Paragraph tituloKPIs = new Paragraph("Resumen Ejecutivo - KPIs")
                                .setFontSize(18)
                                .setBold()
                                .setMarginBottom(15)
                                .setMarginTop(20);
                document.add(tituloKPIs);

                // Crear tabla de KPIs (2x2)
                Table kpisTable = new Table(UnitValue.createPercentArray(new float[] { 1, 1 }))
                                .setWidth(UnitValue.createPercentValue(100))
                                .setMarginBottom(30);

                DeviceRgb colorFondo = new DeviceRgb(240, 248, 255);

                // Total de Ventas
                Cell cellVentas = new Cell()
                                .add(new Paragraph("Total Ventas\n$" + formatCurrency(
                                                kpis.getTotalVentas() != null ? kpis.getTotalVentas() : 0))
                                                .setFontSize(14)
                                                .setBold()
                                                .setTextAlignment(TextAlignment.CENTER))
                                .setBackgroundColor(colorFondo)
                                .setPadding(15);
                kpisTable.addCell(cellVentas);

                // Total de Compras
                Cell cellCompras = new Cell()
                                .add(new Paragraph("Total Compras\n$" + formatCurrency(
                                                kpis.getTotalCompras() != null ? kpis.getTotalCompras() : 0))
                                                .setFontSize(14)
                                                .setBold()
                                                .setTextAlignment(TextAlignment.CENTER))
                                .setBackgroundColor(colorFondo)
                                .setPadding(15);
                kpisTable.addCell(cellCompras);

                // Ganancia
                double ganancia = kpis.getGanancia() != null ? kpis.getGanancia() : 0;
                Cell cellGanancia = new Cell()
                                .add(new Paragraph("Ganancia Neta\n$" + formatCurrency(ganancia))
                                                .setFontSize(14)
                                                .setBold()
                                                .setTextAlignment(TextAlignment.CENTER)
                                                .setFontColor(ganancia >= 0 ? new DeviceRgb(40, 167, 69)
                                                                : new DeviceRgb(220, 53, 69)))
                                .setBackgroundColor(colorFondo)
                                .setPadding(15);
                kpisTable.addCell(cellGanancia);

                // Productos con Stock Bajo
                Cell cellStockBajo = new Cell()
                                .add(new Paragraph("Productos Stock Bajo\n"
                                                + (kpis.getProductosStockBajo() != null ? kpis.getProductosStockBajo()
                                                                : 0))
                                                .setFontSize(14)
                                                .setBold()
                                                .setTextAlignment(TextAlignment.CENTER))
                                .setBackgroundColor(colorFondo)
                                .setPadding(15);
                kpisTable.addCell(cellStockBajo);

                document.add(kpisTable);
        }

        private void agregarSeccionTopProductos(Document document, List<TopProductoDTO> topProductos) {
                // Título de sección
                Paragraph tituloTop = new Paragraph("Top 5 Productos Más Vendidos")
                                .setFontSize(18)
                                .setBold()
                                .setMarginBottom(15)
                                .setMarginTop(20);
                document.add(tituloTop);

                // Crear tabla
                Table table = new Table(UnitValue.createPercentArray(new float[] { 1, 4, 2, 2 }))
                                .setWidth(UnitValue.createPercentValue(100));

                // Encabezados
                DeviceRgb colorHeader = new DeviceRgb(102, 126, 234);
                String[] headers = { "#", "Producto", "Cantidad", "Total Ventas" };

                for (String header : headers) {
                        Cell cell = new Cell()
                                        .add(new Paragraph(header).setBold().setFontColor(ColorConstants.WHITE))
                                        .setBackgroundColor(colorHeader)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setPadding(8);
                        table.addHeaderCell(cell);
                }

                // Datos
                if (topProductos.isEmpty()) {
                        Cell emptyCell = new Cell(1, 4)
                                        .add(new Paragraph("No hay datos de ventas en este período")
                                                        .setTextAlignment(TextAlignment.CENTER))
                                        .setPadding(15);
                        table.addCell(emptyCell);
                } else {
                        int posicion = 1;
                        for (TopProductoDTO producto : topProductos) {
                                table.addCell(new Cell()
                                                .add(new Paragraph(String.valueOf(posicion++)).setFontSize(11)
                                                                .setBold())
                                                .setTextAlignment(TextAlignment.CENTER).setPadding(8));
                                table.addCell(new Cell()
                                                .add(new Paragraph(producto.getNombreProducto()).setFontSize(11))
                                                .setPadding(8));
                                table.addCell(new Cell()
                                                .add(new Paragraph(producto.getCantidad() + " uds").setFontSize(11))
                                                .setTextAlignment(TextAlignment.CENTER).setPadding(8));
                                table.addCell(new Cell()
                                                .add(new Paragraph("$" + formatCurrency(producto.getTotalVentas()))
                                                                .setFontSize(11))
                                                .setTextAlignment(TextAlignment.RIGHT).setPadding(8));
                        }
                }

                document.add(table);
                document.add(new Paragraph("\n"));
        }

        private void agregarSeccionVentas(Document document, List<Venta> ventas, LocalDate inicio, LocalDate fin) {
                // Salto de página
                document.add(new Paragraph("\n\n"));

                // Título de sección
                Paragraph tituloVentas = new Paragraph("Detalle de Ventas")
                                .setFontSize(18)
                                .setBold()
                                .setMarginBottom(10)
                                .setMarginTop(20);
                document.add(tituloVentas);

                Paragraph periodoVentas = new Paragraph(
                                "Período: " + inicio.format(DATE_FORMATTER) + " - " + fin.format(DATE_FORMATTER))
                                .setFontSize(11)
                                .setMarginBottom(15);
                document.add(periodoVentas);

                // Crear tabla con columna adicional para productos
                Table table = new Table(UnitValue.createPercentArray(new float[] { 2, 3, 3, 4, 2 }))
                                .setWidth(UnitValue.createPercentValue(100));

                // Encabezados
                DeviceRgb colorHeader = new DeviceRgb(40, 167, 69);
                String[] headers = { "Fecha", "Cliente", "Vendedor", "Productos", "Total" };

                for (String header : headers) {
                        Cell cell = new Cell()
                                        .add(new Paragraph(header).setBold().setFontColor(ColorConstants.WHITE))
                                        .setBackgroundColor(colorHeader)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setPadding(8);
                        table.addHeaderCell(cell);
                }

                // Datos
                if (ventas.isEmpty()) {
                        Cell emptyCell = new Cell(1, 5)
                                        .add(new Paragraph("No hay ventas registradas en este período")
                                                        .setTextAlignment(TextAlignment.CENTER))
                                        .setPadding(15);
                        table.addCell(emptyCell);
                } else {
                        double totalVentas = 0;
                        for (Venta venta : ventas) {
                                // Fecha
                                table.addCell(new Cell().add(
                                                new Paragraph(venta.getFecha().format(DATE_FORMATTER)).setFontSize(10))
                                                .setPadding(6));

                                // Cliente
                                table.addCell(new Cell().add(new Paragraph(venta.getCliente() != null
                                                ? venta.getCliente().getNombre() + " "
                                                                + venta.getCliente().getApellido()
                                                : "N/A").setFontSize(10)).setPadding(6));

                                // Vendedor
                                table.addCell(new Cell().add(new Paragraph(venta.getUsuario() != null
                                                ? venta.getUsuario().getNombre() + " "
                                                                + venta.getUsuario().getApellido()
                                                : "N/A").setFontSize(10)).setPadding(6));

                                // Productos - Listar todos los productos de la venta
                                StringBuilder productos = new StringBuilder();
                                if (venta.getDetalleVentas() != null && !venta.getDetalleVentas().isEmpty()) {
                                        for (int i = 0; i < venta.getDetalleVentas().size(); i++) {
                                                var detalle = venta.getDetalleVentas().get(i);
                                                productos.append(detalle.getProducto().getNombre())
                                                                .append(" x")
                                                                .append(detalle.getCantidad())
                                                                .append(" ($")
                                                                .append(formatCurrency(detalle.getPrecioUnitario()))
                                                                .append(")");
                                                if (i < venta.getDetalleVentas().size() - 1) {
                                                        productos.append("\n");
                                                }
                                        }
                                } else {
                                        productos.append("Sin detalles");
                                }
                                table.addCell(new Cell().add(new Paragraph(productos.toString()).setFontSize(9))
                                                .setPadding(6));

                                // Total
                                table.addCell(new Cell()
                                                .add(new Paragraph("$" + formatCurrency(venta.getTotal()))
                                                                .setFontSize(10))
                                                .setTextAlignment(TextAlignment.RIGHT).setPadding(6));
                                totalVentas += venta.getTotal();
                        }

                        // Fila de total
                        table.addCell(new Cell(1, 4).add(new Paragraph("TOTAL").setBold().setFontSize(11))
                                        .setTextAlignment(TextAlignment.RIGHT).setPadding(8)
                                        .setBackgroundColor(new DeviceRgb(245, 245, 245)));
                        table.addCell(new Cell()
                                        .add(new Paragraph("$" + formatCurrency(totalVentas)).setBold().setFontSize(11))
                                        .setTextAlignment(TextAlignment.RIGHT).setPadding(8)
                                        .setBackgroundColor(new DeviceRgb(245, 245, 245)));
                }

                document.add(table);
                document.add(new Paragraph("\n"));
        }

        private void agregarSeccionCompras(Document document, List<Compra> compras, LocalDate inicio, LocalDate fin) {
                // Salto de página para separar secciones
                document.add(new Paragraph("\n\n"));

                // Título de sección
                Paragraph tituloCompras = new Paragraph("Detalle de Compras")
                                .setFontSize(18)
                                .setBold()
                                .setMarginBottom(10)
                                .setMarginTop(20);
                document.add(tituloCompras);

                Paragraph periodoCompras = new Paragraph(
                                "Período: " + inicio.format(DATE_FORMATTER) + " - " + fin.format(DATE_FORMATTER))
                                .setFontSize(11)
                                .setMarginBottom(15);
                document.add(periodoCompras);

                // Crear tabla con columna adicional para productos
                Table table = new Table(UnitValue.createPercentArray(new float[] { 2, 3, 5, 2 }))
                                .setWidth(UnitValue.createPercentValue(100));

                // Encabezados
                DeviceRgb colorHeader = new DeviceRgb(220, 53, 69);
                String[] headers = { "Fecha", "Proveedor", "Productos", "Total" };

                for (String header : headers) {
                        Cell cell = new Cell()
                                        .add(new Paragraph(header).setBold().setFontColor(ColorConstants.WHITE))
                                        .setBackgroundColor(colorHeader)
                                        .setTextAlignment(TextAlignment.CENTER)
                                        .setPadding(8);
                        table.addHeaderCell(cell);
                }

                // Datos
                if (compras.isEmpty()) {
                        Cell emptyCell = new Cell(1, 4)
                                        .add(new Paragraph("No hay compras registradas en este período")
                                                        .setTextAlignment(TextAlignment.CENTER))
                                        .setPadding(15);
                        table.addCell(emptyCell);
                } else {
                        double totalCompras = 0;
                        for (Compra compra : compras) {
                                // Fecha
                                table.addCell(new Cell().add(
                                                new Paragraph(compra.getFecha().format(DATE_FORMATTER)).setFontSize(10))
                                                .setPadding(6));

                                // Proveedor
                                table.addCell(new Cell().add(new Paragraph(
                                                compra.getProveedor() != null ? compra.getProveedor().getNombre()
                                                                : "N/A")
                                                .setFontSize(10)).setPadding(6));

                                // Productos - Listar todos los productos de la compra
                                StringBuilder productos = new StringBuilder();
                                if (compra.getDetalleCompras() != null && !compra.getDetalleCompras().isEmpty()) {
                                        for (int i = 0; i < compra.getDetalleCompras().size(); i++) {
                                                var detalle = compra.getDetalleCompras().get(i);
                                                productos.append(detalle.getProducto().getNombre())
                                                                .append(" x")
                                                                .append(detalle.getCantidad())
                                                                .append(" ($")
                                                                .append(formatCurrency(detalle.getPrecioUnitario()))
                                                                .append(")");
                                                if (i < compra.getDetalleCompras().size() - 1) {
                                                        productos.append("\n");
                                                }
                                        }
                                } else {
                                        productos.append("Sin detalles");
                                }
                                table.addCell(new Cell().add(new Paragraph(productos.toString()).setFontSize(9))
                                                .setPadding(6));

                                // Total
                                table.addCell(new Cell()
                                                .add(new Paragraph("$" + formatCurrency(compra.getTotal()))
                                                                .setFontSize(10))
                                                .setTextAlignment(TextAlignment.RIGHT).setPadding(6));
                                totalCompras += compra.getTotal();
                        }

                        // Fila de total
                        table.addCell(new Cell(1, 3).add(new Paragraph("TOTAL").setBold().setFontSize(11))
                                        .setTextAlignment(TextAlignment.RIGHT).setPadding(8)
                                        .setBackgroundColor(new DeviceRgb(245, 245, 245)));
                        table.addCell(new Cell()
                                        .add(new Paragraph("$" + formatCurrency(totalCompras)).setBold()
                                                        .setFontSize(11))
                                        .setTextAlignment(TextAlignment.RIGHT).setPadding(8)
                                        .setBackgroundColor(new DeviceRgb(245, 245, 245)));
                }

                document.add(table);
        }

        private void agregarPiePagina(Document document) {
                Paragraph piePagina = new Paragraph("Documento generado automáticamente - Gestión Inventario")
                                .setFontSize(8)
                                .setTextAlignment(TextAlignment.CENTER)
                                .setMarginTop(30);
                document.add(piePagina);
        }

        private String formatCurrency(double amount) {
                return NUMBER_FORMATTER.format(amount);
        }
}
