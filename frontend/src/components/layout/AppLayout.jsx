import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Determine current page title from pathname
  const getPageMeta = (pathname) => {
    if (pathname === '/') return { title: 'Dashboard', subtitle: 'Real-time hospital operations & clinic queue' };
    if (pathname.startsWith('/appointments')) return { title: 'Appointment Scheduling', subtitle: 'Manage clinic queues, bookings & status workflows' };
    if (pathname.startsWith('/patients')) return { title: 'Patient Management', subtitle: 'Searchable directory, registration & comprehensive EMR' };
    if (pathname === '/records/files') return { title: 'Diagnostics & Lab Reports', subtitle: 'Radiology imaging, lab assays & clinical attachments' };
    if (pathname.startsWith('/records')) return { title: 'Medical Records & EMR', subtitle: 'Consultation notes, prescriptions & ICD diagnoses' };
    if (pathname.startsWith('/admin/staff')) return { title: 'Staff Administration', subtitle: 'Onboard doctors, triage attenders & nurses' };
    if (pathname.startsWith('/admin/hospitals')) return { title: 'Hospital Facilities', subtitle: 'Facility licensing, bed allotment & network branches' };
    if (pathname.startsWith('/audit')) return { title: 'Audit Trail & Compliance', subtitle: 'HIPAA system access logs & clinical activity tracking' };
    return { title: 'MedCore Platform', subtitle: 'Clinical & Hospital Management' };
  };

  const meta = getPageMeta(location.pathname);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title={meta.title}
          subtitle={meta.subtitle}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
