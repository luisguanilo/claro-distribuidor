CREATE TABLE IF NOT EXISTS Usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin', 'asesor')),
    estado TEXT DEFAULT 'activo'
);

CREATE TABLE IF NOT EXISTS Proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    contacto TEXT,
    telefono TEXT,
    tipo TEXT
);

CREATE TABLE IF NOT EXISTS Categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES Categorias(id)
);

CREATE TABLE IF NOT EXISTS Productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('Físico', 'SIM', 'Licencia')),
    grupo_reporte TEXT NOT NULL CHECK(grupo_reporte IN ('Celulares', 'Accesorio', 'Chip', 'OLO', 'TFI', 'Otros')),
    costo REAL NOT NULL,
    precio_venta REAL NOT NULL,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 5,
    FOREIGN KEY (categoria_id) REFERENCES Categorias(id)
);

CREATE TABLE IF NOT EXISTS Movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    producto_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('Entrada', 'Salida', 'Ajuste')),
    cantidad INTEGER NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER NOT NULL,
    ip TEXT,
    latitud REAL,
    longitud REAL,
    dispositivo TEXT,
    FOREIGN KEY (producto_id) REFERENCES Productos(id),
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id)
);

CREATE TABLE IF NOT EXISTS Servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_nombre TEXT NOT NULL,
    identificacion TEXT NOT NULL,
    tipo_servicio TEXT NOT NULL CHECK(tipo_servicio IN ('alta nueva post', 'portabilidad post', 'alta nueva prepago', 'portabilidad prepago', 'internet', 'internet mas TV', 'OLO', 'TFI', 'Renovación')),
    estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK(estado IN ('Pendiente', 'Procesado', 'Rechazado')),
    asesor_id INTEGER NOT NULL,
    comision REAL DEFAULT 0,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asesor_id) REFERENCES Usuarios(id)
);

CREATE TABLE IF NOT EXISTS Logs_Auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    accion TEXT NOT NULL,
    descripcion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES Usuarios(id)
);

-- Trigger para actualizar stock después de un movimiento
CREATE TRIGGER IF NOT EXISTS after_movimiento_insert
AFTER INSERT ON Movimientos
BEGIN
    UPDATE Productos
    SET stock_actual = 
        CASE 
            WHEN NEW.tipo = 'Entrada' THEN stock_actual + NEW.cantidad
            WHEN NEW.tipo = 'Salida' THEN stock_actual - NEW.cantidad
            WHEN NEW.tipo = 'Ajuste' THEN NEW.cantidad
            ELSE stock_actual
        END
    WHERE id = NEW.producto_id;
END;
