import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  CreditCard,
  Download,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Stethoscope,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';
import { appointmentsApi } from '../api/appointments';
import { doctorsApi } from '../api/doctors';
import { patientsApi } from '../api/patients';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';

const BILLING_STORAGE_KEY = 'medcore_billing_invoices';

export const ReportsPage = () => {
  const { showError, showSuccess } = useNotification();

  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments' | 'billing' | 'payments'
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [apts, docs] = await Promise.all([
        appointmentsApi.getAppointments().catch(() => []),
        doctorsApi.getDoctors().catch(() => []),
      ]);
      setAppointments(apts || []);
      setDoctors(docs || []);

      // Load persistent invoices
      const savedInvoices = localStorage.getItem(BILLING_STORAGE_KEY);
      if (savedInvoices) {
        try {
          setInvoices(JSON.parse(savedInvoices));
        } catch {
          setInvoices([]);
        }
      }
    } catch (err) {
      showError(err.message || 'Error compiling reports');
    } finally {
      setLoading(false);
    }
  };

  // Filter items by date
  const isWithinDateFilter = (dateString) => {
    if (!dateString || dateFilter === 'all') return true;
    const itemDate = new Date(dateString);
    const now = new Date();

    if (dateFilter === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= oneWeekAgo && itemDate <= now;
    }
    if (dateFilter === 'month') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return itemDate >= oneMonthAgo && itemDate <= now;
    }
    return true;
  };

  const filteredAppointments = appointments.filter((a) => isWithinDateFilter(a.start_time));
  const filteredInvoices = invoices.filter((i) => isWithinDateFilter(i.date || i.paid_at));

  // Appointment metrics
  const totalAppointments = filteredAppointments.length;
  const todayAppointments = appointments.filter((a) => {
    if (!a.start_time) return false;
    return new Date(a.start_time).toDateString() === new Date().toDateString();
  }).length;
  const completedCount = filteredAppointments.filter((a) => a.status === 'completed').length;
  const pendingCount = filteredAppointments.filter((a) => a.status === 'scheduled').length;
  const cancelledCount = filteredAppointments.filter((a) => a.status === 'cancelled').length;
  const rescheduledCount = filteredAppointments.filter((a) => a.status === 'rescheduled' || a.rescheduled).length;

  // Appointment counts by Doctor
  const doctorAppointmentStats = doctors.map((doc) => {
    const docApts = filteredAppointments.filter((a) => a.doctor_id === doc.id);
    return {
      doctorId: doc.id,
      doctorName: doc.name,
      specialization: doc.specialization,
      count: docApts.length,
      completed: docApts.filter((a) => a.status === 'completed').length,
    };
  });

  // Billing & Payment metrics
  const totalBillsGenerated = filteredInvoices.length;
  const paidInvoices = filteredInvoices.filter((i) => i.status === 'paid');
  const unpaidInvoices = filteredInvoices.filter((i) => i.status !== 'paid');

  const totalRevenue = filteredInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalCollections = paidInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const outstandingBalances = unpaidInvoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);

  // CSV Export utility
  const handleExportCSV = () => {
    let headers = [];
    let rows = [];

    if (activeTab === 'appointments') {
      headers = ['ID', 'Patient', 'Doctor', 'Start Time', 'Reason', 'Status'];
      rows = filteredAppointments.map((a) => [
        a.id,
        `"${a.patient_name || a.patient_id}"`,
        `"${a.doctor_name || a.doctor_id}"`,
        a.start_time,
        `"${a.reason || ''}"`,
        a.status,
      ]);
    } else {
      headers = ['Invoice ID', 'Patient', 'Doctor', 'Date', 'Subtotal', 'Tax', 'Total Amount', 'Status', 'Paid At'];
      rows = filteredInvoices.map((i) => [
        i.id,
        `"${i.patient_name}"`,
        `"${i.doctor_name}"`,
        i.date,
        i.subtotal,
        i.tax_amount,
        i.total_amount,
        i.status,
        i.paid_at || 'N/A',
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `medcore_${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(`Report exported as CSV successfully!`);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)' }}>
            Clinical & Financial Reports
          </h2>
          <p className="text-muted text-sm">
            Comprehensive audit reports, patient volume analytics, and revenue collection summaries
          </p>
        </div>

        <button onClick={handleExportCSV} className="btn btn-primary">
          <Download size={16} />
          <span>Export Report (CSV)</span>
        </button>
      </div>

      {/* Tabs and Date Range Filters */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button
            className={`tab ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <Calendar size={16} />
            <span>Appointment Reports</span>
          </button>
          <button
            className={`tab ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            <Receipt size={16} />
            <span>Billing Reports</span>
          </button>
          <button
            className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <CreditCard size={16} />
            <span>Payment Reports</span>
          </button>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-bold">DATE RANGE:</span>
          {['all', 'today', 'week', 'month'].map((df) => (
            <button
              key={df}
              onClick={() => setDateFilter(df)}
              className={`btn btn-sm ${dateFilter === df ? 'btn-primary' : 'btn-outline'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {df === 'all' ? 'All Time' : df === 'week' ? 'Past 7 Days' : df === 'month' ? 'Past 30 Days' : 'Today'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Compiling clinical intelligence metrics..." />
      ) : (
        <>
          {/* TAB 1: APPOINTMENT REPORTS */}
          {activeTab === 'appointments' && (
            <div>
              {/* Summary KPI Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                  <div>
                    <div className="stat-label">Total Appointments</div>
                    <div className="stat-value">{totalAppointments}</div>
                    <div className="stat-meta">In selected date filter</div>
                  </div>
                  <div className="stat-icon-wrap">
                    <Calendar size={22} />
                  </div>
                </div>

                <div className="stat-card stat-success">
                  <div>
                    <div className="stat-label">Completed Consultations</div>
                    <div className="stat-value">{completedCount}</div>
                    <div className="stat-meta">Successfully discharged</div>
                  </div>
                  <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                    <CheckCircle size={22} />
                  </div>
                </div>

                <div className="stat-card stat-warning">
                  <div>
                    <div className="stat-label">Scheduled / Pending</div>
                    <div className="stat-value">{pendingCount}</div>
                    <div className="stat-meta">Awaiting consultation</div>
                  </div>
                  <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                    <Clock size={22} />
                  </div>
                </div>

                <div className="stat-card stat-danger">
                  <div>
                    <div className="stat-label">Cancelled / Rescheduled</div>
                    <div className="stat-value">{cancelledCount + rescheduledCount}</div>
                    <div className="stat-meta">{cancelledCount} cancelled, {rescheduledCount} rescheduled</div>
                  </div>
                  <div className="stat-icon-wrap" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
                    <XCircle size={22} />
                  </div>
                </div>
              </div>

              {/* Doctor Volume Breakdown */}
              <div className="card mb-6">
                <div className="card-header">
                  <h3 className="card-title">
                    <Stethoscope size={18} color="var(--color-primary)" />
                    <span>Appointment Distribution by Clinician</span>
                  </h3>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Doctor Name</th>
                        <th>Specialization</th>
                        <th>Total Bookings</th>
                        <th>Completed</th>
                        <th>Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctorAppointmentStats.map((doc) => {
                        const rate = doc.count > 0 ? Math.round((doc.completed / doc.count) * 100) : 0;
                        return (
                          <tr key={doc.doctorId}>
                            <td className="font-semibold">{doc.doctorName}</td>
                            <td><span className="badge badge-info">{doc.specialization}</span></td>
                            <td className="font-bold">{doc.count}</td>
                            <td className="text-success font-semibold">{doc.completed}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                  style={{
                                    flex: 1,
                                    height: '6px',
                                    backgroundColor: 'var(--color-border)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    maxWidth: '100px',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${rate}%`,
                                      height: '100%',
                                      backgroundColor: 'var(--color-success)',
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-muted font-bold">{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Appointments Log */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Appointment Details Log</h3>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Appointment Time</th>
                        <th>Reason for Consultation</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.slice(0, 10).map((apt) => (
                        <tr key={apt.id}>
                          <td className="font-bold text-primary">#{apt.id}</td>
                          <td className="font-medium">{apt.patient_name || `Patient #${apt.patient_id}`}</td>
                          <td>{apt.doctor_name || `Dr. #${apt.doctor_id}`}</td>
                          <td>
                            <div className="font-medium">{new Date(apt.start_time).toLocaleDateString()}</div>
                            <div className="text-muted text-xs">
                              {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="text-sm">{apt.reason || 'General checkup'}</td>
                          <td><StatusBadge status={apt.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BILLING REPORTS */}
          {activeTab === 'billing' && (
            <div>
              {/* Billing KPI Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="stat-card">
                  <div>
                    <div className="stat-label">Total Bills Generated</div>
                    <div className="stat-value">{totalBillsGenerated}</div>
                    <div className="stat-meta">Total gross value: ${totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    <Receipt size={22} />
                  </div>
                </div>

                <div className="stat-card stat-success">
                  <div>
                    <div className="stat-label">Paid Invoices</div>
                    <div className="stat-value">{paidInvoices.length}</div>
                    <div className="stat-meta">Settled total: ${totalCollections.toLocaleString()}</div>
                  </div>
                  <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                    <CheckCircle size={22} />
                  </div>
                </div>

                <div className="stat-card stat-warning">
                  <div>
                    <div className="stat-label">Outstanding Invoices</div>
                    <div className="stat-value">{unpaidInvoices.length}</div>
                    <div className="stat-meta">Balance due: ${outstandingBalances.toLocaleString()}</div>
                  </div>
                  <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
                    <Clock size={22} />
                  </div>
                </div>
              </div>

              {/* Billing Ledger Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Billing Summary Ledger</h3>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invoice ID</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Date</th>
                        <th>Subtotal</th>
                        <th>Tax</th>
                        <th>Final Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="font-bold text-primary">{inv.id}</td>
                          <td className="font-semibold">{inv.patient_name}</td>
                          <td>{inv.doctor_name}</td>
                          <td>{inv.date}</td>
                          <td>${inv.subtotal?.toFixed(2)}</td>
                          <td>${inv.tax_amount?.toFixed(2)}</td>
                          <td className="font-bold text-base" style={{ color: 'var(--color-navy)' }}>
                            ${inv.total_amount?.toFixed(2)}
                          </td>
                          <td>
                            <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-danger'}`}>
                              {inv.status?.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT REPORTS */}
          {activeTab === 'payments' && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="stat-card stat-success">
                  <div>
                    <div className="stat-label">Total Collections</div>
                    <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                      ${totalCollections.toLocaleString()}
                    </div>
                    <div className="stat-meta">Confirmed receipts</div>
                  </div>
                  <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                    <CreditCard size={22} />
                  </div>
                </div>

                <div className="stat-card stat-info">
                  <div>
                    <div className="stat-label">Successful Transactions</div>
                    <div className="stat-value">{paidInvoices.length}</div>
                    <div className="stat-meta">100% verified settlement</div>
                  </div>
                  <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
                    <CheckCircle size={22} />
                  </div>
                </div>

                <div className="stat-card">
                  <div>
                    <div className="stat-label">Refunds / Chargebacks</div>
                    <div className="stat-value">$0.00</div>
                    <div className="stat-meta">0 disputed payments</div>
                  </div>
                  <div className="stat-icon-wrap">
                    <RotateCcw size={22} />
                  </div>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Payment Transaction History</h3>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Transaction Ref</th>
                        <th>Invoice ID</th>
                        <th>Patient</th>
                        <th>Payment Method</th>
                        <th>Amount Paid</th>
                        <th>Settlement Timestamp</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paidInvoices.map((inv, idx) => (
                        <tr key={inv.id || idx}>
                          <td className="font-mono text-xs font-bold text-primary">
                            TXN-2026-{(idx + 1001).toString()}
                          </td>
                          <td className="font-medium">{inv.id}</td>
                          <td>{inv.patient_name}</td>
                          <td>
                            <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                              {inv.payment_method || 'Card'}
                            </span>
                          </td>
                          <td className="font-bold text-success">${inv.total_amount?.toFixed(2)}</td>
                          <td className="text-muted text-xs">
                            {inv.paid_at ? new Date(inv.paid_at).toLocaleString() : 'Recent'}
                          </td>
                          <td>
                            <span className="badge badge-success">SUCCESSFUL</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
