import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/authStore';
import { OverviewCards, PageHeader, DataTable, useApiList, ConfirmModal, Skeleton } from './SharedDash.jsx';
import StatusBadge from '../../components/StatusBadge';

function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-error">{error}</div>;
}

export function AdminOverview() {
  return (
    <div>
      <PageHeader title="System Administration Overview" />
      <OverviewCards />
      <div className="card">
        <h3>Quick links</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link className="btn btn-outline" to="/admin/users">Users</Link>
          <Link className="btn btn-outline" to="/admin/bookings">Bookings</Link>
          <Link className="btn btn-outline" to="/admin/cms">CMS</Link>
          <Link className="btn btn-outline" to="/admin/system">System Health</Link>
          <Link className="btn btn-outline" to="/admin/backups">Backups</Link>
          <Link className="btn btn-primary" to="/reception">Open Reception</Link>
          <Link className="btn btn-primary" to="/admin/agent-requests">AI Agent Requests</Link>
          <Link className="btn btn-primary" to="/finance">Open Finance</Link>
        </div>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const { rows, loading, error, reload } = useApiList('/admin/users');
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', phone: '', role_id: 2, password: '',
  });
  const [msg, setMsg] = useState('');
  const [formErr, setFormErr] = useState('');
  const [confirmDisable, setConfirmDisable] = useState(null);

  useEffect(() => {
    api.get('/admin/roles').then((r) => setRoles(r.data?.roles || [])).catch(() => {});
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setMsg(''); setFormErr('');
    try {
      await api.post('/admin/users', form);
      setMsg('User created successfully');
      setForm({ email: '', first_name: '', last_name: '', phone: '', role_id: 2, password: '' });
      reload();
    } catch (err) {
      setFormErr(err.message);
    }
  }

  async function toggleActive(u) {
    await api.patch(`/admin/users/${u.id}`, { is_active: u.is_active ? 0 : 1 });
    reload();
  }

  return (
    <div>
      <PageHeader title="User Management" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <form className="card" onSubmit={createUser}>
        <h3>Create user</h3>
        {formErr && <div className="alert alert-error">{formErr}</div>}
        <div className="grid-2">
          {['first_name', 'last_name', 'email', 'phone'].map((f) => (
            <div className="form-group" key={f}>
              <label className="label">{f.replaceAll('_', ' ')}</label>
              <input className="input" type={f === 'email' ? 'email' : 'text'}
                required={f !== 'phone'} value={form[f]}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            </div>
          ))}
          <div className="form-group">
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={6} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 6 characters" />
          </div>
          <div className="form-group">
            <label className="label">Role</label>
            <select className="select" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: Number(e.target.value) })}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.display_name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary">Create user</button>
      </form>
      <div className="card">
        <ErrorAlert error={error} />
        {loading ? <Skeleton /> : (
          <DataTable
            columns={[
              { render: (u) => `${u.first_name} ${u.last_name}`, label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
              { render: (u) => <StatusBadge status={u.is_active ? 'active' : 'inactive'} />, label: 'Status' },
              {
                label: 'Actions',
                render: (u) => (
                  <button className="btn btn-outline btn-sm" type="button" onClick={() => setConfirmDisable(u)}>
                    {u.is_active ? 'Disable' : 'Enable'}
                  </button>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </div>
      <ConfirmModal
        open={!!confirmDisable}
        onClose={() => setConfirmDisable(null)}
        onConfirm={() => toggleActive(confirmDisable)}
        title={confirmDisable?.is_active ? 'Disable user' : 'Enable user'}
        message={`Are you sure you want to ${confirmDisable?.is_active ? 'disable' : 'enable'} ${confirmDisable?.first_name} ${confirmDisable?.last_name}?`}
        danger={!!confirmDisable?.is_active}
      />
    </div>
  );
}

export function AdminRoles() {
  const [data, setData] = useState({ roles: [], permissions: [] });
  useEffect(() => {
    api.get('/admin/roles').then((r) => setData(r.data || { roles: [], permissions: [] })).catch(() => {});
  }, []);
  return (
    <div>
      <PageHeader title="Roles & Permissions" />
      <div className="grid-2">
        <div className="card">
          <h3>Roles</h3>
          <DataTable
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'display_name', label: 'Name' },
              { key: 'name', label: 'Code' },
              { key: 'description', label: 'Description' },
            ]}
            rows={data.roles}
          />
        </div>
        <div className="card">
          <h3>Permissions</h3>
          <DataTable
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'module', label: 'Module' },
              { key: 'description', label: 'Description' },
            ]}
            rows={data.permissions}
          />
        </div>
      </div>
    </div>
  );
}

export function AdminRooms() {
  const { rows, loading, error, reload } = useApiList('/rooms/inventory/all');
  const [types, setTypes] = useState([]);
  useEffect(() => {
    api.get('/rooms').then((r) => setTypes(r.data || [])).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Rooms Management" />
      <div className="card">
        <h3>Room types</h3>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { render: (r) => formatMoney(r.base_price), label: 'Price' },
            { key: 'max_guests', label: 'Guests' },
            { key: 'bed_type', label: 'Bed' },
          ]}
          rows={types}
        />
      </div>
      <div className="card">
        <h3>Inventory</h3>
        <ErrorAlert error={error} />
        {loading ? <p>Loading...</p> : (
          <DataTable
            columns={[
              { key: 'room_number', label: 'Room #' },
              { key: 'room_type_name', label: 'Type' },
              { key: 'floor', label: 'Floor' },
              { key: 'status', label: 'Status' },
              {
                label: 'Set',
                render: (r) => (
                  <select
                    className="select"
                    value={r.status}
                    onChange={async (e) => {
                      await api.patch(`/rooms/inventory/${r.id}/status`, { status: e.target.value });
                      reload();
                    }}
                  >
                    {['available', 'occupied', 'cleaning', 'maintenance', 'reserved'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}

export function AdminBookings() {
  const { rows, loading, error } = useApiList('/bookings');
  return (
    <div>
      <PageHeader title="All Bookings" />
      <div className="card">
        <ErrorAlert error={error} />
        {loading ? <p>Loading...</p> : (
          <DataTable
            columns={[
              { key: 'booking_code', label: 'Code' },
              { key: 'guest_name', label: 'Guest' },
              { key: 'room_type_name', label: 'Room' },
              { render: (b) => `${b.check_in} → ${b.check_out}`, label: 'Dates' },
              { key: 'status', label: 'Status' },
              { key: 'payment_status', label: 'Payment' },
              { render: (b) => formatMoney(b.total_amount), label: 'Total' },
            ]}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}

export function AdminRestaurant() {
  const [menu, setMenu] = useState({ items: [], categories: [] });
  const { rows: reservations } = useApiList('/restaurant/reservations');
  useEffect(() => {
    api.get('/restaurant/menu').then((r) => setMenu(r.data || { items: [], categories: [] })).catch(() => {});
  }, []);
  return (
    <div>
      <PageHeader title="Restaurant Control" />
      <div className="grid-2">
        <div className="card">
          <h3>Menu items ({menu.items?.length || 0})</h3>
          <DataTable
            columns={[
              { key: 'name', label: 'Item' },
              { render: (i) => formatMoney(i.price), label: 'Price' },
              { render: (i) => (i.is_available ? 'Yes' : 'No'), label: 'Available' },
            ]}
            rows={(menu.items || []).slice(0, 20)}
          />
        </div>
        <div className="card">
          <h3>Table reservations</h3>
          <DataTable
            columns={[
              { key: 'guest_name', label: 'Guest' },
              { key: 'reservation_date', label: 'Date' },
              { key: 'reservation_time', label: 'Time' },
              { key: 'status', label: 'Status' },
            ]}
            rows={reservations.slice(0, 20)}
          />
        </div>
      </div>
    </div>
  );
}

export function AdminEvents() {
  const { rows, loading, error, reload } = useApiList('/events/bookings');
  const [msg, setMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  async function setStatus(id, status) {
    setActionErr('');
    try {
      await api.patch(`/events/bookings/${id}`, { status });
      setMsg(`Status updated to ${status}`);
      reload();
    } catch (e) {
      setActionErr(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Events & Weddings" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        <ErrorAlert error={error || actionErr} />
        {loading ? <p>Loading...</p> : (
          <DataTable
            columns={[
              { key: 'booking_code', label: 'Code' },
              { key: 'hall_name', label: 'Hall' },
              { key: 'event_date', label: 'Date' },
              { key: 'contact_name', label: 'Contact' },
              { key: 'status', label: 'Status' },
              {
                label: 'Action',
                render: (b) => (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {b.status === 'pending' && (
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => setStatus(b.id, 'confirmed')}>Confirm</button>
                    )}
                    {['pending', 'confirmed'].includes(b.status) && (
                      <button className="btn btn-dark btn-sm" type="button" onClick={() => setStatus(b.id, 'completed')}>Complete</button>
                    )}
                    {!['cancelled', 'completed'].includes(b.status) && (
                      <button className="btn btn-outline btn-sm" type="button" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => setStatus(b.id, 'cancelled')}>Cancel</button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}

export function AdminCatering() {
  const { rows, loading, error } = useApiList('/catering/requests');
  return (
    <div>
      <PageHeader title="Outside Catering" />
      <div className="card">
        <ErrorAlert error={error} />
        {loading ? <p>Loading...</p> : (
          <DataTable
            columns={[
              { key: 'request_code', label: 'Code' },
              { key: 'category', label: 'Category' },
              { key: 'event_date', label: 'Date' },
              { key: 'guests', label: 'Guests' },
              { key: 'contact_name', label: 'Contact' },
              { key: 'status', label: 'Status' },
            ]}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}

export function AdminHousekeeping() {
  const { rows, loading, error, reload } = useApiList('/housekeeping/tasks');
  return (
    <div>
      <PageHeader title="Housekeeping" />
      <div className="card">
        <ErrorAlert error={error} />
        {loading ? <p>Loading...</p> : (
          <DataTable
            columns={[
              { key: 'room_number', label: 'Room' },
              { key: 'task_type', label: 'Type' },
              { key: 'scheduled_date', label: 'Date' },
              { key: 'status', label: 'Status' },
              {
                label: 'Action',
                render: (t) => (
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={async () => {
                      await api.patch(`/housekeeping/tasks/${t.id}`, { status: 'completed' });
                      reload();
                    }}
                  >
                    Complete
                  </button>
                ),
              },
            ]}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}

export function AdminFinance() {
  const [finance, setFinance] = useState(null);
  useEffect(() => {
    api.get('/reports/finance').then((r) => setFinance(r.data)).catch(() => {});
  }, []);
  if (!finance) return <p>Loading finance...</p>;
  return (
    <div>
      <PageHeader title="Finance Overview" />
      <div className="grid-4">
        {Object.entries(finance.revenue_breakdown || {}).map(([k, v]) => (
          <div className="stat-card" key={k}>
            <div className="value">{formatMoney(v)}</div>
            <p className="label">{k}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Recent payments</h3>
        <DataTable
          columns={[
            { key: 'payment_ref', label: 'Ref' },
            { key: 'method', label: 'Method' },
            { render: (p) => formatMoney(p.amount), label: 'Amount' },
            { key: 'status', label: 'Status' },
          ]}
          rows={(finance.payments || []).slice(0, 20)}
        />
      </div>
    </div>
  );
}

export function AdminCms() {
  const [msg, setMsg] = useState('');
  return (
    <div>
      <PageHeader title="CMS & Content" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        <p>Publish content quickly or manage settings, gallery, and offers from the side menu.</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={async () => {
              await api.post('/cms/admin/blog', {
                title: `Hotel Update ${new Date().toLocaleDateString()}`,
                slug: `update-${Date.now()}`,
                excerpt: 'Latest from SUN CITY NYAKARAMBI',
                content: '<p>Fresh hospitality news from Nyakarambi.</p>',
                category: 'news',
              });
              setMsg('Blog post published');
            }}
          >
            Publish sample blog
          </button>
          <Link className="btn btn-outline" to="/admin/settings">Website settings</Link>
          <Link className="btn btn-outline" to="/admin/gallery">Gallery</Link>
          <Link className="btn btn-outline" to="/admin/offers">Offers</Link>
        </div>
      </div>
    </div>
  );
}

export function AdminGallery() {
  const { rows, loading, error, reload } = useApiList('/cms/gallery');
  const [form, setForm] = useState({
    category: 'rooms', title: '', media_url: '', media_type: 'image',
  });

  async function addItem(e) {
    e.preventDefault();
    await api.post('/cms/admin/gallery', form);
    setForm({ category: 'rooms', title: '', media_url: '', media_type: 'image' });
    reload();
  }

  return (
    <div>
      <PageHeader title="Gallery & Media Library" />
      <form className="card" onSubmit={addItem}>
        <h3>Add media</h3>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">Category</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['rooms', 'restaurant', 'conference', 'wedding', 'events', 'outside_catering', 'videos', 'virtual_tour'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Type</label>
            <select className="select" value={form.media_type} onChange={(e) => setForm({ ...form, media_type: e.target.value })}>
              <option value="image">image</option>
              <option value="video">video</option>
              <option value="embed">embed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Media URL</label>
            <input className="input" required value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary">Add to gallery</button>
      </form>
      <div className="card">
        <ErrorAlert error={error} />
        {loading ? <p>Loading...</p> : (
          <DataTable
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'category', label: 'Category' },
              { key: 'media_type', label: 'Type' },
            ]}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}

export function AdminOffers() {
  const { rows, loading, error, reload } = useApiList('/cms/offers');
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    discount_percent: 10,
    coupon_code: '',
    offer_type: 'promotion',
    start_date: '',
    end_date: '',
  });
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');

  async function createOffer(e) {
    e.preventDefault();
    setMsg('');
    setFormError('');
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      await api.post('/cms/admin/offers', {
        ...form,
        slug,
        discount_percent: Number(form.discount_percent) || 0,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        coupon_code: form.coupon_code || null,
      });
      setMsg('Offer created.');
      setForm({
        title: '',
        slug: '',
        description: '',
        discount_percent: 10,
        coupon_code: '',
        offer_type: 'promotion',
        start_date: '',
        end_date: '',
      });
      reload();
    } catch (err) {
      setFormError(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="Offers & Promotions" />
      <div className="grid-2">
        <form className="card" onSubmit={createOffer}>
          <h3>Create offer</h3>
          {msg && <div className="alert alert-success">{msg}</div>}
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Slug (optional)</label>
            <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto from title" />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Discount %</label>
              <input className="input" type="number" min="0" max="100" value={form.discount_percent}
                onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Coupon code</label>
              <input className="input" value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Type</label>
              <select className="input" value={form.offer_type} onChange={(e) => setForm({ ...form, offer_type: e.target.value })}>
                <option value="promotion">Promotion</option>
                <option value="seasonal">Seasonal</option>
                <option value="weekend">Weekend</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">End date</label>
              <input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Create offer</button>
        </form>
        <div className="card">
          <h3>Active offers</h3>
          <ErrorAlert error={error} />
          {loading ? <p>Loading...</p> : (
            <DataTable
              columns={[
                { key: 'title', label: 'Title' },
                { key: 'offer_type', label: 'Type' },
                { render: (o) => `${o.discount_percent}%`, label: 'Discount' },
                { key: 'coupon_code', label: 'Coupon' },
              ]}
              rows={rows}
              empty="No active offers."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api.get('/cms/settings').then((r) => setSettings(r.data || {})).catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    await api.post('/cms/admin/settings', settings);
    setMsg('Settings saved');
  }

  return (
    <div>
      <PageHeader title="Website Settings" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <form className="card" onSubmit={save}>
        {Object.entries(settings).map(([k, v]) => (
          <div className="form-group" key={k}>
            <label className="label">{k}</label>
            <input className="input" value={v || ''} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })} />
          </div>
        ))}
        <button className="btn btn-primary">Save settings</button>
      </form>
    </div>
  );
}

export function AdminAi() {
  const [welcome, setWelcome] = useState('');
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState(null);
  useEffect(() => {
    api.get('/cms/settings').then((r) => setWelcome(r.data?.ai_welcome || '')).catch(() => {});
    api.get('/ai/status').then((r) => setStatus(r.data)).catch(() => setStatus({ openai_configured: false }));
  }, []);

  async function save(e) {
    e.preventDefault();
    await api.post('/cms/admin/settings', { ai_welcome: welcome });
    setMsg('AI welcome message updated');
  }

  return (
    <div>
      <PageHeader title="AI Assistant Configuration" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Engine status</h3>
        <p>
          Mode: <strong>Online cascade</strong> — OpenAI → Groq → Gemini → Pollinations, grounded with the hotel system prompt + live rates.
        </p>
        <p>
          OpenAI: <strong>{status?.openai_configured ? 'Configured' : 'Missing'}</strong>
          {status?.openai_cooldown ? ' (quota cooldown)' : ''}
          {' · '}Groq: <strong>{status?.groq_configured ? 'Configured' : 'Missing'}</strong>
          {' · '}Gemini: <strong>{status?.gemini_configured ? 'Configured' : 'Missing'}</strong>
          {' · '}Pollinations: <strong>Available</strong>
        </p>
        <p>Keys belong only in server `.env` (never in `.env.example` or frontend code).</p>
        <Link className="btn btn-primary" to="/admin/agent-requests">
          Open AI Agent Requests
        </Link>
      </div>
      <form className="card" onSubmit={save}>
        <div className="form-group">
          <label className="label">Welcome message (English)</label>
          <textarea className="textarea" value={welcome} onChange={(e) => setWelcome(e.target.value)} />
        </div>
        <p>Set `OPENAI_API_KEY` only in server `.env` — never in frontend code.</p>
        <button className="btn btn-primary">Save AI config</button>
      </form>
    </div>
  );
}

export function AdminReports() {
  return (
    <div>
      <PageHeader title="Analytics & Reports" />
      <OverviewCards />
      <div className="card">
        <h3>Export</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" type="button" onClick={() => api.download('/reports/export/bookings?format=csv', 'bookings.csv')}>Bookings CSV</button>
          <button className="btn btn-outline" type="button" onClick={() => api.download('/reports/export/payments?format=xlsx', 'payments.xlsx')}>Payments Excel</button>
          <button className="btn btn-outline" type="button" onClick={() => api.download('/reports/export/occupancy?format=csv', 'occupancy.csv')}>Occupancy CSV</button>
          <button className="btn btn-dark" type="button" onClick={() => api.download('/reports/export/invoices?format=csv', 'invoices.csv')}>Invoices CSV</button>
        </div>
      </div>
    </div>
  );
}

export function AdminAudit() {
  const { rows: audit } = useApiList('/admin/audit');
  const { rows: activity } = useApiList('/admin/activity');
  return (
    <div>
      <PageHeader title="Audit & Activity Logs" />
      <div className="grid-2">
        <div className="card">
          <h3>Audit logs</h3>
          <DataTable
            columns={[
              { key: 'created_at', label: 'When' },
              { key: 'action', label: 'Action' },
              { key: 'entity', label: 'Entity' },
            ]}
            rows={audit.slice(0, 40)}
          />
        </div>
        <div className="card">
          <h3>Activity logs</h3>
          <DataTable
            columns={[
              { key: 'created_at', label: 'When' },
              { key: 'activity', label: 'Activity' },
            ]}
            rows={activity.slice(0, 40)}
          />
        </div>
      </div>
    </div>
  );
}

export function AdminSecurity() {
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [totp, setTotp] = useState('');
  const [msg, setMsg] = useState('');

  async function setup() {
    const res = await api.post('/auth/2fa/setup', {});
    setQr(res.data.qr);
    setSecret(res.data.secret);
  }

  async function enable(e) {
    e.preventDefault();
    await api.post('/auth/2fa/enable', { totp });
    setMsg('2FA enabled for this administrator account');
  }

  return (
    <div>
      <PageHeader title="Security & Two-Factor Authentication" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        <p>Enable TOTP 2FA for administrator accounts.</p>
        <button className="btn btn-outline" type="button" onClick={setup}>Generate 2FA QR</button>
        {qr && (
          <div style={{ marginTop: '1rem' }}>
            <img src={qr} alt="2FA QR" style={{ width: 180, height: 180 }} />
            <p>Secret: {secret}</p>
            <form onSubmit={enable}>
              <div className="form-group">
                <label className="label">Enter code from authenticator</label>
                <input className="input" value={totp} onChange={(e) => setTotp(e.target.value)} required />
              </div>
              <button className="btn btn-primary">Enable 2FA</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminSystem() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    api.get('/admin/health').then((r) => setHealth(r.data)).catch(() => {});
  }, []);

  if (!health) return <p>Loading system health...</p>;

  const mem = health.memory || {};
  const toMB = (b) => `${Math.round((b || 0) / 1024 / 1024)} MB`;

  return (
    <div>
      <PageHeader title="System Health & Monitoring" />
      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="value" style={{ color: health.database ? '#065f46' : '#dc2626' }}>
            {health.database ? '✓ Online' : '✗ Offline'}
          </div>
          <p className="label">Database</p>
        </div>
        <div className="stat-card">
          <div className="value">{Math.round(health.uptime / 60)} min</div>
          <p className="label">Server uptime</p>
        </div>
        <div className="stat-card">
          <div className="value">{toMB(mem.heapUsed)}</div>
          <p className="label">Heap used</p>
        </div>
        <div className="stat-card">
          <div className="value">{toMB(mem.rss)}</div>
          <p className="label">RSS memory</p>
        </div>
      </div>
      <div className="card">
        <h3>Environment</h3>
        <table className="data">
          <tbody>
            <tr><td><strong>Status</strong></td><td>{health.status}</td></tr>
            <tr><td><strong>Timestamp</strong></td><td>{health.timestamp}</td></tr>
            <tr><td><strong>Heap total</strong></td><td>{toMB(mem.heapTotal)}</td></tr>
            <tr><td><strong>External</strong></td><td>{toMB(mem.external)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminBackups() {
  const [files, setFiles] = useState([]);
  const [msg, setMsg] = useState('');
  async function load() {
    const res = await api.get('/admin/backups');
    setFiles(res.data || []);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <div>
      <PageHeader title="Backups & Restore" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        <button
          className="btn btn-primary"
          type="button"
          onClick={async () => {
            const res = await api.post('/admin/backup', {});
            setMsg(`Backup created: ${res.data?.file || 'ok'}`);
            load();
          }}
        >
          Create backup now
        </button>
        <h3 style={{ marginTop: '1.25rem' }}>Available backups</h3>
        {!files.length && <p>No backups yet.</p>}
        <ul>
          {files.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p style={{ fontSize: '0.9rem' }}>Restore is available via database import scripts for safety on shared XAMPP hosts.</p>
      </div>
    </div>
  );
}
