package com.gestioninventariodemo2.cruddemo2.DTO;

import java.io.Serializable;
import java.util.List;

public class VentaRequestDTO implements Serializable{

    private ClienteRequestDTO cliente;
    private List<DetalleVentaRequestDTO> detalles;
    
    public VentaRequestDTO() {
    }

    public VentaRequestDTO(ClienteRequestDTO cliente, List<DetalleVentaRequestDTO> detalles) {
        this.cliente = cliente;
        this.detalles = detalles;
    }

    public ClienteRequestDTO getCliente() {
        return cliente;
    }

    public void setCliente(ClienteRequestDTO cliente) {
        this.cliente = cliente;
    }

    public List<DetalleVentaRequestDTO> getDetalles() {
        return detalles;
    }

    public void setDetalles(List<DetalleVentaRequestDTO> detalles) {
        this.detalles = detalles;
    }

    

    

}
