import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authStore';
import './Login.css';

const DEMO_ACCOUNTS = [
  { role: 'Customer', email: 'guest@suncity.rw', password: 'Guest@123', path: '/dashboard' },
  { role: 'Reception', email: 'reception@suncity.rw', password: 'Staff@123', path: '/reception' },
  { role: 'Restaurant', email: 'restaurant@suncity.rw', password: 'Staff@123', path: '/restaurant-desk' },
  { role: 'Events', email: 'events@suncity.rw', password: 'Staff@123', path: '/events-desk' },
  { role: 'Service Ops', email: 'ops@suncity.rw', password: 'Staff@123', path: '/ops' },
  { role: 'Finance', email: 'finance@suncity.rw', password: 'Staff@123', path: '/finance' },
  { role: 'Admin', email: 'admin@suncity.rw', password: 'Admin@123', path: '/admin' },
];

export default function Login() {
  const { login, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', totp: '' });
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      const path = dashboardPath() || DEMO_ACCOUNTS.find((d) => d.email === data.user?.email)?.path || '/';
      navigate(path);
    } catch (err) {
      if (err.payload?.errors?.requires2FA) setNeeds2FA(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(account) {
    setForm({ email: account.email, password: account.password, totp: '' });
    setError('');
    setNeeds2FA(false);
  }

  return (
    <section className="login-page section">
      <div className="container login-grid">
        <form className="card login-card" onSubmit={submit}>
          <p className="login-eyebrow">SUN CITY NYAKARAMBI</p>
          <h1>Secure Login</h1>
          <p>One login for all portals. You are redirected to your authorized dashboard.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {needs2FA && (
            <div className="form-group">
              <label className="label">2FA Code</label>
              <input
                className="input"
                value={form.totp}
                onChange={(e) => setForm({ ...form, totp: e.target.value })}
              />
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="login-links">
            <Link to="/register">Create customer account</Link> · <Link to="/forgot-password">Forgot password</Link>
          </p>
        </form>

        <aside className="card login-demos">
          <h2>Demo role accounts</h2>
          <p>Click an account to fill the login form, then Sign In.</p>
          <div className="demo-list">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} type="button" className="demo-item" onClick={() => fillDemo(a)}>
                <strong>{a.role}</strong>
                <span>{a.email}</span>
                <small>{a.password}</small>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
