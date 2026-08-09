import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const GestionAsesores = () => {
    const { token, logout } = useContext(AuthContext);
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [editingUserId, setEditingUserId] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', email: '', password: '' });

    // Backup state
    const [backupFile, setBackupFile] = useState(null);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/usuarios', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setUsuarios(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const method = editingUserId ? 'PUT' : 'POST';
            const url = editingUserId 
                ? `/api/usuarios/${editingUserId}` 
                : (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/usuarios';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert(editingUserId ? 'Usuario actualizado' : 'Usuario creado');
                setFormData({ nombre: '', email: '', password: '' });
                setEditingUserId(null);
                fetchUsuarios();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al guardar');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (u) => {
        setEditingUserId(u.id);
        setFormData({ nombre: u.nombre, email: u.email, password: '' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de desactivar a este asesor?')) return;
        try {
            const res = await fetch(`/api/usuarios/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Usuario desactivado');
                fetchUsuarios();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setFormData({ nombre: '', email: '', password: '' });
    };

    // --- BACKUP & RESTORE ---
    const handleBackup = () => {
        // Redirigir al endpoint de descarga adjuntando el token (o usar window.open si el backend no requiere header Auth, pero sí requiere, así que haremos un fetch y luego un blob)
        fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/backup', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_distribuidor_${new Date().toISOString().substring(0,10)}.sqlite`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
    };

    const handleRestore = async (e) => {
        e.preventDefault();
        if (!backupFile) return;
        if (!window.confirm('¡ADVERTENCIA CRÍTICA! Esto reemplazará toda la base de datos actual y no se puede deshacer. ¿Desea continuar?')) return;
        
        setIsRestoring(true);
        const data = new FormData();
        data.append('database', backupFile);

        try {
            const res = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/restore', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });
            const result = await res.json();
            if (res.ok) {
                alert('Restauración completada. Por seguridad, se cerrará la sesión actual.');
                logout(); // Fuerza al usuario a reloguearse con la base de datos restaurada
            } else {
                alert(result.error || 'Error en la restauración');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsRestoring(false);
        }
    };

    if (loading) return <div style={{padding: '20px'}}>Cargando...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>Gestión de Asesores y Sistema</h2>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginTop: '20px' }}>
                {/* Lista de Asesores */}
                <div className="glass-panel" style={{ flex: 2 }}>
                    <h3 className="mb-2">Lista de Asesores</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Email</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.nombre}</td>
                                        <td>{u.email}</td>
                                        <td className={u.estado === 'activo' ? 'text-green' : 'text-red'}>{u.estado}</td>
                                        <td>
                                            <button className="btn-primary" style={{ padding: '4px 8px', marginRight: '5px' }} onClick={() => handleEdit(u)}>Editar</button>
                                            {u.estado === 'activo' && (
                                                <button className="btn-primary" style={{ padding: '4px 8px', background: 'var(--primary-red)' }} onClick={() => handleDelete(u.id)}>Desactivar</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Formulario de Asesores */}
                <div className="glass-panel" style={{ flex: 1 }}>
                    <h3 className="mb-2">{editingUserId ? 'Editar Asesor' : 'Nuevo Asesor'}</h3>
                    <form onSubmit={handleSubmit}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Nombre:</label>
                        <input type="text" className="input-field mb-2" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                        
                        <label style={{ display: 'block', marginBottom: '5px' }}>Correo Electrónico:</label>
                        <input type="email" className="input-field mb-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                        
                        <label style={{ display: 'block', marginBottom: '5px' }}>Contraseña {editingUserId && <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>(dejar en blanco para no cambiar)</span>}:</label>
                        <input type="password" className="input-field mb-2" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingUserId} />
                        
                        <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: '10px' }}>
                            {editingUserId ? 'Guardar Cambios' : 'Crear Asesor'}
                        </button>
                        {editingUserId && (
                            <button type="button" className="btn-primary" style={{ width: '100%', background: 'var(--text-secondary)' }} onClick={handleCancelEdit}>
                                Cancelar
                            </button>
                        )}
                    </form>
                </div>
            </div>

            {/* Respaldo y Recuperación */}
            <div className="glass-panel mt-2" style={{ border: '1px solid var(--primary-color)' }}>
                <h3 className="mb-2 text-red">Respaldo y Recuperación de Base de Datos (Avanzado)</h3>
                
                <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <h4>1. Exportar Datos</h4>
                        <p className="text-secondary mb-2" style={{ fontSize: '0.9rem' }}>Descarga una copia completa de toda la información actual (ventas, stock, asesores).</p>
                        <button className="btn-primary" onClick={handleBackup}>Descargar Backup (.sqlite)</button>
                    </div>
                    
                    <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)', paddingLeft: '40px' }}>
                        <h4>2. Importar Datos</h4>
                        <p className="text-secondary mb-2" style={{ fontSize: '0.9rem' }}>Sube un archivo de backup previo para restaurar el sistema a ese estado.</p>
                        <form onSubmit={handleRestore} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input 
                                type="file" 
                                accept=".sqlite" 
                                className="input-field" 
                                onChange={e => setBackupFile(e.target.files[0])} 
                                required 
                            />
                            <button type="submit" className="btn-primary" disabled={isRestoring || !backupFile} style={{ background: 'var(--primary-red)' }}>
                                {isRestoring ? 'Restaurando...' : 'Restaurar'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default GestionAsesores;
