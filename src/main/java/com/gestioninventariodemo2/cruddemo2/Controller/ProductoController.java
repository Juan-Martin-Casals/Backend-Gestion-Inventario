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

import jakarta.persistence.EntityNotFoundException;
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
public ResponseEntity<String> eliminarProducto(@PathVariable Long id) { // <-- Cambiado a ResponseEntity<String>
    try {
        // 1. Intentamos ejecutar el borrado
        productoService.eliminarProducto(id);
        
        // 2. Si NO lanzó excepción, fue un BORRADO FÍSICO exitoso
        // Devolvemos 204 No Content (sin cuerpo)
        return ResponseEntity.noContent().build(); 

    } catch (IllegalArgumentException ex) {
        // 3. ¡ES UN BORRADO LÓGICO EXITOSO!
        // Capturamos la excepción que nosotros mismos lanzamos
        if (ex.getMessage().contains("INACTIVO")) {
            // Devolvemos 200 OK con el mensaje de éxito
            return ResponseEntity.ok(ex.getMessage()); 
        } else {
            // Es un error de validación diferente
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
        }
        
    } catch (EntityNotFoundException ex) {
        // 4. Si el producto no existía (desde el findById)
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        
    } catch (Exception ex) {
        // 5. Cualquier otro error 500 inesperado
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error inesperado en el servidor: " + ex.getMessage());
    }
}
}