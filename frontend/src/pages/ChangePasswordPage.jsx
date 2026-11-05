import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { authApi } from '../api/auth';

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, completePasswordChange, logout } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password validation checks
  const hasMinLength = newPassword.length >= 12;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const differsFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;

  const isFormValid =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasUpper &&
    hasLower &&
    hasDigit &&
    hasSpecial &&
    passwordsMatch &&
    differsFromCurrent;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!passwordsMatch) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    if (!differsFromCurrent) {
      setErrorMsg('New password must differ from your current password.');
      return;
    }

    if (!hasMinLength || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setErrorMsg(
        'New password must be at least 12 characters and include uppercase, lowercase, numbers, and special characters.'
      );
      return;
    }

    setSubmitting(true);
    try {
      // 1. Post password change to backend: POST /auth/change-password
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      // 2. Re-authenticate seamlessly with the new password to obtain an updated JWT token
      await completePasswordChange(user.email, newPassword);

      showSuccess('Password successfully updated! Access to clinical modules is now unlocked.');

      // 3. Navigate to originally requested page (e.g. /patients) or dashboard
      const targetPath = location.state?.from?.pathname || (user?.role === 'attender' ? '/patients' : '/');
      navigate(targetPath, { replace: true });
    } catch (err) {
      const msg = err.message || 'Failed to update password. Please check your current password.';
      setErrorMsg(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #115e59 50%, #0d9488 100%)',
        padding: '1.5rem',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Banner Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            padding: '2rem 2rem 1.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(20, 184, 166, 0.2)',
              color: '#2dd4bf',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              border: '2px solid rgba(45, 212, 191, 0.4)',
            }}
          >
            <KeyRound size={28} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Password Change Required
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
            Your clinical account ({user?.role?.toUpperCase() || 'STAFF'}) has been flagged for a mandatory password rotation before accessing patient management and EMR records.
          </p>
        </div>

        {/* Content & Form */}
        <div style={{ padding: '2rem' }}>
          {errorMsg && (
            <div className="alert alert-danger mb-4 flex items-center gap-2" style={{ fontSize: '0.85rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{errorMsg}</div>
            </div>
          )}

          <div
            style={{
              backgroundColor: 'var(--color-surface-hover)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              marginBottom: '1.5rem',
              fontSize: '0.82rem',
              color: 'var(--color-text-muted)',
            }}
          >
            <div>
              Signed in as: <strong style={{ color: 'var(--color-navy)' }}>{user?.full_name || 'Staff Member'}</strong>
            </div>
            <div>
              Account Email: <strong style={{ color: 'var(--color-navy)' }}>{user?.email}</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Current Password */}
            <div className="form-group mb-4">
              <label className="form-label required">Current Temporary Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingRight: '2.5rem' }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="form-group mb-4">
              <label className="form-label required">New Permanent Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingRight: '2.5rem' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group mb-4">
              <label className="form-label required">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="form-control"
                  style={{ paddingRight: '2.5rem' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div
              style={{
                backgroundColor: 'var(--color-surface-hover)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.78rem',
              }}
            >
              <div className="font-bold mb-1.5" style={{ color: 'var(--color-navy)' }}>
                Security Requirements:
              </div>
              <div className="grid grid-cols-2 gap-1 text-muted">
                <div style={{ color: hasMinLength ? 'var(--color-success)' : undefined }}>
                  {hasMinLength ? '✓' : '○'} 12+ Characters
                </div>
                <div style={{ color: hasUpper ? 'var(--color-success)' : undefined }}>
                  {hasUpper ? '✓' : '○'} Uppercase Letter (A-Z)
                </div>
                <div style={{ color: hasLower ? 'var(--color-success)' : undefined }}>
                  {hasLower ? '✓' : '○'} Lowercase Letter (a-z)
                </div>
                <div style={{ color: hasDigit ? 'var(--color-success)' : undefined }}>
                  {hasDigit ? '✓' : '○'} Number (0-9)
                </div>
                <div style={{ color: hasSpecial ? 'var(--color-success)' : undefined }}>
                  {hasSpecial ? '✓' : '○'} Special Symbol (!@#$)
                </div>
                <div style={{ color: passwordsMatch ? 'var(--color-success)' : undefined }}>
                  {passwordsMatch ? '✓' : '○'} Passwords Match
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={logout}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !isFormValid}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span>{submitting ? 'Updating Password...' : 'Update & Continue'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

