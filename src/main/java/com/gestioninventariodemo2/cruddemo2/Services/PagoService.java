package com.gestioninventariodemo2.cruddemo2.Services;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.Model.Compra;
import com.gestioninventariodemo2.cruddemo2.Model.MetodoPago;
import com.gestioninventariodemo2.cruddemo2.Model.Pago;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Repository.PagoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PagoService {

    private final PagoRepository pagoRepository;

    /**
     * Registrar un nuevo pago de compra
     */
    @Transactional
    public Pago registrarPago(Compra compra, MetodoPago metodoPago, BigDecimal importe,
            String tipoTarjeta, String estado, LocalDate fechaVencimiento, Usuario usuario) {

        Pago pago = new Pago();
        pago.setCompra(compra);
        pago.setMetodoPago(metodoPago);
        pago.setImporte(importe);
        pago.setTipoTarjeta(tipoTarjeta);
        pago.setFechaPago(LocalDateTime.now());
        pago.setEstado(estado != null ? estado : "PAGADO");
        pago.setFechaVencimiento(fechaVencimiento);
        pago.setUsuario(usuario);

        return pagoRepository.save(pago);
    }

    /**
     * Obtener el pago asociado a una compra
     */
    public Pago obtenerPagoPorCompra(Long idCompra) {
        return pagoRepository.findByCompraIdCompra(idCompra);
    }
}
