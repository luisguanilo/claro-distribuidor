import React from 'react';
import './TopBar.css';

const TopBar = ({ breadcrumbs, onNavigate }) => {
    return (
        <header className="top-bar">
            <div className="breadcrumbs">
                <span className="breadcrumb-item" onClick={() => onNavigate(-1)}>
                    Inicio
                </span>
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.id}>
                        <span className="breadcrumb-separator">/</span>
                        <span 
                            className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                            onClick={() => onNavigate(index)}
                        >
                            {crumb.nombre}
                        </span>
                    </React.Fragment>
                ))}
            </div>
        </header>
    );
};

export default TopBar;
