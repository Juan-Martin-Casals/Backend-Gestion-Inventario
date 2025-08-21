package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.Model.Rol;
import com.gestioninventariodemo2.cruddemo2.Repository.RolRepository;

@RestController
@RequestMapping("/api/roles")
public class RolController {

    @Autowired
    private RolRepository rolRepository;

    





    //SIRVE PARA QUE EN UN SELECT SE MUESTRE LAS OPCIONES QUE HAY EN LA BASE DE DATOS, EN ESTE CASO ADMINISTRADOR Y EMPLEADO
    @GetMapping
    public List<Rol>listaDeRoles(){
        return rolRepository.findAll();
    }

}
