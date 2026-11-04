import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PatientsPage } from './pages/PatientsPage';
import { PatientDetailPage } from './pages/PatientDetailPage';
import { ConsultationsPage } from './pages/ConsultationsPage';
import { DiagnosticsFilesPage } from './pages/DiagnosticsFilesPage';
import { AdminStaffPage } from './pages/AdminStaffPage';
import { AdminHospitalsPage } from './pages/AdminHospitalsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { BillingPage } from './pages/BillingPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Clinical App Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Module A: Dashboard & Role-Based Home */}
              <Route index element={<DashboardPage />} />

              {/* Module C: Appointment Scheduling */}
              <Route path="appointments" element={<AppointmentsPage />} />

              {/* Module B: Patient Management */}
              <Route
                path="patients"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'admin', 'doctor', 'attender']}>
                    <PatientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="patients/:id"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'admin', 'doctor', 'attender']}>
                    <PatientDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Module D: Consultations & Medical Records */}
              <Route
                path="records"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'admin', 'doctor', 'patient']}>
                    <ConsultationsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="records/files" element={<DiagnosticsFilesPage />} />

              {/* Module E: Staff & Hospital Administration */}
              <Route
                path="admin/staff"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                    <AdminStaffPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/hospitals"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <AdminHospitalsPage />
                  </ProtectedRoute>
                }
              />

              {/* Super Admin User Management */}
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              {/* Module G: Billing & Invoicing */}
              <Route path="billing" element={<BillingPage />} />

              {/* Module H: Clinical & Revenue Reporting */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'admin', 'doctor']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Module F: Audit Logs */}
              <Route
                path="audit"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
