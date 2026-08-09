import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';

const socket = io((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '');

const AdminDashboard = () => {
    const { token } = useContext(AuthContext);
    const [dashboardData, setDashboardData] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    
    const fetchData = async () => {
        try {
            const resDash = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataDash = await resDash.json();
            setDashboardData(dataDash);

            const resMov = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/movimientos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataMov = await resMov.json();
            setMovimientos(dataMov);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchData();

        socket.on('stock_update', () => {
            fetchData(); // Refrescar en tiempo real
        });

        return () => {
            socket.off('stock_update');
        };
    }, []);

    if (!dashboardData) return <div>Cargando panel...</div>;

    return (
        <div>
            <h2>Panel Gerencial Global</h2>
            
            <div className="grid-cards mt-2 mb-2">
                <div className="card">
                    <div className="card-title">Valor del Inventario</div>
                    <div className="card-value">S/.{dashboardData.valor_inventario.toFixed(2)}</div>
                </div>
                <div className="card">
                    <div className="card-title">Ventas de Hoy</div>
                    <div className="card-value">{dashboardData.ventas_hoy}</div>
                </div>
                <div className="card">
                    <div className="card-title">Servicios Pendientes</div>
                    <div className="card-value text-yellow">{dashboardData.servicios_pendientes}</div>
                </div>
            </div>

            {dashboardData.alertas_stock && dashboardData.alertas_stock.length > 0 && (
                <div className="glass-panel mb-2" style={{border: '1px solid var(--primary-red)'}}>
                    <h3 className="text-red mb-2">¡Alertas de Stock!</h3>
                    <ul>
                        {dashboardData.alertas_stock.map(p => (
                            <li key={p.id} style={{marginBottom: '8px'}}>
                                El producto <strong>{p.nombre}</strong> (SKU: {p.sku}) tiene un stock crítico de <strong>{p.stock_actual}</strong> unidades.
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="glass-panel">
                <h3 className="mb-2">Línea de Tiempo Global de Movimientos</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha/Hora Local</th>
                                <th>Usuario (Asesor)</th>
                                <th>Producto</th>
                                <th>Tipo</th>
                                <th>Cant.</th>
                                <th>Ubicación (GPS)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimientos.map(m => (
                                <tr key={m.id}>
                                    <td>{new Date(m.fecha + 'Z').toLocaleString()}</td>
                                    <td>{m.usuario_nombre}</td>
                                    <td>{m.producto_nombre}</td>
                                    <td>
                                        <span className={m.tipo === 'Entrada' ? 'text-green' : m.tipo === 'Salida' ? 'text-red' : ''}>
                                            {m.tipo}
                                        </span>
                                    </td>
                                    <td>{m.cantidad}</td>
                                    <td>
                                        {m.latitud && m.longitud ? (
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${m.latitud},${m.longitud}`} target="_blank" rel="noreferrer" style={{color: 'var(--text-secondary)'}}>
                                                Ver en Mapa
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
