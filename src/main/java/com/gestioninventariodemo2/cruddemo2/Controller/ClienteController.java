package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.ClienteRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ClienteSelectDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Cliente;
import com.gestioninventariodemo2.cruddemo2.Services.ClienteService;

import lombok.AllArgsConstructor;
@RestController
@RequestMapping("/api/clientes")
@AllArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;
    @PostMapping
    public ResponseEntity<Cliente> crearCliente(@RequestBody ClienteRequestDTO dto) {
        // Las validaciones (DNI duplicado, etc.) se manejan en el servicio
        // y se capturan por el GlobalExceptionHandler
        Cliente nuevoCliente = clienteService.crearCliente(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoCliente);
    }

    @GetMapping("/select")
    public ResponseEntity<List<ClienteSelectDTO>> listarClientesSelect() {
        return ResponseEntity.ok(clienteService.listarClientesSelect());
    }

}
