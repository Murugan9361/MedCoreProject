import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Stethoscope,
  Pill,
  Trash2,
  Calendar,
  User,
  Search,
} from 'lucide-react';
import { patientsApi } from '../api/patients';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { SpeechToTextRecorder } from '../components/common/SpeechToTextRecorder';

export const ConsultationsPage = () => {
  const { user, role } = useAuth();
  const isPatient = role === 'patient';
  const { showSuccess, showError } = useNotification();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // New Consultation Modal
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [formPatientId, setFormPatientId] = useState('');
  const [recordForm, setRecordForm] = useState({
    diagnosis: '',
    note: '',
    advice: '',
    prescription: [
      { name: '', dosage: '500 mg', frequency: '1-0-1', duration: '5 days', instructions: 'After food' },
    ],
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [role, user]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      if (isPatient && user?.id) {
        setSelectedPatientId(user.id);
        await fetchRecordsForPatient(user.id);
      } else {
        const pts = await patientsApi.getPatients();
        setPatients(pts || []);
        if (pts?.length > 0) {
          setSelectedPatientId(pts[0].id);
          await fetchRecordsForPatient(pts[0].id);
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch clinical records');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordsForPatient = async (patientId) => {
    if (!patientId) return;
    setRecordsLoading(true);
    try {
      const recs = await patientsApi.getPatientRecords(patientId);
      setRecords(recs || []);
    } catch (err) {
      console.warn('Failed to load patient records:', err);
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handlePatientChange = (patientId) => {
    setSelectedPatientId(patientId);
    fetchRecordsForPatient(patientId);
  };

  const handleAddPrescriptionItem = () => {
    setRecordForm((prev) => ({
      ...prev,
      prescription: [
        ...prev.prescription,
        { name: '', dosage: '', frequency: '1-0-1', duration: '5 days', instructions: 'After food' },
      ],
    }));
  };

  const handleRemovePrescriptionItem = (index) => {
    setRecordForm((prev) => ({
      ...prev,
      prescription: prev.prescription.filter((_, i) => i !== index),
    }));
  };

  const handlePrescriptionChange = (index, field, value) => {
    setRecordForm((prev) => {
      const updated = [...prev.prescription];
      updated[index][field] = value;
      return { ...prev, prescription: updated };
    });
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!formPatientId) {
      showError('Please select a patient');
      return;
    }

    setSubmitting(true);
    try {
      const validPrescriptions = recordForm.prescription.filter((p) => p.name.trim() !== '');
      const payload = {
        note: recordForm.note,
        diagnosis: recordForm.diagnosis || null,
        advice: recordForm.advice || null,
        prescription: validPrescriptions.length > 0 ? validPrescriptions : null,
      };

      await patientsApi.addPatientRecord(formPatientId, payload);
      showSuccess('Consultation record created successfully!');
      setIsNewRecordOpen(false);
      setRecordForm({
        diagnosis: '',
        note: '',
        advice: '',
        prescription: [
          { name: '', dosage: '500 mg', frequency: '1-0-1', duration: '5 days', instructions: 'After food' },
        ],
      });
      if (formPatientId === selectedPatientId) {
        fetchRecordsForPatient(selectedPatientId);
      }
    } catch (err) {
      showError(err.message || 'Failed to create consultation record');
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
            Medical Records & EMR Workspace
          </h2>
          <p className="text-muted text-sm">
            Clinical consultations, ICD assessment, diagnosis, and prescription management
          </p>
        </div>

        {!isPatient && (
          <button
            onClick={() => {
              setFormPatientId(selectedPatientId || (patients[0]?.id || ''));
              setIsNewRecordOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>New Consultation Note</span>
          </button>
        )}
      </div>

      {/* Patient Selector Filter (Staff only) */}
      {!isPatient && (
        <div className="card mb-6" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted" />
              <span className="font-semibold text-sm">Select Patient Chart:</span>
              <select
                className="form-select"
                style={{ width: 'auto', minWidth: '280px', padding: '0.45rem 0.85rem' }}
                value={selectedPatientId}
                onChange={(e) => handlePatientChange(e.target.value)}
              >
                {patients.map((p) => {
                  const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || p.email;
                  return (
                    <option key={p.id} value={p.id}>
                      {name} (ID: #{p.id})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Consultations Records List */}
      {recordsLoading ? (
        <LoadingSpinner text="Loading patient medical chart..." />
      ) : records.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={isPatient ? "No clinical consultation notes on record" : "No clinical consultations found for this patient"}
          description={
            isPatient
              ? "Your physician has not recorded any consultation visit summaries or prescriptions yet."
              : "Create a new consultation note to document symptoms, examination findings, and prescriptions."
          }
          action={
            !isPatient && (
              <button
                onClick={() => {
                  setFormPatientId(selectedPatientId);
                  setIsNewRecordOpen(true);
                }}
                className="btn btn-primary btn-sm"
              >
                Start Consultation
              </button>
            )
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {records.map((rec) => (
            <div key={rec.id} className="card">
              <div className="card-header">
                <div>
                  <div className="flex items-center gap-2">
                    <Stethoscope size={18} color="var(--color-primary)" />
                    <span className="font-bold text-lg">
                      {rec.diagnosis || 'Clinical Record'}
                    </span>
                  </div>
                  <div className="text-muted text-xs mt-1">
                    Documented by <span className="font-semibold text-primary">{rec.author_name}</span> on{' '}
                    {new Date(rec.created_at).toLocaleString()}
                  </div>
                </div>
                {rec.appointment_id && (
                  <span className="badge badge-info">Apt #{rec.appointment_id}</span>
                )}
              </div>

              <div className="card-body">
                <div className="mb-4">
                  <h5 className="font-semibold text-sm text-muted mb-1 uppercase tracking-wide">
                    Clinical Examination & Assessment
                  </h5>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{rec.note}</p>
                </div>

                {rec.advice && (
                  <div
                    className="mb-4"
                    style={{
                      backgroundColor: 'var(--color-surface-hover)',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span className="font-semibold text-sm text-primary">Doctor's Advice: </span>
                    <span>{rec.advice}</span>
                  </div>
                )}

                {rec.prescription && rec.prescription.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-sm text-muted mb-2 uppercase tracking-wide">
                      Prescribed Medications ({rec.prescription.length})
                    </h5>
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Medication</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                            <th>Instructions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rec.prescription.map((med, idx) => (
                            <tr key={idx}>
                              <td className="font-bold text-primary">{med.name}</td>
                              <td>{med.dosage}</td>
                              <td><span className="badge badge-info">{med.frequency}</span></td>
                              <td>{med.duration}</td>
                              <td className="text-muted">{med.instructions || 'As advised'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Consultation Modal */}
      <Modal
        isOpen={isNewRecordOpen}
        onClose={() => setIsNewRecordOpen(false)}
        title="New Consultation & Prescription Builder"
        size="lg"
      >
        <form onSubmit={handleCreateRecord}>
          <div className="form-group">
            <label className="form-label required">Target Patient</label>
            <select
              className="form-select"
              value={formPatientId}
              onChange={(e) => setFormPatientId(e.target.value)}
              required
            >
              {patients.map((p) => {
                const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || p.email;
                return (
                  <option key={p.id} value={p.id}>
                    {name} (ID: #{p.id})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label required">Primary Diagnosis (ICD-Ready Description)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Type 2 Diabetes Mellitus (E11.9), Acute Bronchitis"
              value={recordForm.diagnosis}
              onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
              required
            />
          </div>

          {/* Doctor Speech-to-Text Dictation */}
          <SpeechToTextRecorder
            onInsertText={(spokenText) => {
              setRecordForm((prev) => ({
                ...prev,
                note: prev.note ? `${prev.note}\n${spokenText}` : spokenText,
              }));
            }}
          />

          <div className="form-group">
            <label className="form-label required">Examination Findings & Clinical Notes</label>
            <textarea
              rows={4}
              className="form-textarea"
              placeholder="Record chief complaints, symptoms history, physical exam findings, and vitals review..."
              value={recordForm.note}
              onChange={(e) => setRecordForm({ ...recordForm, note: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Doctor's Clinical Advice</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Plenty of oral fluids, monitor blood sugar fasting, review in 10 days"
              value={recordForm.advice}
              onChange={(e) => setRecordForm({ ...recordForm, advice: e.target.value })}
            />
          </div>

          {/* Dynamic Prescription Builder */}
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-sm uppercase tracking-wide text-primary">
                Prescription Items
              </h4>
              <button
                type="button"
                onClick={handleAddPrescriptionItem}
                className="btn btn-outline btn-sm"
              >
                <Plus size={14} />
                <span>Add Medication</span>
              </button>
            </div>

            {recordForm.prescription.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--color-surface-hover)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.75rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="form-row">
                  <div className="form-group mb-2">
                    <label className="form-label text-xs required">Medication Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Metformin"
                      value={item.name}
                      onChange={(e) => handlePrescriptionChange(idx, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label className="form-label text-xs required">Dosage</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 500 mg"
                      value={item.dosage}
                      onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label className="form-label text-xs required">Frequency</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 1-0-1"
                      value={item.frequency}
                      onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label className="form-label text-xs required">Duration</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 14 days"
                      value={item.duration}
                      onChange={(e) => handlePrescriptionChange(idx, 'duration', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Special instructions (e.g. Take with meals)"
                      value={item.instructions}
                      onChange={(e) => handlePrescriptionChange(idx, 'instructions', e.target.value)}
                    />
                  </div>
                  {recordForm.prescription.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePrescriptionItem(idx)}
                      className="btn btn-danger btn-sm"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsNewRecordOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Issue & Sign Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
