DROP TABLE IF EXISTS detalle_pedidos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS recetas CASCADE;
DROP TABLE IF EXISTS insumos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS gastos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('Mesero', 'Cocina', 'Caja', 'Admin'))
);

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    disponible BOOLEAN DEFAULT TRUE
);

CREATE TABLE insumos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    stock_actual DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE recetas (
    id SERIAL PRIMARY KEY,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    insumo_id INT NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
    cantidad_requerida DECIMAL(10,4) NOT NULL
);

CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    mesa VARCHAR(10) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending', 'preparing', 'ready', 'paid')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_pedidos (
    id SERIAL PRIMARY KEY,
    pedido_id INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL
);

CREATE TABLE gastos (
    id SERIAL PRIMARY KEY,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos base de prueba
INSERT INTO usuarios (nombre_completo, username, password_hash, rol) VALUES
('Luis Hernandez', 'Luis123C', '12345678', 'Cocina'),
('Mari Carmen', 'Mari123C', '12345678', 'Mesero'),
('Ana Rios', 'Ana123J', '12345678', 'Caja'),
('Gabo Aguirre', 'Gabo123M', '12345678', 'Mesero'),
('Administrador', 'admin', '12345678', 'Admin');

INSERT INTO productos (nombre, categoria, precio, disponible) VALUES
('Espresso Intenso', 'Bebidas Calientes', 35.00, true),
('Café Americano', 'Bebidas Calientes', 30.00, true),
('Capuccino', 'Bebidas Calientes', 45.00, true),
('Late', 'Bebidas Calientes', 45.00, true),
('Frape', 'Bebidas Frías', 55.00, true),
('Te Helado', 'Bebidas Frías', 40.00, false),
('Panini 3 Quesos', 'Panadería', 75.00, true),
('Bolillo', 'Panadería', 5.00, true),
('Concha', 'Panadería', 15.00, true),
('Cuernito', 'Panadería', 18.00, true);

INSERT INTO insumos (nombre, unidad, stock_actual, stock_minimo) VALUES
('Granos de Café', 'kg', 5.0, 1.0),
('Leche Entera', 'L', 10.0, 3.0),
('Pan Bolillo', 'pz', 20.0, 5.0),
('Pan Concha', 'pz', 15.0, 5.0),
('Pan Cuernito', 'pz', 15.0, 5.0),
('Té Negro', 'kg', 1.0, 0.2),
('Panini Base', 'pz', 10.0, 2.0);

INSERT INTO recetas (producto_id, insumo_id, cantidad_requerida) VALUES
(1, 1, 0.015), 
(2, 1, 0.015), 
(3, 1, 0.015), 
(3, 2, 0.150), 
(4, 1, 0.015), 
(4, 2, 0.200), 
(5, 1, 0.015), 
(5, 2, 0.150), 
(6, 6, 0.010), 
(7, 7, 1.0),   
(8, 3, 1.0),   
(9, 4, 1.0),   
(10, 5, 1.0);
