import React from 'react';
import { Menu, Building2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../common/StatusBadge';

export const Header = ({ onToggleSidebar, title, subtitle }) => {
  const { user, role, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="header-title-container">
          <h1>{title || 'Clinical Dashboard'}</h1>
          {subtitle && <div className="header-subtitle">{subtitle}</div>}
        </div>
      </div>

      <div className="header-right">
        {/* Hospital Facility Indicator */}
        <div
          className="flex items-center gap-2"
          style={{
            fontSize: '0.84rem',
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface-hover)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Building2 size={15} color="var(--color-primary)" />
          <span className="font-medium" style={{ display: 'none', md: 'inline' }}>
            MedCore Hospital
          </span>
        </div>

        {/* User Role Badge */}
        <RoleBadge role={role} />

        {/* Sign Out Shortcut */}
        <button
          onClick={logout}
          className="btn btn-outline btn-sm"
          title="Sign Out"
          style={{ marginLeft: '0.5rem' }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
