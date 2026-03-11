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
                long totalProductos = stockRepository.count();
                Long agotadosActivos = stockRepository.countAgotadosActivos();
                long productosAgotados = agotadosActivos != null ? agotadosActivos : 0;
                // Usar query que compara contra el stockMinimo individual de cada producto
                Integer productosBajoStockCount = stockRepository.countProductosConStockBajo();
                long productosBajoStock = productosBajoStockCount != null ? productosBajoStockCount : 0;

                return ResumenStockDTO.builder()
                                .totalProductos(totalProductos)
                                .productosAgotados(productosAgotados)
                                .productosBajoStock(productosBajoStock)
                                .build();
        }

        public Page<StockTablaDTO> obtenerProductosConStockBajo(Pageable pageable) {
                String estadoActivo = "ACTIVO";

                // Incluye agotados + bajo stock (para la tabla del dashboard)
                Page<Stock> stocksBajos = stockRepository.findProductosQueNecesitanReposicion(
                                estadoActivo,
                                pageable);

                return stocksBajos.map(stock -> {
                        com.gestioninventariodemo2.cruddemo2.Model.Producto prod = stock.getProducto();

                        String proveedorNom = "Sin Proveedor";
                        String emailNom = "-";
                        String telNom = "-";
                        if (prod.getProductoProveedores() != null && !prod.getProductoProveedores().isEmpty()) {
                                com.gestioninventariodemo2.cruddemo2.Model.Proveedor prov =
                                        prod.getProductoProveedores().get(0).getProveedor();
                                if (prov != null) {
                                        proveedorNom = prov.getNombre();
                                        emailNom = prov.getEmail() != null ? prov.getEmail() : "-";
                                        telNom = prov.getTelefono() != null ? prov.getTelefono() : "-";
                                }
                        }

                        Double precioCosto = 0.0;
                        if (prod.getDetalleCompras() != null && !prod.getDetalleCompras().isEmpty()) {
                                com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra ultimoDetalle =
                                        prod.getDetalleCompras().stream()
                                                .max(java.util.Comparator.comparing(
                                                        com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra::getIdDetalleCompra))
                                                .orElse(null);
                                if (ultimoDetalle != null) {
                                        precioCosto = ultimoDetalle.getPrecioUnitario();
                                        if (proveedorNom.equals("Sin Proveedor") &&
                                                ultimoDetalle.getCompra() != null &&
                                                ultimoDetalle.getCompra().getProveedor() != null) {
                                                com.gestioninventariodemo2.cruddemo2.Model.Proveedor provCompra =
                                                        ultimoDetalle.getCompra().getProveedor();
                                                proveedorNom = provCompra.getNombre();
                                                emailNom = provCompra.getEmail() != null ? provCompra.getEmail() : "-";
                                                telNom = provCompra.getTelefono() != null ? provCompra.getTelefono() : "-";
                                        }
                                }
                        }

                        return StockTablaDTO.builder()
                                .id(prod.getIdProducto())
                                .nombre(prod.getNombre())
                                .categoria(prod.getCategoria() != null ? prod.getCategoria().getNombre() : "Sin categoría")
                                .descripcion(prod.getDescripcion())
                                .precio(prod.getPrecio())
                                .stock(stock.getStockActual())
                                .stockMinimo(stock.getStockMinimo())
                                .proveedor(proveedorNom)
                                .email(emailNom)
                                .telefono(telNom)
                                .precioCosto(precioCosto)
                                .build();
                });
        }

        // Solo stock bajo real (0 < stockActual < stockMinimo), para el modal del dashboard
        public Page<StockTablaDTO> obtenerSoloStockBajo(Pageable pageable) {
                String estadoActivo = "ACTIVO";
                Page<Stock> stocksBajos = stockRepository.findSoloStockBajo(estadoActivo, pageable);
                return stocksBajos.map(stock -> {
                        com.gestioninventariodemo2.cruddemo2.Model.Producto prod = stock.getProducto();

                        // Resolver proveedor (igual que en obtenerProductosAgotados)
                        String proveedorNom = "Sin Proveedor";
                        String emailNom = "-";
                        String telNom = "-";
                        if (prod.getProductoProveedores() != null && !prod.getProductoProveedores().isEmpty()) {
                                com.gestioninventariodemo2.cruddemo2.Model.Proveedor prov =
                                        prod.getProductoProveedores().get(0).getProveedor();
                                if (prov != null) {
                                        proveedorNom = prov.getNombre();
                                        emailNom = prov.getEmail() != null ? prov.getEmail() : "-";
                                        telNom = prov.getTelefono() != null ? prov.getTelefono() : "-";
                                }
                        }

                        // Resolves precio de costo desde el último DetalleCompra
                        Double precioCosto = 0.0;
                        if (prod.getDetalleCompras() != null && !prod.getDetalleCompras().isEmpty()) {
                                com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra ultimoDetalle =
                                        prod.getDetalleCompras().stream()
                                                .max(java.util.Comparator.comparing(
                                                        com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra::getIdDetalleCompra))
                                                .orElse(null);
                                if (ultimoDetalle != null) {
                                        precioCosto = ultimoDetalle.getPrecioUnitario();
                                        // Fallback: proveedor desde la compra si no hay relación directa
                                        if (proveedorNom.equals("Sin Proveedor") &&
                                                ultimoDetalle.getCompra() != null &&
                                                ultimoDetalle.getCompra().getProveedor() != null) {
                                                com.gestioninventariodemo2.cruddemo2.Model.Proveedor provCompra =
                                                        ultimoDetalle.getCompra().getProveedor();
                                                proveedorNom = provCompra.getNombre();
                                                emailNom = provCompra.getEmail() != null ? provCompra.getEmail() : "-";
                                                telNom = provCompra.getTelefono() != null ? provCompra.getTelefono() : "-";
                                        }
                                }
                        }

                        return StockTablaDTO.builder()
                                .id(prod.getIdProducto())
                                .nombre(prod.getNombre())
                                .descripcion(prod.getDescripcion())
                                .stock(stock.getStockActual())
                                .stockMinimo(stock.getStockMinimo())
                                .proveedor(proveedorNom)
                                .email(emailNom)
                                .telefono(telNom)
                                .precioCosto(precioCosto)
                                .build();
                });
        }

        public InformeDashboardDTO obtenerDashboard() {
                LocalDate primerDiaMes = LocalDate.now().withDayOfMonth(1);
                LocalDate hoy = LocalDate.now();

                Long ventasMes = ventaRepository.countVentasEnRango(primerDiaMes, hoy);
                Long ventasHistoricas = ventaRepository.countVentasHistoricas();
                Long productoMes = ventaRepository.sumProductosEnRango(primerDiaMes, hoy);
                Long productoHistoricos = ventaRepository.sumProductosHistoricos();
                Double recaudacionMes = ventaRepository.sumRecaudacionEnRango(primerDiaMes, hoy);

                List<String> masVendidoList = ventaRepository.obtenerProductoMasVendidoEnRango(primerDiaMes, hoy);
                List<String> menosVendidoList = ventaRepository.obtenerProductoMenosVendidoEnRango(primerDiaMes, hoy);

                return InformeDashboardDTO.builder()
                                .ventasMes(ventasMes != null ? ventasMes : 0L)
                                .ventasHistoricas(ventasHistoricas != null ? ventasHistoricas : 0L)
                                .productoMes(productoMes != null ? productoMes : 0L)
                                .productoHistoricos(productoHistoricos != null ? productoHistoricos : 0L)
                                .recaudacionMes(recaudacionMes != null ? recaudacionMes : 0.0)
                                .productoMasVendidoMes(masVendidoList != null && !masVendidoList.isEmpty()
                                                ? masVendidoList.get(0)
                                                : null)
                                .productoMenosVendidoMes(menosVendidoList != null && !menosVendidoList.isEmpty()
                                                ? menosVendidoList.get(0)
                                                : null)
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

                // Cantidad de ventas en el rango
                Long cantidadVentas = ventaRepository.countVentasEnRango(inicio, fin);
                if (cantidadVentas == null)
                        cantidadVentas = 0L;

                // Productos vendidos en el rango
                Long productosVendidos = ventaRepository.sumProductosEnRango(inicio, fin);
                if (productosVendidos == null)
                        productosVendidos = 0L;

                return KPIsDTO.builder()
                                .totalVentas(totalVentas)
                                .totalCompras(totalCompras)
                                .ganancia(ganancia)
                                .productosStockBajo(productosStockBajo)
                                .cantidadVentas(cantidadVentas)
                                .productosVendidos(productosVendidos)
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

        public List<TopProductoDTO> obtenerTopProductosComprados(LocalDate inicio, LocalDate fin, Integer limit) {
                List<Object[]> top = compraRepository.findTopProductosComprados(inicio, fin,
                                limit != null ? limit : 5);

                return top.stream()
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

    public org.springframework.data.domain.Page<com.gestioninventariodemo2.cruddemo2.DTO.AgotadoDTO> obtenerProductosAgotados(org.springframework.data.domain.Pageable pageable) {
        String estadoActivo = "ACTIVO";
        org.springframework.data.domain.Page<com.gestioninventariodemo2.cruddemo2.Model.Stock> agotados = stockRepository.findAgotadosActivos(estadoActivo, pageable);

        return agotados.map(stock -> {
            com.gestioninventariodemo2.cruddemo2.Model.Producto prod = stock.getProducto();
            
            String proveedorNom = "Sin Proveedor";
            String emailNom = "-";
            String telNom = "-";
            if (prod.getProductoProveedores() != null && !prod.getProductoProveedores().isEmpty()) {
                com.gestioninventariodemo2.cruddemo2.Model.Proveedor prov = prod.getProductoProveedores().get(0).getProveedor();
                if (prov != null) {
                    proveedorNom = prov.getNombre();
                    emailNom = prov.getEmail() != null ? prov.getEmail() : "-";
                    telNom = prov.getTelefono() != null ? prov.getTelefono() : "-";
                }
            }

            Double precioCosto = 0.0;
            if (prod.getDetalleCompras() != null && !prod.getDetalleCompras().isEmpty()) {
                com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra ultimoDetalle = prod.getDetalleCompras().stream()
                        .max(java.util.Comparator.comparing(com.gestioninventariodemo2.cruddemo2.Model.DetalleCompra::getIdDetalleCompra))
                        .orElse(null);
                
                if (ultimoDetalle != null) {
                    precioCosto = ultimoDetalle.getPrecioUnitario();
                    
                    if (proveedorNom.equals("Sin Proveedor") && ultimoDetalle.getCompra() != null && ultimoDetalle.getCompra().getProveedor() != null) {
                        com.gestioninventariodemo2.cruddemo2.Model.Proveedor provCompra = ultimoDetalle.getCompra().getProveedor();
                        proveedorNom = provCompra.getNombre();
                        emailNom = provCompra.getEmail() != null ? provCompra.getEmail() : "-";
                        telNom = provCompra.getTelefono() != null ? provCompra.getTelefono() : "-";
                    }
                }
            }

            return com.gestioninventariodemo2.cruddemo2.DTO.AgotadoDTO.builder()
                .nombre(prod.getNombre())
                .descripcion(prod.getDescripcion())
                .proveedor(proveedorNom)
                .email(emailNom)
                .telefono(telNom)
                .precioCosto(precioCosto)
                .build();
        });
    }

}
