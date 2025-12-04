-- ============================================
-- SISTEMA DE PAGOS - SCRIPT DE BASE DE DATOS
-- PostgreSQL
-- ============================================

-- 1. Crear tabla metodo_pago
CREATE TABLE metodo_pago (
    id_metodo_pago BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    requiere_datos_extra BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW()
);

-- 2. Insertar métodos de pago iniciales
INSERT INTO metodo_pago (nombre, descripcion, requiere_datos_extra, activo) VALUES
('Efectivo', 'Pago en efectivo', FALSE, TRUE),
('Tarjeta', 'Tarjeta de crédito/débito', TRUE, TRUE),
('Transferencia', 'Transferencia bancaria', TRUE, TRUE);

-- 3. Crear tabla pago
CREATE TABLE pago (
    id_pago BIGSERIAL PRIMARY KEY,
    id_venta BIGINT NOT NULL UNIQUE,
    id_metodo_pago BIGINT NOT NULL,
    importe DECIMAL(10, 2) NOT NULL,
    nro_transaccion VARCHAR(100),
    tipo_tarjeta VARCHAR(50),
    ultimos_digitos VARCHAR(4),
    fecha_pago TIMESTAMP DEFAULT NOW(),
    id_usuario BIGINT,
    
    CONSTRAINT fk_pago_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_pago_metodo FOREIGN KEY (id_metodo_pago) REFERENCES metodo_pago(id_metodo_pago),
    CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- 4. Crear índices para mejorar rendimiento
CREATE INDEX idx_pago_metodo ON pago(id_metodo_pago);
CREATE INDEX idx_pago_fecha ON pago(fecha_pago);
CREATE INDEX idx_pago_usuario ON pago(id_usuario);

-- 5. Crear función y trigger para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_metodo_pago_actualizacion
    BEFORE UPDATE ON metodo_pago
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_actualizacion();
