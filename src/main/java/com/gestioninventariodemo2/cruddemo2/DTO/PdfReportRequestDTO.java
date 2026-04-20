package com.gestioninventariodemo2.cruddemo2.DTO;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PdfReportRequestDTO {
    private List<ProductoInventarioDTO> productos;
    private String filtrosAplicados;
}
