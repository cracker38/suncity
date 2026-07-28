import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatMoney, useAuth } from '../../lib/authStore';

export function CustomerHome() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    api.get('/bookings/mine').then((r) => setBookings(r.data || [])).catch(() => {});
    api.get('/customer/notifications').then((r) => setNotes(r.data || [])).catch(() => {});
  }, []);

  const upcoming = bookings.filter((b) => ['pending', 'confirmed'].includes(b.status));

  return (
    <>
      <div className="grid-4">
        <div className="stat-card"><div className="value">{bookings.length}</div><p className="label">Total bookings</p></div>
        <div className="stat-card"><div className="value">{upcoming.length}</div><p className="label">Upcoming</p></div>
        <div className="stat-card"><div className="value">{notes.filter((n) => !n.is_read).length}</div><p className="label">Unread alerts</p></div>
        <div className="stat-card"><div className="value">{user?.first_name}</div><p className="label">Welcome</p></div>
      </div>
      <div className="card">
        <h2>Upcoming Reservations</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Room</th><th>Dates</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {upcoming.map((b) => (
                <tr key={b.id}>
                  <td>{b.booking_code}</td>
                  <td>{b.room_type_name}</td>
                  <td>{b.check_in} → {b.check_out}</td>
                  <td>{b.status}</td>
                  <td>{formatMoney(b.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link className="btn btn-primary" to="/dashboard/bookings">View all bookings</Link>
      </div>
    </>
  );
}

export function CustomerBookings() {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/bookings/mine');
      setBookings(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function cancel(id) {
    setError('');
    setMsg('');
    try {
      await api.post(`/bookings/${id}/cancel`, { reason: 'Cancelled by guest' });
      setMsg('Booking cancelled');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="card">
      <h2>My Bookings</h2>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <p>Loading...</p> : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Room</th><th>Dates</th><th>Payment</th><th>Actions</th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.booking_code}</td>
                  <td>{b.room_type_name} {b.room_number ? `(${b.room_number})` : ''}</td>
                  <td>{b.check_in} → {b.check_out}</td>
                  <td>{b.payment_status}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-outline" onClick={() => api.download(`/bookings/${b.id}/invoice.pdf`, `${b.booking_code}.pdf`).catch((e) => setError(e.message))}>Invoice</button>
                    {['pending', 'confirmed'].includes(b.status) && (
                      <button className="btn btn-dark" onClick={() => cancel(b.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bookings.length && <p>No bookings yet. <Link to="/book">Book a stay</Link></p>}
        </div>
      )}
    </div>
  );
}

export function CustomerProfile() {
  const { user, refreshMe } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    country: user?.country || 'Rwanda',
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await api.put('/auth/profile', form);
      await refreshMe();
      setMsg('Profile updated');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h2>Profile</h2>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {Object.keys(form).map((k) => (
        <div className="form-group" key={k}>
          <label className="label">{k.replaceAll('_', ' ')}</label>
          <input className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        </div>
      ))}
      <button className="btn btn-primary">Save</button>
    </form>
  );
}

export function CustomerInvoices() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/customer/invoices').then((r) => setRows(r.data || [])).catch(() => {}); }, []);
  return (
    <div className="card">
      <h2>Invoices</h2>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Number</th><th>Amount</th><th>Tax</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td>{i.invoice_number}</td>
                <td>{formatMoney(i.amount)}</td>
                <td>{formatMoney(i.tax_amount)}</td>
                <td>{formatMoney(i.total_amount)}</td>
                <td>{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CustomerFavorites() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setError('');
    try {
      const r = await api.get('/customer/favorites');
      setRows(r.data || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function remove(roomTypeId) {
    setMsg('');
    setError('');
    try {
      await api.delete(`/customer/favorites/${roomTypeId}`);
      setMsg('Removed from favorites');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="card">
      <h2>Favorites</h2>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      {!rows.length && <p>No favorites yet. Save rooms from the room detail page.</p>}
      <div className="grid-3">
        {rows.map((r) => (
          <div key={r.favorite_id || r.room_type_id} className="card" style={{ padding: 0 }}>
            <Link to={`/rooms/${r.slug}`}>
              <img src={r.cover_image} alt={r.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            </Link>
            <div style={{ padding: '0.8rem' }}>
              <strong>{r.name}</strong>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link className="btn btn-outline btn-sm" to={`/rooms/${r.slug}`}>View</Link>
                <button className="btn btn-dark btn-sm" type="button" onClick={() => remove(r.room_type_id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerReviews() {
  const [rows, setRows] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ room_type_id: '', rating: 5, title: '', content: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/customer/reviews/mine').then((r) => setRows(r.data || [])).catch(() => {});
    api.get('/rooms').then((r) => {
      const list = r.data || [];
      setRooms(list);
      if (list[0]) setForm((f) => ({ ...f, room_type_id: list[0].id }));
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await api.post('/customer/reviews', {
        ...form,
        room_type_id: Number(form.room_type_id),
        rating: Number(form.rating),
      });
      setMsg('Review submitted for approval');
      setForm((f) => ({ ...f, title: '', content: '' }));
      const r = await api.get('/customer/reviews/mine');
      setRows(r.data || []);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <form className="card" onSubmit={submit}>
        <h2>Write a Review</h2>
        {msg && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label className="label">Room type</label>
          <select
            className="input"
            required
            value={form.room_type_id}
            onChange={(e) => setForm({ ...form, room_type_id: e.target.value })}
          >
            <option value="">Select room</option>
            {rooms.map((rt) => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Rating</label>
          <input className="input" type="number" min="1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">Content</label>
          <textarea className="textarea" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        </div>
        <button className="btn btn-primary">Submit</button>
      </form>
      <div className="card">
        <h2>My Reviews</h2>
        {rows.map((r) => (
          <div key={r.id} style={{ marginBottom: '0.8rem' }}>
            <strong>{r.rating}★ {r.title}</strong>
            <p>{r.content}</p>
            <small>{r.is_approved ? 'Approved' : 'Pending approval'}</small>
          </div>
        ))}
        {!rows.length && <p>No reviews yet.</p>}
      </div>
    </>
  );
}

export function CustomerNotifications() {
  const [rows, setRows] = useState([]);
  async function load() {
    const r = await api.get('/customer/notifications');
    setRows(r.data || []);
  }
  useEffect(() => { load().catch(() => {}); }, []);
  return (
    <div className="card">
      <h2>Notifications</h2>
      {rows.map((n) => (
        <div key={n.id} style={{ padding: '0.8rem 0', borderBottom: '1px solid #e5e7eb', opacity: n.is_read ? 0.6 : 1 }}>
          <strong>{n.title}</strong>
          <p style={{ margin: 0 }}>{n.message}</p>
          {!n.is_read && <button className="btn btn-outline" onClick={async () => { await api.post(`/customer/notifications/${n.id}/read`); load(); }}>Mark read</button>}
        </div>
      ))}
      {!rows.length && <p>No notifications yet.</p>}
    </div>
  );
}

export function CustomerPayments() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    api.get('/payments/history').then((r) => setRows(r.data || [])).catch(() => {});
  }, []);
  return (
    <div className="card">
      <h2>Payment History</h2>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.payment_ref}</td>
                <td>{p.method}</td>
                <td>{formatMoney(p.amount)}</td>
                <td>{p.status}</td>
                <td>{p.paid_at || p.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>No payments yet.</p>}
    </div>
  );
}

export function CustomerAssistant() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `dash-${Date.now()}`);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Good day. Welcome to SUN CITY NYAKARAMBI. I am your virtual concierge — how may I assist you today?',
    },
  ]);

  async function sendMessage(text, requestAgent = false) {
    if (!text.trim() || loading) return;
    const content = text.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: content }]);
    setLoading(true);
    try {
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.text }));
      const res = await api.post('/ai/chat', {
        message: content,
        session_id: sessionId,
        history,
        request_agent: requestAgent,
      });
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res.data.reply,
          whatsapp: res.data.whatsapp,
          ticket: res.data.agent_request?.request_code,
        },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err.message || 'Unable to respond right now.' }]);
    } finally {
      setLoading(false);
    }
  }

  function send(e) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="card">
      <h2>Guest Concierge</h2>
      <p>Professional English assistance for rooms, bookings, dining, and events. Reception receives agent requests with your account details.</p>
      <div style={{ maxHeight: 360, overflow: 'auto', background: '#f3f6f5', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '0.8rem', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <div
              style={{
                display: 'inline-block',
                padding: '0.7rem 0.9rem',
                borderRadius: 12,
                background: m.role === 'user' ? '#114B3A' : '#fff',
                color: m.role === 'user' ? '#fff' : '#333',
                maxWidth: '90%',
              }}
            >
              {m.text}
            </div>
            {m.ticket && (
              <div style={{ fontSize: '0.8rem', color: '#114B3A', marginTop: 4 }}>Ticket {m.ticket}</div>
            )}
            {m.whatsapp && (
              <div>
                <a className="btn btn-primary" href={m.whatsapp} target="_blank" rel="noreferrer" style={{ marginTop: 8 }}>
                  WhatsApp
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={send} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question..." style={{ flex: 1, minWidth: 180 }} />
        <button className="btn btn-primary" disabled={loading}>{loading ? '...' : 'Send'}</button>
        <button
          className="btn btn-dark"
          type="button"
          disabled={loading}
          onClick={() => sendMessage('I would like to talk to a receptionist agent please.', true)}
        >
          Talk to agent
        </button>
      </form>
    </div>
  );
}
