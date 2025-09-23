package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.List;


import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.UsuarioRequestDTO;
import com.gestioninventariodemo2.cruddemo2.Model.Rol;
import com.gestioninventariodemo2.cruddemo2.Model.Usuario;
import com.gestioninventariodemo2.cruddemo2.Repository.RolRepository;
import com.gestioninventariodemo2.cruddemo2.Repository.UsuarioRepository;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final RolRepository rolRepository;

    @Transactional
    public UsuarioResponseDTO crearUsuario(UsuarioRequestDTO dto) {
    // Validar campos obligatorios
    if (dto.getNombre() == null || dto.getNombre().isBlank() ||
        dto.getApellido() == null || dto.getApellido().isBlank() ||
        dto.getEmail() == null || dto.getEmail().isBlank() ||
        dto.getContrasena() == null || dto.getContrasena().isBlank() ||
        dto.getConfirmacionContrasena() == null || dto.getConfirmacionContrasena().isBlank() ||
        dto.getIdRol() == null) {
        throw new IllegalArgumentException("Todos los campos son obligatorios");
    }

    // Validar formato de email
    if (!dto.getEmail().matches("^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {
        throw new IllegalArgumentException("Correo electrónico incorrecto");
    }

    // Validar coincidencia de contraseñas
    if (!dto.getContrasena().equals(dto.getConfirmacionContrasena())) {
        throw new IllegalArgumentException("Las contraseñas no coinciden");
    }

    // Validar email único
    if (usuarioRepository.existsByEmail(dto.getEmail())) {
        throw new IllegalArgumentException("Ya existe un usuario con este correo");
    }


        Rol rol = rolRepository.findById(dto.getIdRol())
                .orElseThrow(() -> new EntityNotFoundException("Rol no encontrado"));

        Usuario usuario = Usuario.builder()
                .nombre(dto.getNombre())
                .apellido(dto.getApellido())
                .email(dto.getEmail())
                .contrasena(passwordEncoder.encode(dto.getContrasena()))
                .rol(rol)
                .build();

        usuarioRepository.save(usuario);
        return toResponseDTO(usuario);
    }


    //LISTAR A LOS USARIOS AL FRONT OCULTANDO SU ID Y CONTRASEÑA
    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> obtenerTodosLosUsuarios() {
        return usuarioRepository.findAll().stream()
                .map(this::toResponseDTO)
                .toList();
    }



    //ACTUALIZAR USUARIO

    @Transactional
    public UsuarioResponseDTO actualizarUsuario(Long id, UsuarioRequestDTO dto) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado"));

        Rol rol = rolRepository.findById(dto.getIdRol())
                .orElseThrow(() -> new EntityNotFoundException("Rol no encontrado"));

        if (!usuario.getEmail().equals(dto.getEmail())) {
            validarEmailUnico(dto.getEmail());
        }

        usuario.setNombre(dto.getNombre());
        usuario.setApellido(dto.getApellido());
        usuario.setEmail(dto.getEmail());
        usuario.setContrasena(dto.getContrasena());
        usuario.setRol(rol);

        usuarioRepository.save(usuario);
        return toResponseDTO(usuario);
    }


    //BORRRAR USUARIO
    @Transactional
    public void borrarUsuario(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new EntityNotFoundException("Usuario no encontrado");
        }
        usuarioRepository.deleteById(id);
    }
    
    
        private void validarEmailUnico(String email) {
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("El email ya está en uso");
        }
    }


        private UsuarioResponseDTO toResponseDTO(Usuario usuario) {
        return UsuarioResponseDTO.builder()
                .nombre(usuario.getNombre())
                .apellido(usuario.getApellido())
                .email(usuario.getEmail())
                .descripcionRol(usuario.getRol().getDescripcion())
                .build();
    }

    

}
