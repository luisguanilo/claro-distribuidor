import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const user = await login(email, password);
            if (user.rol === 'admin') navigate('/admin');
            else navigate('/asesor');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            backgroundColor: '#f4f6f8'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', textAlign: 'center', background: '#ffffff' }}>
                <div style={{marginBottom: '20px'}}>
                    <img src="/logo-claro.png" alt="Logo Claro" style={{height: '120px', objectFit: 'contain'}} onError={(e) => e.target.style.display='none'} />
                </div>
                <h1 style={{ color: 'var(--primary-red)', marginBottom: '8px', fontSize: '1.8rem' }}>ALICENTER</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Acceso Distribuidores Autorizados</p>
                
                {error && <div style={{ background: 'rgba(218,41,28,0.1)', color: 'var(--primary-red)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <input 
                        type="email" 
                        placeholder="Correo Electrónico" 
                        className="input-field" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Contraseña" 
                        className="input-field" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                        Ingresar al Sistema
                    </button>
                </form>
            </div>
            
            <footer style={{
                position: 'absolute',
                bottom: '20px',
                textAlign: 'center', 
                width: '100%',
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)'
            }}>
                Desarrollado por <strong>Luis Angel Guanilo Esteves</strong> | ALICENTER &copy; {new Date().getFullYear()}
            </footer>
        </div>
    );
};

export default Login;
