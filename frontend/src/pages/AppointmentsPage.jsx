 import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  User,
  Stethoscope,
  Receipt,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { appointmentsApi } from '../api/appointments';
import { doctorsApi } from '../api/doctors';
import { patientsApi } from '../api/patients';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';

export const AppointmentsPage = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isPatient = role === 'patient';
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patient_id');

  const { showSuccess, showError } = useNotification();

  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [todayOnly, setTodayOnly] = useState(false);

  // Helper to get initial valid clinic date (Mon-Sat 09:00 - 17:00)
  const getNextAvailableDate = () => {
    const now = new Date();
    const d = new Date();
    // Clinic closed on Sunday (0)
    if (d.getDay() === 0) {
      d.setDate(d.getDate() + 1);
    } else if (now.getHours() >= 16 && now.getMinutes() >= 30) {
      // Past clinic hours today, move to tomorrow
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
  };

  // Booking Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [bookForm, setBookForm] = useState({
    doctor_id: '',
    patient_id: preselectedPatientId || '',
    date: getNextAvailableDate(),
    time_slot: '',
    reason: '',
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Reschedule Modal State
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Cancel Modal State
  const [cancelApt, setCancelApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Unique departments extracted from active doctors
  const departments = useMemo(() => {
    const list = doctors.map((d) => d.department).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [doctors]);

  // Doctors filtered by selected department for modal
  const filteredDoctorsForBooking = useMemo(() => {
    if (!selectedDepartment || selectedDepartment === 'all') return doctors;
    return doctors.filter((d) => d.department === selectedDepartment);
  }, [doctors, selectedDepartment]);

  // Currently selected doctor object in modal
  const selectedDoctorObj = useMemo(() => {
    return doctors.find((d) => String(d.id) === String(bookForm.doctor_id)) || null;
  }, [doctors, bookForm.doctor_id]);

  useEffect(() => {
    fetchInitialData();
  }, [role, user]);

  // Handle deep-link patient selection
  useEffect(() => {
    if (preselectedPatientId && !isPatient) {
      setBookForm((prev) => ({ ...prev, patient_id: preselectedPatientId }));
      setIsBookModalOpen(true);
    }
  }, [preselectedPatientId, isPatient]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const promises = [
        appointmentsApi.getAppointments().catch(() => []),
        doctorsApi.getDoctors().catch(() => []),
      ];
      if (!isPatient) {
        promises.push(patientsApi.getPatients().catch(() => []));
      }

      const [apts, docs, pts] = await Promise.all(promises);
      setAppointments(apts || []);
      const docList = docs || [];
      setDoctors(docList);
      setPatients(pts || []);

      if (docList.length > 0) {
        const firstDoc = docList[0];
        const defaultDate = getNextAvailableDate();
        setBookForm((prev) => ({
          ...prev,
          doctor_id: firstDoc.id,
          patient_id: isPatient && user?.id ? user.id : (prev.patient_id || preselectedPatientId || ''),
          date: defaultDate,
        }));
        setSelectedDepartment(firstDoc.department || 'all');
        fetchDoctorSlots(firstDoc.id, defaultDate);
      } else if (isPatient && user?.id) {
        setBookForm((prev) => ({ ...prev, patient_id: user.id }));
      }
    } catch (err) {
      showError(err.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorSlots = async (docId, date) => {
    if (!docId || !date) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const data = await doctorsApi.getDoctorSlots(docId, date);
      const slots = Array.isArray(data)
        ? data
        : Array.isArray(data?.slots)
        ? data.slots
        : [];
      setAvailableSlots(slots);
      if (slots.length > 0) {
        setBookForm((prev) => ({
          ...prev,
          time_slot: slots.includes(prev.time_slot) ? prev.time_slot : slots[0],
        }));
      } else {
        setBookForm((prev) => ({ ...prev, time_slot: '' }));
      }
    } catch {
      setAvailableSlots([]);
      setBookForm((prev) => ({ ...prev, time_slot: '' }));
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDepartmentChange = (dept) => {
    setSelectedDepartment(dept);
    const availableDocs = dept === 'all' ? doctors : doctors.filter((d) => d.department === dept);
    if (availableDocs.length > 0) {
      const nextDocId = availableDocs[0].id;
      setBookForm((prev) => ({ ...prev, doctor_id: nextDocId }));
      fetchDoctorSlots(nextDocId, bookForm.date);
    } else {
      setBookForm((prev) => ({ ...prev, doctor_id: '', time_slot: '' }));
      setAvailableSlots([]);
    }
  };

  const handleDoctorChange = (doctorId) => {
    const doc = doctors.find((d) => String(d.id) === String(doctorId));
    if (doc?.department && selectedDepartment !== 'all' && doc.department !== selectedDepartment) {
      setSelectedDepartment(doc.department);
    }
    setBookForm((prev) => ({ ...prev, doctor_id: doctorId }));
    fetchDoctorSlots(doctorId, bookForm.date);
  };

  const handleDateChange = (date) => {
    setBookForm((prev) => ({ ...prev, date }));
    if (bookForm.doctor_id) {
      fetchDoctorSlots(bookForm.doctor_id, date);
    }
  };

  const handleAdvanceToNextAvailableDay = () => {
    const curr = new Date(bookForm.date || new Date());
    curr.setDate(curr.getDate() + 1);
    if (curr.getDay() === 0) {
      curr.setDate(curr.getDate() + 1); // skip Sunday
    }
    const nextDate = curr.toISOString().split('T')[0];
    setBookForm((prev) => ({ ...prev, date: nextDate }));
    if (bookForm.doctor_id) {
      fetchDoctorSlots(bookForm.doctor_id, nextDate);
    }
  };

  const handleOpenBookModal = () => {
    const initialDoc = doctors[0];
    const initialDocId = initialDoc?.id || '';
    const initialDept = initialDoc?.department || 'all';
    const initialDate = getNextAvailableDate();

    setSelectedDepartment(initialDept);
    setBookForm((prev) => ({
      ...prev,
      doctor_id: initialDocId,
      patient_id: isPatient && user?.id ? user.id : (prev.patient_id || preselectedPatientId || ''),
      date: initialDate,
      time_slot: '',
    }));
    setIsBookModalOpen(true);
    if (initialDocId) {
      fetchDoctorSlots(initialDocId, initialDate);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();

    if (!bookForm.doctor_id) {
      showError('Please select a doctor to book with');
      return;
    }
    if (!bookForm.date) {
      showError('Please choose an appointment date');
      return;
    }
    if (!bookForm.time_slot) {
      showError('Please select an available time slot');
      return;
    }

    const patientIdToBook = isPatient ? user?.id : (bookForm.patient_id ? Number(bookForm.patient_id) : null);
    if (!patientIdToBook) {
      showError('Please select a patient from the directory');
      return;
    }

    setBookingLoading(true);

    try {
      const startIso = `${bookForm.date}T${bookForm.time_slot}:00`;

      // Validate slot is in future
      const startDt = new Date(startIso);
      if (startDt <= new Date()) {
        showError('Appointment time must be in the future');
        setBookingLoading(false);
        return;
      }

      // Prevent duplicate booking for the same doctor and slot in local state
      const isDuplicate = appointments.some(
        (a) =>
          Number(a.doctor_id) === Number(bookForm.doctor_id) &&
          a.start_time?.startsWith(startIso) &&
          a.status !== 'cancelled'
      );
      if (isDuplicate) {
        showError('This time slot is already booked for the selected doctor. Please choose another available slot.');
        setBookingLoading(false);
        return;
      }

      const payload = {
        doctor_id: Number(bookForm.doctor_id),
        patient_id: patientIdToBook,
        start_time: startIso,
        reason: bookForm.reason?.trim() || 'Routine clinical appointment',
      };

      await appointmentsApi.createAppointment(payload);
      showSuccess('Appointment scheduled successfully!');
      setIsBookModalOpen(false);

      // Reload appointments list from real backend
      const updated = await appointmentsApi.getAppointments();
      setAppointments(updated || []);

      // Refresh slots for current selection
      if (bookForm.doctor_id && bookForm.date) {
        fetchDoctorSlots(bookForm.doctor_id, bookForm.date);
      }
    } catch (err) {
      showError(err.message || 'Appointment booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await appointmentsApi.updateStatus(id, status);
      showSuccess(`Status updated to ${status}`);
      const updated = await appointmentsApi.getAppointments();
      setAppointments(updated || []);
    } catch (err) {
      showError(err.message || 'Status transition failed');
    }
  };

  const handleOpenReschedule = async (apt) => {
    setRescheduleApt(apt);
    const currentDate = apt.start_time.split('T')[0];
    setRescheduleDate(currentDate);
    const timeMatch = apt.start_time.match(/T(\d{2}:\d{2})/);
    const currentTime = timeMatch ? timeMatch[1] : '10:00';
    setRescheduleTime(currentTime);

    // Fetch slots for this doctor on that date
    setRescheduleSlotsLoading(true);
    try {
      const data = await doctorsApi.getDoctorSlots(apt.doctor_id, currentDate);
      const slots = Array.isArray(data) ? data : data?.slots || [];
      setRescheduleSlots(slots);
    } catch {
      setRescheduleSlots([]);
    } finally {
      setRescheduleSlotsLoading(false);
    }
  };

  const handleRescheduleDateChange = async (newDate) => {
    setRescheduleDate(newDate);
    if (!rescheduleApt) return;
    setRescheduleSlotsLoading(true);
    try {
      const data = await doctorsApi.getDoctorSlots(rescheduleApt.doctor_id, newDate);
      const slots = Array.isArray(data) ? data : data?.slots || [];
      setRescheduleSlots(slots);
      if (slots.length > 0 && !slots.includes(rescheduleTime)) {
        setRescheduleTime(slots[0]);
      }
    } catch {
      setRescheduleSlots([]);
    } finally {
      setRescheduleSlotsLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleApt) return;
    setRescheduling(true);

    try {
      const startIso = `${rescheduleDate}T${rescheduleTime}:00`;
      await appointmentsApi.reschedule(rescheduleApt.id, startIso);
      showSuccess('Appointment rescheduled successfully!');
      setRescheduleApt(null);
      const updated = await appointmentsApi.getAppointments();
      setAppointments(updated || []);
    } catch (err) {
      showError(err.message || 'Reschedule failed');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelApt) return;
    setCancelling(true);

    try {
      await appointmentsApi.cancel(cancelApt.id, cancelReason);
      showSuccess('Appointment cancelled');
      setCancelApt(null);
      setCancelReason('');
      const updated = await appointmentsApi.getAppointments();
      setAppointments(updated || []);
    } catch (err) {
      showError(err.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  // Filter list
  const filteredAppointments = appointments.filter((apt) => {
    if (selectedStatus !== 'all' && apt.status?.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    if (selectedDoctorId !== 'all' && String(apt.doctor_id) !== String(selectedDoctorId)) return false;
    if (todayOnly && apt.start_time) {
      const aptDate = new Date(apt.start_time).toDateString();
      const todayDate = new Date().toDateString();
      if (aptDate !== todayDate) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            Appointment Scheduling & Queues
          </h2>
          <p className="text-muted text-sm">
            Manage daily clinical schedules, doctor availability, patient intake, and consultation workflows
          </p>
        </div>

        <button onClick={handleOpenBookModal} className="btn btn-primary">
          <Plus size={16} />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card mb-6" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted" />
            <span className="font-semibold text-sm">Status:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Stethoscope size={16} className="text-muted" />
            <span className="font-semibold text-sm">Doctor:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="all">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.department || d.specialization})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTodayOnly(!todayOnly)}
              className={`btn btn-sm ${todayOnly ? 'btn-primary' : 'btn-outline'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Clock size={14} />
              <span>Today's Clinic Queue</span>
            </button>
          </div>

          <div className="flex-1 text-right text-muted text-sm">
            Total: <span className="font-bold text-primary">{filteredAppointments.length}</span> visits
          </div>
        </div>
      </div>

      {/* Appointments List Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Retrieving clinical appointment schedules..." />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments match filters"
            description="Adjust your doctor or status filters above, or schedule a new appointment."
            action={
              <button onClick={handleOpenBookModal} className="btn btn-primary btn-sm">
                Book Visit Now
              </button>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Appointment Time</th>
                  <th>Patient Name</th>
                  <th>Doctor & Department</th>
                  <th>Visit Reason</th>
                  <th>Status</th>
                  <th className="text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id}>
                    <td>
                      <div className="font-bold text-primary">
                        {new Date(apt.start_time).toLocaleDateString()}
                      </div>
                      <div className="text-muted text-xs">
                        {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div className="font-semibold">{apt.patient_name || `Patient #${apt.patient_id}`}</div>
                      <div className="text-muted text-xs">Patient ID: #{apt.patient_id}</div>
                    </td>
                    <td>
                      <div className="font-medium">{apt.doctor_name || `Doctor #${apt.doctor_id}`}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{apt.reason || 'General Checkup'}</span>
                    </td>
                    <td>
                      <StatusBadge status={apt.status} />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {/* Link to Billing & Invoice Action */}
                        <button
                          onClick={() => navigate(`/billing?appointment_id=${apt.id}`)}
                          className="btn btn-outline btn-sm"
                          title="Generate or View Clinical Invoice for this Appointment"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Receipt size={14} />
                          <span>Invoice</span>
                        </button>

                        {apt.status?.toLowerCase() === 'scheduled' && (
                          <>
                            {!isPatient && (
                              <button
                                onClick={() => handleStatusUpdate(apt.id, 'completed')}
                                className="btn btn-success btn-sm"
                                title="Mark consultation completed"
                              >
                                <CheckCircle size={14} />
                                <span>Done</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenReschedule(apt)}
                              className="btn btn-outline btn-sm"
                              title="Reschedule to another time slot"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              onClick={() => setCancelApt(apt)}
                              className="btn btn-danger btn-sm"
                              title="Cancel appointment"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {apt.status?.toLowerCase() === 'completed' && (
                          <span className="text-xs text-muted font-medium">Completed</span>
                        )}
                        {apt.status?.toLowerCase() === 'cancelled' && (
                          <span className="text-xs text-danger font-medium">Cancelled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Schedule Clinical Appointment"
        size="md"
      >
        <form onSubmit={handleBookSubmit}>
          {/* Department Selection */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Select Department</label>
              <select
                className="form-select"
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
              >
                <option value="all">-- All Departments ({departments.length}) --</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Selection */}
            <div className="form-group">
              <label className="form-label required">Select Doctor</label>
              <select
                className="form-select"
                value={bookForm.doctor_id}
                onChange={(e) => handleDoctorChange(e.target.value)}
                required
              >
                <option value="">-- Choose Doctor --</option>
                {filteredDoctorsForBooking.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.department ? `${d.department} • ` : ''}({d.specialization}) — ${d.consultation_fee || '150'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Doctor Summary Card */}
          {selectedDoctorObj && (
            <div
              className="card mb-3"
              style={{
                padding: '0.6rem 0.85rem',
                backgroundColor: 'var(--color-surface-hover)',
                fontSize: '0.85rem',
                border: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <span className="font-semibold text-primary">{selectedDoctorObj.name}</span>
                <span className="text-muted ml-2">
                  ({selectedDoctorObj.department || 'General'} • {selectedDoctorObj.specialization})
                </span>
              </div>
              <div className="font-bold text-success">
                Fee: ${selectedDoctorObj.consultation_fee || 150}
              </div>
            </div>
          )}

          {/* Patient Selection */}
          {isPatient ? (
            <div className="form-group">
              <label className="form-label">Patient</label>
              <input
                type="text"
                className="form-control"
                value={`${user?.full_name || 'Patient'} (Self)`}
                disabled
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label required">Select Patient</label>
              <select
                className="form-select"
                value={bookForm.patient_id}
                onChange={(e) => setBookForm({ ...bookForm, patient_id: e.target.value })}
                required
              >
                <option value="">-- Choose Patient from Directory --</option>
                {patients.map((p) => {
                  const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || p.email;
                  return (
                    <option key={p.id} value={p.id}>
                      {name} ({p.email})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Date and Time Slot */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Appointment Date</label>
              <input
                type="date"
                className="form-control"
                value={bookForm.date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Available Time Slot</label>
              <select
                className="form-select"
                value={bookForm.time_slot}
                onChange={(e) => setBookForm({ ...bookForm, time_slot: e.target.value })}
                required
                disabled={slotsLoading || availableSlots.length === 0}
              >
                {availableSlots.length === 0 ? (
                  <option value="">
                    {slotsLoading ? 'Loading doctor slots...' : 'No slots available for this date'}
                  </option>
                ) : (
                  availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Interactive Slot Pills */}
          {slotsLoading ? (
            <div className="text-muted text-xs mb-3 flex items-center gap-2">
              <Clock size={13} className="text-primary" />
              <span>Fetching available appointment slots for selected clinician...</span>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="mb-3">
              <div className="text-xs font-semibold text-muted mb-1 flex items-center justify-between">
                <span>Select from Available 30-min Clinical Slots:</span>
                <span className="text-primary font-bold">{availableSlots.length} available</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                  maxHeight: '110px',
                  overflowY: 'auto',
                  padding: '2px',
                }}
              >
                {availableSlots.map((slot) => {
                  const isSelected = bookForm.time_slot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setBookForm((prev) => ({ ...prev, time_slot: slot }))}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className="card mb-3"
              style={{
                padding: '0.75rem',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-warning" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
                  <strong>No available time slots on {bookForm.date}</strong>
                  <div>The clinic operates Mon–Sat (09:00 to 17:00). Today's slots may have already passed, the clinic may be closed, or the doctor is booked.</div>
                  <button
                    type="button"
                    onClick={handleAdvanceToNextAvailableDay}
                    className="btn btn-sm btn-outline mt-2"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', backgroundColor: '#ffffff' }}
                  >
                    <span>Check Next Day's Slots</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label required">Reason for Medical Visit</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Follow-up for chest palpitations, routine health examination"
              value={bookForm.reason}
              onChange={(e) => setBookForm({ ...bookForm, reason: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsBookModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={bookingLoading || slotsLoading || availableSlots.length === 0}
            >
              {bookingLoading ? 'Confirming...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleApt}
        onClose={() => setRescheduleApt(null)}
        title="Reschedule Appointment"
      >
        <form onSubmit={handleRescheduleSubmit}>
          <p className="text-muted text-sm mb-4">
            Rescheduling visit for <strong className="text-primary">{rescheduleApt?.patient_name}</strong> with{' '}
            <strong>{rescheduleApt?.doctor_name}</strong>.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">New Date</label>
              <input
                type="date"
                className="form-control"
                value={rescheduleDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => handleRescheduleDateChange(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">New Time</label>
              {rescheduleSlots.length > 0 ? (
                <select
                  className="form-select"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  required
                >
                  {rescheduleSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="time"
                  className="form-control"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  required
                />
              )}
            </div>
          </div>

          {rescheduleSlotsLoading && (
            <div className="text-muted text-xs mb-3 flex items-center gap-1">
              <Clock size={12} /> Fetching clinician availability...
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setRescheduleApt(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={rescheduling}
            >
              {rescheduling ? 'Rescheduling...' : 'Update Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal
        isOpen={!!cancelApt}
        onClose={() => setCancelApt(null)}
        title="Cancel Appointment"
      >
        <form onSubmit={handleCancelSubmit}>
          <p className="text-muted text-sm mb-4">
            Are you sure you want to cancel the appointment for{' '}
            <strong>{cancelApt?.patient_name}</strong> on{' '}
            <strong>{cancelApt && new Date(cancelApt.start_time).toLocaleString()}</strong>?
          </p>

          <div className="form-group">
            <label className="form-label">Reason for Cancellation</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Patient emergency, clinician unavailable"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setCancelApt(null)}
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
