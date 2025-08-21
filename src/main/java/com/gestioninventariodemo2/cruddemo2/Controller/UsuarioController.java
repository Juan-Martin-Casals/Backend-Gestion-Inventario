package com.gestioninventariodemo2.cruddemo2.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioDTOFront;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Services.UsuarioService;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired
    private UsuarioService usuarioService;


    //CREAR USUARIO
    @PostMapping
    public Usuario crearUsuario(@RequestBody UsuarioDTO usuarioDTO){
        return usuarioService.crearUsuario(usuarioDTO);
    }


    //OBTENER TODOS LOS USARIOS OCULTANDO SU ID Y CONTRASEÑA
    @GetMapping
    public List<UsuarioDTOFront> obtenerTodosLosUsuarios(){
        return usuarioService.obtenerTodosLosUsuarios();
    }


    //ACTUALIZAR USUARIO
    @PutMapping("/{id}")
    public Usuario actualizarUsuario(@PathVariable Long id, @RequestBody UsuarioDTO usuarioDTO){
        return usuarioService.actualizarUsuario(id, usuarioDTO);

    }

    //ELIMINAR USUARIO
    @DeleteMapping("/{id}")
    public void borrarUsuario(@PathVariable Long id){
        usuarioService.borrarUsuario(id);
    }

}
