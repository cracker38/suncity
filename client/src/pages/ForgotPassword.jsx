import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState('');

  async function requestReset(e) {
    e.preventDefault();
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMsg(res.message);
      if (res.data?.resetToken) {
        setToken(res.data.resetToken);
        setStep(2);
      }
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function reset(e) {
    e.preventDefault();
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setMsg(res.message);
      setStep(3);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 460 }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h1>Forgot Password</h1>
          {msg && <div className="alert alert-success">{msg}</div>}
          {step === 1 && (
            <form onSubmit={requestReset}>
              <div className="form-group"><label className="label">Email</label>
                <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <button className="btn btn-primary">Send Reset Link</button>
            </form>
          )}
          {step === 2 && (
            <form onSubmit={reset}>
              <div className="form-group"><label className="label">Reset token</label>
                <input className="input" value={token} onChange={(e) => setToken(e.target.value)} /></div>
              <div className="form-group"><label className="label">New password</label>
                <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <button className="btn btn-primary">Update Password</button>
            </form>
          )}
          {step === 3 && <Link className="btn btn-primary" to="/login">Go to Login</Link>}
        </div>
      </div>
    </section>
  );
}
