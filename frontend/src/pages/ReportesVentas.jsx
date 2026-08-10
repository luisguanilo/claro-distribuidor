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

    // Modals state
    const [editingMov, setEditingMov] = useState(null);
    const [editingServ, setEditingServ] = useState(null);

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

    const handleDelete = async (r) => {
        if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
        const endpoint = r.origen === 'Producto' ? `/api/movimientos/${r.id}` : `/api/servicios/${r.id}`;
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Registro eliminado');
                fetchReportes();
            } else {
                const data = await res.json();
                alert('Error al eliminar: ' + data.error);
            }
        } catch (err) { console.error(err); }
    };

    const handleUpdateMov = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + `/api/movimientos/${editingMov.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ cantidad: editingMov.cantidad, fecha: editingMov.fecha })
            });
            if (res.ok) {
                alert('Actualizado');
                setEditingMov(null);
                fetchReportes();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch(err) { console.error(err); }
    };

    const handleUpdateServ = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + `/api/servicios/${editingServ.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    cliente_nombre: editingServ.cliente_nombre || '',
                    identificacion: editingServ.identificacion || '',
                    tipo_servicio: editingServ.categoria,
                    fecha: editingServ.fecha,
                    modalidad: editingServ.categoria === 'Renovación' ? (editingServ.modalidad || 'Cuotas') : undefined,
                    plazo_meses: editingServ.categoria === 'Renovación' ? ((editingServ.modalidad || 'Cuotas') === 'Contado' ? 18 : Number(editingServ.plazo_meses || 12)) : undefined,
                    cuota_inicial: editingServ.categoria === 'Renovación' && (editingServ.modalidad || 'Cuotas') === 'Cuotas' ? Number(editingServ.cuota_inicial || 0) : undefined,
                    importe: editingServ.categoria === 'Renovación' && (editingServ.modalidad || 'Cuotas') === 'Contado' ? Number(editingServ.importe || 0) : undefined
                })
            });
            if (res.ok) {
                alert('Actualizado');
                setEditingServ(null);
                fetchReportes();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch(err) { console.error(err); }
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
                                    Valor: S/.{data.total.toFixed(2)}
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
                        <div className="card-value text-green">S/.{totalGeneralVentas.toFixed(2)}</div>
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
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detallesFiltrados.map((r, i) => (
                                        <tr key={i}>
                                            <td>{new Date(r.fecha).toLocaleString()}</td>
                                            <td style={{textTransform: 'capitalize'}}>{r.categoria}</td>
                                            <td>
                                                {r.detalle}
                                                {r.categoria === 'Renovación' && r.modalidad && (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                        <span style={{background: 'rgba(238, 20, 20, 0.1)', padding: '2px 6px', borderRadius: '4px'}}>
                                                            {r.modalidad} {r.plazo_meses ? `(${r.plazo_meses} meses)` : ''}
                                                            {r.modalidad === 'Cuotas' && r.cuota_inicial !== null ? ` | Inicial: S/.${r.cuota_inicial}` : ''}
                                                            {r.modalidad === 'Contado' && r.importe !== null ? ` | Importe: S/.${r.importe}` : ''}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>{r.asesor_nombre}</td>
                                            <td>{r.cantidad}</td>
                                            <td className="text-green">S/.{r.total?.toFixed(2)}</td>
                                            <td>
                                                {(user?.rol === 'admin' || user?.nombre === r.asesor_nombre) && (
                                                    <div style={{display: 'flex', gap: '5px'}}>
                                                        <button onClick={() => r.origen === 'Producto' ? setEditingMov(r) : setEditingServ(r)} className="btn-primary" style={{padding: '4px 8px', fontSize: '0.8rem'}}>Editar</button>
                                                        <button onClick={() => handleDelete(r)} className="btn-primary" style={{background: 'var(--primary-red)', padding: '4px 8px', fontSize: '0.8rem'}}>Borrar</button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {editingMov && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', backgroundColor: 'white' }}>
                        <h3>Editar Venta de Producto</h3>
                        <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>{editingMov.detalle}</p>
                        <form onSubmit={handleUpdateMov}>
                            <label style={{display: 'block', marginTop: '10px'}}>Fecha:</label>
                            <input type="datetime-local" className="input-field" value={editingMov.fecha ? new Date(new Date(editingMov.fecha).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => setEditingMov({...editingMov, fecha: e.target.value})} />
                            
                            <label style={{display: 'block', marginTop: '10px'}}>Cantidad:</label>
                            <input type="number" min="1" className="input-field" value={editingMov.cantidad} onChange={e => setEditingMov({...editingMov, cantidad: Number(e.target.value)})} required />
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar</button>
                                <button type="button" className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--text-secondary)' }} onClick={() => setEditingMov(null)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingServ && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', backgroundColor: 'white' }}>
                        <h3>Editar Servicio</h3>
                        <form onSubmit={handleUpdateServ}>
                            <label style={{display: 'block', marginTop: '10px'}}>Fecha:</label>
                            <input type="datetime-local" className="input-field" value={editingServ.fecha ? new Date(new Date(editingServ.fecha).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => setEditingServ({...editingServ, fecha: e.target.value})} />
                            
                            <label style={{display: 'block', marginTop: '10px'}}>Cliente Nombre:</label>
                            <input type="text" className="input-field" value={editingServ.cliente_nombre || ''} onChange={e => setEditingServ({...editingServ, cliente_nombre: e.target.value})} required />
                            
                            <label style={{display: 'block', marginTop: '10px'}}>Identificación (DNI/RUC):</label>
                            <input type="text" className="input-field" value={editingServ.identificacion || ''} onChange={e => setEditingServ({...editingServ, identificacion: e.target.value})} required />
                            
                            <label style={{display: 'block', marginTop: '10px'}}>Tipo de Servicio:</label>
                            <select className="input-field" value={editingServ.categoria} onChange={e => setEditingServ({...editingServ, categoria: e.target.value})} required>
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

                            {editingServ.categoria === 'Renovación' && (
                                <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(238, 20, 20, 0.05)', borderRadius: '8px', border: '1px solid rgba(238, 20, 20, 0.2)' }}>
                                    <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Modalidad:</label>
                                    <select className="input-field mb-2" value={editingServ.modalidad || 'Cuotas'} onChange={e => setEditingServ({...editingServ, modalidad: e.target.value})} required>
                                        <option value="Cuotas">Cuotas</option>
                                        <option value="Contado">Contado</option>
                                    </select>
                                    
                                    {(editingServ.modalidad || 'Cuotas') === 'Cuotas' ? (
                                        <>
                                            <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Plazo (Meses):</label>
                                            <select className="input-field mb-2" value={editingServ.plazo_meses || 12} onChange={e => setEditingServ({...editingServ, plazo_meses: e.target.value})} required>
                                                <option value="6">6 meses</option>
                                                <option value="12">12 meses</option>
                                                <option value="18">18 meses</option>
                                                <option value="24">24 meses</option>
                                            </select>
                                            <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Cuota Inicial (S/.):</label>
                                            <input type="number" step="0.01" min="0" className="input-field" value={editingServ.cuota_inicial ?? 0} onChange={e => setEditingServ({...editingServ, cuota_inicial: e.target.value})} required />
                                        </>
                                    ) : (
                                        <>
                                            <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Plazo (Meses):</label>
                                            <input type="text" className="input-field mb-2" value="18 meses (Fijo)" readOnly style={{ background: '#f5f5f5', color: '#666' }} />
                                            <label style={{display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Importe (S/.):</label>
                                            <input type="number" step="0.01" min="0" className="input-field" value={editingServ.importe ?? ''} onChange={e => setEditingServ({...editingServ, importe: e.target.value})} required />
                                        </>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar</button>
                                <button type="button" className="btn-primary" style={{ flex: 1, backgroundColor: 'var(--text-secondary)' }} onClick={() => setEditingServ(null)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportesVentas;
