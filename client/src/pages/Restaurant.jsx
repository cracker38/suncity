import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatMoney } from '../lib/authStore';

export default function Restaurant() {
  const [menu, setMenu] = useState({ categories: [], items: [] });
  const [form, setForm] = useState({
    guest_name: '', guest_email: '', guest_phone: '', reservation_date: '', reservation_time: '19:00', guests: 2, notes: '',
  });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/restaurant/menu').then((r) => setMenu(r.data || { categories: [], items: [] })).catch(() => {});
  }, []);

  async function reserve(e) {
    e.preventDefault();
    try {
      const res = await api.post('/restaurant/reservations', form);
      setMsg(res.message || 'Table reserved');
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <>
      <section className="page-hero">
        <div><h1>Restaurant</h1><p>Breakfast, lunch, dinner, drinks, coffee & desserts.</p></div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Chef Recommendations</h2></div>
          <div className="grid-3">
            {menu.items.filter((i) => i.is_chef_recommendation).map((item) => (
              <article className="card" key={item.id}>
                <img src={item.image_url} alt={item.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} loading="lazy" />
                <div style={{ padding: '1rem' }}>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <strong>{formatMoney(item.price)}</strong>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section" style={{ background: '#f0f3f2' }}>
        <div className="container">
          <div className="section-head"><h2>Digital Menu</h2></div>
          {menu.categories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: '2rem' }}>
              <h3>{cat.name}</h3>
              <div className="grid-2">
                {menu.items.filter((i) => i.category_id === cat.id).map((item) => (
                  <div className="card" key={item.id} style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <strong>{item.name}</strong>
                      <p style={{ margin: 0 }}>{item.description}</p>
                    </div>
                    <span>{formatMoney(item.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <h2>Table Booking</h2>
          {msg && <div className="alert alert-success">{msg}</div>}
          <form className="card" style={{ padding: '1.25rem' }} onSubmit={reserve}>
            {['guest_name', 'guest_email', 'guest_phone'].map((f) => (
              <div className="form-group" key={f}>
                <label className="label">{f.replace('_', ' ')}</label>
                <input className="input" required={f === 'guest_name'} value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="form-group"><label className="label">Date</label>
              <input className="input" type="date" required value={form.reservation_date}
                onChange={(e) => setForm({ ...form, reservation_date: e.target.value })} /></div>
            <div className="form-group"><label className="label">Time</label>
              <input className="input" type="time" required value={form.reservation_time}
                onChange={(e) => setForm({ ...form, reservation_time: e.target.value })} /></div>
            <div className="form-group"><label className="label">Guests</label>
              <input className="input" type="number" min="1" value={form.guests}
                onChange={(e) => setForm({ ...form, guests: e.target.value })} /></div>
            <div className="form-group"><label className="label">Notes</label>
              <textarea className="textarea" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <button className="btn btn-primary">Reserve Table</button>
          </form>
        </div>
      </section>
    </>
  );
}
