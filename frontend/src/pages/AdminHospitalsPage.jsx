import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  CheckCircle,
  Building,
} from 'lucide-react';
import { hospitalsApi } from '../api/hospitals';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Modal } from '../components/common/Modal';

export const AdminHospitalsPage = () => {
  const { showSuccess, showError } = useNotification();

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const data = await hospitalsApi.getHospitals();
      setHospitals(data || []);
    } catch (err) {
      showError(err.message || 'Failed to load hospital facilities');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    if (!hospitalName.trim()) return;

    setSubmitting(true);
    try {
      await hospitalsApi.createHospital({ name: hospitalName.trim() });
      showSuccess(`Hospital facility "${hospitalName}" registered successfully!`);
      setIsModalOpen(false);
      setHospitalName('');
      fetchHospitals();
    } catch (err) {
      showError(err.message || 'Failed to register hospital');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            Hospital Facilities & Network Branches
          </h2>
          <p className="text-muted text-sm">
            Enterprise health system network, facility management, and hospital onboarding
          </p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Register New Hospital</span>
        </button>
      </div>

      {/* Hospital Facilities Grid */}
      {loading ? (
        <LoadingSpinner text="Retrieving registered medical centers..." />
      ) : hospitals.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Building2 size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem auto' }} />
          <h4 className="font-bold text-lg mb-2">No Hospitals Registered</h4>
          <p className="text-muted text-sm mb-4">Register your health system's main hospital or branch clinic.</p>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
            Register Hospital
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {hospitals.map((hosp) => (
            <div key={hosp.id} className="card">
              <div className="card-header" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--color-navy)' }}>
                      {hosp.name}
                    </h3>
                    <div className="text-muted text-xs">Facility ID: #{hosp.id}</div>
                  </div>
                </div>
                <span className="badge badge-success">
                  <span className="badge-dot" />
                  Active
                </span>
              </div>

              <div className="card-body">
                <div className="mb-3 flex items-center gap-2 text-sm text-muted">
                  <MapPin size={15} />
                  <span>Licensed Healthcare Provider Facility</span>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--color-surface-hover)',
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <div className="text-muted text-xs">Accreditation</div>
                    <div className="font-semibold text-primary">JCAHO Verified</div>
                  </div>
                  <div>
                    <div className="text-muted text-xs">EMR Status</div>
                    <div className="font-semibold text-success">Integrated</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Hospital Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Hospital / Facility"
      >
        <form onSubmit={handleCreateHospital}>
          <div className="form-group">
            <label className="form-label required">Hospital Facility Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Metro General Hospital & Trauma Center"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Registering...' : 'Register Hospital Facility'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
