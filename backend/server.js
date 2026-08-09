const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun, dbAll, restartDb } = require('./database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'secreto_super_seguro_claro_2026';

// Middleware Auth
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Requiere permisos de administrador' });
    }
    next();
};

// --- AUTH ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await dbGet('SELECT * FROM Usuarios WHERE email = ?', [email]);
        if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });

        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(400).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// --- USUARIOS (CRUD ADMIN) ---
app.get('/api/usuarios', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const usuarios = await dbAll("SELECT id, nombre, email, rol, estado FROM Usuarios WHERE rol = 'asesor'");
        res.json(usuarios);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/usuarios', authenticateToken, requireAdmin, async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await dbRun('INSERT INTO Usuarios (nombre, email, password_hash, rol, estado) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, hash, 'asesor', 'activo']);
        res.json({ success: true, message: 'Usuario creado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            await dbRun('UPDATE Usuarios SET nombre = ?, email = ?, password_hash = ? WHERE id = ?', [nombre, email, hash, req.params.id]);
        } else {
            await dbRun('UPDATE Usuarios SET nombre = ?, email = ? WHERE id = ?', [nombre, email, req.params.id]);
        }
        res.json({ success: true, message: 'Usuario actualizado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // En lugar de borrar físicamente y romper claves foráneas de Movimientos y Servicios, cambiamos estado o se asume borrado lógico, 
        // pero por simplicidad haremos borrado físico si no hay dependencias, o borrado lógico si las hay.
        // Haremos borrado lógico:
        await dbRun("UPDATE Usuarios SET estado = 'inactivo' WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: 'Usuario desactivado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CATEGORIAS ---
app.get('/api/categorias', authenticateToken, async (req, res) => {
    try {
        const parentId = req.query.parent_id;
        let query = 'SELECT * FROM Categorias';
        let params = [];
        
        if (parentId !== undefined) {
            if (parentId === 'null') {
                query += ' WHERE parent_id IS NULL';
            } else {
                query += ' WHERE parent_id = ?';
                params.push(parentId);
            }
        }
        
        const categorias = await dbAll(query, params);
        res.json(categorias);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRODUCTOS ---
app.get('/api/productos', authenticateToken, async (req, res) => {
    try {
        const querySearch = req.query.q || '';
        const categoriaId = req.query.categoria_id;
        
        let query = 'SELECT p.*, c.nombre as categoria_nombre FROM Productos p LEFT JOIN Categorias c ON p.categoria_id = c.id WHERE (p.nombre LIKE ? OR p.sku LIKE ?)';
        let params = [`%${querySearch}%`, `%${querySearch}%`];

        if (categoriaId) {
            query += ' AND p.categoria_id = ?';
            params.push(categoriaId);
        }

        const productos = await dbAll(query, params);
        res.json(productos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MOVIMIENTOS ---
app.post('/api/movimientos', authenticateToken, async (req, res) => {
    const { producto_id, tipo, cantidad, ip, latitud, longitud, dispositivo } = req.body;
    try {
        // Registrar movimiento
        await dbRun(
            `INSERT INTO Movimientos (producto_id, tipo, cantidad, usuario_id, ip, latitud, longitud, dispositivo) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [producto_id, tipo, cantidad, req.user.id, ip, latitud, longitud, dispositivo]
        );

        // Emitir evento socket para actualizar stock a todos los clientes (El trigger de SQLite ya actualizó la BD)
        const productos = await dbAll('SELECT * FROM Productos');
        io.emit('stock_update', productos);

        // Guardar log
        await dbRun('INSERT INTO Logs_Auditoria (usuario_id, accion, descripcion) VALUES (?, ?, ?)',
            [req.user.id, 'NUEVO_MOVIMIENTO', `Movimiento tipo ${tipo} para producto ${producto_id} cant: ${cantidad}`]
        );

        res.json({ success: true, message: 'Movimiento registrado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/movimientos', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const movimientos = await dbAll(`
            SELECT m.*, p.nombre as producto_nombre, u.nombre as usuario_nombre
            FROM Movimientos m
            JOIN Productos p ON m.producto_id = p.id
            JOIN Usuarios u ON m.usuario_id = u.id
            ORDER BY m.fecha DESC
            LIMIT 100
        `);
        res.json(movimientos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SERVICIOS ---
app.post('/api/servicios', authenticateToken, async (req, res) => {
    const { cliente_nombre, identificacion, tipo_servicio } = req.body;
    try {
        // Lógica de cálculo de comisión simple
        let comision = 0;
        if (tipo_servicio.includes('post')) comision = 35.0;
        else if (tipo_servicio.includes('prepago')) comision = 15.0;
        else if (tipo_servicio.includes('internet')) comision = 20.0;
        else if (tipo_servicio === 'Renovación') comision = 10.0;
        else comision = 25.0; // OLO, TFI etc.

        await dbRun(
            `INSERT INTO Servicios (cliente_nombre, identificacion, tipo_servicio, estado, asesor_id, comision) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [cliente_nombre, identificacion, tipo_servicio, 'Pendiente', req.user.id, comision]
        );
        
        await dbRun('INSERT INTO Logs_Auditoria (usuario_id, accion, descripcion) VALUES (?, ?, ?)',
            [req.user.id, 'NUEVO_SERVICIO', `Servicio ${tipo_servicio} registrado para ${identificacion}`]
        );

        res.json({ success: true, message: 'Servicio registrado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/mis-comisiones', authenticateToken, async (req, res) => {
    try {
        const mesActual = new Date().toISOString().substring(0, 7); // YYYY-MM
        const result = await dbGet(`
            SELECT SUM(comision) as total_comision 
            FROM Servicios 
            WHERE asesor_id = ? AND strftime('%Y-%m', fecha) = ?
        `, [req.user.id, mesActual]);
        
        const servicios = await dbAll(`
            SELECT * FROM Servicios 
            WHERE asesor_id = ? AND strftime('%Y-%m', fecha) = ?
            ORDER BY fecha DESC
        `, [req.user.id, mesActual]);

        res.json({ total_mes: result.total_comision || 0, servicios });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REPORTES ---
app.get('/api/reportes/ventas', authenticateToken, async (req, res) => {
    try {
        let movimientosQuery = `
            SELECT m.id, p.grupo_reporte as categoria, m.fecha, p.nombre as detalle, m.cantidad, (m.cantidad * p.precio_venta) as total, u.nombre as asesor_nombre
            FROM Movimientos m
            JOIN Productos p ON m.producto_id = p.id
            JOIN Usuarios u ON m.usuario_id = u.id
            WHERE m.tipo = 'Salida'
        `;
        let serviciosQuery = `
            SELECT s.id, s.tipo_servicio as categoria, s.fecha, ('DNI/RUC: ' || s.identificacion || ' - Cliente: ' || s.cliente_nombre) as detalle, 1 as cantidad, s.comision as total, u.nombre as asesor_nombre
            FROM Servicios s
            JOIN Usuarios u ON s.asesor_id = u.id
            WHERE 1=1
        `;
        
        let paramsMov = [];
        let paramsServ = [];

        if (req.user.rol === 'asesor') {
            movimientosQuery += ` AND m.usuario_id = ?`;
            serviciosQuery += ` AND s.asesor_id = ?`;
            paramsMov.push(req.user.id);
            paramsServ.push(req.user.id);
        }

        const movs = await dbAll(movimientosQuery, paramsMov);
        const servs = await dbAll(serviciosQuery, paramsServ);

        // Add a type identifier and combine
        const combined = [
            ...movs.map(m => ({ ...m, origen: 'Producto' })),
            ...servs.map(s => ({ ...s, origen: 'Servicio' }))
        ];

        // Sort descending by date
        combined.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        res.json(combined);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BACKUP & RESTORE ---
const dbPath = path.resolve(__dirname, 'database.sqlite');
const upload = multer({ dest: 'uploads/' });

app.get('/api/backup', authenticateToken, requireAdmin, (req, res) => {
    res.download(dbPath, `backup_distribuidor_${new Date().toISOString().substring(0,10)}.sqlite`);
});

app.post('/api/restore', authenticateToken, requireAdmin, upload.single('database'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
    try {
        // Reemplazar la base de datos
        fs.copyFileSync(req.file.path, dbPath);
        fs.unlinkSync(req.file.path); // Borrar el temporal
        
        // Avisar que se requerirá reconexión en el cliente o hacer refresh
        res.json({ success: true, message: 'Base de datos restaurada. El servidor usa ahora los nuevos datos.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DASHBOARD ADMIN ---
app.get('/api/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const valorInventario = await dbGet('SELECT SUM(stock_actual * costo) as valor FROM Productos');
        const hoy = new Date().toISOString().substring(0, 10);
        const ventasHoy = await dbGet(`
            SELECT COUNT(*) as cantidad 
            FROM Movimientos 
            WHERE tipo = 'Salida' AND date(fecha) = ?
        `, [hoy]);
        const serviciosPendientes = await dbGet(`
            SELECT COUNT(*) as cantidad 
            FROM Servicios 
            WHERE estado = 'Pendiente'
        `);
        const alertasStock = await dbAll(`
            SELECT * FROM Productos WHERE stock_actual < stock_minimo
        `);

        res.json({
            valor_inventario: valorInventario.valor || 0,
            ventas_hoy: ventasHoy.cantidad || 0,
            servicios_pendientes: serviciosPendientes.cantidad || 0,
            alertas_stock: alertasStock
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Socket.io config
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
