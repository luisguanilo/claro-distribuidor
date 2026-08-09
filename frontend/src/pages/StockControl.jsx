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
    const [precioVentaInput, setPrecioVentaInput] = useState('');

    // Archivos
    const [fileTransform, setFileTransform] = useState(null);
    const [fileImport, setFileImport] = useState(null);

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
        setLoading(true);
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + `/api/productos?q=${query}`, {
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

    const handleActualizarPrecio = async (e) => {
        e.preventDefault();
        if (!selectedProduct || !precioVentaInput || precioVentaInput < 0) return;
        setLoading(true);
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + `/api/productos/${selectedProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ precio_venta: Number(precioVentaInput) })
            });

            if (res.ok) {
                alert('Precio actualizado exitosamente.');
                setPrecioVentaInput('');
                setSelectedProduct(null);
                handleSearch(null, searchQuery);
            } else {
                alert('Error al actualizar precio.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleTransform = async (e) => {
        e.preventDefault();
        if(!fileTransform) return alert("Por favor seleccione un archivo original de Claro");
        setLoading(true);
        const formData = new FormData();
        formData.append('file', fileTransform);
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/productos/transformar-claro', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'plantilla_limpia_claro.xlsx';
                a.click();
            } else {
                const errData = await res.json();
                alert("Error al procesar el archivo: " + (errData.error || "Desconocido"));
            }
        } catch(err) { console.error(err) } finally { setLoading(false); }
    };

    const handleImport = async (e) => {
        e.preventDefault();
        if(!fileImport) return alert("Por favor seleccione la plantilla ya rellenada");
        setLoading(true);
        const formData = new FormData();
        formData.append('file', fileImport);
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/productos/importar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Importación exitosa.\nProductos nuevos creados: ${data.creados}\nProductos actualizados: ${data.actualizados}`);
                if (searchQuery) handleSearch(null, searchQuery);
            } else {
                alert("Error en la importación. Revisa la consola.");
            }
        } catch(err) { console.error(err) } finally { setLoading(false); }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Control de Stock y Carga de Mercadería</h2>
            
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div className="glass-panel mt-2 mb-2" style={{ flex: 1, minWidth: '300px' }}>
                    <h3>Paso 1: Generar Plantilla</h3>
                    <p className="text-secondary mb-2" style={{fontSize: '0.85rem'}}>Sube el archivo Excel que envía Claro para extraer los modelos y generar una plantilla limpia.</p>
                    <form onSubmit={handleTransform} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input type="file" className="input-field" accept=".xlsx" onChange={(e) => setFileTransform(e.target.files[0])} />
                        <button type="submit" className="btn-primary" disabled={loading || !fileTransform}>Extraer y Descargar Plantilla</button>
                    </form>
                </div>

                <div className="glass-panel mt-2 mb-2" style={{ flex: 1, minWidth: '300px' }}>
                    <h3>Paso 2: Subir Inventario</h3>
                    <p className="text-secondary mb-2" style={{fontSize: '0.85rem'}}>Sube la plantilla que descargaste en el paso 1 ya con las cantidades y precios rellenados.</p>
                    <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input type="file" className="input-field" accept=".xlsx" onChange={(e) => setFileImport(e.target.files[0])} />
                        <button type="submit" className="btn-primary" disabled={loading || !fileImport}>Importar a la Base de Datos</button>
                    </form>
                </div>
            </div>

            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />

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
                                                    onClick={() => {
                                                        setSelectedProduct(p);
                                                        setPrecioVentaInput(p.precio_venta || '');
                                                        setCantidadIngreso('');
                                                    }}
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
                        <h3 className="mb-2">Gestionar Producto</h3>
                        <div className="mb-2">
                            <strong>{selectedProduct.nombre}</strong><br/>
                            <span className="text-secondary">SKU: {selectedProduct.sku}</span><br/>
                            <span className="text-secondary">Stock Actual: {selectedProduct.stock_actual}</span><br/>
                            <span className="text-secondary">Precio Actual: S/.{selectedProduct.precio_venta}</span>
                        </div>
                        
                        <form onSubmit={handleIngreso} style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Agregar Stock (Ingreso):</label>
                            <input 
                                type="number" 
                                min="1" 
                                className="input-field mb-2" 
                                value={cantidadIngreso} 
                                onChange={e => setCantidadIngreso(e.target.value)} 
                                placeholder="Cant. a sumar"
                            />
                            <button type="submit" className="btn-primary" disabled={loading || !cantidadIngreso} style={{width: '100%'}}>
                                Confirmar Ingreso
                            </button>
                        </form>

                        <form onSubmit={handleActualizarPrecio}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Actualizar Precio de Venta (S/.):</label>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0" 
                                className="input-field mb-2" 
                                value={precioVentaInput} 
                                onChange={e => setPrecioVentaInput(e.target.value)} 
                                required 
                            />
                            <button type="submit" className="btn-primary" disabled={loading} style={{width: '100%', background: 'var(--success-color)'}}>
                                Guardar Precio
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockControl;

