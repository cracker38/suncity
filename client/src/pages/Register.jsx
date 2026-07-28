import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/authStore';
import './Login.css';

function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: '', color: '' },
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Good', color: '#3b82f6' },
    { label: 'Strong', color: '#10b981' },
  ];
  return { score, ...map[score] };
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(form.password);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left branding panel */}
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
            <h1>Join SUN CITY</h1>
            <p>
              Create your free customer account to manage bookings, download invoices,
              save favourite rooms, and access our AI concierge — all in one portal.
            </p>
            <div className="auth-features">
              {[
                { icon: '📋', text: 'Track all your reservations' },
                { icon: '🧾', text: 'Download PDF invoices instantly' },
                { icon: '♡', text: 'Save your favourite rooms' },
                { icon: '🤖', text: 'AI concierge available 24/7' },
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

      {/* Right form panel */}
      <div className="auth-panel-right">
        <motion.div
          className="auth-form-wrap"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-form-header">
            <p className="auth-eyebrow">Free account</p>
            <h2>Create your account</h2>
            <p className="auth-sub">
              Already have an account?{' '}
              <Link to="/login" className="auth-link">Sign in</Link>
            </p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={submit} noValidate>
            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="auth-field">
                <label htmlFor="reg-fname">First name</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">👤</span>
                  <input
                    id="reg-fname"
                    type="text"
                    required
                    autoComplete="given-name"
                    placeholder="Jean"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="auth-field">
                <label htmlFor="reg-lname">Last name</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">👤</span>
                  <input
                    id="reg-lname"
                    type="text"
                    required
                    autoComplete="family-name"
                    placeholder="Habimana"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉</span>
                <input
                  id="reg-email"
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
              <label htmlFor="reg-phone">
                Phone number <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">📱</span>
                <input
                  id="reg-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+250 780 000 000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔑</span>
                <input
                  id="reg-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
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
              {/* Strength meter */}
              {form.password && (
                <div>
                  <div className="auth-strength">
                    <div
                      className="auth-strength-bar"
                      style={{
                        width: `${(strength.score / 4) * 100}%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <p className="auth-hint" style={{ color: strength.color }}>
                    {strength.label} password
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? <span className="auth-spinner" /> : 'Create Account'}
            </button>
          </form>

          <p className="auth-footer-note">
            By creating an account you agree to our{' '}
            <Link to="/about" className="auth-link">Terms of Service</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
