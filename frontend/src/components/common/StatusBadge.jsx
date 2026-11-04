import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;
  const s = String(status).toLowerCase();

  switch (s) {
    case 'scheduled':
      return (
        <span className="badge badge-warning">
          <span className="badge-dot" />
          Scheduled
        </span>
      );
    case 'checked_in':
      return (
        <span className="badge badge-info">
          <span className="badge-dot" />
          Checked In
        </span>
      );
    case 'in_consultation':
      return (
        <span className="badge badge-purple">
          <span className="badge-dot" />
          In Consultation
        </span>
      );
    case 'completed':
      return (
        <span className="badge badge-success">
          <span className="badge-dot" />
          Completed
        </span>
      );
    case 'cancelled':
      return (
        <span className="badge badge-danger">
          <span className="badge-dot" />
          Cancelled
        </span>
      );
    case 'no_show':
      return (
        <span className="badge badge-neutral">
          <span className="badge-dot" />
          No Show
        </span>
      );
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
};

export const RoleBadge = ({ role }) => {
  if (!role) return null;
  const r = String(role).toLowerCase();

  const config = {
    super_admin: { label: 'Super Admin', className: 'badge-purple' },
    admin: { label: 'Hospital Admin', className: 'badge-info' },
    doctor: { label: 'Doctor', className: 'badge-success' },
    attender: { label: 'Attender / Staff', className: 'badge-warning' },
    patient: { label: 'Patient', className: 'badge-neutral' },
  };

  const item = config[r] || { label: role, className: 'badge-neutral' };

  return <span className={`badge ${item.className}`}>{item.label}</span>;
};
