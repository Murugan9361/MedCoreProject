import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Stethoscope,
  ShieldCheck,
  Plus,
  Mail,
  Phone,
  Building,
  Award,
} from 'lucide-react';
import { doctorsApi } from '../api/doctors';
import { staffApi } from '../api/staff';
import { hospitalsApi } from '../api/hospitals';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';

export const AdminStaffPage = () => {
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' | 'attenders'
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Onboard Doctor Modal
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [doctorForm, setDoctorForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '1985-04-12',
    gender: 'male',
    specialization: 'Cardiology',
    qualification: 'MD, FACC',
    registration_number: 'MD-2026-9041',
    years_of_experience: 10,
    consultation_fee: 150,
    languages_spoken: 'English, Spanish',
    bio: 'Board-certified clinical specialist with focus on preventative cardiology.',
    street: '100 Hospital Way',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    designation: 'Senior Consultant',
    hospital_id: 1,
    department: 'Cardiology',
    date_of_joining: new Date().toISOString().split('T')[0],
    emergency_contact_name: 'Dr. John Doe',
    emergency_contact_phone: '(555) 012-7890',
  });
  const [savingDoctor, setSavingDoctor] = useState(false);

  // Onboard Attender Modal
  const [isAttenderModalOpen, setIsAttenderModalOpen] = useState(false);
  const [attenders, setAttenders] = useState([]);
  const [attenderForm, setAttenderForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '1995-08-20',
    gender: 'female',
    shift: 'morning',
    department: 'Emergency & Triage Intake',
    street: '200 Clinic Lane',
    city: 'New York',
    state: 'NY',
    postal_code: '10002',
    designation: 'Attender',
    hospital_id: 1,
    date_of_joining: new Date().toISOString().split('T')[0],
    emergency_contact_name: 'Contact Person',
    emergency_contact_phone: '(555) 012-7890',
  });
  const [savingAttender, setSavingAttender] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const [docs, hosps, users] = await Promise.all([
        doctorsApi.getDoctors().catch(() => []),
        hospitalsApi.getHospitals().catch(() => []),
        staffApi.getUsers().catch(() => []),
      ]);
      setDoctors(docs || []);
      setHospitals(hosps || []);
      setAttenders((users || []).filter((u) => u.role === 'attender'));

      if (hosps?.length > 0) {
        setDoctorForm((prev) => ({ ...prev, hospital_id: hosps[0].id }));
        setAttenderForm((prev) => ({ ...prev, hospital_id: hosps[0].id }));
      }
    } catch (err) {
      showError(err.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setSavingDoctor(true);

    try {
      const cleanPhone = doctorForm.phone.replace(/\D/g, '');
      const cleanEmergPhone = (doctorForm.emergency_contact_phone || '5550127890').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Phone must have exactly 10 digits, e.g. (555) 012-7890');
      }
      if (cleanEmergPhone.length !== 10) {
        throw new Error('Emergency contact phone must have exactly 10 digits, e.g. (555) 012-7890');
      }

      const payload = {
        ...doctorForm,
        phone: cleanPhone,
        emergency_contact_phone: cleanEmergPhone,
        years_of_experience: Number(doctorForm.years_of_experience),
        consultation_fee: Number(doctorForm.consultation_fee),
        hospital_id: Number(doctorForm.hospital_id),
      };

      await doctorsApi.createDoctor(payload);
      showSuccess(`Doctor Dr. ${doctorForm.first_name} ${doctorForm.last_name} created successfully!`);
      setIsDoctorModalOpen(false);
      setDoctorForm((prev) => ({
        ...prev,
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
        registration_number: `MD-${Date.now().toString().slice(-6)}`,
      }));
      fetchStaff();
    } catch (err) {
      showError(err.message || 'Failed to create doctor');
    } finally {
      setSavingDoctor(false);
    }
  };

  const handleCreateAttender = async (e) => {
    e.preventDefault();
    setSavingAttender(true);

    try {
      const cleanPhone = attenderForm.phone.replace(/\D/g, '');
      const cleanEmergPhone = (attenderForm.emergency_contact_phone || '5550127890').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Phone must have exactly 10 digits, e.g. (555) 012-7890');
      }
      if (cleanEmergPhone.length !== 10) {
        throw new Error('Emergency contact phone must have exactly 10 digits, e.g. (555) 012-7890');
      }

      const payload = {
        ...attenderForm,
        phone: cleanPhone,
        emergency_contact_phone: cleanEmergPhone,
        hospital_id: Number(attenderForm.hospital_id),
        doctor_id: attenderForm.doctor_id ? Number(attenderForm.doctor_id) : null,
      };

      await staffApi.createAttender(payload);
      showSuccess(`Attender ${attenderForm.first_name} ${attenderForm.last_name} created successfully!`);
      setIsAttenderModalOpen(false);
      fetchStaff();
    } catch (err) {
      showError(err.message || 'Failed to create attender');
    } finally {
      setSavingAttender(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            Clinical Staff Administration
          </h2>
          <p className="text-muted text-sm">
            Onboard medical doctors, attenders, and manage clinic personnel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsDoctorModalOpen(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>doctor creation</span>
          </button>
          <button onClick={() => setIsAttenderModalOpen(true)} className="btn btn-outline">
            <Plus size={16} />
            <span>Create Attender</span>
          </button>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="tabs mb-4">
        <button
          className={`tab ${activeTab === 'doctors' ? 'active' : ''}`}
          onClick={() => setActiveTab('doctors')}
        >
          <Stethoscope size={16} />
          <span>Specialists & Doctors ({doctors.length})</span>
        </button>
        <button
          className={`tab ${activeTab === 'attenders' ? 'active' : ''}`}
          onClick={() => setActiveTab('attenders')}
        >
          <UserCheck size={16} />
          <span>Attenders ({attenders.length})</span>
        </button>
      </div>

      {/* Staff Directory Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {activeTab === 'doctors' ? (
              <>
                <Stethoscope size={18} color="var(--color-primary)" />
                <span>Active Clinicians & Specialists ({doctors.length})</span>
              </>
            ) : (
              <>
                <UserCheck size={18} color="var(--color-primary)" />
                <span>Active Attenders ({attenders.length})</span>
              </>
            )}
          </h3>
        </div>

        {loading ? (
          <LoadingSpinner text="Retrieving clinical staff directory..." />
        ) : activeTab === 'doctors' ? (
          doctors.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No doctors currently onboarded. Click 'doctor creation' to register medical staff.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor Name</th>
                    <th>Specialization & Dept</th>
                    <th>Consultation Fee</th>
                    <th>Languages</th>
                    <th>Bio / Expertise</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="font-bold text-primary">{doc.name}</div>
                        <div className="text-muted text-xs">Doctor ID: #{doc.id}</div>
                      </td>
                      <td>
                        <div className="font-semibold">{doc.specialization}</div>
                        <div className="text-muted text-xs">{doc.department || 'General Medicine'}</div>
                      </td>
                      <td>
                        <span className="badge badge-success">
                          ${doc.consultation_fee || '150'} / visit
                        </span>
                      </td>
                      <td>{doc.languages_spoken || 'English'}</td>
                      <td className="text-muted text-xs" style={{ maxWidth: '280px' }}>
                        {doc.bio || 'General clinical consultation and inpatient care'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          attenders.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No attenders currently registered under this account. Click 'Onboard Nurse / Attender' to register staff.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attenders.map((att) => (
                    <tr key={att.id}>
                      <td>
                        <div className="font-bold text-primary">{att.full_name}</div>
                        <div className="text-muted text-xs">User ID: #{att.id}</div>
                      </td>
                      <td>{att.email}</td>
                      <td>
                        <span className="badge badge-info">Attender / Nurse</span>
                      </td>
                      <td>
                        <span className={`badge ${att.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {att.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Doctor Creation Modal */}
      <Modal
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        title="doctor creation"
        size="lg"
      >
        <form onSubmit={handleCreateDoctor}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.first_name}
                onChange={(e) => setDoctorForm({ ...doctorForm, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.last_name}
                onChange={(e) => setDoctorForm({ ...doctorForm, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Clinical Email</label>
              <input
                type="email"
                className="form-control"
                value={doctorForm.email}
                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Password (min 8 chars)</label>
              <input
                type="password"
                className="form-control"
                value={doctorForm.password}
                onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.phone}
                onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={doctorForm.date_of_birth}
                onChange={(e) => setDoctorForm({ ...doctorForm, date_of_birth: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Gender</label>
              <select
                className="form-select"
                value={doctorForm.gender}
                onChange={(e) => setDoctorForm({ ...doctorForm, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Specialization</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Cardiology, Neurology, Pediatrics"
                value={doctorForm.specialization}
                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Qualification</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. MD, MBBS, FACC"
                value={doctorForm.qualification}
                onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">License / Reg Number</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.registration_number}
                onChange={(e) => setDoctorForm({ ...doctorForm, registration_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Years of Experience</label>
              <input
                type="number"
                className="form-control"
                value={doctorForm.years_of_experience}
                onChange={(e) => setDoctorForm({ ...doctorForm, years_of_experience: e.target.value })}
                min={0}
                max={70}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Consultation Fee ($)</label>
              <input
                type="number"
                className="form-control"
                value={doctorForm.consultation_fee}
                onChange={(e) => setDoctorForm({ ...doctorForm, consultation_fee: e.target.value })}
                min={0}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Department</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.department}
                onChange={(e) => setDoctorForm({ ...doctorForm, department: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Street Address</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.street}
                onChange={(e) => setDoctorForm({ ...doctorForm, street: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">City</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.city}
                onChange={(e) => setDoctorForm({ ...doctorForm, city: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">State</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.state}
                onChange={(e) => setDoctorForm({ ...doctorForm, state: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Postal Code</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.postal_code}
                onChange={(e) => setDoctorForm({ ...doctorForm, postal_code: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Hospital Facility</label>
              <select
                className="form-select"
                value={doctorForm.hospital_id}
                onChange={(e) => setDoctorForm({ ...doctorForm, hospital_id: e.target.value })}
                required
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Designation</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.designation}
                onChange={(e) => setDoctorForm({ ...doctorForm, designation: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Emergency Contact Name</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.emergency_contact_name}
                onChange={(e) => setDoctorForm({ ...doctorForm, emergency_contact_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Emergency Contact Phone</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.emergency_contact_phone}
                onChange={(e) => setDoctorForm({ ...doctorForm, emergency_contact_phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Professional Bio & Specialties</label>
            <textarea
              rows={3}
              className="form-textarea"
              value={doctorForm.bio}
              onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsDoctorModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingDoctor}
            >
              {savingDoctor ? 'Creating Doctor...' : 'doctor creation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Attender Modal */}
      <Modal
        isOpen={isAttenderModalOpen}
        onClose={() => setIsAttenderModalOpen(false)}
        title="Create Attender"
        size="lg"
      >
        <form onSubmit={handleCreateAttender}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input
                type="text"
                className="form-control"
                value={attenderForm.first_name}
                onChange={(e) => setAttenderForm({ ...attenderForm, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input
                type="text"
                className="form-control"
                value={attenderForm.last_name}
                onChange={(e) => setAttenderForm({ ...attenderForm, last_name: e.target.value })}
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
                value={attenderForm.email}
                onChange={(e) => setAttenderForm({ ...attenderForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Password (min 8 chars)</label>
              <input
                type="password"
                className="form-control"
                value={attenderForm.password}
                onChange={(e) => setAttenderForm({ ...attenderForm, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Shift</label>
              <select
                className="form-select"
                value={attenderForm.shift}
                onChange={(e) => setAttenderForm({ ...attenderForm, shift: e.target.value })}
              >
                <option value="morning">Morning Shift (07:00 - 15:00)</option>
                <option value="evening">Evening Shift (15:00 - 23:00)</option>
                <option value="night">Night Shift (23:00 - 07:00)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Department</label>
              <input
                type="text"
                className="form-control"
                value={attenderForm.department}
                onChange={(e) => setAttenderForm({ ...attenderForm, department: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Street Address</label>
              <input
                type="text"
                className="form-control"
                value={attenderForm.street}
                onChange={(e) => setAttenderForm({ ...attenderForm, street: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">City</label>
              <input
                type="text"
                className="form-control"
                value={attenderForm.city}
                onChange={(e) => setAttenderForm({ ...attenderForm, city: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">State</label>
              <input
                type="text"
                className="form-control"
                value={attenderForm.state}
                onChange={(e) => setAttenderForm({ ...attenderForm, state: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Postal Code</label>
              <input
                type="text"
                className="form-control"
                value={attenderForm.postal_code}
                onChange={(e) => setAttenderForm({ ...attenderForm, postal_code: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsAttenderModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingAttender}
            >
              {savingAttender ? 'Creating Attender...' : 'Create Attender'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
