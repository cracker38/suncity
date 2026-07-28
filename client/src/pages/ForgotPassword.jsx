import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import './Login.css';

const STEPS = ['Request reset', 'Set new password', 'Done'];

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestReset(e) {
    e.preventDefault();
    setError(''); setMsg(''); setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMsg(res.message || 'If the email exists, a reset link was sent.');
      // In dev mode the token is returned directly
      if (res.data?.resetToken) {
        setToken(res.data.resetToken);
      }
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setMsg(res.message || 'Password updated successfully.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
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
            <h1>Reset your password</h1>
            <p>
              Enter your registered email address and we will send you instructions
              to reset your password securely.
            </p>

            {/* Step indicator */}
            <div className="auth-steps">
              {STEPS.map((s, i) => (
                <div key={s} className={`auth-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                  <span className="auth-step-dot">
                    {i < step ? '✓' : i + 1}
                  </span>
                  <span>{s}</span>
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
          <AnimatePresence mode="wait">

            {/* Step 0 — request email */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="auth-form-header">
                  <p className="auth-eyebrow">Step 1 of 2</p>
                  <h2>Forgot your password?</h2>
                  <p className="auth-sub">
                    Enter your email and we'll send reset instructions.
                  </p>
                </div>

                {error && (
                  <div className="auth-alert auth-alert-error">
                    <span>⚠</span> {error}
                  </div>
                )}

                <form onSubmit={requestReset} noValidate>
                  <div className="auth-field">
                    <label htmlFor="fp-email">Email address</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">✉</span>
                      <input
                        id="fp-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? <span className="auth-spinner" /> : 'Send Reset Instructions'}
                  </button>
                </form>

                <div className="auth-divider">or</div>
                <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--muted)' }}>
                  Remember your password?{' '}
                  <Link to="/login" className="auth-link">Sign in</Link>
                </p>
              </motion.div>
            )}

            {/* Step 1 — enter token + new password */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="auth-form-header">
                  <p className="auth-eyebrow">Step 2 of 2</p>
                  <h2>Set new password</h2>
                  <p className="auth-sub">
                    Enter the reset token from your email and choose a new password.
                  </p>
                </div>

                {msg && (
                  <div className="auth-alert auth-alert-success">
                    <span>✓</span> {msg}
                  </div>
                )}
                {error && (
                  <div className="auth-alert auth-alert-error">
                    <span>⚠</span> {error}
                  </div>
                )}

                <form onSubmit={resetPassword} noValidate>
                  <div className="auth-field">
                    <label htmlFor="fp-token">Reset token</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">🔐</span>
                      <input
                        id="fp-token"
                        type="text"
                        required
                        placeholder="Paste token from email"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                      />
                    </div>
                    <p className="auth-hint">Check your inbox for the reset token.</p>
                  </div>

                  <div className="auth-field">
                    <label htmlFor="fp-password">New password</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">🔑</span>
                      <input
                        id="fp-password"
                        type={showPwd ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        placeholder="Min. 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

                  <button type="submit" className="auth-submit-btn" disabled={loading}>
                    {loading ? <span className="auth-spinner" /> : 'Update Password'}
                  </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  <button
                    type="button"
                    onClick={() => { setStep(0); setError(''); setMsg(''); }}
                    style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: 'inherit' }}
                  >
                    ← Back
                  </button>
                </p>
              </motion.div>
            )}

            {/* Step 2 — success */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
                <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>
                  Password updated!
                </h2>
                <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
                <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none', display: 'flex' }}>
                  Go to Sign In
                </Link>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
