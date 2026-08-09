const bcrypt = require('bcryptjs');
const { dbRun, dbAll, db } = require('./database');

async function resetDb() {
    console.log('Reiniciando y poblando base de datos...');
    
    // Usuarios
    const hashAdmin = await bcrypt.hash('admin123', 10);
    const hashAsesor = await bcrypt.hash('asesor123', 10);

    try {
        await dbRun('INSERT INTO Usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)', 
            ['Admin Principal', 'admin@claro.com', hashAdmin, 'admin']);
        await dbRun('INSERT INTO Usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)', 
            ['Juan Asesor', 'juan@claro.com', hashAsesor, 'asesor']);
        console.log('Usuarios creados (admin@claro.com / juan@claro.com)');
        
        // Categorías
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Móvil', NULL)`); // id 1
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Equipos', 1)`); // id 2
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Apple', 2)`); // id 3
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Samsung', 2)`); // id 4
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Líneas y Chips', 1)`); // id 5
        
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Hogar', NULL)`); // id 6
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Internet', 6)`); // id 7
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Televisión', 6)`); // id 8
        await dbRun(`INSERT INTO Categorias (nombre, parent_id) VALUES ('Inalámbrico', 6)`); // id 9

        console.log('Categorías de prueba creadas.');

        // Productos
        // Apple (id 3)
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('IPH14-128-BLK', 'iPhone 14 128GB Black', 3, 'Físico', 'Celulares', 600, 799, 10, 5)`);
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('IPH15-256-BLU', 'iPhone 15 256GB Blue', 3, 'Físico', 'Celulares', 800, 999, 8, 3)`);
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('IPH15-PRO-TIT', 'iPhone 15 Pro Titanium', 3, 'Físico', 'Celulares', 1000, 1199, 5, 2)`);
        
        // Samsung (id 4)
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('S23-256-GRY', 'Samsung Galaxy S23 256GB', 4, 'Físico', 'Celulares', 550, 750, 3, 5)`);
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('S24-ULTRA-BLK', 'Samsung Galaxy S24 Ultra', 4, 'Físico', 'Celulares', 1100, 1299, 4, 2)`);
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('A54-128-WHT', 'Samsung Galaxy A54 128GB', 4, 'Físico', 'Celulares', 250, 350, 15, 5)`);
        
        // Líneas y Chips (id 5)
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('SIM-PRE-001', 'Chip Prepago 5G', 5, 'SIM', 'Chip', 1, 5, 100, 20)`);
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('SIM-POS-002', 'Chip Postpago Ilimitado', 5, 'SIM', 'Chip', 1, 0, 50, 10)`);
        
        // Internet Hogar (id 7)
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('ROU-FIB-01', 'Router Fibra Óptica WiFi 6', 7, 'Físico', 'Accesorio', 40, 0, 25, 5)`);
        
        // Televisión (id 8)
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('DEC-TV-001', 'Decodificador TV HD', 8, 'Físico', 'Accesorio', 30, 0, 20, 5)`);
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('CTL-REM-01', 'Control Remoto Universal', 8, 'Físico', 'Accesorio', 5, 15, 40, 10)`);
        
        // OLO / TFI (id 9)
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('OLO-MOD-01', 'Modem Inalámbrico OLO', 9, 'Físico', 'OLO', 45, 60, 20, 5)`);
        await dbRun(`INSERT INTO Productos (sku, nombre, categoria_id, tipo, grupo_reporte, costo, precio_venta, stock_actual, stock_minimo) VALUES ('TFI-RTR-02', 'Router TFI 4G', 9, 'Físico', 'TFI', 50, 70, 15, 5)`);
        
        console.log('Productos de prueba creados.');

        console.log('Base de datos poblada exitosamente.');
    } catch(err) {
        console.error('Error al poblar BD (puede que ya existan registros):', err.message);
    }
    
    db.close();
}

setTimeout(resetDb, 500); // Esperar que el schema cargue
