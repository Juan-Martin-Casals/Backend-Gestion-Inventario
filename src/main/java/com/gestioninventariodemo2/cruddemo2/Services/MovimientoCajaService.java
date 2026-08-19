package com.gestioninventariodemo2.cruddemo2.Services;

import com.gestioninventariodemo2.cruddemo2.DTO.MovimientoCajaRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.MovimientoCajaResponseDTO;
import com.gestioninventariodemo2.cruddemo2.Model.CategoriaMovimientoCaja;
import com.gestioninventariodemo2.cruddemo2.Model.MovimientoCaja;
import com.gestioninventariodemo2.cruddemo2.Model.SesionCaja;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MovimientoCajaService {

    private final MovimientoCajaRepository movimientoCajaRepository;
    private final SesionCajaRepository sesionCajaRepository;
    private final UsuarioRepository usuarioRepository;
    private final CategoriaMovimientoCajaRepository categoriaMovimientoCajaRepository;
    private final CobroRepository cobroRepository;
    private final PagoRepository pagoRepository;

    @Transactional
    public MovimientoCajaResponseDTO registrarMovimiento(MovimientoCajaRequestDTO dto) {
        // 1. Obtener la sesión de caja abierta
        SesionCaja sesion = sesionCajaRepository.findFirstByEstado("ABIERTA")
                .orElseThrow(() -> new RuntimeException("Debe abrir la caja antes de registrar movimientos."));

        // 2. Obtener el usuario y la categoría
        Usuario usuario = usuarioRepository.findById(dto.getIdUsuario())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + dto.getIdUsuario()));

        CategoriaMovimientoCaja categoria = categoriaMovimientoCajaRepository.findById(dto.getIdCategoriaMovimiento())
                .orElseThrow(() -> new RuntimeException("Categoría de movimiento no encontrada con ID: " + dto.getIdCategoriaMovimiento()));

        // 3. Validar que el tipo de movimiento coincida con la categoría
        if (!categoria.getTipo().equalsIgnoreCase(dto.getTipo())) {
            throw new IllegalArgumentException("El tipo de movimiento (" + dto.getTipo() + ") no coincide con el tipo de la categoría (" + categoria.getTipo() + ").");
        }

        // 4. Validar saldo disponible para EGRESOS
        if ("EGRESO".equalsIgnoreCase(dto.getTipo())) {
            Double saldoEfectivo = calcularSaldoEfectivoActual(sesion);
            if (dto.getMonto() > saldoEfectivo) {
                throw new RuntimeException("❌ Operación rechazada: El monto ingresado supera el límite disponible en caja para retiros. Por favor, verifique la cantidad de dinero físico disponible o solicite la asistencia de un supervisor.");
            }
        }

        // 5. Registrar el movimiento (inmutable, sin métodos de edición/eliminación)
        MovimientoCaja movimiento = MovimientoCaja.builder()
                .tipo(dto.getTipo().toUpperCase())
                .monto(dto.getMonto())
                .descripcion(dto.getDescripcion())
                .referencia(dto.getReferencia())
                .fechaHora(LocalDateTime.now())
                .sesionCaja(sesion)
                .usuario(usuario)
                .categoriaMovimiento(categoria)
                .build();

        MovimientoCaja guardado = movimientoCajaRepository.save(movimiento);
        return mapToDTO(guardado);
    }

    @Transactional(readOnly = true)
    public List<MovimientoCajaResponseDTO> listarMovimientosDeSesion(Long idSesion) {
        return movimientoCajaRepository.findBySesionCajaIdSesion(idSesion).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MovimientoCajaResponseDTO> listarMovimientosSesionActiva() {
        return sesionCajaRepository.findFirstByEstado("ABIERTA")
                .map(sesion -> listarMovimientosDeSesion(sesion.getIdSesion()))
                .orElse(java.util.Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public List<MovimientoCajaResponseDTO> listarTodos() {
        return movimientoCajaRepository.findAll().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public Double calcularSaldoEfectivoActual(SesionCaja sesion) {
        Double calcEfectivoCobros = 0.0;
        List<Object[]> resultadosCobros = cobroRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
        for (Object[] row : resultadosCobros) {
            String metodo = (String) row[0];
            Double sumImporte = 0.0;
            if (row[1] instanceof BigDecimal) {
                sumImporte = ((BigDecimal) row[1]).doubleValue();
            } else if (row[1] instanceof Double) {
                sumImporte = (Double) row[1];
            }
            if (metodo != null) {
                String m = metodo.toLowerCase();
                if (m.contains("efectivo") && !m.contains("aporte externo")) {
                    calcEfectivoCobros += sumImporte;
                }
            }
        }

        Double calcEfectivoPagos = 0.0;
        List<Object[]> resultadosPagos = pagoRepository.obtenerTotalPorMetodoPagoPorSesion(sesion.getIdSesion());
        for (Object[] row : resultadosPagos) {
            String metodo = (String) row[0];
            Double sumImporte = 0.0;
            if (row[1] instanceof BigDecimal) {
                sumImporte = ((BigDecimal) row[1]).doubleValue();
            } else if (row[1] instanceof Double) {
                sumImporte = (Double) row[1];
            }
            if (metodo != null) {
                String m = metodo.toLowerCase();
                if (m.contains("efectivo") && !m.contains("aporte externo")) {
                    calcEfectivoPagos += sumImporte;
                }
            }
        }

        // Movimientos manuales
        Double ingresosManuales = movimientoCajaRepository.sumIngresosBySesion(sesion.getIdSesion());
        Double egresosManuales = movimientoCajaRepository.sumEgresosBySesion(sesion.getIdSesion());
        if (ingresosManuales == null) ingresosManuales = 0.0;
        if (egresosManuales == null) egresosManuales = 0.0;

        Double montoInicial = sesion.getMontoInicialReal() != null ? sesion.getMontoInicialReal() : 0.0;

        return montoInicial + calcEfectivoCobros - calcEfectivoPagos + ingresosManuales - egresosManuales;
    }

    @Transactional(readOnly = true)
    public Double obtenerSaldoEfectivoSesionActiva() {
        SesionCaja sesion = sesionCajaRepository.findFirstByEstado("ABIERTA")
                .orElseThrow(() -> new RuntimeException("No hay una sesión de caja abierta."));
        return calcularSaldoEfectivoActual(sesion);
    }

    @Transactional
    public MovimientoCajaResponseDTO anularMovimiento(Long id, Long idAdmin) {
        MovimientoCaja m = movimientoCajaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movimiento no encontrado con ID: " + id));

        if ("ANULADO".equals(m.getEstado())) {
            throw new IllegalArgumentException("El movimiento ya se encuentra anulado.");
        }

        Usuario admin = usuarioRepository.findById(idAdmin)
                .orElseThrow(() -> new RuntimeException("Usuario administrador no encontrado con ID: " + idAdmin));

        if (!"ADMINISTRADOR".equalsIgnoreCase(admin.getRol().getDescripcion())) {
            throw new RuntimeException("❌ Operación denegada: Solo los administradores pueden realizar esta acción.");
        }

        // Validar saldo si se anula un ingreso
        if ("INGRESO".equalsIgnoreCase(m.getTipo())) {
            Double saldoEfectivo = calcularSaldoEfectivoActual(m.getSesionCaja());
            if (saldoEfectivo - m.getMonto() < 0) {
                throw new RuntimeException("❌ Operación rechazada: La anulación de este ingreso dejaría la caja con saldo negativo. Saldo disponible: " + saldoEfectivo);
            }
        }

        m.setEstado("ANULADO");
        m.setUsuarioModificador(admin);
        m.setFechaModificacion(LocalDateTime.now());

        MovimientoCaja guardado = movimientoCajaRepository.save(m);
        return mapToDTO(guardado);
    }

    @Transactional
    public MovimientoCajaResponseDTO editarMovimiento(Long id, MovimientoCajaRequestDTO dto, Long idAdmin) {
        MovimientoCaja m = movimientoCajaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movimiento no encontrado con ID: " + id));

        if ("ANULADO".equals(m.getEstado())) {
            throw new IllegalArgumentException("No se puede editar un movimiento anulado.");
        }

        Usuario admin = usuarioRepository.findById(idAdmin)
                .orElseThrow(() -> new RuntimeException("Usuario administrador no encontrado con ID: " + idAdmin));

        if (!"ADMINISTRADOR".equalsIgnoreCase(admin.getRol().getDescripcion())) {
            throw new RuntimeException("❌ Operación denegada: Solo los administradores pueden realizar esta acción.");
        }

        CategoriaMovimientoCaja categoria = categoriaMovimientoCajaRepository.findById(dto.getIdCategoriaMovimiento())
                .orElseThrow(() -> new RuntimeException("Categoría de movimiento no encontrada con ID: " + dto.getIdCategoriaMovimiento()));

        // Validar tipo
        if (!categoria.getTipo().equalsIgnoreCase(m.getTipo())) {
            throw new IllegalArgumentException("El tipo de movimiento (" + m.getTipo() + ") no coincide con la nueva categoría (" + categoria.getTipo() + ").");
        }

        // Validar que el saldo de caja no quede negativo
        Double saldoEfectivo = calcularSaldoEfectivoActual(m.getSesionCaja());
        double diferencia = 0.0;
        if ("INGRESO".equalsIgnoreCase(m.getTipo())) {
            diferencia = dto.getMonto() - m.getMonto();
        } else if ("EGRESO".equalsIgnoreCase(m.getTipo())) {
            diferencia = m.getMonto() - dto.getMonto();
        }
        if (saldoEfectivo + diferencia < 0) {
            throw new RuntimeException("❌ Operación rechazada: La modificación propuesta dejaría la caja con saldo negativo. Saldo disponible: " + saldoEfectivo);
        }

        m.setMonto(dto.getMonto());
        m.setDescripcion(dto.getDescripcion());
        m.setReferencia(dto.getReferencia());
        m.setCategoriaMovimiento(categoria);
        m.setUsuarioModificador(admin);
        m.setFechaModificacion(LocalDateTime.now());

        MovimientoCaja guardado = movimientoCajaRepository.save(m);
        return mapToDTO(guardado);
    }

    private MovimientoCajaResponseDTO mapToDTO(MovimientoCaja m) {
        return MovimientoCajaResponseDTO.builder()
                .idMovimiento(m.getIdMovimiento())
                .tipo(m.getTipo())
                .monto(m.getMonto())
                .descripcion(m.getDescripcion())
                .referencia(m.getReferencia())
                .fechaHora(m.getFechaHora())
                .idSesion(m.getSesionCaja() != null ? m.getSesionCaja().getIdSesion() : null)
                .nombreUsuario(m.getUsuario() != null ? 
                        m.getUsuario().getNombre() + " " + m.getUsuario().getApellido() : "Sistema")
                .rolUsuario(m.getUsuario() != null && m.getUsuario().getRol() != null ? 
                        capitalizar(m.getUsuario().getRol().getDescripcion()) : "N/A")
                .nombreCategoria(m.getCategoriaMovimiento() != null ? 
                        m.getCategoriaMovimiento().getNombre() : "General")
                .estado(m.getEstado() != null ? m.getEstado() : "ACTIVO")
                .nombreUsuarioModificador(m.getUsuarioModificador() != null ? 
                        m.getUsuarioModificador().getNombre() + " " + m.getUsuarioModificador().getApellido() : null)
                .fechaModificacion(m.getFechaModificacion())
                .build();
    }

    private String capitalizar(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String t = text.trim();
        if (t.equalsIgnoreCase("N/A")) {
            return "N/A";
        }
        return t.substring(0, 1).toUpperCase() + t.substring(1).toLowerCase();
    }
}
