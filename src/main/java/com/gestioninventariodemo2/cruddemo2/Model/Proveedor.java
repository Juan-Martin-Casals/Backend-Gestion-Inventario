package com.gestioninventariodemo2.cruddemo2.Model;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "Proveedor")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Proveedor {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idProveedor;

    @Column(name = "Nombre")
    private String nombre;

    @Column(name = "Telefono")
    private String telefono;

    @Column(name = "Email")
    private String email;

    @Column(name = "Direccion")
    private String direccion;


    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Compra>compras = new ArrayList<>();

    @OneToMany(mappedBy = "proveedor", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductoProveedor>productoProveedor = new ArrayList<>();



}
