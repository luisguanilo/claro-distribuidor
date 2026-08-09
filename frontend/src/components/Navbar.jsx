import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <header className="navbar">
            <div className="logo" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Claro_Logo.svg" alt="Claro Logo" style={{height: '30px'}} />
                <span>ALICENTER</span>
            </div>
            <div className="d-flex align-center" style={{gap: '16px'}}>
                <div>Hola, {user.nombre} <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>({user.rol})</span></div>
                <button onClick={logout} className="btn-primary" style={{padding: '8px 16px', background: 'var(--surface-dark)', border: '1px solid var(--border-color)'}}>
                    Salir
                </button>
            </div>
        </header>
    );
};

export default Navbar;
