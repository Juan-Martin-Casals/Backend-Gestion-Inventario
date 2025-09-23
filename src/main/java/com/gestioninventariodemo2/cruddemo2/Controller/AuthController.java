package com.gestioninventariodemo2.cruddemo2.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gestioninventariodemo2.cruddemo2.DTO.AuthResponseDTO;
import com.gestioninventariodemo2.cruddemo2.DTO.LoginRequestDTO;
import com.gestioninventariodemo2.cruddemo2.Services.AuthenticationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationService authenticationService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@RequestBody LoginRequestDTO loginRequestDTO){
        UserDetails userDetails = authenticationService.authenticate(loginRequestDTO.getEmail(), loginRequestDTO.getContrasena());
        String tokenValue = authenticationService.generateToken(userDetails);
        AuthResponseDTO authResponseDTO = AuthResponseDTO.builder()
                .token(tokenValue)
                .expired(86400L).build();
        return ResponseEntity.ok(authResponseDTO);
    }

}
