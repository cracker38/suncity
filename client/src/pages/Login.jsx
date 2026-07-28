import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/authStore';
import './Login.css';

export default function Login() {
  const { login, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', totp: '' });
  const [needs2FA, setNeeds2FA] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate(dashboardPath());
    } catch (err) {
      if (err.payload?.errors?.requires2FA || err.payload?.requires2FA) setNeeds2FA(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left panel — branding */}
      <div className="auth-panel-left">
        <div className="auth-panel-left-inner">
          <Link to="/" className="auth-logo">
            <span className="auth-logo-mark">SC</span>
            <span className="auth-logo-text">
              <strong>SUN CITY</strong>
              <small>NYAKARAMBI HOTEL</small>
            </span>
          </Link>

          <div className="auth-panel-copy">
            <h1>Welcome back</h1>
            <p>
              Sign in to access your portal — customer reservations, staff dashboards,
              and hotel management tools, all in one place.
            </p>
            <div className="auth-features">
              {[
                { icon: '🛏', text: 'Manage your bookings & invoices' },
                { icon: '🔒', text: 'Secure JWT authentication' },
                { icon: '🤖', text: 'AI concierge & agent requests' },
                { icon: '📊', text: 'Role-based staff dashboards' },
              ].map((f) => (
                <div key={f.text} className="auth-feature-item">
                  <span className="auth-feature-icon">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-panel-hotel">
            <p>📍 Nyakarambi, Kirehe District, Rwanda</p>
            <p>📞 +250 780 219 057</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-panel-right">
        <motion.div
          className="auth-form-wrap"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-form-header">
            <p className="auth-eyebrow">Secure access</p>
            <h2>Sign in to your account</h2>
            <p className="auth-sub">
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">Create one free</Link>
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={submit} noValidate>
            <div className="auth-field">
              <label htmlFor="login-email">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉</span>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-field-row">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password" className="auth-link auth-link-sm">
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔑</span>
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {needs2FA && (
              <motion.div
                className="auth-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label htmlFor="login-totp">Two-factor authentication code</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔐</span>
                  <input
                    id="login-totp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={form.totp}
                    onChange={(e) => setForm({ ...form, totp: e.target.value })}
                    autoFocus
                  />
                </div>
                <p className="auth-hint">Enter the code from your authenticator app.</p>
              </motion.div>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="auth-footer-note">
            By signing in you agree to our{' '}
            <Link to="/about" className="auth-link">Terms of Service</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
