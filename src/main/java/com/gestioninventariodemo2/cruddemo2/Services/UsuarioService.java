package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioDTOFront;
import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Rol;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Repository.RolRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;

@Service
public class UsuarioService {
    
    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;
    


    public Usuario crearUsuario(UsuarioDTO usuarioDTO){
        Rol rol = rolRepository.findById(usuarioDTO.getIdRol())
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));

        Usuario usuario = new Usuario();
        usuario.setNombre(usuarioDTO.getNombre());
        usuario.setApellido(usuarioDTO.getApellido());
        usuario.setEmail(usuarioDTO.getEmail());
        usuario.setContrasena(usuarioDTO.getContrasena());
        usuario.setRol(rol);

        return usuarioRepository.save(usuario);
    }


    //LISTAR A LOS USARIOS AL FRONT OCULTANDO SU ID Y CONTRASEÑA
    public List<UsuarioDTOFront> obtenerTodosLosUsuarios() {
    return usuarioRepository.findAll()
            .stream()
            .map(u -> new UsuarioDTOFront(
                    u.getNombre(),
                    u.getApellido(),
                    u.getEmail(),
                    u.getRol().getDescripcion()))
            .collect(Collectors.toList());
    }



    //ACTUALIZAR USUARIO
    public Usuario actualizarUsuario(Long id, UsuarioDTO usuarioDTO){
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        Rol rol = rolRepository.findById(usuarioDTO.getIdRol())
            .orElseThrow(()-> new RuntimeException("Rol no encontrado"));

        usuario.setNombre(usuarioDTO.getNombre());
        usuario.setApellido(usuarioDTO.getApellido());
        usuario.setEmail(usuarioDTO.getEmail());
        usuario.setContrasena(usuarioDTO.getContrasena());
        usuario.setRol(rol);

        return usuarioRepository.save(usuario);
    }


    //BORRRAR USUARIO
    public void borrarUsuario(Long id){
        if(!usuarioRepository.existsById(id)){
            throw new RuntimeException("Usuario no encontrado");
        }
        usuarioRepository.deleteById(id);
    }

    

}
