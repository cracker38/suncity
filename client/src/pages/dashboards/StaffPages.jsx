import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/authStore';

export function OverviewCards() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/reports/overview').then((r) => setData(r.data)).catch(() => {});
  }, []);
  if (!data) return <p>Loading analytics...</p>;
  const cards = [
    ['Today bookings', data.todays_bookings],
    ['Available rooms', data.available_rooms],
    ['Occupied', data.occupied_rooms],
    ['Revenue', formatMoney(data.revenue)],
    ['Restaurant sales', formatMoney(data.restaurant_sales)],
    ['Event bookings', data.event_bookings],
    ['Catering requests', data.catering_requests],
    ['Cleaning pending', data.cleaning_pending],
    ['Satisfaction', data.customer_satisfaction],
    ['AI usage', data.ai_usage],
  ];
  return (
    <>
      <div className="grid-4">
        {cards.map(([l, v]) => (
          <div className="stat-card" key={l}><div className="value">{v}</div><p className="label">{l}</p></div>
        ))}
      </div>
      <div className="grid-2">
        <div className="card">
          <h3>Monthly Revenue</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data.monthly_revenue || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#114B3A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>Booking Trends</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={data.booking_trends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="card">
        <h3>Popular Rooms</h3>
        <ul>
          {(data.popular_rooms || []).map((r) => (
            <li key={r.name}>{r.name}: {r.bookings} bookings</li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function ReceptionDesk() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [walkin, setWalkin] = useState({
    room_type_id: 1, check_in: '', check_out: '', guest_name: '', guest_phone: '', adults: 1, source: 'walk_in',
  });

  async function load() {
    const [b, r] = await Promise.all([api.get('/bookings'), api.get('/rooms/inventory/all')]);
    setBookings(b.data || []);
    setRooms(r.data || []);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <>
      <OverviewCards />
      <div className="card">
        <h2>Reservations</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Guest</th><th>Room</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {bookings.slice(0, 40).map((b) => (
                <tr key={b.id}>
                  <td>{b.booking_code}</td>
                  <td>{b.guest_name}</td>
                  <td>{b.room_type_name} {b.room_number || ''}</td>
                  <td>{b.check_in} → {b.check_out}</td>
                  <td>{b.status}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline" onClick={async () => { await api.post(`/bookings/${b.id}/check-in`); load(); }}>Check-in</button>
                    <button className="btn btn-dark" onClick={async () => { await api.post(`/bookings/${b.id}/check-out`); load(); }}>Check-out</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid-2">
        <form className="card" onSubmit={async (e) => {
          e.preventDefault();
          await api.post('/bookings', walkin);
          load();
        }}>
          <h2>Walk-in Guest</h2>
          {['guest_name', 'guest_phone', 'check_in', 'check_out'].map((f) => (
            <div className="form-group" key={f}>
              <label className="label">{f}</label>
              <input className="input" type={f.includes('check') ? 'date' : 'text'} required value={walkin[f]}
                onChange={(e) => setWalkin({ ...walkin, [f]: e.target.value })} />
            </div>
          ))}
          <div className="form-group"><label className="label">Room type ID</label>
            <input className="input" value={walkin.room_type_id} onChange={(e) => setWalkin({ ...walkin, room_type_id: Number(e.target.value) })} /></div>
          <button className="btn btn-primary">Create booking</button>
        </form>
        <div className="card">
          <h2>Room Assignment / Occupancy</h2>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Room</th><th>Type</th><th>Status</th></tr></thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}><td>{r.room_number}</td><td>{r.room_type_name}</td><td>{r.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export function RestaurantDesk() {
  const [reservations, setReservations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState({ items: [] });

  useEffect(() => {
    api.get('/restaurant/reservations').then((r) => setReservations(r.data || [])).catch(() => {});
    api.get('/restaurant/orders').then((r) => setOrders(r.data || [])).catch(() => {});
    api.get('/restaurant/menu').then((r) => setMenu(r.data || { items: [] })).catch(() => {});
  }, []);

  return (
    <>
      <OverviewCards />
      <div className="card">
        <h2>Table Reservations</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Guest</th><th>Date</th><th>Time</th><th>Guests</th><th>Status</th></tr></thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}><td>{r.guest_name}</td><td>{r.reservation_date}</td><td>{r.reservation_time}</td><td>{r.guests}</td><td>{r.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h2>Orders / Kitchen</h2>
          {orders.map((o) => (
            <div key={o.id} style={{ marginBottom: '0.8rem' }}>
              <strong>{o.order_code}</strong> — {formatMoney(o.total_amount)} — {o.status}
              <button className="btn btn-outline" style={{ marginLeft: 8 }}
                onClick={async () => { await api.patch(`/restaurant/orders/${o.id}`, { status: 'ready' }); const r = await api.get('/restaurant/orders'); setOrders(r.data || []); }}>
                Mark ready
              </button>
            </div>
          ))}
          <button className="btn btn-primary" onClick={async () => {
            await api.post('/restaurant/orders', { items: [{ name: 'Chef Special', qty: 1 }], total_amount: 15000 });
            const r = await api.get('/restaurant/orders'); setOrders(r.data || []);
          }}>Create sample order</button>
        </div>
        <div className="card">
          <h2>Menu Overview</h2>
          <p>{menu.items?.length || 0} items · manage via admin CMS or add items API</p>
          <ul>{(menu.items || []).slice(0, 8).map((i) => <li key={i.id}>{i.name} — {formatMoney(i.price)}</li>)}</ul>
        </div>
      </div>
    </>
  );
}

export function EventsDesk() {
  const [bookings, setBookings] = useState([]);
  const [halls, setHalls] = useState([]);
  useEffect(() => {
    api.get('/events/bookings').then((r) => setBookings(r.data || [])).catch(() => {});
    api.get('/events/halls').then((r) => setHalls(r.data || [])).catch(() => {});
  }, []);
  return (
    <>
      <OverviewCards />
      <div className="card">
        <h2>Event Bookings Calendar List</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Hall</th><th>Date</th><th>Contact</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.booking_code}</td><td>{b.hall_name}</td><td>{b.event_date}</td><td>{b.contact_name}</td><td>{b.status}</td>
                  <td><button className="btn btn-outline" onClick={async () => { await api.patch(`/events/bookings/${b.id}`, { status: 'confirmed' }); const r = await api.get('/events/bookings'); setBookings(r.data || []); }}>Confirm</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h2>Halls</h2>
        <div className="grid-3">{halls.map((h) => <div key={h.id}><strong>{h.name}</strong><p>{h.type} · {h.capacity}</p></div>)}</div>
      </div>
    </>
  );
}

export function OpsDesk() {
  const [tasks, setTasks] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [lost, setLost] = useState([]);
  const [catering, setCatering] = useState([]);

  async function load() {
    const [t, m, l, c] = await Promise.all([
      api.get('/housekeeping/tasks'),
      api.get('/housekeeping/maintenance'),
      api.get('/housekeeping/lost-found'),
      api.get('/catering/requests'),
    ]);
    setTasks(t.data || []); setMaintenance(m.data || []); setLost(l.data || []); setCatering(c.data || []);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <>
      <OverviewCards />
      <div className="card">
        <h2>Housekeeping / Room Readiness</h2>
        <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={async () => {
          await api.post('/housekeeping/tasks', { room_id: 1, scheduled_date: new Date().toISOString().slice(0, 10), task_type: 'cleaning' });
          load();
        }}>Add cleaning task</button>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Room</th><th>Type</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.room_number}</td><td>{t.task_type}</td><td>{t.scheduled_date}</td><td>{t.status}</td>
                  <td><button className="btn btn-outline" onClick={async () => { await api.patch(`/housekeeping/tasks/${t.id}`, { status: 'completed' }); load(); }}>Complete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h2>Maintenance</h2>
          <button className="btn btn-dark" onClick={async () => { await api.post('/housekeeping/maintenance', { title: 'AC check', room_id: 1, priority: 'medium' }); load(); }}>Log request</button>
          {maintenance.map((m) => <p key={m.id}>{m.title} — {m.status} ({m.priority})</p>)}
        </div>
        <div className="card">
          <h2>Lost & Found</h2>
          <button className="btn btn-outline" onClick={async () => { await api.post('/housekeeping/lost-found', { item_name: 'Phone charger', room_id: 2, found_date: new Date().toISOString().slice(0, 10) }); load(); }}>Log item</button>
          {lost.map((i) => <p key={i.id}>{i.item_name} — {i.status}</p>)}
        </div>
      </div>
      <div className="card">
        <h2>Outside Catering Requests</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Code</th><th>Category</th><th>Date</th><th>Guests</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {catering.map((c) => (
                <tr key={c.id}>
                  <td>{c.request_code}</td><td>{c.category}</td><td>{c.event_date}</td><td>{c.guests}</td><td>{c.status}</td>
                  <td><button className="btn btn-primary" onClick={async () => {
                    await api.post('/catering/quotations', { request_id: c.id, amount: c.guests * 8000 });
                    load();
                  }}>Quote</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function FinanceDesk() {
  const [finance, setFinance] = useState(null);
  useEffect(() => { api.get('/reports/finance').then((r) => setFinance(r.data)).catch(() => {}); }, []);
  if (!finance) return <p>Loading finance...</p>;
  return (
    <>
      <OverviewCards />
      <div className="grid-4">
        {Object.entries(finance.revenue_breakdown || {}).map(([k, v]) => (
          <div className="stat-card" key={k}><div className="value">{formatMoney(v)}</div><p className="label">{k}</p></div>
        ))}
      </div>
      <div className="card">
        <h2>Payments</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => api.download('/reports/export/payments?format=csv', 'payments.csv')}>Export CSV</button>
          <button className="btn btn-outline" onClick={() => api.download('/reports/export/payments?format=xlsx', 'payments.xlsx')}>Export Excel</button>
          <button className="btn btn-dark" onClick={() => api.download('/reports/export/invoices?format=csv', 'invoices.csv')}>Invoices CSV</button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Ref</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {(finance.payments || []).map((p) => (
                <tr key={p.id}><td>{p.payment_ref}</td><td>{p.method}</td><td>{formatMoney(p.amount)}</td><td>{p.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h2>Refunds</h2>
        {(finance.refunds || []).length === 0 && <p>No refunds yet.</p>}
        {(finance.refunds || []).map((r) => <p key={r.id}>#{r.id} — {formatMoney(r.amount)} — {r.status}</p>)}
      </div>
    </>
  );
}

export function AdminDesk() {
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState(null);
  const [audit, setAudit] = useState([]);
  const [backups, setBackups] = useState([]);
  const [settings, setSettings] = useState({});

  async function load() {
    const [u, h, a, b, s] = await Promise.all([
      api.get('/admin/users'),
      api.get('/admin/health'),
      api.get('/admin/audit'),
      api.get('/admin/backups'),
      api.get('/cms/settings'),
    ]);
    setUsers(u.data || []); setHealth(h.data); setAudit(a.data || []); setBackups(b.data || []); setSettings(s.data || {});
  }
  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <>
      <OverviewCards />
      <div className="card">
        <h2>System Health</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(health, null, 2)}</pre>
        <button className="btn btn-primary" onClick={async () => { await api.post('/admin/backup'); load(); }}>Create Backup</button>
        <p>Backups: {(backups || []).join(', ') || 'none'}</p>
      </div>
      <div className="card">
        <h2>User Management</h2>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}><td>{u.first_name} {u.last_name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.is_active ? 'Yes' : 'No'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid-2">
        <form className="card" onSubmit={async (e) => {
          e.preventDefault();
          await api.post('/cms/admin/settings', settings);
          alert('Settings saved');
        }}>
          <h2>Website / AI Settings</h2>
          {Object.entries(settings).slice(0, 10).map(([k, v]) => (
            <div className="form-group" key={k}>
              <label className="label">{k}</label>
              <input className="input" value={v || ''} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })} />
            </div>
          ))}
          <button className="btn btn-primary">Save Settings</button>
        </form>
        <div className="card">
          <h2>Audit Logs</h2>
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {audit.slice(0, 30).map((a) => <p key={a.id}>{a.created_at}: {a.action} {a.entity || ''}</p>)}
          </div>
        </div>
      </div>
      <div className="card">
        <h2>CMS Shortcuts</h2>
        <p>Manage blog, offers, gallery via API endpoints under /api/cms/admin/* — forms below for quick content.</p>
        <button className="btn btn-outline" onClick={async () => {
          await api.post('/cms/admin/blog', {
            title: 'New Hotel Update',
            slug: `update-${Date.now()}`,
            excerpt: 'Latest from SUN CITY',
            content: '<p>Fresh hospitality news from Nyakarambi.</p>',
            category: 'news',
          });
          alert('Blog post created');
        }}>Publish sample blog</button>
      </div>
    </>
  );
}
