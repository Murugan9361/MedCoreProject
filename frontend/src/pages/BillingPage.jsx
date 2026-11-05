import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Receipt,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Download,
  Calendar,
  User,
  Stethoscope,
  Filter,
  Check,
  ExternalLink,
} from 'lucide-react';
import { appointmentsApi } from '../api/appointments';
import { patientsApi } from '../api/patients';
import { doctorsApi } from '../api/doctors';
import { billingApi } from '../api/billing';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { StatusBadge } from '../components/common/StatusBadge';

export const BillingPage = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isPatient = role === 'patient';
  const isDoctor = role === 'doctor';
  const isAttender = role === 'attender';
  const { showSuccess, showError } = useNotification();
  const [searchParams] = useSearchParams();
  const queryAppointmentId = searchParams.get('appointment_id');
  const queryPatientId = searchParams.get('patient_id');

  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'unpaid' | 'pending'
  const [searchQuery, setSearchQuery] = useState(queryPatientId ? `Patient #${queryPatientId}` : '');

  // Generate Invoice Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [billForm, setBillForm] = useState({
    patient_id: '',
    doctor_id: '',
    consultation_fee: 150,
    lab_charges: 0,
    pharmacy_charges: 0,
    discount_percentage: 0,
    tax_percentage: 5, // Standard medical tax rate
    notes: 'Outpatient clinical consultation & evaluation',
  });

  // Invoice Details Modal
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);

  // Payment Confirmation Modal
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [user, role]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const promises = [
        appointmentsApi.getAppointments().catch(() => []),
        doctorsApi.getDoctors().catch(() => []),
        billingApi.getBills().catch(() => []),
      ];
      // Only non-patients can view full patient directory
      if (role !== 'patient') {
        promises.push(patientsApi.getPatients().catch(() => []));
      }

      const [apts, docs, bills, pts] = await Promise.all(promises);
      const apptList = Array.isArray(apts) ? apts : [];
      const docList = Array.isArray(docs) ? docs : [];
      const billList = Array.isArray(bills) ? bills : (bills?.items || []);
      
      setAppointments(apptList);
      setDoctors(docList);
      setInvoices(billList);
      setPatients(Array.isArray(pts) ? pts : []);

      // Handle deep-link appointment linking if appointment_id query param is present
      if (queryAppointmentId && apptList.length > 0) {
        const targetApt = apptList.find((a) => String(a.id) === String(queryAppointmentId));
        if (targetApt) {
          const existingInv = billList.find((i) => Number(i.appointment_id) === Number(targetApt.id));
          if (existingInv) {
            setActiveInvoice(existingInv);
            setIsInvoiceDetailOpen(true);
          } else {
            handleSelectAppointment(targetApt.id, targetApt, docList);
            setIsCreateModalOpen(true);
          }
        }
      }
    } catch (err) {
      showError(err.message || 'Error loading billing data');
    } finally {
      setLoading(false);
    }
  };

  // Appointment selection handler
  const handleSelectAppointment = (aptId, explicitApt = null, explicitDocs = null) => {
    setSelectedAppointmentId(aptId);
    if (!aptId) {
      setBillForm((prev) => ({
        ...prev,
        patient_id: '',
        doctor_id: '',
        consultation_fee: 150,
        notes: 'Outpatient clinical consultation',
      }));
      return;
    }

    const aptList = explicitApt ? [explicitApt, ...appointments] : appointments;
    const docList = explicitDocs || doctors;
    const apt = explicitApt || aptList.find((a) => String(a.id) === String(aptId));
    if (apt) {
      const doc = docList.find((d) => d.id === apt.doctor_id);
      const fee = Number(doc?.consultation_fee) || 150;
      setBillForm((prev) => ({
        ...prev,
        patient_id: apt.patient_id,
        doctor_id: apt.doctor_id,
        consultation_fee: fee,
        notes: apt.reason ? `Clinical evaluation: ${apt.reason}` : 'Outpatient clinical consultation',
      }));
    }
  };

  // Currently selected appointment object for details preview in modal
  const selectedAppointment = useMemo(() => {
    if (!selectedAppointmentId) return null;
    return appointments.find((a) => String(a.id) === String(selectedAppointmentId)) || null;
  }, [selectedAppointmentId, appointments]);

  // Calculations
  const calculateTotals = () => {
    const subtotal =
      Number(billForm.consultation_fee || 0) +
      Number(billForm.lab_charges || 0) +
      Number(billForm.pharmacy_charges || 0);

    const discountAmount = Math.round(subtotal * (Number(billForm.discount_percentage || 0) / 100));
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(taxableAmount * (Number(billForm.tax_percentage || 0) / 100));
    const totalAmount = taxableAmount + taxAmount;

    return { subtotal, discountAmount, taxAmount, totalAmount };
  };

  const handleOpenCreateModal = () => {
    if (appointments.length > 0) {
      // Find first appointment without an invoice, or default to first
      const firstUnbilled = appointments.find(
        (a) => !invoices.some((i) => Number(i.appointment_id) === Number(a.id))
      );
      const target = firstUnbilled || appointments[0];
      handleSelectAppointment(target.id, target);
    } else {
      setSelectedAppointmentId('');
    }
    setIsCreateModalOpen(true);
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!selectedAppointmentId) {
      showError('Please link this invoice to a scheduled appointment');
      return;
    }

    const apt = appointments.find((a) => String(a.id) === String(selectedAppointmentId));
    if (!apt) {
      showError('Selected appointment not found in records.');
      return;
    }

    // Check if an invoice for this appointment already exists in state
    const existing = invoices.find((i) => Number(i.appointment_id) === Number(apt.id));
    if (existing) {
      showError(`An invoice (${existing.number || `#${existing.id}`}) has already been generated for Appointment #${apt.id}`);
      return;
    }

    const { subtotal, discountAmount, taxAmount, totalAmount } = calculateTotals();

    const items = [
      {
        description: 'Clinical Consultation Fee',
        quantity: 1,
        unit_amount: Number(billForm.consultation_fee),
        tax_rate: Number(billForm.tax_percentage || 0),
      },
    ];

    if (Number(billForm.lab_charges) > 0) {
      items.push({
        description: 'Diagnostic Laboratory Assays',
        quantity: 1,
        unit_amount: Number(billForm.lab_charges),
        tax_rate: Number(billForm.tax_percentage || 0),
      });
    }

    if (Number(billForm.pharmacy_charges) > 0) {
      items.push({
        description: 'Dispensed Pharmacy Medications',
        quantity: 1,
        unit_amount: Number(billForm.pharmacy_charges),
        tax_rate: Number(billForm.tax_percentage || 0),
      });
    }

    const payload = {
      patient_id: Number(apt.patient_id),
      appointment_id: Number(apt.id),
      currency: 'INR',
      discount_amount: Number(discountAmount || 0),
      notes: billForm.notes || 'Outpatient clinical consultation',
      items,
    };

    setGenerating(true);
    try {
      const created = await billingApi.createBill(payload);
      showSuccess(`Invoice ${created.number || `#${created.id}`} generated and saved successfully!`);
      setIsCreateModalOpen(false);
      setSelectedAppointmentId('');
      await loadBillingData();
    } catch (err) {
      showError(err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!paymentInvoice) return;
    setProcessingPayment(true);

    try {
      const total = Number(paymentInvoice.total_amount || 0);
      const paid = Number(paymentInvoice.amount_paid || 0);
      const amountDue = Math.max(0.01, total - paid);

      // Map payment methods: card, cash, bank_transfer
      let mappedMethod = 'card';
      if (paymentMethod === 'cash') mappedMethod = 'cash';
      else if (paymentMethod === 'bank_transfer' || paymentMethod === 'insurance' || paymentMethod === 'upi') {
        mappedMethod = 'bank_transfer';
      }

      await billingApi.recordPayment(paymentInvoice.id, {
        amount: amountDue,
        method: mappedMethod,
        reference: `PAY-${Date.now()}`,
        note: `Payment collected via ${paymentMethod.toUpperCase()}`,
      });

      showSuccess(`Payment of $${amountDue.toFixed(2)} recorded for Invoice ${paymentInvoice.number || `#${paymentInvoice.id}`}!`);
      setPaymentInvoice(null);
      await loadBillingData();
    } catch (err) {
      showError(err.message || 'Payment processing failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Filtered invoices based on search & status filter
  const filteredInvoices = invoices.filter((inv) => {
    const isPaid = inv.status === 'paid';
    const isPending = inv.status === 'partially_paid' || inv.status === 'issued' || inv.status === 'draft';
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && isPaid) ||
      (statusFilter === 'unpaid' && !isPaid) ||
      (statusFilter === 'pending' && isPending);

    const q = searchQuery.toLowerCase().trim();
    const invNum = (inv.number || `INV-${inv.id}`).toLowerCase();
    const patName = (inv.patient_name || '').toLowerCase();
    const docName = (inv.doctor_name || '').toLowerCase();
    const apptId = String(inv.appointment_id || '');
    const patId = String(inv.patient_id || '');

    const matchesSearch =
      !q ||
      invNum.includes(q) ||
      patName.includes(q) ||
      docName.includes(q) ||
      apptId.includes(q) ||
      patId.includes(q);

    return matchesStatus && matchesSearch;
  });

  // Financial summary metrics
  const totalBilled = invoices.reduce((acc, i) => acc + Number(i.total_amount || 0), 0);
  const totalCollected = invoices.reduce((acc, i) => acc + Number(i.amount_paid || 0), 0);
  const outstandingBalance = Math.max(0, totalBilled - totalCollected);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)' }}>
            Patient Billing & Invoicing
          </h2>
          <p className="text-muted text-sm">
            Generate clinical consultation invoices, link scheduled appointments, record fees, and reconcile patient payments
          </p>
        </div>

        <button onClick={handleOpenCreateModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Generate New Invoice</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Billed</div>
            <div className="stat-value" style={{ color: 'var(--color-navy)' }}>
              ${totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="stat-meta">{invoices.length} total clinical invoices</div>
          </div>
          <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Receipt size={22} />
          </div>
        </div>

        <div className="stat-card stat-success">
          <div>
            <div className="stat-label">Total Collections</div>
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              ${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="stat-meta">Verified received payments</div>
          </div>
          <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="stat-card stat-warning">
          <div>
            <div className="stat-label">Outstanding Balance</div>
            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
              ${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="stat-meta">Pending or unpaid invoices</div>
          </div>
          <div className="stat-icon-wrap" style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card mb-6" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search by Invoice #, Appt #, Patient name, or Doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted">Status:</span>
            {['all', 'paid', 'unpaid', 'pending'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Retrieving patient billing ledgers from database..." />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Invoices Found"
            description={
              searchQuery || statusFilter !== 'all'
                ? 'No invoices match your selected filter criteria.'
                : appointments.length === 0
                ? 'No scheduled appointments exist yet. Book an appointment first to generate consultation invoices.'
                : 'No patient bills have been generated yet. Select a scheduled appointment to create an invoice.'
            }
            action={
              appointments.length === 0 ? (
                <button onClick={() => navigate('/appointments')} className="btn btn-primary btn-sm">
                  Schedule First Appointment
                </button>
              ) : (
                <button onClick={handleOpenCreateModal} className="btn btn-primary btn-sm">
                  Generate First Invoice
                </button>
              )
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => {
                  const invTotal = Number(inv.total_amount || 0);
                  const invPaid = Number(inv.amount_paid || 0);
                  const isFullyPaid = inv.status === 'paid' || invPaid >= invTotal;
                  return (
                    <tr key={inv.id}>
                      <td>
                        <span className="font-bold text-primary">{inv.number || `INV-${inv.id}`}</span>
                        {inv.appointment_id && (
                          <div className="text-muted text-xs flex items-center gap-1 mt-0.5">
                            <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                              Appt #{inv.appointment_id}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold">{inv.patient_name || `Patient #${inv.patient_id}`}</div>
                        <div className="text-muted text-xs">Patient ID: #{inv.patient_id}</div>
                      </td>
                      <td>
                        <div className="font-medium">{inv.doctor_name || (inv.doctor_id ? `Doctor #${inv.doctor_id}` : 'General Staff')}</div>
                      </td>
                      <td>
                        <div className="text-sm font-medium">
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div className="font-bold text-base" style={{ color: 'var(--color-navy)' }}>
                          ${invTotal.toFixed(2)}
                        </div>
                        <div className="text-muted text-xs">Paid: ${invPaid.toFixed(2)}</div>
                      </td>
                      <td>
                        {isFullyPaid ? (
                          <span className="badge badge-success">PAID</span>
                        ) : inv.status === 'partially_paid' ? (
                          <span className="badge badge-warning">PARTIALLY PAID</span>
                        ) : (
                          <span className="badge badge-danger">UNPAID</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            onClick={() => {
                              setActiveInvoice(inv);
                              setIsInvoiceDetailOpen(true);
                            }}
                            className="btn btn-outline btn-sm"
                            title="View Official Receipt"
                          >
                            <Receipt size={14} />
                            <span>View</span>
                          </button>

                          {!isFullyPaid && (
                            <button
                              onClick={() => setPaymentInvoice(inv)}
                              className="btn btn-success btn-sm"
                              title="Record Payment"
                            >
                              <CreditCard size={14} />
                              <span>Collect</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Generate Clinical Consultation Invoice"
        size="md"
      >
        <form onSubmit={handleGenerateInvoice}>
          {/* Link to Scheduled Appointment Selector */}
          <div className="form-group">
            <label className="form-label required">Link to Scheduled Appointment</label>
            {appointments.length === 0 ? (
              <div className="alert alert-warning text-sm p-3 mb-2">
                No scheduled appointments found. Please schedule an appointment first in{' '}
                <a
                  href="/appointments"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/appointments');
                  }}
                  className="font-bold underline"
                >
                  Appointment Scheduling
                </a>
                .
              </div>
            ) : (
              <select
                className="form-select"
                value={selectedAppointmentId}
                onChange={(e) => handleSelectAppointment(e.target.value)}
                required
              >
                <option value="">-- Choose Patient Appointment to Link --</option>
                {appointments.map((apt) => {
                  const existing = invoices.find((i) => Number(i.appointment_id) === Number(apt.id));
                  const dt = new Date(apt.start_time);
                  const dateFormatted = !isNaN(dt.getTime()) ? dt.toLocaleDateString() : apt.start_time;
                  const timeFormatted = !isNaN(dt.getTime())
                    ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                  return (
                    <option key={apt.id} value={apt.id}>
                      #{apt.id} - {apt.patient_name || `Patient #${apt.patient_id}`} with {apt.doctor_name || `Dr. #${apt.doctor_id}`} on {dateFormatted} at {timeFormatted} [{apt.status.toUpperCase()}]{existing ? ` (Invoiced: ${existing.number || `#${existing.id}`})` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Linked Appointment Details Summary Card */}
          {selectedAppointment && (
            <div
              className="card mb-4"
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                padding: '0.85rem 1rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm text-primary">
                  Linked Appointment #{selectedAppointment.id}
                </span>
                <StatusBadge status={selectedAppointment.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted mt-2">
                <div>
                  <strong>Patient:</strong> {selectedAppointment.patient_name || `Patient #${selectedAppointment.patient_id}`}
                </div>
                <div>
                  <strong>Doctor:</strong> {selectedAppointment.doctor_name || `Doctor #${selectedAppointment.doctor_id}`}
                </div>
                <div>
                  <strong>Visit Date:</strong>{' '}
                  {new Date(selectedAppointment.start_time).toLocaleDateString()} at{' '}
                  {new Date(selectedAppointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>
                  <strong>Reason:</strong> {selectedAppointment.reason || 'Routine consultation'}
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Doctor Consultation Fee ($)</label>
              <input
                type="number"
                className="form-control"
                value={billForm.consultation_fee}
                onChange={(e) => setBillForm({ ...billForm, consultation_fee: e.target.value })}
                required
                min={0}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Diagnostic / Lab Charges ($)</label>
              <input
                type="number"
                className="form-control"
                value={billForm.lab_charges}
                onChange={(e) => setBillForm({ ...billForm, lab_charges: e.target.value })}
                min={0}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pharmacy / Medication Charges ($)</label>
              <input
                type="number"
                className="form-control"
                value={billForm.pharmacy_charges}
                onChange={(e) => setBillForm({ ...billForm, pharmacy_charges: e.target.value })}
                min={0}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Discount Percentage (%)</label>
              <input
                type="number"
                className="form-control"
                value={billForm.discount_percentage}
                onChange={(e) => setBillForm({ ...billForm, discount_percentage: e.target.value })}
                min={0}
                max={100}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Clinical Notes / Ledger Remarks</label>
            <input
              type="text"
              className="form-control"
              value={billForm.notes}
              onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
              placeholder="e.g. Outpatient consultation & follow-up"
            />
          </div>

          {/* Real-time Calculation Summary Box */}
          {(() => {
            const { subtotal, discountAmount, taxAmount, totalAmount } = calculateTotals();
            return (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--color-surface-hover)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted">Subtotal (Consultation + Tests + Pharmacy):</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm mb-1 text-danger">
                    <span>Discount ({billForm.discount_percentage}%):</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted">Medical Tax ({billForm.tax_percentage}%):</span>
                  <span className="font-semibold">${taxAmount.toFixed(2)}</span>
                </div>
                <div
                  className="flex justify-between items-center"
                  style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}
                >
                  <span className="font-bold text-base" style={{ color: 'var(--color-navy)' }}>
                    Total Payable Amount:
                  </span>
                  <span className="font-extrabold text-xl" style={{ color: 'var(--color-primary)' }}>
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={generating || appointments.length === 0 || !selectedAppointmentId}
            >
              {generating ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invoice Detail / Receipt View Modal */}
      <Modal
        isOpen={isInvoiceDetailOpen}
        onClose={() => setIsInvoiceDetailOpen(false)}
        title={`Invoice Breakdown: ${activeInvoice?.number || (activeInvoice ? `#${activeInvoice.id}` : '')}`}
      >
        {activeInvoice && (
          <div style={{ padding: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '2px solid var(--color-border)',
                paddingBottom: '1rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-navy)', margin: 0 }}>
                  MedCore Health Clinic
                </h4>
                <div className="text-muted text-xs">Official Clinical Receipt & Invoice</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="font-bold text-primary">{activeInvoice.number || `INV-${activeInvoice.id}`}</div>
                <div className="text-muted text-xs">
                  Date: {activeInvoice.created_at ? new Date(activeInvoice.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-muted">Billed To (Patient):</div>
                <div className="font-bold text-sm">{activeInvoice.patient_name || `Patient #${activeInvoice.patient_id}`}</div>
                <div className="text-xs text-muted">Patient ID: #{activeInvoice.patient_id}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Consulting Physician:</div>
                <div className="font-bold text-sm">{activeInvoice.doctor_name || (activeInvoice.doctor_id ? `Doctor #${activeInvoice.doctor_id}` : 'General Clinic Staff')}</div>
                {activeInvoice.doctor_id && (
                  <div className="text-xs text-muted">Doctor ID: #{activeInvoice.doctor_id}</div>
                )}
              </div>
            </div>

            {/* Linked Appointment Reference */}
            {activeInvoice.appointment_id && (
              <div
                className="mb-4 p-2"
                style={{
                  backgroundColor: 'var(--color-surface-hover)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span className="font-semibold text-primary">Appointment Reference:</span>{' '}
                Scheduled Visit #{activeInvoice.appointment_id}
              </div>
            )}

            {/* Line items table */}
            <div className="table-responsive mb-4">
              <table className="table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th className="text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoice.items && activeInvoice.items.length > 0 ? (
                    activeInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.description}</td>
                        <td>{Number(item.quantity || 1).toFixed(0)}</td>
                        <td>${Number(item.unit_amount || 0).toFixed(2)}</td>
                        <td className="text-right">${Number(item.line_total || item.unit_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>Clinical Consultation Services</td>
                      <td className="text-right">${Number(activeInvoice.subtotal || activeInvoice.total_amount || 0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
              }}
            >
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal:</span>
                <span>${Number(activeInvoice.subtotal || 0).toFixed(2)}</span>
              </div>
              {Number(activeInvoice.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-sm mb-1 text-danger">
                  <span>Discount:</span>
                  <span>-${Number(activeInvoice.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(activeInvoice.tax_amount || 0) > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span>Taxes:</span>
                  <span>${Number(activeInvoice.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div
                className="flex justify-between font-bold text-base"
                style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}
              >
                <span>Final Total:</span>
                <span style={{ color: 'var(--color-primary)' }}>
                  ${Number(activeInvoice.total_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1" style={{ color: 'var(--color-success)' }}>
                <span>Amount Paid:</span>
                <span>${Number(activeInvoice.amount_paid || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Receipts Section */}
            {activeInvoice.payments && activeInvoice.payments.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-bold text-muted uppercase mb-2">Payment Receipts</div>
                <div className="space-y-1">
                  {activeInvoice.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center text-xs p-2"
                      style={{ backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)' }}
                    >
                      <div>
                        <span className="font-bold text-success">#{p.receipt_number}</span>
                        <span className="text-muted ml-2">via {p.method?.toUpperCase()}</span>
                      </div>
                      <div className="font-semibold">${Number(p.amount).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <span className="text-xs text-muted">Status: </span>
                <span
                  className={`badge ${
                    activeInvoice.status === 'paid' || Number(activeInvoice.amount_paid || 0) >= Number(activeInvoice.total_amount || 0)
                      ? 'badge-success'
                      : 'badge-danger'
                  }`}
                >
                  {activeInvoice.status?.toUpperCase()}
                </span>
              </div>
              <button onClick={() => window.print()} className="btn btn-outline btn-sm">
                <Download size={14} />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Confirmation Modal */}
      <Modal
        isOpen={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
        title={`Record Payment for ${paymentInvoice?.number || (paymentInvoice ? `#${paymentInvoice.id}` : '')}`}
      >
        {paymentInvoice && (
          <div>
            <p className="text-muted text-sm mb-4">
              Confirm payment receipt for <strong>{paymentInvoice.patient_name || `Patient #${paymentInvoice.patient_id}`}</strong> for clinical consultation services.
            </p>

            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                textAlign: 'center',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="text-xs text-muted uppercase font-bold mb-1">Total Outstanding Due</div>
              <div className="text-3xl font-extrabold text-primary">
                ${Math.max(0, Number(paymentInvoice.total_amount || 0) - Number(paymentInvoice.amount_paid || 0)).toFixed(2)}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Payment Method</label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="card">Credit / Debit Card</option>
                <option value="cash">Cash In-Hand</option>
                <option value="bank_transfer">Bank Wire Transfer</option>
                <option value="upi">UPI / Digital Wallet</option>
                <option value="insurance">Health Insurance Claim</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPaymentInvoice(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                className="btn btn-success"
                disabled={processingPayment}
              >
                <Check size={16} />
                <span>{processingPayment ? 'Confirming...' : 'Confirm Received Payment'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
