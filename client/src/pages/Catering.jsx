import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatMoney } from '../lib/authStore';

export default function Catering() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({
    category: 'corporate', package_id: '', event_date: '', location: '', guests: 30,
    contact_name: '', contact_email: '', contact_phone: '', details: '',
  });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/catering/packages').then((r) => setPackages(r.data || [])).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post('/catering/requests', {
        ...form,
        package_id: form.package_id ? Number(form.package_id) : null,
        guests: Number(form.guests),
      });
      setMsg(`${res.message} Ref: ${res.data.request_code}`);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <>
      <section className="page-hero">
        <div><h1>Outside Catering</h1><p>Corporate, wedding, school, NGO, and private event catering.</p></div>
      </section>
      <section className="section">
        <div className="container grid-3">
          {packages.map((p) => (
            <article className="card" key={p.id} style={{ padding: '1.2rem' }}>
              <span className="badge">{p.category}</span>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <strong>{formatMoney(p.price_per_person)} / person</strong>
              <p>Min {p.min_guests} guests</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section" style={{ background: '#f0f3f2' }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <h2>Quotation Request</h2>
          {msg && <div className="alert alert-success">{msg}</div>}
          <form className="card" style={{ padding: '1.25rem' }} onSubmit={submit}>
            <div className="form-group">
              <label className="label">Category</label>
              <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['corporate', 'wedding', 'school', 'ngo', 'private'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Package</label>
              <select className="select" value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })}>
                <option value="">Optional</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {['contact_name', 'contact_email', 'contact_phone', 'location'].map((f) => (
              <div className="form-group" key={f}>
                <label className="label">{f.replaceAll('_', ' ')}</label>
                <input className="input" required={f === 'contact_name'} value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="form-group"><label className="label">Event date</label>
              <input className="input" type="date" required value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
            <div className="form-group"><label className="label">Guests</label>
              <input className="input" type="number" required value={form.guests}
                onChange={(e) => setForm({ ...form, guests: e.target.value })} /></div>
            <div className="form-group"><label className="label">Details</label>
              <textarea className="textarea" value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })} /></div>
            <button className="btn btn-primary">Request Quotation</button>
          </form>
        </div>
      </section>
    </>
  );
}
