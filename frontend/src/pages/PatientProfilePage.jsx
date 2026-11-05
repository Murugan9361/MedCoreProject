import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Activity,
  Edit2,
  Save,
  X,
  Shield,
  FileText,
} from 'lucide-react';
import { patientsApi } from '../api/patients';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const PatientProfilePage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    phone: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    postal_code: '',
    blood_type: 'O+',
    marital_status: 'single',
    health_change_trigger: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await patientsApi.getMyProfile();
      setProfileData(data);
      const prof = data.profile || {};
      setFormData({
        phone: prof.phone || '',
        street: prof.street || '',
        street2: prof.street2 || '',
        city: prof.city || '',
        state: prof.state || '',
        postal_code: prof.postal_code || '',
        blood_type: prof.blood_type || 'O+',
        marital_status: prof.marital_status || 'single',
        health_change_trigger: prof.health_change_trigger || '',
      });
    } catch (err) {
      showError(err.message || 'Failed to load personal profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Validate phone has 10 digits
      const digits = (formData.phone || '').replace(/\D/g, '');
      if (digits.length !== 10) {
        showError('Please enter a valid 10-digit phone number');
        setSaving(false);
        return;
      }

      const payload = {
        phone: formData.phone,
        street: formData.street || undefined,
        street2: formData.street2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postal_code: formData.postal_code || undefined,
        blood_type: formData.blood_type || undefined,
        marital_status: formData.marital_status || undefined,
        health_change_trigger: formData.health_change_trigger || undefined,
      };

      const updated = await patientsApi.updateMyProfile(payload);
      setProfileData(updated);
      showSuccess('Profile details updated successfully');
      setIsEditing(false);
    } catch (err) {
      showError(err.message || 'Failed to update details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading your medical profile..." />;
  }

  const prof = profileData?.profile || {};

  return (
    <div className="container" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)' }}>
            My Medical Details & Profile
          </h2>
          <p className="text-muted text-sm">
            View and manage your personal demographics, contact info, and medical records summary
          </p>
        </div>

        <div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              <Edit2 size={16} />
              <span>Edit My Details</span>
            </button>
          ) : (
            <button onClick={() => setIsEditing(false)} className="btn btn-outline">
              <X size={16} />
              <span>Cancel Editing</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 border-b pb-6 mb-6">
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-light, #e0f2fe)',
              color: 'var(--color-primary, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.5rem',
            }}
          >
            {profileData?.full_name?.charAt(0)?.toUpperCase() || 'P'}
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              {profileData?.full_name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted">
              <span>Patient ID: #{profileData?.id}</span>
              <span>•</span>
              <span className="badge badge-success">ACTIVE PATIENT</span>
              <span>•</span>
              <span>Hospital #{prof.hospital_id || 1}</span>
            </div>
          </div>
        </div>

        {!isEditing ? (
          /* View Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                <User size={15} /> Contact & Demographics
              </h4>
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <div>
                  <div className="text-xs text-muted">Email Address</div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Mail size={14} className="text-muted" />
                    {profileData?.email}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Phone Number</div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Phone size={14} className="text-muted" />
                    {prof.phone || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Date of Birth & Gender</div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Calendar size={14} className="text-muted" />
                    {prof.date_of_birth || 'Not recorded'} ({prof.gender ? prof.gender.toUpperCase() : 'N/A'})
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Marital Status</div>
                  <div className="font-semibold text-sm">
                    {prof.marital_status ? prof.marital_status.replace('_', ' ').toUpperCase() : 'Not provided'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                <Heart size={15} /> Clinical Profile & Vitals
              </h4>
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                <div>
                  <div className="text-xs text-muted">Blood Group</div>
                  <div className="font-semibold text-sm">
                    <span className="badge badge-info" style={{ fontSize: '0.9rem' }}>
                      {prof.blood_type || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Residential Address</div>
                  <div className="font-semibold text-sm flex items-start gap-2">
                    <MapPin size={14} className="text-muted mt-0.5" />
                    <span>
                      {[prof.street, prof.street2, prof.city, prof.state, prof.postal_code]
                        .filter(Boolean)
                        .join(', ') || 'No address on file'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Primary Medical Concerns / Health Trigger</div>
                  <div className="font-semibold text-sm text-secondary" style={{ fontStyle: prof.health_change_trigger ? 'normal' : 'italic' }}>
                    {prof.health_change_trigger || 'No specific health concerns documented'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label required">Contact Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  className="form-control"
                  placeholder="(555) 012-3456"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
                <span className="text-xs text-muted">10-digit mobile or contact number</span>
              </div>

              <div className="form-group">
                <label className="form-label">Blood Group</label>
                <select
                  name="blood_type"
                  className="form-select"
                  value={formData.blood_type}
                  onChange={handleInputChange}
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
                <label className="form-label">Marital Status</label>
                <select
                  name="marital_status"
                  className="form-select"
                  value={formData.marital_status}
                  onChange={handleInputChange}
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                  <option value="long_term_partnership">Long Term Partnership</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input
                  type="text"
                  name="street"
                  className="form-control"
                  placeholder="e.g. 123 Health Ave"
                  value={formData.street}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Apt / Suite / Street 2</label>
                <input
                  type="text"
                  name="street2"
                  className="form-control"
                  placeholder="e.g. Apt 4B"
                  value={formData.street2}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  name="city"
                  className="form-control"
                  placeholder="e.g. New York"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  type="text"
                  name="state"
                  className="form-control"
                  placeholder="e.g. NY"
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input
                  type="text"
                  name="postal_code"
                  className="form-control"
                  placeholder="e.g. 10001"
                  value={formData.postal_code}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Medical Concerns / Health Summary</label>
                <textarea
                  name="health_change_trigger"
                  className="form-control"
                  rows={3}
                  placeholder="Document any chronic conditions, allergies, or health updates..."
                  value={formData.health_change_trigger}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={16} />
                <span>{saving ? 'Saving Details...' : 'Save My Details'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

