package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoSelectDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Producto;
import com.gestioninventariodemo2.cruddemo2.Services.ProductoService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/productos")
@RequiredArgsConstructor
public class ProductoController {


    private final ProductoService productoService;


    @PostMapping
    public ResponseEntity<Producto> crearProducto(@RequestBody ProductoRequestDTO dto){
        Producto nuevo = productoService.crearProducto(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevo);
    }

    @GetMapping
    public ResponseEntity<List<ProductoResponseDTO>> listarProductos(){
        List<ProductoResponseDTO> productos = productoService.listarProductos();
        return ResponseEntity.ok(productos);
    }

    @GetMapping("/select")
    public ResponseEntity<List<ProductoSelectDTO>> listarProductosSelect(){
        List<ProductoSelectDTO> productos = productoService.listarProductosSelect();
        return ResponseEntity.ok(productos);
    }



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarProducto(@PathVariable Long id){
        try {
        // Ejecutamos el servicio
        productoService.eliminarProducto(id);
        
        // Si no lanza excepción, es Borrado Físico (SUCCESS 204)
        return ResponseEntity.noContent().build(); 

    } catch (IllegalArgumentException ex) {
        // --- ¡CAPTURAMOS LA EXCEPCIÓN DEL SOFT DELETE! ---
        
        // Devolvemos 200 OK con el mensaje de la excepción en el cuerpo.
        // Esto le dice al navegador: "Todo salió bien, aquí está el mensaje".
        throw new ResponseStatusException(HttpStatus.OK, ex.getMessage()); 

    } catch (RuntimeException ex) {
        // Para errores inesperados, dejamos que el GlobalExceptionHandler maneje el 500
        throw ex; 
    }
    }
}