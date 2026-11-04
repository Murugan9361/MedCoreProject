import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ShieldAlert } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Authenticating MedCore clinical session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = role?.toLowerCase();
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole);

    if (!isAllowed) {
      return (
        <div className="card" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>
            <ShieldAlert size={48} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Access Restricted</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Your clinical account ({userRole?.toUpperCase()}) does not have permission to access this module.
          </p>
          <a href="/" className="btn btn-primary">
            Return to Dashboard
          </a>
        </div>
      );
    }
  }

  return children;
};
