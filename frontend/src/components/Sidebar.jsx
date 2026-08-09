import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <img src="/logo-claro.png" alt="Logo Claro" style={{ height: '70px', objectFit: 'contain' }} onError={(e) => e.target.style.display='none'} />
                    <h2 style={{ fontSize: '1.3rem', margin: 0, textAlign: 'center' }}>ALICENTER</h2>
                </div>
                <span className="user-role">{user?.rol === 'admin' ? 'Administrador' : 'Asesor'}</span>
            </div>
            
            <nav className="sidebar-nav">
                {user?.rol === 'admin' && (
                    <>
                        <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} end>
                            <i className="icon">📊</i>
                            <span>Dashboard Global</span>
                        </NavLink>
                        <NavLink to="/admin/stock" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <i className="icon">📦</i>
                            <span>Control de Stock</span>
                        </NavLink>
                        <NavLink to="/admin/reportes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <i className="icon">📈</i>
                            <span>Reportes de Venta</span>
                        </NavLink>
                        <NavLink to="/admin/gestion" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <i className="icon">⚙️</i>
                            <span>Gestión y Respaldos</span>
                        </NavLink>
                    </>
                )}
                
                {user?.rol === 'asesor' && (
                    <>
                        <NavLink to="/asesor" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'} end>
                            <i className="icon">🛒</i>
                            <span>Consultas y Ventas</span>
                        </NavLink>
                        <NavLink to="/asesor/reportes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                            <i className="icon">📈</i>
                            <span>Mis Reportes</span>
                        </NavLink>
                    </>
                )}
            </nav>
            
            <div className="sidebar-footer">
                <div className="user-info">
                    <strong>{user?.nombre}</strong>
                </div>
                <button onClick={logout} className="btn-logout">Cerrar Sesión</button>
            </div>
        </aside>
    );
};

export default Sidebar;
