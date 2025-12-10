package com.gestioninventariodemo2.cruddemo2.Services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.EstadoStockDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.InformeDashboardDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.KPIsDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.TopProductoDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.VentasComprasDiariasDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.InformeResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ResumenStockDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.StockTablaDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Stock;
import com.gestioninventariodemo2.cruddemo2.Repository.CompraRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.StockRepository;
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
        private final CompraRepository compraRepository;
        private final StockRepository stockRepository;

        public InformeResponseDTO generarInforme(LocalDate inicio, LocalDate fin) {
                InformeResponseDTO resumen = ventaRepository.obtenerResumenVentas(inicio, fin);
                String top = ventaRepository.obtenerProductoMasVendido(inicio, fin);
                resumen.setProductoMasVendido(top);
                return resumen;
        }

        public ResumenStockDTO obtenerResumenStock() {
                int stockBajoNivel = 5; // El mismo límite que usás en el frontend

                long totalProductos = stockRepository.count();
                long productosAgotados = stockRepository.countByStockActualEquals(0);
                long productosBajoStock = stockRepository.countByStockActualGreaterThanAndStockActualLessThanEqual(0,
                                stockBajoNivel);

                return ResumenStockDTO.builder()
                                .totalProductos(totalProductos)
                                .productosAgotados(productosAgotados)
                                .productosBajoStock(productosBajoStock)
                                .build();
        }

        public Page<StockTablaDTO> obtenerProductosConStockBajo(Pageable pageable) {
                int stockBajoNivel = 5;
                String estadoActivo = "ACTIVO";

                // 1. Busca en la BD usando paginación y ordenamiento
                // ¡CAMBIO CLAVE AQUÍ!
                // Cambiamos el método a uno que NO tiene el sufijo "OrderByStockActualAsc".
                // Esto permite que el ordenamiento sea tomado de la variable 'pageable'.
                Page<Stock> stocksBajos = stockRepository.findByStockActualLessThanEqualAndProductoEstado(
                                stockBajoNivel,
                                estadoActivo,
                                pageable);

                // 2. Convierte esa 'Page' de Stock a una 'Page' de StockTablaDTO
                return stocksBajos.map(stock -> StockTablaDTO.builder()
                                .id(stock.getProducto().getIdProducto())
                                .nombre(stock.getProducto().getNombre())
                                .categoria(stock.getProducto().getCategoria() != null
                                                ? stock.getProducto().getCategoria().getNombre()
                                                : "Sin categoría")
                                .descripcion(stock.getProducto().getDescripcion())
                                .precio(stock.getProducto().getPrecio())
                                .stock(stock.getStockActual())
                                .build());
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
                                                                .stream().findFirst().orElse(null))
                                .productoMenosVendidoMes(
                                                ventaRepository.obtenerProductoMenosVendidoEnRango(primerDiaMes, hoy)
                                                                .stream().findFirst().orElse(null))
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

        // ==========================================================
        // NUEVOS MÉTODOS PARA DASHBOARD DE INFORMES
        // ==========================================================

        public KPIsDTO obtenerKPIs(LocalDate inicio, LocalDate fin) {
                // Total de ventas en el rango
                Double totalVentas = ventaRepository.sumTotalVentasEnRango(inicio, fin);
                if (totalVentas == null)
                        totalVentas = 0.0;

                // Total de compras en el rango
                Double totalCompras = compraRepository.sumTotalComprasEnRango(inicio, fin);
                if (totalCompras == null)
                        totalCompras = 0.0;

                // Ganancia
                Double ganancia = totalVentas - totalCompras;

                // Productos con stock bajo (stock < stockMinimo)
                Integer productosStockBajo = stockRepository.countProductosConStockBajo();

                return KPIsDTO.builder()
                                .totalVentas(totalVentas)
                                .totalCompras(totalCompras)
                                .ganancia(ganancia)
                                .productosStockBajo(productosStockBajo)
                                .build();
        }

        public List<VentasComprasDiariasDTO> obtenerVentasComprasDiarias(LocalDate inicio, LocalDate fin) {
                // Obtener ventas agrupadas por día
                List<Object[]> ventasPorDia = ventaRepository.sumVentasPorDia(inicio, fin);
                Map<LocalDate, Double> ventasMap = new HashMap<>();
                for (Object[] row : ventasPorDia) {
                        // Convertir java.sql.Date a LocalDate
                        LocalDate fecha = row[0] instanceof java.sql.Date
                                        ? ((java.sql.Date) row[0]).toLocalDate()
                                        : (LocalDate) row[0];
                        Double total = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
                        ventasMap.put(fecha, total);
                }

                // Obtener compras agrupadas por día
                List<Object[]> comprasPorDia = compraRepository.sumComprasPorDia(inicio, fin);
                Map<LocalDate, Double> comprasMap = new HashMap<>();
                for (Object[] row : comprasPorDia) {
                        // Convertir java.sql.Date a LocalDate
                        LocalDate fecha = row[0] instanceof java.sql.Date
                                        ? ((java.sql.Date) row[0]).toLocalDate()
                                        : (LocalDate) row[0];
                        Double total = row[1] != null ? ((Number) row[1]).doubleValue() : 0.0;
                        comprasMap.put(fecha, total);
                }

                // Combinar ambos mapas en una lista de DTOs
                List<VentasComprasDiariasDTO> resultado = new ArrayList<>();
                LocalDate fecha = inicio;
                while (!fecha.isAfter(fin)) {
                        resultado.add(VentasComprasDiariasDTO.builder()
                                        .fecha(fecha)
                                        .ventas(ventasMap.getOrDefault(fecha, 0.0))
                                        .compras(comprasMap.getOrDefault(fecha, 0.0))
                                        .build());
                        fecha = fecha.plusDays(1);
                }

                return resultado;
        }

        public List<TopProductoDTO> obtenerTopProductos(LocalDate inicio, LocalDate fin, Integer limit) {
                List<Object[]> topProductos = ventaRepository.findTopProductos(inicio, fin,
                                limit != null ? limit : 5);

                return topProductos.stream()
                                .map(row -> TopProductoDTO.builder()
                                                .nombreProducto((String) row[0])
                                                .cantidad(((Number) row[1]).intValue())
                                                .totalVentas(((Number) row[2]).doubleValue())
                                                .build())
                                .collect(Collectors.toList());
        }

        public EstadoStockDTO obtenerEstadoStock() {
                // Productos con stock óptimo (stock >= stockMinimo)
                Integer optimo = stockRepository.countStockOptimo();

                // Productos con stock bajo (stock < stockMinimo AND stock > 0)
                Integer bajo = stockRepository.countStockBajo();

                // Productos agotados (stock = 0)
                Integer agotado = stockRepository.countStockAgotado();

                return EstadoStockDTO.builder()
                                .optimo(optimo)
                                .bajo(bajo)
                                .agotado(agotado)
                                .build();
        }

}
