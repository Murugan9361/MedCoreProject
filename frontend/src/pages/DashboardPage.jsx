import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Activity,
  Building2,
  Stethoscope,
  PlusCircle,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { appointmentsApi } from '../api/appointments';
import { patientsApi } from '../api/patients';
import { doctorsApi } from '../api/doctors';
import { hospitalsApi } from '../api/hospitals';
import { auditApi } from '../api/audit';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Super Admin check
  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    // Prevent any API queries before authentication is initialized or for Super Admin
    if (!authLoading && isAuthenticated && !isSuperAdmin) {
      fetchDashboardData();
    }
  }, [authLoading, isAuthenticated, role, isSuperAdmin]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const promises = [
        appointmentsApi.getAppointments().catch(() => []),
        doctorsApi.getDoctors().catch(() => []),
      ];

      if (role !== 'patient') {
        promises.push(patientsApi.getPatients().catch(() => []));
      }
      if (role === 'admin') {
        promises.push(hospitalsApi.getHospitals().catch(() => []));
        promises.push(auditApi.getAuditLogs({ limit: 6 }).catch(() => []));
      }

      const results = await Promise.all(promises);
      setAppointments(results[0] || []);
      setDoctors(results[1] || []);

      if (results[2]) setPatients(results[2]);
      if (results[3]) setHospitals(results[3]);
      if (results[4]) setAuditLogs(results[4]);
    } catch (err) {
      console.warn('Dashboard fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await appointmentsApi.updateStatus(id, newStatus);
      showSuccess(`Appointment status updated to ${newStatus}`);
      fetchDashboardData();
    } catch (err) {
      showError(err.message || 'Status update failed');
    }
  };

  // SUPER ADMIN DASHBOARD REQUIREMENT:
  // Must display ONLY: "Welcome, Super Admin!"
  // Do NOT show dashboard statistics, charts, recent activity, or audit logs on the Super Admin Dashboard.
  if (isSuperAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div
          className="card"
          style={{
            padding: '3.5rem 3rem',
            textAlign: 'center',
            maxWidth: '560px',
            width: '100%',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-purple), #6366f1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              marginBottom: '1.25rem',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
            }}
          >
            <Activity size={32} strokeWidth={2.5} />
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--color-navy)',
              letterSpacing: '-0.02em',
              marginBottom: '0.75rem',
            }}
          >
            Welcome, Super Admin!
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
            System-wide administrator portal. Access user management to create and oversee Admins, Doctors, Patients, and Attenders.
          </p>
          <button
            onClick={() => navigate('/admin/users')}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
          >
            <Users size={18} />
            <span>Open User Management</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading || authLoading) {
    return <LoadingSpinner text="Compiling clinical intelligence metrics..." />;
  }

  // Calculated Metrics for Clinical Roles
  const scheduledCount = appointments.filter((a) => a.status === 'scheduled').length;
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  return (
    <div>
      {/* Welcome Banner */}
      <div
        className="card mb-6"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '1.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          border: 'none',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#5eead4', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              MedCore Live Workspace
            </span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Welcome back, {user?.full_name || 'Doctor'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {role === 'doctor' && 'Here is your active patient queue and consultation schedule for today.'}
            {role === 'admin' && 'Hospital operations, department statistics, and clinical staff oversight.'}
            {role === 'attender' && 'Patient triage intake, waiting room queue, and check-in management.'}
            {role === 'patient' && 'Access your medical history, upcoming visits, and diagnostic laboratory results.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => navigate('/appointments')} className="btn btn-primary">
            <Calendar size={16} />
            <span>Schedule Appointment</span>
          </button>
          {role !== 'patient' && (
            <button
              onClick={() => navigate('/patients')}
              className="btn btn-outline"
              style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <Users size={16} />
              <span>Patient Directory</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Appointments</div>
            <div className="stat-value">{appointments.length}</div>
            <div className="stat-meta">Across all doctors & clinics</div>
          </div>
          <div className="stat-icon-wrap">
            <Calendar size={22} />
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div>
            <div className="stat-label">Scheduled / Pending</div>
            <div className="stat-value">{scheduledCount}</div>
            <div className="stat-meta">In queue for consultation</div>
          </div>
          <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card stat-success">
          <div>
            <div className="stat-label">Consultations Done</div>
            <div className="stat-value">{completedCount}</div>
            <div className="stat-meta">Successfully completed</div>
          </div>
          <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="stat-card stat-info">
          <div>
            <div className="stat-label">Active Clinicians</div>
            <div className="stat-value">{doctors.length}</div>
            <div className="stat-meta">Verified active medical staff</div>
          </div>
          <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
            <Stethoscope size={22} />
          </div>
        </div>
      </div>

      {/* Main Grid: Queue & Activity */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left 2 Cols: Appointments / Triage Queue */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Activity size={18} color="var(--color-primary)" />
                  <span>Clinical Patient Queue</span>
                </h3>
                <div className="card-subtitle">Real-time status transitions and patient consultations</div>
              </div>
              <button onClick={() => navigate('/appointments')} className="btn btn-outline btn-sm">
                <span>View Full Calendar</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="card-body" style={{ padding: 0 }}>
              {appointments.length === 0 ? (
                <EmptyState
                  title="No scheduled visits today"
                  description="All appointment queues have been cleared or no visits are scheduled."
                  action={
                    <button onClick={() => navigate('/appointments')} className="btn btn-primary btn-sm">
                      Book First Appointment
                    </button>
                  }
                />
              ) : (
                <div className="table-responsive" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Time / Date</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 6).map((apt) => (
                        <tr key={apt.id}>
                          <td>
                            <div className="font-semibold">{apt.patient_name || `Patient #${apt.patient_id}`}</div>
                            <div className="text-muted text-xs">ID: #{apt.patient_id}</div>
                          </td>
                          <td>
                            <div className="font-medium">{apt.doctor_name || `Dr. #${apt.doctor_id}`}</div>
                          </td>
                          <td>
                            <div className="font-medium">{new Date(apt.start_time).toLocaleDateString()}</div>
                            <div className="text-muted text-xs">{new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem' }}>{apt.reason || 'General checkup'}</span>
                          </td>
                          <td>
                            <StatusBadge status={apt.status} />
                          </td>
                          <td className="text-right">
                            {apt.status === 'scheduled' ? (
                              <button
                                onClick={() => handleStatusUpdate(apt.id, 'completed')}
                                className="btn btn-success btn-sm"
                                title="Mark completed"
                              >
                                Complete
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate('/records')}
                                className="btn btn-outline btn-sm"
                              >
                                View Record
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions & Doctors */}
        <div>
          {/* Quick Actions Panel */}
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button onClick={() => navigate('/appointments')} className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                <Calendar size={16} color="var(--color-primary)" />
                <span>Book New Appointment</span>
              </button>

              {role !== 'patient' && (
                <button onClick={() => navigate('/patients')} className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <PlusCircle size={16} color="var(--color-primary)" />
                  <span>Register New Patient</span>
                </button>
              )}

              {(role === 'doctor' || role === 'admin') && (
                <button onClick={() => navigate('/records')} className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <FileText size={16} color="var(--color-primary)" />
                  <span>EMR & Speech Dictation</span>
                </button>
              )}

              <button onClick={() => navigate('/billing')} className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                <Activity size={16} color="var(--color-primary)" />
                <span>Manage Patient Billing</span>
              </button>

              {(role === 'admin' || role === 'doctor') && (
                <button onClick={() => navigate('/reports')} className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                  <Activity size={16} color="var(--color-primary)" />
                  <span>Clinical & Revenue Reports</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Clinicians Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Available Doctors</h3>
            </div>
            <div className="card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {doctors.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <div className="font-semibold" style={{ fontSize: '0.88rem' }}>{doc.name}</div>
                      <div className="text-muted text-xs">{doc.specialization} • Fee: ${doc.consultation_fee || '150'}</div>
                    </div>
                    <button
                      onClick={() => navigate('/appointments')}
                      className="btn btn-primary btn-sm"
                    >
                      Book
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
