import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  FolderOpen,
  UserCheck,
  ShieldAlert,
  CreditCard,
  BarChart3,
  Activity,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isDoctor = role === 'doctor';
  const isAttender = role === 'attender';
  const isPatient = role === 'patient';

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="brand-icon-wrapper">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <span>MedCore</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Clinical Hub</div>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <LayoutDashboard className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>

          {/* Appointments: All roles (Super Admin, Admin, Doctor, Attender, Patient) */}
          <NavLink
            to="/appointments"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Calendar className="nav-icon" />
            <span>Appointments</span>
          </NavLink>

          {/* Patients Directory: Super Admin, Admin, Doctor, Attender */}
          {(isSuperAdmin || isAdmin || isDoctor || isAttender) && (
            <NavLink
              to="/patients"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Users className="nav-icon" />
              <span>Patients</span>
            </NavLink>
          )}

          {/* Patient Personal Details: Patient only */}
          {isPatient && (
            <NavLink
              to="/patient/profile"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <User className="nav-icon" />
              <span>My Medical Details</span>
            </NavLink>
          )}

          {/* Medical Records & EMR: All roles */}
          <NavLink
            to="/records"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <FileText className="nav-icon" />
            <span>{isPatient ? 'My Prescriptions' : 'Medical Records'}</span>
          </NavLink>

          {/* Diagnostics & Labs: All roles */}
          <NavLink
            to="/records/files"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <FolderOpen className="nav-icon" />
            <span>Diagnostics & Labs</span>
          </NavLink>

          {/* Billing & Invoices: All roles */}
          <NavLink
            to="/billing"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <CreditCard className="nav-icon" />
            <span>{isPatient ? 'My Invoices & Bills' : 'Billing & Invoices'}</span>
          </NavLink>

          {/* Reports: All roles */}
          <NavLink
            to="/reports"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <BarChart3 className="nav-icon" />
            <span>Reports</span>
          </NavLink>

          {/* Administration & Governance Section */}
          {(isSuperAdmin || isAdmin || isDoctor) && (
            <>
              <div className="nav-section-title">Administration</div>

              {/* User Management: Super Admin & Admin */}
              {(isSuperAdmin || isAdmin) && (
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Users className="nav-icon" />
                  <span>User Management</span>
                </NavLink>
              )}

              {/* Hospital Facilities: Super Admin only */}
              {isSuperAdmin && (
                <NavLink
                  to="/admin/hospitals"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <Activity className="nav-icon" />
                  <span>Hospital Facilities</span>
                </NavLink>
              )}

              {/* Staff & Attenders: Super Admin, Admin, Doctor */}
              <NavLink
                to="/admin/staff"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <UserCheck className="nav-icon" />
                <span>{isDoctor ? 'Staff & Attenders' : 'Staff Administration'}</span>
              </NavLink>

              {/* Audit Logs: Super Admin, Admin */}
              {(isSuperAdmin || isAdmin) && (
                <NavLink
                  to="/audit"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <ShieldAlert className="nav-icon" />
                  <span>Audit Logs</span>
                </NavLink>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-snippet">
            <div className="user-avatar">{getInitials(user?.full_name)}</div>
            <div className="user-meta">
              <div className="user-name">{user?.full_name || 'Clinical User'}</div>
              <div className="user-role-badge">{role?.replace('_', ' ')}</div>
            </div>
            <button
              onClick={logout}
              className="btn-icon"
              title="Sign Out"
              aria-label="Sign Out"
              style={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
