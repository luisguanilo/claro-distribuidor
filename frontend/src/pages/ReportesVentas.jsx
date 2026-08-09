import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const ReportesVentas = () => {
    const { token, user } = useContext(AuthContext);
    const [reportes, setReportes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedAsesor, setSelectedAsesor] = useState('ALL');

    // Tipos solicitados por el usuario
    const tiposRequeridos = [
        'Celulares', 'Accesorio', 'alta nueva post', 'portabilidad post', 
        'alta nueva prepago', 'portabilidad prepago', 'internet', 
        'internet mas TV', 'OLO', 'TFI', 'Chip'
    ];

    useEffect(() => {
        fetchReportes();
    }, []);

    const fetchReportes = async () => {
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/reportes/ventas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setReportes(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{padding: '20px'}}>Cargando reportes...</div>;

    // Obtener lista única de asesores (solo para admin)
    const asesoresUnicos = user?.rol === 'admin' ? [...new Set(reportes.map(r => r.asesor_nombre))] : [];

    // 1. Filtrar los reportes crudos por fecha y asesor
    const reportesFiltradosGeneral = reportes.filter(r => {
        if (user?.rol === 'admin' && selectedAsesor !== 'ALL' && r.asesor_nombre !== selectedAsesor) return false;
        
        // La fecha en BD viene como YYYY-MM-DD HH:MM:SS
        const fechaCorta = r.fecha.substring(0, 10);
        if (startDate && fechaCorta < startDate) return false;
        if (endDate && fechaCorta > endDate) return false;
        
        return true;
    });

    // 2. Calcular resumen basándonos en los datos ya filtrados
    const calcularResumen = () => {
        const resumen = {};
        tiposRequeridos.forEach(tipo => {
            resumen[tipo.toLowerCase()] = { cantidad: 0, total: 0, originalKey: tipo };
        });

        let totalGeneralCantidad = 0;
        let totalGeneralVentas = 0;

        reportesFiltradosGeneral.forEach(row => {
            const cat = row.categoria ? row.categoria.toLowerCase() : '';
            if (resumen[cat]) {
                resumen[cat].cantidad += row.cantidad;
                resumen[cat].total += row.total || 0;
            }
            totalGeneralCantidad += row.cantidad;
            totalGeneralVentas += row.total || 0;
        });

        return { resumen, totalGeneralCantidad, totalGeneralVentas };
    };

    const { resumen, totalGeneralCantidad, totalGeneralVentas } = calcularResumen();

    // 3. Filtrar detalles para la tabla inferior basándonos en la categoría seleccionada (usando la lista ya filtrada por fecha/asesor)
    const detallesFiltrados = reportesFiltradosGeneral.filter(r => {
        if (!selectedCategory) return false;
        if (selectedCategory === 'ALL') return true;
        return (r.categoria || '').toLowerCase() === selectedCategory.toLowerCase();
    });

    return (
        <div style={{ padding: '20px' }}>
            <div className="d-flex justify-between align-center mb-2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <img src="/logo-claro.png" alt="Logo Claro" style={{ height: '80px', objectFit: 'contain' }} onError={(e) => e.target.style.display='none'} />
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem' }}>
                            {user?.rol === 'admin' ? 'Reportes de Venta Globales' : 'Mis Reportes de Venta'}
                        </h2>
                        <span className="text-secondary" style={{ fontSize: '1.1rem' }}>Distribuidor Autorizado: <strong>ALICENTER</strong></span>
                    </div>
                </div>
                <button className="btn-primary" onClick={fetchReportes}>Actualizar</button>
            </div>

            {/* Filtros Generales */}
            <div className="glass-panel mb-2" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Desde:</label>
                    <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Hasta:</label>
                    <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                {user?.rol === 'admin' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Filtrar por Asesor:</label>
                        <select className="input-field" value={selectedAsesor} onChange={e => setSelectedAsesor(e.target.value)}>
                            <option value="ALL">Todos los asesores</option>
                            {asesoresUnicos.map(asesor => (
                                <option key={asesor} value={asesor}>{asesor}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div style={{ marginLeft: 'auto' }}>
                    <button className="btn-primary" style={{ background: 'var(--text-secondary)' }} onClick={() => { setStartDate(''); setEndDate(''); setSelectedAsesor('ALL'); }}>Limpiar Filtros</button>
                </div>
            </div>

            <div className="glass-panel mb-2">
                <h3 className="mb-2">Resumen por Categoría</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                    {tiposRequeridos.map(tipo => {
                        const data = resumen[tipo.toLowerCase()];
                        const isSelected = selectedCategory === tipo;
                        
                        return (
                            <div 
                                key={tipo} 
                                className="card" 
                                style={{ 
                                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    backgroundColor: isSelected ? 'rgba(218, 41, 28, 0.05)' : 'white',
                                    cursor: 'pointer',
                                    transform: isSelected ? 'scale(1.02)' : 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                                onClick={() => setSelectedCategory(isSelected ? null : tipo)}
                            >
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'capitalize' }}>
                                    {tipo}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                    {data.cantidad} <span style={{fontSize: '0.8rem', color: 'var(--text-color)', fontWeight: 'normal'}}>unidades/servicios</span>
                                </div>
                                <div className="text-green mt-1">
                                    Valor: ${data.total.toFixed(2)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="glass-panel mb-2">
                <h3 className="mb-2">Totales Consolidados</h3>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div 
                        className="card" 
                        style={{ 
                            flex: 1, textAlign: 'center', cursor: 'pointer', 
                            border: selectedCategory === 'ALL' ? '2px solid var(--primary-color)' : '1px solid transparent',
                            backgroundColor: selectedCategory === 'ALL' ? 'rgba(218, 41, 28, 0.05)' : 'white',
                        }}
                        onClick={() => setSelectedCategory(selectedCategory === 'ALL' ? null : 'ALL')}
                    >
                        <div className="card-title">Volumen Total</div>
                        <div className="card-value">{totalGeneralCantidad}</div>
                        <div className="text-secondary mt-1" style={{fontSize:'0.8rem'}}>Click para ver todo el detalle</div>
                    </div>
                    <div 
                        className="card" 
                        style={{ 
                            flex: 1, textAlign: 'center', cursor: 'pointer', 
                            border: selectedCategory === 'ALL' ? '2px solid var(--primary-color)' : '1px solid transparent',
                            backgroundColor: selectedCategory === 'ALL' ? 'rgba(218, 41, 28, 0.05)' : 'white',
                        }}
                        onClick={() => setSelectedCategory(selectedCategory === 'ALL' ? null : 'ALL')}
                    >
                        <div className="card-title">Ingresos/Comisiones Totales</div>
                        <div className="card-value text-green">${totalGeneralVentas.toFixed(2)}</div>
                        <div className="text-secondary mt-1" style={{fontSize:'0.8rem'}}>Click para ver todo el detalle</div>
                    </div>
                </div>
            </div>

            {selectedCategory && (
                <div className="glass-panel">
                    <h3 className="mb-2">Detalle de: {selectedCategory === 'ALL' ? 'Todas las transacciones' : selectedCategory}</h3>
                    {detallesFiltrados.length === 0 ? (
                        <p>No hay transacciones registradas para esta selección.</p>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha (Local)</th>
                                        <th>Categoría</th>
                                        <th>Detalle / Producto / Cliente</th>
                                        <th>Asesor</th>
                                        <th>Cant.</th>
                                        <th>Valor Generado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detallesFiltrados.map((r, i) => (
                                        <tr key={i}>
                                            <td>{new Date(r.fecha + 'Z').toLocaleString()}</td>
                                            <td style={{textTransform: 'capitalize'}}>{r.categoria}</td>
                                            <td>{r.detalle}</td>
                                            <td>{r.asesor_nombre}</td>
                                            <td>{r.cantidad}</td>
                                            <td className="text-green">${r.total?.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportesVentas;
