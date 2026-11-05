import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  UserPlus,
  Calendar,
  FileText,
  Phone,
  Mail,
  ChevronRight,
  Filter,
  CreditCard,
  Key,
} from 'lucide-react';
import { patientsApi } from '../api/patients';
import { doctorsApi } from '../api/doctors';
import { hospitalsApi } from '../api/hospitals';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const PatientsPage = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // New Patient Form matching FastAPI PatientCreate model
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    filler_first_name: '',
    filler_last_name: '',
    email: '',
    password: '',
    phone: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    postal_code: '',
    date_of_birth: '1995-05-15',
    place_of_birth: 'City General',
    gender: 'male',
    marital_status: 'single',
    health_change_trigger: 'Routine medical examination and intake',
    blood_type: 'O+',
    doctor_id: '',
    hospital_id: '',
    hospital_name: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user, role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pts, docs, hosps] = await Promise.all([
        patientsApi.getPatients().catch(() => []),
        doctorsApi.getDoctors().catch(() => []),
        hospitalsApi.getHospitals().catch(() => []),
      ]);
      setPatients(pts || []);
      setDoctors(docs || []);
      setHospitals(hosps || []);

      const userHospId = user?.staff_profile?.hospital_id || (hosps?.length > 0 ? hosps[0].id : '');
      const userHospName = hosps?.find((h) => h.id === Number(userHospId))?.name || '';

      setFormData((prev) => ({
        ...prev,
        hospital_id: userHospId,
        hospital_name: userHospName,
        doctor_id: '', // Default to unassigned so no cross-hospital constraint violation occurs
      }));
    } catch (err) {
      showError(err.message || 'Failed to fetch patients list');
    } finally {
      setLoading(false);
    }
  };

  // Doctors available for registration (filtered to current user hospital if staff)
  const availableDoctors = useMemo(() => {
    const userHospId = user?.staff_profile?.hospital_id;
    if (userHospId && role === 'attender') {
      return doctors.filter((d) => Number(d.hospital_id) === Number(userHospId));
    }
    return doctors;
  }, [doctors, user, role]);

  const handleGeneratePassword = () => {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newPass = `MedCore@${suffix}2026!`;
    setFormData((prev) => ({ ...prev, password: newPass }));
    showSuccess('Generated secure 15-character temporary password!');
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();

    // Client-side validation: Password requirements
    if (formData.password.length < 12) {
      showError('Password must be at least 12 characters long');
      return;
    }
    if (
      !/[a-z]/.test(formData.password) ||
      !/[A-Z]/.test(formData.password) ||
      !/\d/.test(formData.password) ||
      !/[^a-zA-Z0-9]/.test(formData.password)
    ) {
      showError(
        'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g. MedCore@2026!)'
      );
      return;
    }

    // Client-side validation: Phone number
    const digits = formData.phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      showError('Phone number must have exactly 10 digits (e.g. 9876543210)');
      return;
    }

    // Check duplicate phone locally to give instant feedback
    const phoneExists = patients.some(
      (p) => p.profile?.phone?.replace(/\D/g, '') === digits
    );
    if (phoneExists) {
      showError(`A patient with phone number ${formData.phone} is already registered.`);
      return;
    }

    setSubmitting(true);

    try {
      let hospId = formData.hospital_id ? Number(formData.hospital_id) : null;
      if (user?.staff_profile?.hospital_id) {
        hospId = Number(user.staff_profile.hospital_id);
      } else if (formData.hospital_name) {
        const match = hospitals.find(
          (h) =>
            h.name.toLowerCase() === formData.hospital_name.toLowerCase() ||
            String(h.id) === formData.hospital_name
        );
        if (match) hospId = match.id;
        else if (!isNaN(Number(formData.hospital_name)) && Number(formData.hospital_name) > 0)
          hospId = Number(formData.hospital_name);
      }

      const payload = {
        ...formData,
        doctor_id: formData.doctor_id ? Number(formData.doctor_id) : null,
        hospital_id: hospId,
      };
      delete payload.hospital_name;

      const registered = await patientsApi.createPatient(payload);
      showSuccess(
        `Patient ${formData.first_name} ${formData.last_name} registered successfully (ID: #${registered.id})!`
      );
      setIsRegisterOpen(false);
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        filler_first_name: '',
        filler_last_name: '',
        email: '',
        password: '',
        phone: '',
        street: '',
        street2: '',
        city: '',
        state: '',
        postal_code: '',
        date_of_birth: '1995-05-15',
        place_of_birth: 'City General',
        gender: 'male',
        marital_status: 'single',
        health_change_trigger: 'Routine medical examination and intake',
        blood_type: 'O+',
        doctor_id: '',
        hospital_id: hospId || '',
        hospital_name: '',
      });
      fetchData();
    } catch (err) {
      showError(err.message || 'Patient registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const q = searchQuery.toLowerCase();
    const fullName = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.toLowerCase();
    const email = (p.email || '').toLowerCase();
    const phone = (p.profile?.phone || '').toLowerCase();
    const id = String(p.id || '');
    return fullName.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q);
  });

  return (
    <div>
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            Patient Management & EMR
          </h2>
          <p className="text-muted text-sm">
            Searchable clinical registry, demographic profiles, and consultation history
          </p>
        </div>

        <button onClick={() => setIsRegisterOpen(true)} className="btn btn-primary">
          <UserPlus size={16} />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="search-box flex-1" style={{ minWidth: '260px' }}>
            <Search size={16} />
            <input
              type="text"
              className="form-control"
              placeholder="Search patients by name, email, phone, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="text-muted text-sm font-medium">
            Showing <span className="text-primary font-bold">{filteredPatients.length}</span> registered patients
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text="Retrieving patient directory from database..." />
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matching patients found"
            description="Try adjusting your search criteria or register a new patient."
            action={
              <button onClick={() => setIsRegisterOpen(true)} className="btn btn-primary btn-sm">
                Register Patient Now
              </button>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient Details</th>
                  <th>Contact Info</th>
                  <th>Gender / DOB</th>
                  <th>Blood Group</th>
                  <th>Clinical Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => {
                  const name =
                    `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() ||
                    `Patient #${p.id}`;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div
                          className="font-semibold text-primary"
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/patients/${p.id}`)}
                        >
                          {name}
                        </div>
                        <div className="text-muted text-xs">Patient ID: #{p.id}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail size={13} className="text-muted" />
                          <span>{p.email}</span>
                        </div>
                        {p.profile?.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted mt-1">
                            <Phone size={13} />
                            <span>{p.profile.phone}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="font-medium text-sm" style={{ textTransform: 'capitalize' }}>
                          {p.profile?.gender || 'N/A'}
                        </div>
                        <div className="text-muted text-xs">
                          DOB: {p.profile?.date_of_birth || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info font-bold">
                          {p.profile?.blood_type || 'O+'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/patients/${p.id}`)}
                            className="btn btn-primary btn-sm"
                            title="View Full Patient EMR and Details"
                          >
                            <FileText size={14} />
                            <span>View Records</span>
                          </button>
                          <button
                            onClick={() => navigate(`/appointments?patient_id=${p.id}`)}
                            className="btn btn-outline btn-sm"
                            title="Book Appointment for Patient"
                          >
                            <Calendar size={14} />
                            <span>Book Visit</span>
                          </button>
                          <button
                            onClick={() => navigate(`/billing?patient_id=${p.id}`)}
                            className="btn btn-outline btn-sm"
                            title="View or Create Invoices for Patient"
                          >
                            <CreditCard size={14} />
                            <span>Billing</span>
                          </button>
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

      {/* Patient Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Clinical Patient Intake Registration"
        size="lg"
      >
        <form onSubmit={handleRegisterPatient}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Rahul"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Sharma"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Email Address (Login Username)</label>
              <input
                type="email"
                className="form-control"
                placeholder="patient@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <div className="flex justify-between items-center mb-1">
                <label className="form-label required" style={{ margin: 0 }}>
                  Password (min 12 chars)
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="btn btn-outline btn-xs"
                  style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}
                >
                  <Key size={11} />
                  <span>Generate</span>
                </button>
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. MedCore@2026!"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={12}
                required
              />
              <div className="text-muted text-xs mt-1">
                Must contain uppercase, lowercase, number, and symbol.
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone Number (10 digits)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={formData.date_of_birth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Gender</label>
              <select
                className="form-select"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Blood Type</label>
              <select
                className="form-select"
                value={formData.blood_type}
                onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Marital Status</label>
              <select
                className="form-select"
                value={formData.marital_status}
                onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label required">Street Address</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 12 Healthcare Avenue"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">City</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mumbai"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">State</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Postal Code</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 400001"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Place of Birth</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mumbai"
                value={formData.place_of_birth}
                onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Assign Primary Care Doctor (Optional)</label>
              <select
                className="form-select"
                value={formData.doctor_id}
                onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
              >
                <option value="">Unassigned / General OPD</option>
                {availableDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialization}) {d.department ? `• ${d.department}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Hospital Facility</label>
              <input
                type="text"
                className="form-control"
                value={
                  hospitals.find((h) => h.id === Number(formData.hospital_id))?.name ||
                  formData.hospital_name ||
                  `Hospital #${formData.hospital_id || 1}`
                }
                disabled
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Health Change Trigger / Visit Reason</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Chronic cough, annual physical checkup"
              value={formData.health_change_trigger}
              onChange={(e) => setFormData({ ...formData, health_change_trigger: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsRegisterOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Registering...' : 'Save & Register Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
