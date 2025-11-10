package com.gestioninventariodemo2.cruddemo2.Services;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
                .estado("ACTIVO")
                .build();

        usuarioRepository.save(usuario);
        return toResponseDTO(usuario);
    }


    //LISTAR A LOS USARIOS AL FRONT OCULTANDO SU ID Y CONTRASEÑA
@Transactional(readOnly = true)
    public Page<UsuarioResponseDTO> obtenerTodosLosUsuarios(Pageable pageable) { // <-- Acepta Pageable
        
        // Asumimos que la lista solo debe traer usuarios activos.
        // Si no tienes este método en tu Repositorio, usa findAll(pageable) en su lugar.
        Page<Usuario> paginaUsuarios = usuarioRepository.findAllByEstado("ACTIVO", pageable); 

        return paginaUsuarios.map(this::toResponseDTO); // <-- Devuelve Page<DTO>
    }


    //ACTUALIZAR USUARIO

// --- 3. NUEVO MÉTODO: OBTENER POR ID (Para el Modal) ---
// AÑADE ESTE MÉTODO (GET /{id})
    @Transactional(readOnly = true)
    public UsuarioResponseDTO obtenerUsuarioPorId(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado"));
        return toResponseDTO(usuario);
    }

    // --- 4. ACTUALIZAR USUARIO (MÉTODO ACTUALIZADO) ---
    @Transactional
    public UsuarioResponseDTO actualizarUsuario(Long id, UsuarioRequestDTO dto) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado"));

        Rol rol = rolRepository.findById(dto.getIdRol())
                .orElseThrow(() -> new EntityNotFoundException("Rol no encontrado"));

        // Validar si el email ha cambiado y si ya existe
        if (!usuario.getEmail().equalsIgnoreCase(dto.getEmail())) {
            validarEmailUnico(dto.getEmail());
        }

        usuario.setNombre(dto.getNombre());
        usuario.setApellido(dto.getApellido());
        usuario.setEmail(dto.getEmail());
        usuario.setRol(rol);
        

        usuarioRepository.save(usuario);
        return toResponseDTO(usuario);
    }
    


    //BORRRAR USUARIO
 @Transactional
    public void borrarUsuario(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Usuario no encontrado"));
            
        // CAMBIO: Soft Delete
        usuario.setEstado("INACTIVO");
        usuarioRepository.save(usuario);
    }
    
        private void validarEmailUnico(String email) {
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("El email ya está en uso");
        }
    }


// MÉTODO toResponseDTO CORREGIDO:
    private UsuarioResponseDTO toResponseDTO(Usuario usuario) {
        return UsuarioResponseDTO.builder()
                .id(usuario.getIdUsuario()) // <--- Ahora incluimos el ID
                .nombre(usuario.getNombre())
                .apellido(usuario.getApellido())
                .email(usuario.getEmail())
                .idRol(usuario.getRol().getIdRol()) // <--- Incluimos el ID del Rol
                .descripcionRol(usuario.getRol().getDescripcion())
                .build();
    }
}
    


