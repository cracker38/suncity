import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authStore';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 520 }}>
        <form className="card" style={{ padding: '1.5rem' }} onSubmit={submit}>
          <h1>Create Account</h1>
          {error && <div className="alert alert-error">{error}</div>}
          {['first_name', 'last_name', 'email', 'phone', 'password'].map((f) => (
            <div className="form-group" key={f}>
              <label className="label">{f.replaceAll('_', ' ')}</label>
              <input className="input" type={f === 'password' ? 'password' : f === 'email' ? 'email' : 'text'}
                required={f !== 'phone'} value={form[f]}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            </div>
          ))}
          <button className="btn btn-primary" style={{ width: '100%' }}>Register</button>
          <p style={{ marginTop: '1rem' }}>Already have an account? <Link to="/login">Login</Link></p>
        </form>
      </div>
    </section>
  );
}
