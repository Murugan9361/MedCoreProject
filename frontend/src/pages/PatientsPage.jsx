import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { patientsApi } from '../api/patients';
import { doctorsApi } from '../api/doctors';
import { hospitalsApi } from '../api/hospitals';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const PatientsPage = () => {
  const navigate = useNavigate();
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
    date_of_birth: '1992-05-15',
    place_of_birth: 'New York',
    gender: 'male',
    marital_status: 'single',
    health_change_trigger: 'Routine medical examination',
    blood_type: 'O+',
    doctor_id: '',
    hospital_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

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

      if (docs?.length > 0) {
        setFormData((prev) => ({ ...prev, doctor_id: docs[0].id }));
      }
      if (hosps?.length > 0) {
        setFormData((prev) => ({ ...prev, hospital_id: hosps[0].id }));
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch patients list');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        doctor_id: formData.doctor_id ? Number(formData.doctor_id) : null,
        hospital_id: formData.hospital_id ? Number(formData.hospital_id) : null,
      };

      await patientsApi.createPatient(payload);
      showSuccess(`Patient ${formData.first_name} ${formData.last_name} registered successfully!`);
      setIsRegisterOpen(false);
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
          <LoadingSpinner text="Retrieving patient directory..." />
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
                  <th>Clinical Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => {
                  const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || `Patient #${p.id}`;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="font-semibold text-primary">{name}</div>
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/patients/${p.id}`)}
                            className="btn btn-primary btn-sm"
                            title="View Full Patient EMR"
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
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Email</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Password (min 8 chars)</label>
              <input
                type="password"
                className="form-control"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone Number</label>
              <input
                type="text"
                className="form-control"
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
            <div className="form-group">
              <label className="form-label required">Street Address</label>
              <input
                type="text"
                className="form-control"
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
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">State</label>
              <input
                type="text"
                className="form-control"
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
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Primary Care Doctor</label>
              <select
                className="form-select"
                value={formData.doctor_id}
                onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Hospital Facility</label>
              <select
                className="form-select"
                value={formData.hospital_id}
                onChange={(e) => setFormData({ ...formData, hospital_id: e.target.value })}
              >
                <option value="">Default Facility</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required">Health Change Trigger / Visit Reason</label>
            <input
              type="text"
              className="form-control"
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
