import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                    <div style={{ position: 'relative' }}>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Contraseña" 
                            className="input-field" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            style={{ 
                                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', 
                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' 
                            }}
                        >
                            {showPassword ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            )}
                        </button>
                    </div>
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
