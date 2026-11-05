import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Upload,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  User,
  Plus,
  X,
} from 'lucide-react';
import { patientsApi } from '../api/patients';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const DiagnosticsFilesPage = () => {
  const { user, role } = useAuth();
  const isPatient = role === 'patient';
  const { showSuccess, showError } = useNotification();

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadPatientId, setUploadPatientId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDescription, setFileDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [role, user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      if (isPatient && user?.id) {
        setSelectedPatientId(user.id);
        await fetchFilesForPatient(user.id);
      } else {
        const pts = await patientsApi.getPatients();
        setPatients(pts || []);
        if (pts?.length > 0) {
          setSelectedPatientId(pts[0].id);
          await fetchFilesForPatient(pts[0].id);
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch diagnostic records');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilesForPatient = async (patientId) => {
    if (!patientId) return;
    setFilesLoading(true);
    try {
      const data = await patientsApi.getPatientLabFiles(patientId);
      setFiles(data || []);
    } catch (err) {
      console.warn('Failed to load files:', err);
      setFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const handlePatientChange = (patientId) => {
    setSelectedPatientId(patientId);
    fetchFilesForPatient(patientId);
  };

  const handleOpenPreview = async (file) => {
    setPreviewFile(file);
    setPreviewBlobUrl(null);
    setPreviewLoading(true);
    try {
      const blobUrl = await patientsApi.getLabFileBlobUrl(file.id);
      setPreviewBlobUrl(blobUrl);
    } catch (err) {
      showError(err.message || 'Failed to load file preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewFile(null);
    setPreviewBlobUrl(null);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadPatientId) {
      showError('Please select a patient');
      return;
    }
    if (!selectedFile) {
      showError('Please select a diagnostic file to upload');
      return;
    }

    const allowedExtensions = ['pdf', 'jpg', 'jpeg'];
    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      showError('Invalid file format. Only PDF, JPG, and JPEG documents are permitted.');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      showError('File exceeds the 10MB limit. Please upload a smaller file.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (fileDescription) {
        formData.append('description', fileDescription);
      }

      await patientsApi.uploadLabFile(uploadPatientId, formData);
      showSuccess('Diagnostic file uploaded successfully!');
      setIsUploadOpen(false);
      setSelectedFile(null);
      setFileDescription('');
      if (uploadPatientId === selectedPatientId) {
        fetchFilesForPatient(selectedPatientId);
      }
    } catch (err) {
      showError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
            Diagnostics & Laboratory Reports
          </h2>
          <p className="text-muted text-sm">
            Radiology scans, hematology assays, pathology reports, and clinical documents
          </p>
        </div>

        <button
          onClick={() => {
            setUploadPatientId(isPatient ? user?.id : (selectedPatientId || (patients[0]?.id || '')));
            setIsUploadOpen(true);
          }}
          className="btn btn-primary"
        >
          <Upload size={16} />
          <span>Upload Lab Report</span>
        </button>
      </div>

      {/* Patient Filter (Staff only) */}
      {!isPatient && (
        <div className="card mb-6" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted" />
              <span className="font-semibold text-sm">Select Patient:</span>
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

      {/* Files Table */}
      <div className="card">
        {filesLoading ? (
          <LoadingSpinner text="Retrieving patient diagnostic archives..." />
        ) : files.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={isPatient ? "No diagnostic files in your chart" : "No diagnostic files for this patient"}
            description={
              isPatient
                ? "Your doctor or triage staff has not attached any diagnostic assay files to your medical record yet."
                : "Upload PDF reports, pathology results, or radiology X-ray/MRI imagery."
            }
            action={
              !isPatient && (
                <button
                  onClick={() => {
                    setUploadPatientId(selectedPatientId);
                    setIsUploadOpen(true);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Upload First Report
                </button>
              )
            }
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Diagnostic File</th>
                  <th>Clinical Description</th>
                  <th>Size</th>
                  <th>Uploaded Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => {
                  const isImage = file.content_type?.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.original_name);
                  return (
                    <tr key={file.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: isImage ? 'var(--color-purple-bg)' : 'var(--color-info-bg)',
                              color: isImage ? 'var(--color-purple)' : 'var(--color-info)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
                          </div>
                          <div>
                            <div className="font-bold text-primary">{file.original_name}</div>
                            <div className="text-muted text-xs">{file.content_type || 'Clinical Document'}</div>
                          </div>
                        </div>
                      </td>
                      <td>{file.description || 'Routine diagnostic assay'}</td>
                      <td className="text-muted">{Math.round((file.size_bytes || 0) / 1024)} KB</td>
                      <td className="text-muted text-xs">
                        {new Date(file.created_at).toLocaleString()}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenPreview(file)}
                            className="btn btn-outline btn-sm"
                            title="Preview file in browser"
                          >
                            <Eye size={14} />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => patientsApi.downloadLabFile(file.id, file.original_name)}
                            className="btn btn-primary btn-sm"
                            title="Download file"
                          >
                            <Download size={14} />
                            <span>Download</span>
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

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Diagnostic Report / Medical Scan"
      >
        <form onSubmit={handleUploadSubmit}>
          {!isPatient ? (
            <div className="form-group">
              <label className="form-label required">Target Patient</label>
              <select
                className="form-select"
                value={uploadPatientId}
                onChange={(e) => setUploadPatientId(e.target.value)}
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
          ) : (
            <div className="form-group">
              <label className="form-label">Uploading For</label>
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--color-surface-hover)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                {user?.full_name || 'My Record'} (Patient ID: #{user?.id})
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label required">Select File (PDF, PNG, JPEG)</label>
            <input
              type="file"
              className="form-control"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Clinical Description / Findings</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 12-Lead Resting ECG with normal sinus rhythm"
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
              {uploading ? 'Uploading...' : 'Upload Diagnostic File'}
            </button>
          </div>
        </form>
      </Modal>

      {/* File In-Browser Preview Modal */}
      <Modal
        isOpen={!!previewFile}
        onClose={handleClosePreview}
        title={`Preview: ${previewFile?.original_name || 'Document'}`}
        size="lg"
      >
        {previewFile && (
          <div>
            <div
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                fontSize: '0.85rem',
              }}
            >
              <div><strong>Description:</strong> {previewFile.description || 'No description provided'}</div>
              <div className="text-muted text-xs mt-1">Uploaded: {new Date(previewFile.created_at).toLocaleString()} • Size: {Math.round((previewFile.size_bytes || 0) / 1024)} KB</div>
            </div>

            <div
              style={{
                minHeight: '340px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f1f5f9',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
              }}
            >
              {previewLoading ? (
                <LoadingSpinner text="Retrieving authenticated file preview..." />
              ) : previewBlobUrl ? (
                previewFile.content_type?.startsWith('image/') || /\.(png|jpe?g)$/i.test(previewFile.original_name) ? (
                  <img
                    src={previewBlobUrl}
                    alt={previewFile.original_name}
                    style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain' }}
                  />
                ) : (
                  <iframe
                    src={previewBlobUrl}
                    title={previewFile.original_name}
                    style={{ width: '100%', height: '480px', border: 'none' }}
                  />
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <FileText size={48} color="var(--color-primary)" style={{ margin: '0 auto 1rem auto' }} />
                  <p className="font-semibold text-sm mb-2">{previewFile.original_name}</p>
                  <p className="text-muted text-xs mb-4">Click below to download the diagnostic document directly.</p>
                  <button
                    onClick={() => patientsApi.downloadLabFile(previewFile.id, previewFile.original_name)}
                    className="btn btn-primary btn-sm"
                  >
                    <Download size={14} />
                    <span>Download File</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
