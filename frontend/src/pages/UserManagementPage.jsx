import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  Heart,
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  Calendar,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react';
import { staffApi } from '../api/staff';
import { doctorsApi } from '../api/doctors';
import { patientsApi } from '../api/patients';
import { hospitalsApi } from '../api/hospitals';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge } from '../components/common/StatusBadge';

export const UserManagementPage = () => {
  const { showSuccess, showError } = useNotification();

  // Active role category tab: 'admin' | 'doctor' | 'patient' | 'attender'
  const [activeTab, setActiveTab] = useState('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Real backend data sets
  const [hospitals, setHospitals] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [patientsList, setPatientsList] = useState([]);

  // User Details Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Modals for creating the 4 supported roles
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
  const [isAttenderModalOpen, setIsAttenderModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 1. Admin Form State
  const [adminForm, setAdminForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '1985-05-15',
    gender: 'male',
    street: '124 Healthcare Boulevard',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    designation: 'Hospital Administrator',
    department: 'Hospital Administration',
    hospital_id: 1,
    date_of_joining: new Date().toISOString().split('T')[0],
    emergency_contact_name: 'Primary Contact',
    emergency_contact_phone: '(555) 012-7890',
  });

  // 2. Doctor Form State
  const [doctorForm, setDoctorForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '1982-08-20',
    gender: 'male',
    specialization: 'Cardiology',
    qualification: 'MD, FACC',
    registration_number: 'MD-' + Math.floor(100000 + Math.random() * 900000),
    years_of_experience: 10,
    consultation_fee: 150,
    languages_spoken: 'English, Spanish',
    bio: 'Experienced clinical specialist providing comprehensive cardiac care.',
    street: '450 Medical Arts Plaza',
    city: 'New York',
    state: 'NY',
    postal_code: '10001',
    designation: 'Senior Consultant',
    department: 'Cardiology',
    hospital_id: 1,
    date_of_joining: new Date().toISOString().split('T')[0],
    emergency_contact_name: 'Emergency Clinic Contact',
    emergency_contact_phone: '(555) 012-7890',
  });

  // 3. Attender Form State
  const [attenderForm, setAttenderForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '1996-03-12',
    gender: 'female',
    shift: 'morning',
    street: '780 Wellness Avenue',
    city: 'New York',
    state: 'NY',
    postal_code: '10002',
    designation: 'Attender',
    department: 'General Care',
    hospital_id: 1,
    doctor_id: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    emergency_contact_name: 'Family Contact',
    emergency_contact_phone: '(555) 012-7890',
  });

  // 4. Patient Form State
  const [patientForm, setPatientForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    street: '320 Parkside Drive',
    city: 'New York',
    state: 'NY',
    postal_code: '10003',
    date_of_birth: '1992-06-18',
    place_of_birth: 'New York, USA',
    gender: 'female',
    marital_status: 'single',
    health_change_trigger: 'Routine preventative checkup and wellness consultation',
    blood_type: 'O+',
    hospital_id: 1,
    doctor_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hosps, users, docs, pts] = await Promise.all([
        hospitalsApi.getHospitals().catch(() => []),
        staffApi.getUsers().catch(() => []),
        doctorsApi.getDoctors().catch(() => []),
        patientsApi.getPatients().catch(() => []),
      ]);

      setHospitals(hosps || []);
      setUsersList(users || []);
      setDoctorsList(docs || []);
      setPatientsList(pts || []);

      const hId = hosps?.[0]?.id || 1;
      setAdminForm((prev) => ({ ...prev, hospital_id: hId }));
      setDoctorForm((prev) => ({ ...prev, hospital_id: hId }));
      setAttenderForm((prev) => ({ ...prev, hospital_id: hId }));
      setPatientForm((prev) => ({ ...prev, hospital_id: hId }));
    } catch (err) {
      showError(err.message || 'Error loading user data');
    } finally {
      setLoading(false);
    }
  };

  // 1. Create Admin Handler (POST /admins)
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanPhone = adminForm.phone.replace(/\D/g, '');
      const cleanEmergPhone = (adminForm.emergency_contact_phone || '5550127890').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Phone number must have exactly 10 digits, e.g. (555) 012-7890');
      }
      if (cleanEmergPhone.length !== 10) {
        throw new Error('Emergency contact phone must have exactly 10 digits, e.g. (555) 012-7890');
      }

      const payload = {
        ...adminForm,
        phone: cleanPhone,
        emergency_contact_phone: cleanEmergPhone,
        hospital_id: Number(adminForm.hospital_id),
      };

      await staffApi.createAdmin(payload);
      showSuccess(`Admin ${adminForm.first_name} ${adminForm.last_name} created successfully!`);
      setIsAdminModalOpen(false);
      setAdminForm((prev) => ({
        ...prev,
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
      }));
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to create Admin account');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Create Doctor Handler (POST /doctors)
  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanPhone = doctorForm.phone.replace(/\D/g, '');
      const cleanEmergPhone = (doctorForm.emergency_contact_phone || '5550127890').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Phone number must have exactly 10 digits, e.g. (555) 012-7890');
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
        registration_number: 'MD-' + Math.floor(100000 + Math.random() * 900000),
      }));
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to create Doctor');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Create Attender Handler (POST /attenders)
  const handleCreateAttender = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanPhone = attenderForm.phone.replace(/\D/g, '');
      const cleanEmergPhone = (attenderForm.emergency_contact_phone || '5550127890').replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Phone number must have exactly 10 digits, e.g. (555) 012-7890');
      }
      if (cleanEmergPhone.length !== 10) {
        throw new Error('Emergency contact phone must have exactly 10 digits, e.g. (555) 012-7890');
      }

      const payload = {
        first_name: attenderForm.first_name.trim(),
        last_name: attenderForm.last_name.trim(),
        email: attenderForm.email.trim(),
        password: attenderForm.password,
        phone: cleanPhone,
        date_of_birth: attenderForm.date_of_birth || '1996-03-12',
        gender: attenderForm.gender || 'female',
        shift: attenderForm.shift || 'morning',
        street: attenderForm.street || '780 Wellness Avenue',
        city: attenderForm.city || 'New York',
        state: attenderForm.state || 'NY',
        postal_code: attenderForm.postal_code || '10002',
        designation: attenderForm.designation?.trim() || 'Attender',
        department: attenderForm.department?.trim() || 'General Care',
        hospital_id: Number(attenderForm.hospital_id),
        date_of_joining: attenderForm.date_of_joining || new Date().toISOString().split('T')[0],
        emergency_contact_name: attenderForm.emergency_contact_name || 'Emergency Contact',
        emergency_contact_phone: cleanEmergPhone,
        doctor_id: attenderForm.doctor_id ? Number(attenderForm.doctor_id) : null,
      };

      await staffApi.createAttender(payload);
      showSuccess(`Attender ${attenderForm.first_name} ${attenderForm.last_name} created successfully!`);
      setIsAttenderModalOpen(false);
      setAttenderForm((prev) => ({
        ...prev,
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
        doctor_id: '',
      }));
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to create Attender');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Create Patient Handler (POST /patients)
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanPhone = patientForm.phone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        throw new Error('Phone number must have exactly 10 digits, e.g. (555) 012-7890');
      }

      const payload = {
        ...patientForm,
        phone: cleanPhone,
        hospital_id: Number(patientForm.hospital_id),
        doctor_id: patientForm.doctor_id ? Number(patientForm.doctor_id) : null,
      };

      await patientsApi.createPatient(payload);
      showSuccess(`Patient ${patientForm.first_name} ${patientForm.last_name} registered successfully!`);
      setIsPatientModalOpen(false);
      setPatientForm((prev) => ({
        ...prev,
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        phone: '',
        doctor_id: '',
      }));
      fetchData();
    } catch (err) {
      showError(err.message || 'Failed to register Patient');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered collections according to the 4 active role categories
  const admins = usersList.filter((u) => u.role === 'admin');
  const attenders = usersList.filter((u) => u.role === 'attender');

  const getDisplayedUsers = () => {
    const q = searchQuery.toLowerCase().trim();

    if (activeTab === 'admin') {
      return admins.filter(
        (u) =>
          !q ||
          u.full_name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'doctor') {
      return doctorsList.filter(
        (d) =>
          !q ||
          d.name?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.department?.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'patient') {
      return patientsList.filter((p) => {
        const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || p.email;
        return (
          !q ||
          name.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.profile?.phone?.toLowerCase().includes(q)
        );
      });
    }
    if (activeTab === 'attender') {
      return attenders.filter(
        (a) =>
          !q ||
          a.full_name?.toLowerCase().includes(q) ||
          a.email?.toLowerCase().includes(q)
      );
    }
    return [];
  };

  const displayedUsers = getDisplayedUsers();

  const handleOpenDetails = (userItem) => {
    setSelectedUser({
      ...userItem,
      category: activeTab,
    });
    setIsDetailsModalOpen(true);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)' }}>
            User Management
          </h2>
          <p className="text-muted text-sm">
            Centralized role oversight, user provisioning, and permissions control across hospital facilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'admin' && (
            <button onClick={() => setIsAdminModalOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Create Admin</span>
            </button>
          )}
          {activeTab === 'doctor' && (
            <button onClick={() => setIsDoctorModalOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>doctor creation</span>
            </button>
          )}
          {activeTab === 'patient' && (
            <button onClick={() => setIsPatientModalOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Create Patient</span>
            </button>
          )}
          {activeTab === 'attender' && (
            <button onClick={() => setIsAttenderModalOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Create Attender</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Categories Navigation: Strictly 4 Roles (Admin, Doctor, Patient, Attender) */}
      <div className="tabs mb-6">
        <button
          className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          <ShieldCheck size={16} />
          <span>Admin</span>
          <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>
            {admins.length}
          </span>
        </button>

        <button
          className={`tab ${activeTab === 'doctor' ? 'active' : ''}`}
          onClick={() => setActiveTab('doctor')}
        >
          <Stethoscope size={16} />
          <span>Doctor</span>
          <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>
            {doctorsList.length}
          </span>
        </button>

        <button
          className={`tab ${activeTab === 'patient' ? 'active' : ''}`}
          onClick={() => setActiveTab('patient')}
        >
          <Heart size={16} />
          <span>Patient</span>
          <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>
            {patientsList.length}
          </span>
        </button>

        <button
          className={`tab ${activeTab === 'attender' ? 'active' : ''}`}
          onClick={() => setActiveTab('attender')}
        >
          <UserCheck size={16} />
          <span>Attender</span>
          <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>
            {attenders.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
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
              placeholder={`Search ${activeTab}s by name, email, department, or keyword...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="text-sm text-muted">
            Showing <strong>{displayedUsers.length}</strong> {activeTab} accounts
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="card">
        {loading ? (
          <LoadingSpinner text={`Retrieving ${activeTab} directory...`} />
        ) : displayedUsers.length === 0 ? (
          <EmptyState
            title={`No ${activeTab} accounts found`}
            description={
              searchQuery
                ? `No ${activeTab} records match the search term "${searchQuery}".`
                : `No ${activeTab} accounts registered yet. Use the Create ${activeTab} button to add an account.`
            }
            action={
              <button
                onClick={() => {
                  if (activeTab === 'admin') setIsAdminModalOpen(true);
                  if (activeTab === 'doctor') setIsDoctorModalOpen(true);
                  if (activeTab === 'patient') setIsPatientModalOpen(true);
                  if (activeTab === 'attender') setIsAttenderModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                {activeTab === 'doctor' ? 'doctor creation' : `Create New ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
              </button>
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User / Name</th>
                  <th>Contact Info</th>
                  {activeTab === 'doctor' ? (
                    <>
                      <th>Specialization</th>
                      <th>Consultation Fee</th>
                    </>
                  ) : activeTab === 'patient' ? (
                    <>
                      <th>Blood Group & Gender</th>
                      <th>Date of Birth</th>
                    </>
                  ) : (
                    <>
                      <th>Assigned Role</th>
                      <th>Account Status</th>
                    </>
                  )}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u, idx) => {
                  if (activeTab === 'doctor') {
                    return (
                      <tr key={u.id || idx}>
                        <td>
                          <div className="font-semibold text-primary">{u.name}</div>
                          <div className="text-muted text-xs">Licence: {u.license_number || 'Registered'}</div>
                        </td>
                        <td>
                          <div className="text-sm">{u.department || 'General Medicine'}</div>
                          <div className="text-muted text-xs">Hospital ID: #{u.hospital_id}</div>
                        </td>
                        <td>
                          <span className="badge badge-info">{u.specialization || 'Clinical Specialist'}</span>
                        </td>
                        <td>
                          <span className="font-semibold" style={{ color: 'var(--color-navy)' }}>
                            ${u.consultation_fee || '150'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleOpenDetails(u)}
                            className="btn btn-outline btn-sm"
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  if (activeTab === 'patient') {
                    const name = `${u.profile?.first_name || ''} ${u.profile?.last_name || ''}`.trim() || u.email;
                    return (
                      <tr key={u.id || idx}>
                        <td>
                          <div className="font-semibold text-primary">{name}</div>
                          <div className="text-muted text-xs">Patient ID: #{u.id}</div>
                        </td>
                        <td>
                          <div className="text-sm">{u.email}</div>
                          <div className="text-muted text-xs">{u.profile?.phone || 'No phone recorded'}</div>
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ marginRight: '0.4rem' }}>
                            {u.profile?.blood_type || 'O+'}
                          </span>
                          <span className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>
                            {u.profile?.gender || 'Not specified'}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm">
                            {u.profile?.date_of_birth ? new Date(u.profile.date_of_birth).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleOpenDetails(u)}
                            className="btn btn-outline btn-sm"
                          >
                            <Eye size={14} />
                            <span>View Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Admin or Attender
                  return (
                    <tr key={u.id || idx}>
                      <td>
                        <div className="font-semibold text-primary">{u.full_name}</div>
                        <div className="text-muted text-xs">User ID: #{u.id}</div>
                      </td>
                      <td>
                        <div className="text-sm">{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-warning'}`}>
                          {u.role?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleOpenDetails(u)}
                          className="btn btn-outline btn-sm"
                        >
                          <Eye size={14} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`${selectedUser?.category?.toUpperCase() || 'User'} Profile Details`}
      >
        {selectedUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--color-surface-hover)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                }}
              >
                {selectedUser.name?.[0] || selectedUser.full_name?.[0] || selectedUser.email?.[0] || 'U'}
              </div>
              <div>
                <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-navy)', margin: 0 }}>
                  {selectedUser.name || selectedUser.full_name || `${selectedUser.profile?.first_name || ''} ${selectedUser.profile?.last_name || ''}`.trim() || selectedUser.email}
                </h4>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  <span className="badge badge-primary">{selectedUser.category?.toUpperCase()}</span>
                  <span className="text-xs text-muted">ID: #{selectedUser.id}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted">Email Address</div>
                <div className="font-semibold text-sm">{selectedUser.email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Phone Number</div>
                <div className="font-semibold text-sm">{selectedUser.profile?.phone || selectedUser.phone || 'N/A'}</div>
              </div>
              {selectedUser.specialization && (
                <div>
                  <div className="text-xs text-muted">Clinical Specialization</div>
                  <div className="font-semibold text-sm">{selectedUser.specialization}</div>
                </div>
              )}
              {selectedUser.consultation_fee && (
                <div>
                  <div className="text-xs text-muted">Consultation Fee</div>
                  <div className="font-semibold text-sm">${selectedUser.consultation_fee}</div>
                </div>
              )}
              {selectedUser.department && (
                <div>
                  <div className="text-xs text-muted">Department</div>
                  <div className="font-semibold text-sm">{selectedUser.department}</div>
                </div>
              )}
              {selectedUser.profile?.blood_type && (
                <div>
                  <div className="text-xs text-muted">Blood Group</div>
                  <div className="font-semibold text-sm">{selectedUser.profile.blood_type}</div>
                </div>
              )}
              {selectedUser.profile?.gender && (
                <div>
                  <div className="text-xs text-muted">Gender</div>
                  <div className="font-semibold text-sm" style={{ textTransform: 'capitalize' }}>
                    {selectedUser.profile.gender}
                  </div>
                </div>
              )}
              {selectedUser.hospital_id && (
                <div>
                  <div className="text-xs text-muted">Hospital Affiliation</div>
                  <div className="font-semibold text-sm">Hospital #{selectedUser.hospital_id}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setIsDetailsModalOpen(false)} className="btn btn-outline">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 1. Create Admin Modal */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        title="Create New Hospital Admin Account"
      >
        <form onSubmit={handleCreateAdmin}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input
                type="text"
                className="form-control"
                value={adminForm.first_name}
                onChange={(e) => setAdminForm({ ...adminForm, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input
                type="text"
                className="form-control"
                value={adminForm.last_name}
                onChange={(e) => setAdminForm({ ...adminForm, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Temporary Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min 8 characters"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone (10 digits)</label>
              <input
                type="text"
                className="form-control"
                placeholder="(555) 012-7890"
                value={adminForm.phone}
                onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Assigned Hospital</label>
              <select
                className="form-select"
                value={adminForm.hospital_id}
                onChange={(e) => setAdminForm({ ...adminForm, hospital_id: e.target.value })}
                required
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (#{h.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Designation</label>
              <input
                type="text"
                className="form-control"
                value={adminForm.designation}
                onChange={(e) => setAdminForm({ ...adminForm, designation: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Department</label>
              <input
                type="text"
                className="form-control"
                value={adminForm.department}
                onChange={(e) => setAdminForm({ ...adminForm, department: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsAdminModalOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating Admin...' : 'Create Admin Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 2. Doctor Creation Modal */}
      <Modal
        isOpen={isDoctorModalOpen}
        onClose={() => setIsDoctorModalOpen(false)}
        title="doctor creation"
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
              <label className="form-label required">Email</label>
              <input
                type="email"
                className="form-control"
                value={doctorForm.email}
                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Password</label>
              <input
                type="password"
                className="form-control"
                value={doctorForm.password}
                onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone (10 digits)</label>
              <input
                type="text"
                className="form-control"
                placeholder="(555) 012-7890"
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
                required
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
                value={doctorForm.specialization}
                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Medical Registration Number</label>
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
              <label className="form-label required">Qualification</label>
              <input
                type="text"
                className="form-control"
                value={doctorForm.qualification}
                onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })}
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
              <label className="form-label required">Hospital Facility</label>
              <select
                className="form-select"
                value={doctorForm.hospital_id}
                onChange={(e) => setDoctorForm({ ...doctorForm, hospital_id: e.target.value })}
                required
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (#{h.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Consultation Fee ($)</label>
              <input
                type="number"
                className="form-control"
                value={doctorForm.consultation_fee}
                onChange={(e) => setDoctorForm({ ...doctorForm, consultation_fee: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Years of Experience</label>
              <input
                type="number"
                className="form-control"
                value={doctorForm.years_of_experience}
                onChange={(e) => setDoctorForm({ ...doctorForm, years_of_experience: e.target.value })}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsDoctorModalOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating Doctor...' : 'doctor creation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Create Patient Modal */}
      <Modal
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        title="Register New Clinical Patient"
      >
        <form onSubmit={handleCreatePatient}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input
                type="text"
                className="form-control"
                value={patientForm.first_name}
                onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input
                type="text"
                className="form-control"
                value={patientForm.last_name}
                onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })}
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
                value={patientForm.email}
                onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Password</label>
              <input
                type="password"
                className="form-control"
                value={patientForm.password}
                onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone (10 digits)</label>
              <input
                type="text"
                className="form-control"
                placeholder="(555) 012-7890"
                value={patientForm.phone}
                onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={patientForm.date_of_birth}
                onChange={(e) => setPatientForm({ ...patientForm, date_of_birth: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Blood Group</label>
              <select
                className="form-select"
                value={patientForm.blood_type}
                onChange={(e) => setPatientForm({ ...patientForm, blood_type: e.target.value })}
                required
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
              <label className="form-label required">Gender</label>
              <select
                className="form-select"
                value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Marital Status</label>
              <select
                className="form-select"
                value={patientForm.marital_status}
                onChange={(e) => setPatientForm({ ...patientForm, marital_status: e.target.value })}
                required
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Hospital Facility</label>
              <select
                className="form-select"
                value={patientForm.hospital_id}
                onChange={(e) => setPatientForm({ ...patientForm, hospital_id: e.target.value })}
                required
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (#{h.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Primary Care Doctor (Optional)</label>
              <select
                className="form-select"
                value={patientForm.doctor_id || ''}
                onChange={(e) => setPatientForm({ ...patientForm, doctor_id: e.target.value })}
              >
                <option value="">None (Unassigned)</option>
                {doctorsList
                  .filter((d) => Number(d.hospital_id) === Number(patientForm.hospital_id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} ({d.specialization})
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Place of Birth</label>
              <input
                type="text"
                className="form-control"
                value={patientForm.place_of_birth}
                onChange={(e) => setPatientForm({ ...patientForm, place_of_birth: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsPatientModalOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Create Patient Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Create Attender Modal */}
      <Modal
        isOpen={isAttenderModalOpen}
        onClose={() => setIsAttenderModalOpen(false)}
        title="Create New Attender Account"
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
              <label className="form-label required">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={attenderForm.email}
                onChange={(e) => setAttenderForm({ ...attenderForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Temporary Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Min 8 characters"
                value={attenderForm.password}
                onChange={(e) => setAttenderForm({ ...attenderForm, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Assigned Shift</label>
              <select
                className="form-select"
                value={attenderForm.shift}
                onChange={(e) => setAttenderForm({ ...attenderForm, shift: e.target.value })}
                required
              >
                <option value="morning">Morning Shift (07:00 - 15:00)</option>
                <option value="evening">Evening Shift (15:00 - 23:00)</option>
                <option value="night">Night Shift (23:00 - 07:00)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Hospital Facility</label>
              <select
                className="form-select"
                value={attenderForm.hospital_id}
                onChange={(e) => setAttenderForm({ ...attenderForm, hospital_id: e.target.value })}
                required
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (#{h.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone (10 digits)</label>
              <input
                type="text"
                className="form-control"
                placeholder="(555) 012-7890"
                value={attenderForm.phone}
                onChange={(e) => setAttenderForm({ ...attenderForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Designation</label>
              <input
                type="text"
                className="form-control"
                value={attenderForm.designation}
                onChange={(e) => setAttenderForm({ ...attenderForm, designation: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
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
            <div className="form-group">
              <label className="form-label">Supervising Doctor (Optional)</label>
              <select
                className="form-select"
                value={attenderForm.doctor_id || ''}
                onChange={(e) => setAttenderForm({ ...attenderForm, doctor_id: e.target.value })}
              >
                <option value="">None (Unassigned)</option>
                {doctorsList
                  .filter((d) => Number(d.hospital_id) === Number(attenderForm.hospital_id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} ({d.specialization})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={() => setIsAttenderModalOpen(false)} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating Attender...' : 'Create Attender Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
