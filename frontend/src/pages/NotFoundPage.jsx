import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div className="card" style={{ maxWidth: '480px', padding: '3rem 2rem' }}>
        <div style={{ color: 'var(--color-primary)', marginBottom: '1.25rem' }}>
          <AlertCircle size={54} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-navy)' }}>
          404 — Page Not Found
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.75rem', fontSize: '0.92rem' }}>
          The clinical module or patient record you requested could not be located in MedCore.
        </p>
        <button onClick={() => navigate('/')} className="btn btn-primary">
          <Home size={16} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
