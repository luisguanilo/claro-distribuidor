import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import localforage from 'localforage';
import TopBar from '../components/TopBar';

const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '');

const AsesorDashboard = () => {
    const { token } = useContext(AuthContext);
    
    // Core states
    const [comisiones, setComisiones] = useState({ total_mes: 0, servicios: [] });
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [loading, setLoading] = useState(false);

    // Drill-down states
    const [categorias, setCategorias] = useState([]);
    const [categoryPath, setCategoryPath] = useState([]);
    const [productos, setProductos] = useState([]);
    const [showingProducts, setShowingProducts] = useState(false);

    // Form states
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    
    // Service Form states
    const [clienteNombre, setClienteNombre] = useState('');
    const [identificacion, setIdentificacion] = useState('');
    const [tipoServicio, setTipoServicio] = useState('alta nueva post');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);

    useEffect(() => {
        initCategorias();
        fetchComisiones();

        socket.on('stock_update', (nuevosProductos) => {
            // If we are currently viewing products, we should probably update them, 
            // but since we filter by category, it's safer to re-fetch if needed.
            // For simplicity, we just update if we have a match.
            setProductos(prev => prev.map(p => {
                const updated = nuevosProductos.find(np => np.id === p.id);
                return updated ? updated : p;
            }));
        });

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', () => setIsOffline(true));

        return () => {
            socket.off('stock_update');
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', () => setIsOffline(true));
        };
    }, []);

    const fetchCategorias = async (parentId) => {
        try {
            const res = await fetch(`/api/categorias?parent_id=${parentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const fetchProductosPorCategoria = async (categoriaId) => {
        try {
            const res = await fetch(`/api/productos?categoria_id=${categoriaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await res.json();
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const searchProductos = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }
        try {
            const res = await fetch(`/api/productos?q=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSearchResults(data);
        } catch (e) { console.error(e); }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
    };

    const fetchComisiones = async () => {
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/mis-comisiones', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setComisiones(data);
        } catch (e) { console.error(e); }
    };

    const handleOnline = async () => {
        setIsOffline(false);
        const queueVentas = await localforage.getItem('queueVentas') || [];
        const queueServicios = await localforage.getItem('queueServicios') || [];

        if (queueVentas.length > 0 || queueServicios.length > 0) {
            alert('Sincronizando operaciones pendientes...');
            for (let venta of queueVentas) {
                await sendVenta(venta, true);
            }
            for (let servicio of queueServicios) {
                await sendServicio(servicio, true);
            }
            await localforage.setItem('queueVentas', []);
            await localforage.setItem('queueServicios', []);
            fetchComisiones();
            // Re-fetch current view if needed
            if (showingProducts && categoryPath.length > 0) {
                const prods = await fetchProductosPorCategoria(categoryPath[categoryPath.length - 1].id);
                setProductos(prods);
            }
        }
    };

    const requestGeolocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada'));
            } else {
                navigator.geolocation.getCurrentPosition(
                    pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    err => reject(err)
                );
            }
        });
    };

    // Drill-down Logic
    const initCategorias = async () => {
        const rootCats = await fetchCategorias('null');
        setCategorias(rootCats);
        setCategoryPath([]);
        setShowingProducts(false);
        setProductoSeleccionado(null);
    };

    const handleCategoryClick = async (categoria) => {
        const subCats = await fetchCategorias(categoria.id);
        const newPath = [...categoryPath, categoria];
        setCategoryPath(newPath);

        if (subCats.length > 0) {
            setCategorias(subCats);
            setShowingProducts(false);
        } else {
            // Leaf category reached, fetch products
            const prods = await fetchProductosPorCategoria(categoria.id);
            setProductos(prods);
            setShowingProducts(true);
        }
    };

    const handleBreadcrumbNavigate = async (index) => {
        if (index === -1) {
            await initCategorias();
            return;
        }

        // Navigate to a specific level
        const newPath = categoryPath.slice(0, index + 1);
        const targetCategory = newPath[newPath.length - 1];
        setCategoryPath(newPath);
        
        const subCats = await fetchCategorias(targetCategory.id);
        if (subCats.length > 0) {
            setCategorias(subCats);
            setShowingProducts(false);
            setProductoSeleccionado(null);
        }
    };

    // Venta Logic
    const handleVenta = async (e) => {
        e.preventDefault();
        if (!productoSeleccionado) {
            alert('Por favor, seleccione un producto.');
            return;
        }

        setLoading(true);
        try {
            const coords = await requestGeolocation();
            const payload = {
                producto_id: productoSeleccionado.id,
                tipo: 'Salida',
                cantidad,
                ip: '127.0.0.1',
                latitud: coords.lat,
                longitud: coords.lng,
                dispositivo: navigator.userAgent
            };
            
            if (isOffline) {
                const queue = await localforage.getItem('queueVentas') || [];
                queue.push(payload);
                await localforage.setItem('queueVentas', queue);
                alert('Sin conexión. Venta guardada localmente.');
            } else {
                await sendVenta(payload);
                alert('Venta registrada exitosamente.');
                
                // Refresh products stock
                const prods = await fetchProductosPorCategoria(categoryPath[categoryPath.length - 1].id);
                setProductos(prods);
                setProductoSeleccionado(null);
                setCantidad(1);
            }
        } catch (err) {
            alert('Error: Debe permitir la geolocalización para registrar la venta.');
        } finally {
            setLoading(false);
        }
    };

    const sendVenta = async (payload, isSync = false) => {
        await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
    };

    // Servicio Logic
    const handleServicio = async (e) => {
        e.preventDefault();
        setLoading(true);
        const payload = { cliente_nombre: clienteNombre, identificacion, tipo_servicio: tipoServicio };

        if (isOffline) {
            const queue = await localforage.getItem('queueServicios') || [];
            queue.push(payload);
            await localforage.setItem('queueServicios', queue);
            alert('Sin conexión. Servicio guardado localmente.');
        } else {
            await sendServicio(payload);
            alert('Servicio registrado exitosamente.');
            fetchComisiones();
            setClienteNombre('');
            setIdentificacion('');
        }
        setLoading(false);
    };

    const sendServicio = async (payload, isSync = false) => {
        await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/servicios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <TopBar breadcrumbs={categoryPath} onNavigate={handleBreadcrumbNavigate} />
            
            <div style={{ padding: '20px' }}>
                <div className="d-flex justify-between align-center mb-2">
                    <h2>Panel de Asesor</h2>
                    {isOffline && <div style={{background: 'var(--warning)', color: 'black', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold'}}>Modo Offline</div>}
                </div>

                <div className="grid-cards mb-2">
                    <div className="card">
                        <div className="card-title">Comisiones del Mes</div>
                        <div className="card-value text-green">${comisiones.total_mes}</div>
                    </div>
                </div>

                {/* Consulta rápida de Stock */}
                <div className="glass-panel mb-2">
                    <h3 className="mb-2">Consulta Rápida de Stock</h3>
                    <form onSubmit={searchProductos} style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            className="input-field" 
                            style={{ flex: 1 }} 
                            placeholder="Buscar por Nombre o SKU..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                        />
                        <button type="submit" className="btn-primary">Consultar</button>
                        {searchResults && (
                            <button type="button" className="btn-primary" style={{background: 'var(--text-secondary)'}} onClick={clearSearch}>Limpiar</button>
                        )}
                    </form>

                    {searchResults && (
                        <div className="mt-2">
                            <h4>Resultados de la búsqueda:</h4>
                            {searchResults.length === 0 ? (
                                <p>No se encontraron productos.</p>
                            ) : (
                                <div className="table-container mt-1">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>SKU</th>
                                                <th>Producto</th>
                                                <th>Precio</th>
                                                <th>Stock</th>
                                                <th>Categoría</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.map(p => (
                                                <tr key={p.id}>
                                                    <td>{p.sku}</td>
                                                    <td>{p.nombre}</td>
                                                    <td>${p.precio_venta}</td>
                                                    <td className={p.stock_actual > 0 ? 'text-green' : 'text-red'}>{p.stock_actual}</td>
                                                    <td>{p.categoria_nombre || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Drill-down UI */}
                <div className="glass-panel mb-2">
                    <h3 className="mb-2">
                        {showingProducts ? 'Seleccione un Producto' : 'Seleccione una Categoría'}
                    </h3>
                    
                    {!showingProducts ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                            {categorias.length === 0 ? (
                                <p>Cargando categorías...</p>
                            ) : (
                                categorias.map(cat => (
                                    <div 
                                        key={cat.id} 
                                        className="card" 
                                        style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', border: '1px solid var(--border-color)' }}
                                        onClick={() => handleCategoryClick(cat)}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📁</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{cat.nombre}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                                {productos.filter(p => p.stock_actual > 0).length === 0 ? (
                                    <p>No hay productos con stock en esta categoría.</p>
                                ) : (
                                    productos.filter(p => p.stock_actual > 0).map(p => (
                                        <div 
                                            key={p.id} 
                                            className={`card ${productoSeleccionado?.id === p.id ? 'active' : ''}`}
                                            style={{ 
                                                cursor: 'pointer', 
                                                border: productoSeleccionado?.id === p.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                                background: productoSeleccionado?.id === p.id ? 'rgba(238, 20, 20, 0.05)' : 'var(--card-bg)'
                                            }}
                                            onClick={() => setProductoSeleccionado(p)}
                                        >
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>{p.nombre}</div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '5px' }}>SKU: {p.sku}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>${p.precio_venta}</span>
                                                <span className="text-green" style={{ fontSize: '0.9rem' }}>Stock: {p.stock_actual}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Formulario de Venta (Visible solo si se seleccionan productos) */}
                            {productoSeleccionado && (
                                <div style={{ flex: 1, position: 'sticky', top: '100px' }} className="glass-panel">
                                    <h4 className="mb-2">Registrar Venta</h4>
                                    <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                        <strong>{productoSeleccionado.nombre}</strong><br/>
                                        Precio: ${productoSeleccionado.precio_venta}
                                    </div>
                                    <form onSubmit={handleVenta}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>Cantidad:</label>
                                        <input type="number" min="1" max={productoSeleccionado.stock_actual} className="input-field mb-2" value={cantidad} onChange={e => setCantidad(Number(e.target.value))} required />
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '1.1rem' }}>
                                            <span>Total:</span>
                                            <strong>${(productoSeleccionado.precio_venta * cantidad).toFixed(2)}</strong>
                                        </div>

                                        <button type="submit" className="btn-primary" disabled={loading} style={{width: '100%'}}>
                                            {loading ? 'Procesando...' : 'Confirmar Venta (GPS Req.)'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="glass-panel">
                    <h3 className="mb-2">Registro de Servicio (Fijo/Hogar/Portabilidad)</h3>
                    <form onSubmit={handleServicio} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="text" className="input-field" style={{ flex: 1, minWidth: '200px' }} placeholder="Nombre del Cliente" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} required />
                        <input type="text" className="input-field" style={{ flex: 1, minWidth: '200px' }} placeholder="Identificación (DNI/RUC)" value={identificacion} onChange={e => setIdentificacion(e.target.value)} required />
                        <select className="input-field" style={{ flex: 1, minWidth: '200px' }} value={tipoServicio} onChange={e => setTipoServicio(e.target.value)} required>
                            <option value="alta nueva post">Alta Nueva Postpago</option>
                            <option value="portabilidad post">Portabilidad Postpago</option>
                            <option value="alta nueva prepago">Alta Nueva Prepago</option>
                            <option value="portabilidad prepago">Portabilidad Prepago</option>
                            <option value="internet">Internet</option>
                            <option value="internet mas TV">Internet + TV</option>
                            <option value="OLO">Contrato OLO</option>
                            <option value="TFI">Contrato TFI</option>
                            <option value="Renovación">Renovación</option>
                        </select>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ minWidth: '150px' }}>
                            Registrar
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default AsesorDashboard;
