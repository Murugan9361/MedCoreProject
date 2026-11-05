import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  FolderOpen,
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Download,
  AlertCircle,
  Pill,
  CheckCircle,
  Stethoscope,
  Receipt,
} from 'lucide-react';
import { patientsApi } from '../api/patients';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import { SpeechToTextRecorder } from '../components/common/SpeechToTextRecorder';

export const PatientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'prescriptions' | 'files'
  const [patientInfo, setPatientInfo] = useState(null);
  const [records, setRecords] = useState([]);
  const [labFiles, setLabFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Consultation Record Modal State
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    note: '',
    diagnosis: '',
    advice: '',
    prescription: [
      { name: '', dosage: '', frequency: '1-0-1', duration: '5 days', instructions: 'After food' },
    ],
  });
  const [submittingRecord, setSubmittingRecord] = useState(false);

  // Upload Lab File Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [fileDescription, setFileDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPatientData();
  }, [id]);

  const fetchPatientData = async () => {
    setLoading(true);
    try {
      const [recs, files] = await Promise.all([
        patientsApi.getPatientRecords(id).catch(() => []),
        patientsApi.getPatientLabFiles(id).catch(() => []),
      ]);
      setRecords(recs || []);
      setLabFiles(files || []);

      let patientData = null;
      try {
        patientData = await patientsApi.getPatientById(id);
      } catch {
        const pts = await patientsApi.getPatients().catch(() => []);
        patientData = pts?.find((p) => String(p.id) === String(id)) || null;
      }
      setPatientInfo(patientData);
    } catch (err) {
      showError(err.message || 'Error loading patient details');
    } finally {
      setLoading(false);
    }
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

  const handleSaveRecord = async (e) => {
    e.preventDefault();
    setSubmittingRecord(true);

    try {
      // Filter out empty prescription items
      const validPrescriptions = recordForm.prescription.filter((p) => p.name.trim() !== '');

      const payload = {
        note: recordForm.note,
        diagnosis: recordForm.diagnosis || null,
        advice: recordForm.advice || null,
        prescription: validPrescriptions.length > 0 ? validPrescriptions : null,
      };

      await patientsApi.addPatientRecord(id, payload);
      showSuccess('Consultation record & prescription saved successfully!');
      setIsAddRecordOpen(false);
      setRecordForm({
        note: '',
        diagnosis: '',
        advice: '',
        prescription: [
          { name: '', dosage: '', frequency: '1-0-1', duration: '5 days', instructions: 'After food' },
        ],
      });
      fetchPatientData();
    } catch (err) {
      showError(err.message || 'Failed to save record');
    } finally {
      setSubmittingRecord(false);
    }
  };

  const handleUploadLabFile = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showError('Please select a file to upload');
      return;
    }

    const allowedExtensions = ['pdf', 'jpg', 'jpeg'];
    const fileExt = uploadFile.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      showError('Invalid file format. Only PDF, JPG, and JPEG files are supported.');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB limit
    if (uploadFile.size > maxSize) {
      showError('File exceeds 10MB size limit. Please upload a smaller document.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (fileDescription) {
        formData.append('description', fileDescription);
      }

      await patientsApi.uploadLabFile(id, formData);
      showSuccess('Diagnostic lab file uploaded successfully!');
      setIsUploadOpen(false);
      setUploadFile(null);
      setFileDescription('');
      fetchPatientData();
    } catch (err) {
      showError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Retrieving patient electronic health record..." />;
  }

  // Flatten all prescriptions across records
  const allPrescriptions = records.flatMap((r) =>
    (r.prescription || []).map((p) => ({
      ...p,
      recordDate: r.created_at,
      authorName: r.author_name,
    }))
  );

  return (
    <div>
      {/* Back Button & Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/patients')} className="btn btn-outline btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Patients</span>
        </button>
      </div>

      {/* Patient Profile Card */}
      <div
        className="card mb-6"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #134e4a 100%)',
          color: '#ffffff',
          padding: '1.75rem 2rem',
          border: 'none',
        }}
      >
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-purple" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
                Patient ID: #{id}
              </span>
              <span className="badge badge-success">Active Medical Chart</span>
              {patientInfo?.profile?.gender && (
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                  {patientInfo.profile.gender}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {patientInfo?.profile?.first_name ? `${patientInfo.profile.first_name} ${patientInfo.profile.last_name}` : 'Electronic Medical Record (EMR)'}
            </h2>
            <p style={{ color: '#99f6e4', fontSize: '0.88rem', marginTop: '0.25rem' }}>
              {patientInfo?.email ? `${patientInfo.email} • Phone: ${patientInfo.profile?.phone || 'N/A'}` : 'Comprehensive clinical history, prescription logs, and diagnostic assay attachments'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/billing?patient_id=${id}`)}
              className="btn btn-outline"
              style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <Receipt size={16} />
              <span>Billing & Invoices</span>
            </button>
            <button onClick={() => setIsAddRecordOpen(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Record Consultation</span>
            </button>
            <button onClick={() => setIsUploadOpen(true)} className="btn btn-outline" style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
              <Upload size={16} />
              <span>Upload Lab File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="tabs">
        <button
          onClick={() => setActiveTab('records')}
          className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
        >
          Consultation Records ({records.length})
        </button>
        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
        >
          Active Prescriptions ({allPrescriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
        >
          Diagnostic Lab Files ({labFiles.length})
        </button>
      </div>

      {/* Tab 1: Records Timeline */}
      {activeTab === 'records' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {records.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No clinical notes recorded yet"
              description="Click 'Record Consultation' to document clinical examination, diagnosis, and prescriptions."
              action={
                <button onClick={() => setIsAddRecordOpen(true)} className="btn btn-primary btn-sm">
                  Add First Record
                </button>
              }
            />
          ) : (
            records.map((rec) => (
              <div key={rec.id} className="card">
                <div className="card-header">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stethoscope size={18} color="var(--color-primary)" />
                      <span className="font-bold text-lg">
                        {rec.diagnosis || 'Clinical Consultation'}
                      </span>
                    </div>
                    <div className="text-muted text-xs mt-1">
                      Recorded by <span className="font-semibold text-primary">{rec.author_name}</span> on{' '}
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
                      Clinical Notes & Examination Findings
                    </h5>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{rec.note}</p>
                  </div>

                  {rec.advice && (
                    <div className="mb-4" style={{ backgroundColor: 'var(--color-surface-hover)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)' }}>
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
            ))
          )}
        </div>
      )}

      {/* Tab 2: Prescriptions Table */}
      {activeTab === 'prescriptions' && (
        <div className="card">
          {allPrescriptions.length === 0 ? (
            <EmptyState
              icon={Pill}
              title="No active prescriptions"
              description="No prescribed medication items exist in this patient's medical records."
            />
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Medication Name</th>
                    <th>Dosage</th>
                    <th>Schedule</th>
                    <th>Duration</th>
                    <th>Instructions</th>
                    <th>Prescribing Doctor</th>
                    <th>Date Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {allPrescriptions.map((rx, idx) => (
                    <tr key={idx}>
                      <td className="font-bold text-primary">{rx.name}</td>
                      <td>{rx.dosage}</td>
                      <td><span className="badge badge-info">{rx.frequency}</span></td>
                      <td>{rx.duration}</td>
                      <td className="text-muted">{rx.instructions || 'Standard dosing'}</td>
                      <td className="font-medium">{rx.authorName}</td>
                      <td className="text-muted text-xs">
                        {new Date(rx.recordDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Diagnostic Lab Files */}
      {activeTab === 'files' && (
        <div className="card">
          {labFiles.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No diagnostic reports uploaded"
              description="Upload PDF lab assays, ECG scans, or radiology imagery for this patient."
              action={
                <button onClick={() => setIsUploadOpen(true)} className="btn btn-primary btn-sm">
                  Upload Report
                </button>
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Description</th>
                    <th>File Size</th>
                    <th>Uploaded Date</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {labFiles.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <div className="font-semibold text-primary">{file.original_name}</div>
                        <div className="text-muted text-xs">{file.content_type || 'Diagnostic Document'}</div>
                      </td>
                      <td>{file.description || 'Lab diagnostic report'}</td>
                      <td className="text-muted">{Math.round((file.size_bytes || 0) / 1024)} KB</td>
                      <td className="text-muted text-xs">
                        {new Date(file.created_at).toLocaleString()}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => patientsApi.downloadLabFile(file.id, file.original_name)}
                          className="btn btn-outline btn-sm"
                          title="Download file"
                        >
                          <Download size={14} />
                          <span>Download</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Record Consultation Modal */}
      <Modal
        isOpen={isAddRecordOpen}
        onClose={() => setIsAddRecordOpen(false)}
        title="Record Clinical Consultation & Prescriptions"
        size="lg"
      >
        <form onSubmit={handleSaveRecord}>
          <div className="form-group">
            <label className="form-label required">Primary Diagnosis / Clinical Assessment</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Essential Hypertension (ICD-10 I10), Acute Sinusitis"
              value={recordForm.diagnosis}
              onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
              required
            />
          </div>

          {/* Speech-to-Text Voice Dictation */}
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
              placeholder="Enter patient complaints, vitals correlation, physical exam notes, and clinical reasoning..."
              value={recordForm.note}
              onChange={(e) => setRecordForm({ ...recordForm, note: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Patient Advice / Lifestyle Instructions</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Low sodium diet, 30 min daily aerobic exercise, review BP logs in 2 weeks"
              value={recordForm.advice}
              onChange={(e) => setRecordForm({ ...recordForm, advice: e.target.value })}
            />
          </div>

          {/* Interactive Prescription Builder */}
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
                    <label className="form-label text-xs required">Drug / Medication Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Amlodipine, Amoxicillin"
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
                      placeholder="e.g. 5 mg, 500 mg"
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
                      placeholder="e.g. 1-0-1, 1-0-0, 0-0-1"
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
                      placeholder="e.g. 7 days, 30 days"
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
                      placeholder="Special instructions (e.g. Take after food with water)"
                      value={item.instructions}
                      onChange={(e) => handlePrescriptionChange(idx, 'instructions', e.target.value)}
                    />
                  </div>
                  {recordForm.prescription.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePrescriptionItem(idx)}
                      className="btn btn-danger btn-sm"
                      title="Remove Medication"
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
              onClick={() => setIsAddRecordOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingRecord}
            >
              {submittingRecord ? 'Finalizing...' : 'Save & Issue Consultation Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload Lab File Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Diagnostic Lab File / Assay"
      >
        <form onSubmit={handleUploadLabFile}>
          <div className="form-group">
            <label className="form-label required">Select Diagnostic File (PDF, PNG, JPEG)</label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setUploadFile(e.target.files[0] || null)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Assay Category</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Complete Blood Count (CBC) or Chest X-Ray"
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsUploadOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
