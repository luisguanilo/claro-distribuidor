import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';

const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '');

const StockControl = () => {
    const { token } = useContext(AuthContext);
    const [productos, setProductos] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Ingreso state
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cantidadIngreso, setCantidadIngreso] = useState('');

    useEffect(() => {
        socket.on('stock_update', () => {
            if (searchQuery) handleSearch(null, searchQuery);
        });
        return () => {
            socket.off('stock_update');
        };
    }, [searchQuery]);

    const handleSearch = async (e, query = searchQuery) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/productos?q=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setProductos(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleIngreso = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !cantidadIngreso || cantidadIngreso <= 0) return;

        if (!window.confirm(`¿Está seguro de ingresar ${cantidadIngreso} unidades de ${selectedProduct.nombre}?`)) return;

        setLoading(true);
        try {
            const payload = {
                producto_id: selectedProduct.id,
                tipo: 'Entrada',
                cantidad: Number(cantidadIngreso),
                ip: '127.0.0.1',
                dispositivo: navigator.userAgent
            };

            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/movimientos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Stock actualizado exitosamente.');
                setCantidadIngreso('');
                setSelectedProduct(null);
                handleSearch(null, searchQuery); // Refresh
            } else {
                alert('Error al actualizar stock.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Control de Stock / Ingreso de Mercadería</h2>
            
            <div className="glass-panel mt-2 mb-2">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="text" 
                        className="input-field" 
                        style={{ flex: 1 }} 
                        placeholder="Buscar producto por SKU o nombre..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="btn-primary" disabled={loading}>Buscar</button>
                </form>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ flex: 2 }}>
                    {productos.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>SKU</th>
                                        <th>Producto</th>
                                        <th>Categoría</th>
                                        <th>Stock Actual</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {productos.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.sku}</td>
                                            <td>{p.nombre}</td>
                                            <td>{p.grupo_reporte}</td>
                                            <td className={p.stock_actual < p.stock_minimo ? 'text-red' : 'text-green'}>
                                                {p.stock_actual}
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn-primary" 
                                                    style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                                                    onClick={() => setSelectedProduct(p)}
                                                >
                                                    Seleccionar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        searchQuery && !loading ? <p>No se encontraron productos.</p> : null
                    )}
                </div>

                {selectedProduct && (
                    <div className="glass-panel" style={{ flex: 1, position: 'sticky', top: '20px', border: '1px solid var(--primary-color)' }}>
                        <h3 className="mb-2">Ingresar Mercadería</h3>
                        <div className="mb-2">
                            <strong>{selectedProduct.nombre}</strong><br/>
                            <span className="text-secondary">SKU: {selectedProduct.sku}</span><br/>
                            <span className="text-secondary">Stock Actual: {selectedProduct.stock_actual}</span>
                        </div>
                        
                        <form onSubmit={handleIngreso}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Cantidad a ingresar:</label>
                            <input 
                                type="number" 
                                min="1" 
                                className="input-field mb-2" 
                                value={cantidadIngreso} 
                                onChange={e => setCantidadIngreso(e.target.value)} 
                                required 
                            />
                            <button type="submit" className="btn-primary" disabled={loading} style={{width: '100%'}}>
                                Confirmar Ingreso
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockControl;
