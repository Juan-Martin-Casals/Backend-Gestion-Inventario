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

import com.gestioninventariodemo2.cruddemo2.DTO.ProductoRequestDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.ProductoResponseDTO;
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



    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarProducto(@PathVariable Long id){
        productoService.eliminarProducto(id);
        return ResponseEntity.noContent().build();
    }

}
