-- Crear el esquema (Base de datos)
CREATE SCHEMA IF NOT EXISTS `agencia_viajes` DEFAULT CHARACTER SET utf8mb4;
USE `agencia_viajes`;

-- -----------------------------------------------------
-- Tabla 1: AEROLINEAS
-- Catálogo de aerolíneas para evitar repetir nombres
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `aerolineas` (
  `id_aerolinea` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id_aerolinea`),
  UNIQUE INDEX `nombre_UNIQUE` (`nombre` ASC)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Tabla 2: CLIENTES
-- Información de los pasajeros
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `clientes` (
  `id_cliente` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `apellido` VARCHAR(100) NOT NULL,
  -- Podrías agregar pasaporte o email aquí en el futuro
  PRIMARY KEY (`id_cliente`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Tabla 3: RESERVAS
-- Agrupa los boletos por Localizador (PNR)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `reservas` (
  `localizador` VARCHAR(10) NOT NULL, -- Ej: J1DDR
  `fecha_venta` DATE NULL,
  PRIMARY KEY (`localizador`)
) ENGINE = InnoDB;

-- -----------------------------------------------------
-- Tabla 4: BOLETOS
-- Tabla transaccional principal (Hechos)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `boletos` (
  `id_transaccion` INT NOT NULL AUTO_INCREMENT, -- ID interno único
  `numero_boleto` VARCHAR(50) NULL,             -- Ej: TK752112134945 (Puede ser nulo si solo es reserva)
  `tipo` VARCHAR(20) DEFAULT 'BOLETO',
  `ruta` VARCHAR(50) NOT NULL,                  -- Ej: CCS-MAD-CCS
  `fecha_ida` DATE NULL,
  `fecha_retorno` DATE NULL,
  
  -- Datos Financieros (DECIMAL para precisión monetaria)
  `monto_neto` DECIMAL(10,2) DEFAULT 0.00,
  `fee_emision` DECIMAL(10,2) DEFAULT 0.00,
  `monto_venta` DECIMAL(10,2) DEFAULT 0.00,
  `utilidad` DECIMAL(10,2) DEFAULT 0.00,
  `fee_comision` DECIMAL(10,2) DEFAULT 0.00,
  
  -- Claves Foráneas (Relaciones)
  `aerolinea_id` INT NOT NULL,
  `cliente_id` INT NOT NULL,
  `localizador_id` VARCHAR(10) NOT NULL,
  
  PRIMARY KEY (`id_transaccion`),
  
  -- Definición de Relaciones
  CONSTRAINT `fk_boletos_aerolineas`
    FOREIGN KEY (`aerolinea_id`)
    REFERENCES `aerolineas` (`id_aerolinea`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
    
  CONSTRAINT `fk_boletos_clientes`
    FOREIGN KEY (`cliente_id`)
    REFERENCES `clientes` (`id_cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
    
  CONSTRAINT `fk_boletos_reservas`
    FOREIGN KEY (`localizador_id`)
    REFERENCES `reservas` (`localizador`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB;

USE `agencia_viajes`;

-- -----------------------------------------------------
-- 1. Insertar AEROLINEAS (se usa IGNORE para no duplicar si se ejecuta de nuevo)
-- -----------------------------------------------------
INSERT IGNORE INTO aerolineas (nombre) VALUES 
('ESTELAR'),
('IBERIA'),
('RUTACA'),
('PLUS ULTRA');

-- -----------------------------------------------------
-- 2. Insertar CLIENTES
-- -----------------------------------------------------
INSERT INTO clientes (nombre, apellido) VALUES 
('ANABEL', 'LEON'),
('DEBORA', 'CORDERO'),
('FLORENCIA', 'CORDERO'),
('EUCLIDES', 'QUIJADA'),
('ALEXANDRE', 'TERAN'),
('JOSE NICOLAS', 'FRANCO'),
('DAISSY', 'MORENO');

-- -----------------------------------------------------
-- 3. Insertar RESERVAS (Localizadores)
-- Nota: si no posee fecha de venta en el CSV, se dejan en NULL
-- -----------------------------------------------------
INSERT IGNORE INTO reservas (localizador, fecha_venta) VALUES 
('COSYFQ', NULL),
('J1DDR', NULL),
('NMKLHQ', '2025-11-25'),
('NFKVVM', '2025-11-27');

-- -----------------------------------------------------
-- 4. Insertar BOLETOS (Transacciones)
-- Aquí cruzamos los datos usando los Nombres y Localizadores
-- -----------------------------------------------------

-- Fila 1: Anabel Leon (Estelar)
INSERT INTO boletos (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id)
VALUES (
    'TK0520390122135', 'CCS-MAD-CCS', '2025-01-02', '2025-02-06', 890.53, 10.00, 1030.00, 129.47, 25.89,
    (SELECT id_aerolinea FROM aerolineas WHERE nombre = 'ESTELAR'),
    (SELECT id_cliente FROM clientes WHERE nombre = 'ANABEL' AND apellido = 'LEON'),
    'COSYFQ'
);

-- Fila 2: Debora Cordero (Iberia)
INSERT INTO boletos (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id)
VALUES (
    'TK752112134945', 'BCN-CDG-MAD', '2025-04-06', '2025-04-09', 237.80, 10.00, 340.00, 92.20, 18.44,
    (SELECT id_aerolinea FROM aerolineas WHERE nombre = 'IBERIA'),
    (SELECT id_cliente FROM clientes WHERE nombre = 'DEBORA' AND apellido = 'CORDERO'),
    'J1DDR'
);

-- Fila 3: Florencia Cordero (Iberia)
INSERT INTO boletos (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id)
VALUES (
    'TK752112134946', 'BCN-CDG-MAD', '2025-04-06', '2025-04-09', 237.80, 10.00, 340.00, 92.20, 18.44,
    (SELECT id_aerolinea FROM aerolineas WHERE nombre = 'IBERIA'),
    (SELECT id_cliente FROM clientes WHERE nombre = 'FLORENCIA' AND apellido = 'CORDERO'),
    'J1DDR'
);

-- Fila 4: Euclides Quijada (Iberia)
INSERT INTO boletos (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id)
VALUES (
    'TK752112134947', 'BCN-CDG-MAD', '2025-04-06', '2025-04-09', 237.80, 10.00, 340.00, 92.20, 18.44,
    (SELECT id_aerolinea FROM aerolineas WHERE nombre = 'IBERIA'),
    (SELECT id_cliente FROM clientes WHERE nombre = 'EUCLIDES' AND apellido = 'QUIJADA'),
    'J1DDR'
);

-- Fila 5: Alexandre Teran (Rutaca) - SIN NUMERO DE BOLETO
INSERT INTO boletos (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id)
VALUES (
    NULL, 'CCS-BRM', '2025-11-27', NULL, 62.50, 0.00, 95.00, 32.50, 6.50,
    (SELECT id_aerolinea FROM aerolineas WHERE nombre = 'RUTACA'),
    (SELECT id_cliente FROM clientes WHERE nombre = 'ALEXANDRE' AND apellido = 'TERAN'),
    'NMKLHQ'
);

-- Fila 6: Jose Nicolas Franco (Plus Ultra)
INSERT INTO boletos (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id)
VALUES (
    'TK6630350041359', 'CCS-MAD-CCS', '2025-02-12', '2025-02-24', 750.20, 0.00, 840.00, 89.80, 17.96,
    (SELECT id_aerolinea FROM aerolineas WHERE nombre = 'PLUS ULTRA'),
    (SELECT id_cliente FROM clientes WHERE nombre = 'JOSE NICOLAS' AND apellido = 'FRANCO'),
    'NFKVVM'
);

-- Fila 7: Daissy Moreno (Plus Ultra)
INSERT INTO boletos (numero_boleto, ruta, fecha_ida, fecha_retorno, monto_neto, fee_emision, monto_venta, utilidad, fee_comision, aerolinea_id, cliente_id, localizador_id)
VALUES (
    'TK6630350041360', 'CCS-MAD-CCS', '2025-02-12', '2025-02-24', 750.20, 0.00, 840.00, 89.80, 17.96,
    (SELECT id_aerolinea FROM aerolineas WHERE nombre = 'PLUS ULTRA'),
    (SELECT id_cliente FROM clientes WHERE nombre = 'DAISSY' AND apellido = 'MORENO'),
    'NFKVVM'
);

