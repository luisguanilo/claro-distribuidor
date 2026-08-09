import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import AsesorDashboard from './pages/AsesorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StockControl from './pages/StockControl';
import ReportesVentas from './pages/ReportesVentas';
import GestionAsesores from './pages/GestionAsesores';
import Sidebar from './components/Sidebar';
import './index.css';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useContext(AuthContext);
  
  if (loading) return <div style={{padding: 20, color: 'white'}}>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" />;
  
  return (
    <div className="app-container layout-sidebar">
      <Sidebar />
      <div className="main-wrapper">
        <main className="main-content">
          {children}
        </main>
        <footer style={{
            textAlign: 'center', 
            padding: '20px', 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            borderTop: '1px solid var(--border-color)',
            marginTop: 'auto'
        }}>
          Desarrollado por <strong>Luis Angel Guanilo Esteves</strong> | ALICENTER &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div style={{padding: 20, color: 'white'}}>Cargando...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? (user.rol === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/asesor" />) : <Login />} />
      <Route path="/asesor" element={<PrivateRoute roles={['asesor', 'admin']}><AsesorDashboard /></PrivateRoute>} />
      <Route path="/asesor/reportes" element={<PrivateRoute roles={['asesor', 'admin']}><ReportesVentas /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/stock" element={<PrivateRoute roles={['admin']}><StockControl /></PrivateRoute>} />
      <Route path="/admin/reportes" element={<PrivateRoute roles={['admin']}><ReportesVentas /></PrivateRoute>} />
      <Route path="/admin/gestion" element={<PrivateRoute roles={['admin']}><GestionAsesores /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
