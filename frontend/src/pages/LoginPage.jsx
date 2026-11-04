import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, UserPlus, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { authApi } from '../api/auth';
import { Modal } from '../components/common/Modal';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Patient Registration Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    date_of_birth: '1990-01-01',
    place_of_birth: 'New York',
    gender: 'male',
    marital_status: 'single',
    health_change_trigger: 'Routine checkup',
    blood_type: 'O+',
  });
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await login({ email, password });
      showSuccess('Welcome back to MedCore clinical workspace!');
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid clinical credentials. Please try again.');
      showError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);

    try {
      await authApi.registerPatient(registerForm);
      showSuccess('Patient registered successfully! You can now sign in.');
      setIsRegisterOpen(false);
      setEmail(registerForm.email);
      setPassword(registerForm.password);
    } catch (err) {
      showError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setRegisterLoading(false);
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
          maxWidth: '460px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Brand Banner */}
        <div
          style={{
            padding: '2rem 2rem 1.5rem 2rem',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-primary), #0284c7)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.4)',
              marginBottom: '0.85rem',
            }}
          >
            <Activity size={30} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-navy)', letterSpacing: '-0.02em' }}>
            MedCore Clinical Portal
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Hospital Management & Electronic Medical Records
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
          {errorMsg && (
            <div
              style={{
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid #fecaca',
                color: 'var(--color-danger-text)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label required">Clinical Email</label>
              <div className="search-box">
                <Mail size={16} />
                <input
                  type="email"
                  className="form-control"
                  placeholder="doctor@medcore.health"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', height: '42px' }}
            >
              {loading ? <div className="spinner spinner-sm" /> : <LogIn size={18} />}
              <span>{loading ? 'Authenticating...' : 'Sign In to Clinical Workspace'}</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setIsRegisterOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <UserPlus size={15} />
                <span>New Patient? Self-Register Here</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Patient Self-Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Patient Self-Registration"
        size="lg"
      >
        <form onSubmit={handleRegisterSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">First Name</label>
              <input
                type="text"
                className="form-control"
                value={registerForm.first_name}
                onChange={(e) => setRegisterForm({ ...registerForm, first_name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Last Name</label>
              <input
                type="text"
                className="form-control"
                value={registerForm.last_name}
                onChange={(e) => setRegisterForm({ ...registerForm, last_name: e.target.value })}
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
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Password (min 8 chars)</label>
              <input
                type="password"
                className="form-control"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone Number (10 digits)</label>
              <input
                type="text"
                className="form-control"
                placeholder="(555) 012-3456"
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={registerForm.date_of_birth}
                onChange={(e) => setRegisterForm({ ...registerForm, date_of_birth: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Gender</label>
              <select
                className="form-select"
                value={registerForm.gender}
                onChange={(e) => setRegisterForm({ ...registerForm, gender: e.target.value })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label required">Blood Type</label>
              <select
                className="form-select"
                value={registerForm.blood_type}
                onChange={(e) => setRegisterForm({ ...registerForm, blood_type: e.target.value })}
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
                value={registerForm.marital_status}
                onChange={(e) => setRegisterForm({ ...registerForm, marital_status: e.target.value })}
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
                <option value="long_term_partnership">Long Term Partnership</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Street Address</label>
              <input
                type="text"
                className="form-control"
                value={registerForm.street}
                onChange={(e) => setRegisterForm({ ...registerForm, street: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">City</label>
              <input
                type="text"
                className="form-control"
                value={registerForm.city}
                onChange={(e) => setRegisterForm({ ...registerForm, city: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">State</label>
              <input
                type="text"
                className="form-control"
                value={registerForm.state}
                onChange={(e) => setRegisterForm({ ...registerForm, state: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label required">Postal Code</label>
              <input
                type="text"
                className="form-control"
                value={registerForm.postal_code}
                onChange={(e) => setRegisterForm({ ...registerForm, postal_code: e.target.value })}
                required
              />
            </div>
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
              disabled={registerLoading}
            >
              {registerLoading ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
