import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { OverviewCards, PageHeader, DataTable, useApiList } from './SharedDash.jsx';

const OPS_KEYS = ['cleaning_pending', 'available_rooms', 'occupied_rooms', 'catering_requests'];

function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-error">{error}</div>;
}

function Loading({ loading, children }) {
  if (loading) return <p>Loading...</p>;
  return children;
}

function useRooms() {
  const [rooms, setRooms] = useState([]);
  useEffect(() => {
    api.get('/rooms/inventory/all').then((r) => setRooms(r.data || [])).catch(() => {});
  }, []);
  return rooms;
}

function RoomSelect({ value, onChange, required }) {
  const rooms = useRooms();
  return (
    <select className="input" required={required} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select room</option>
      {rooms.map((r) => (
        <option key={r.id} value={r.id}>
          {r.room_number} — {r.room_type_name} ({r.status})
        </option>
      ))}
    </select>
  );
}

function TaskList({ title, filterType, allowCreate, createType }) {
  const { rows, loading, error, reload } = useApiList('/housekeeping/tasks');
  const rooms = useRooms();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    room_id: '',
    scheduled_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [msg, setMsg] = useState('');

  const filtered = useMemo(
    () => (filterType ? rows.filter((t) => t.task_type === filterType) : rows),
    [rows, filterType]
  );

  async function complete(id) {
    try {
      await api.patch(`/housekeeping/tasks/${id}`, { status: 'completed' });
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  async function addTask(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/housekeeping/tasks', {
        room_id: Number(form.room_id),
        scheduled_date: form.scheduled_date,
        task_type: createType || filterType || 'cleaning',
        notes: form.notes || null,
      });
      setMsg('Task created.');
      setForm({
        room_id: rooms[0]?.id || '',
        scheduled_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setShowForm(false);
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  useEffect(() => {
    if (rooms[0] && !form.room_id) {
      setForm((f) => ({ ...f, room_id: String(rooms[0].id) }));
    }
  }, [rooms, form.room_id]);

  return (
    <div>
      <PageHeader
        title={title}
        action={
          allowCreate ? (
            <button className="btn btn-primary" type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Close' : 'Add task'}
            </button>
          ) : null
        }
      />
      {msg && <div className="alert alert-success">{msg}</div>}
      {showForm && (
        <form className="card" onSubmit={addTask} style={{ marginBottom: '1rem' }}>
          <h3>New {createType || filterType || 'cleaning'} task</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Room</label>
              <RoomSelect
                required
                value={form.room_id}
                onChange={(v) => setForm({ ...form, room_id: v })}
              />
            </div>
            <div className="form-group">
              <label className="label">Scheduled date</label>
              <input
                className="input"
                type="date"
                required
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">Create task</button>
        </form>
      )}
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          <DataTable
            columns={[
              { key: 'room_number', label: 'Room' },
              { key: 'task_type', label: 'Type' },
              { key: 'scheduled_date', label: 'Scheduled' },
              { key: 'status', label: 'Status' },
              { key: 'notes', label: 'Notes' },
              {
                render: (t) => (t.status !== 'completed' ? (
                  <button className="btn btn-outline btn-sm" onClick={() => complete(t.id)}>Complete</button>
                ) : 'Done'),
                label: 'Action',
              },
            ]}
            rows={filtered}
          />
        </Loading>
      </div>
    </div>
  );
}

export function OpsOverview() {
  const { rows: tasks } = useApiList('/housekeeping/tasks');
  const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;

  return (
    <div>
      <PageHeader title="Operations Overview" />
      <OverviewCards filterKeys={OPS_KEYS} />
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Open tasks</h3>
        <p className="value" style={{ fontSize: '1.5rem' }}>{pending}</p>
      </div>
    </div>
  );
}

export function OpsCleaning() {
  return <TaskList title="Housekeeping / Cleaning" filterType="cleaning" allowCreate createType="cleaning" />;
}

export function OpsInspection() {
  return <TaskList title="Room Inspections" filterType="inspection" allowCreate createType="inspection" />;
}

export function OpsLaundry() {
  return <TaskList title="Laundry Tasks" filterType="laundry" allowCreate createType="laundry" />;
}

export function OpsMaintenance() {
  const { rows, loading, error, reload } = useApiList('/housekeeping/maintenance');
  const [form, setForm] = useState({ title: '', description: '', room_id: '', priority: 'medium' });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/housekeeping/maintenance', {
        ...form,
        room_id: form.room_id ? Number(form.room_id) : null,
      });
      setForm({ title: '', description: '', room_id: '', priority: 'medium' });
      setMsg('Maintenance request logged.');
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/housekeeping/maintenance/${id}`, { status });
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Maintenance Requests" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          <h3>Log maintenance</h3>
          <div className="form-group">
            <label className="label">Title</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Room</label>
              <RoomSelect value={form.room_id} onChange={(v) => setForm({ ...form, room_id: v })} />
            </div>
            <div className="form-group">
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Submit request</button>
        </form>
        <div className="card">
          <ErrorAlert error={error} />
          <Loading loading={loading}>
            <DataTable
              columns={[
                { key: 'title', label: 'Issue' },
                { key: 'priority', label: 'Priority' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Reported' },
                {
                  label: 'Update',
                  render: (r) => (
                    <select
                      className="input"
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      style={{ maxWidth: 140 }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  ),
                },
              ]}
              rows={rows}
            />
          </Loading>
        </div>
      </div>
    </div>
  );
}

export function OpsLostFound() {
  const { rows, loading, error, reload } = useApiList('/housekeeping/lost-found');
  const [form, setForm] = useState({
    item_name: '',
    description: '',
    room_id: '',
    found_date: new Date().toISOString().slice(0, 10),
  });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/housekeeping/lost-found', {
        ...form,
        room_id: form.room_id ? Number(form.room_id) : null,
      });
      setForm({
        item_name: '',
        description: '',
        room_id: '',
        found_date: new Date().toISOString().slice(0, 10),
      });
      setMsg('Item logged.');
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      const payload = { status };
      if (status === 'claimed') {
        const who = window.prompt('Claimed by (name):', '');
        if (who === null) return;
        payload.claimed_by = who || 'Guest';
      }
      await api.patch(`/housekeeping/lost-found/${id}`, payload);
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Lost & Found" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          <h3>Log found item</h3>
          <div className="form-group">
            <label className="label">Item name</label>
            <input className="input" required value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Room</label>
              <RoomSelect value={form.room_id} onChange={(v) => setForm({ ...form, room_id: v })} />
            </div>
            <div className="form-group">
              <label className="label">Found date</label>
              <input className="input" type="date" value={form.found_date} onChange={(e) => setForm({ ...form, found_date: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Log item</button>
        </form>
        <div className="card">
          <ErrorAlert error={error} />
          <Loading loading={loading}>
            <DataTable
              columns={[
                { key: 'item_name', label: 'Item' },
                { key: 'description', label: 'Details' },
                { key: 'status', label: 'Status' },
                { key: 'claimed_by', label: 'Claimed by' },
                { key: 'found_date', label: 'Found' },
                {
                  label: 'Update',
                  render: (r) => (
                    <select
                      className="input"
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      style={{ maxWidth: 130 }}
                    >
                      <option value="found">Found</option>
                      <option value="claimed">Claimed</option>
                      <option value="disposed">Disposed</option>
                    </select>
                  ),
                },
              ]}
              rows={rows}
            />
          </Loading>
        </div>
      </div>
    </div>
  );
}

export function OpsReadiness() {
  const { rows, loading, error } = useApiList('/rooms/inventory/all');

  const ready = rows.filter((r) => r.status === 'available').length;
  const notReady = rows.filter((r) => ['cleaning', 'maintenance', 'occupied'].includes(r.status)).length;

  return (
    <div>
      <PageHeader title="Room Readiness" />
      <ErrorAlert error={error} />
      {loading ? <p>Loading...</p> : (
        <>
          <div className="grid-3">
            <div className="stat-card"><div className="value">{ready}</div><p className="label">Ready</p></div>
            <div className="stat-card"><div className="value">{notReady}</div><p className="label">Not ready</p></div>
            <div className="stat-card"><div className="value">{rows.length}</div><p className="label">Total rooms</p></div>
          </div>
          <div className="card" style={{ marginTop: '1rem' }}>
            <DataTable
              columns={[
                { key: 'room_number', label: 'Room' },
                { key: 'room_type_name', label: 'Type' },
                { key: 'status', label: 'Status' },
              ]}
              rows={rows}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function OpsCatering() {
  const { rows, loading, error, reload } = useApiList('/catering/requests');

  return (
    <div>
      <PageHeader title="Catering Requests" />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          <DataTable
            columns={[
              { key: 'request_code', label: 'Code' },
              { key: 'category', label: 'Category' },
              { key: 'event_date', label: 'Date' },
              { key: 'location', label: 'Location' },
              { key: 'guests', label: 'Guests' },
              { key: 'contact_name', label: 'Contact' },
              { key: 'status', label: 'Status' },
            ]}
            rows={rows}
          />
        </Loading>
        <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => reload()}>Refresh</button>
      </div>
    </div>
  );
}

export function OpsQuotations() {
  const { rows, loading, error, reload } = useApiList('/catering/requests');
  const [form, setForm] = useState({ request_id: '', amount: '', notes: '' });
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/catering/quotations', {
        request_id: Number(form.request_id),
        amount: Number(form.amount),
        notes: form.notes || null,
      });
      setMsg('Quotation sent.');
      setForm({ request_id: '', amount: '', notes: '' });
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  const pending = rows.filter((r) => r.status === 'pending');

  return (
    <div>
      <PageHeader title="Create Quotation" />
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          {msg && <div className="alert alert-success">{msg}</div>}
          <div className="form-group">
            <label className="label">Request</label>
            <select className="input" required value={form.request_id} onChange={(e) => setForm({ ...form, request_id: e.target.value })}>
              <option value="">Select request</option>
              {pending.map((r) => (
                <option key={r.id} value={r.id}>{r.request_code} — {r.contact_name} ({r.guests} guests)</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Amount (RWF)</label>
            <input className="input" type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit">Create quotation</button>
        </form>
        <div className="card">
          <ErrorAlert error={error} />
          <Loading loading={loading}>
            <h3>Pending requests</h3>
            <DataTable
              columns={[
                { key: 'request_code', label: 'Code' },
                { key: 'category', label: 'Category' },
                { key: 'guests', label: 'Guests' },
                { key: 'status', label: 'Status' },
              ]}
              rows={pending}
              empty="No pending catering requests."
            />
          </Loading>
        </div>
      </div>
    </div>
  );
}

export function OpsStaff() {
  const { rows, loading, error, reload } = useApiList('/catering/requests');
  const [editing, setEditing] = useState(null);
  const [notes, setNotes] = useState({ assigned_staff: '', vehicle_notes: '' });

  function startEdit(row) {
    setEditing(row.id);
    setNotes({ assigned_staff: row.assigned_staff || '', vehicle_notes: row.vehicle_notes || '' });
  }

  async function save(id) {
    try {
      await api.patch(`/catering/requests/${id}`, notes);
      setEditing(null);
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Staff Assignments" />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          {rows.map((r) => (
            <div key={r.id} className="card" style={{ marginBottom: 12 }}>
              <strong>{r.request_code}</strong> — {r.contact_name} — {r.event_date}
              {editing === r.id ? (
                <>
                  <div className="form-group" style={{ marginTop: 8 }}>
                    <label className="label">Assigned staff</label>
                    <input className="input" value={notes.assigned_staff} onChange={(e) => setNotes({ ...notes, assigned_staff: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="label">Vehicle notes</label>
                    <input className="input" value={notes.vehicle_notes} onChange={(e) => setNotes({ ...notes, vehicle_notes: e.target.value })} />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => save(r.id)}>Save</button>
                  <button className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={() => setEditing(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <p>Staff: {r.assigned_staff || 'Unassigned'}</p>
                  <p>Vehicle: {r.vehicle_notes || '—'}</p>
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(r)}>Edit assignment</button>
                </>
              )}
            </div>
          ))}
        </Loading>
      </div>
    </div>
  );
}

export function OpsReports() {
  return (
    <div>
      <PageHeader title="Operations Reports" />
      <OverviewCards filterKeys={OPS_KEYS} />
    </div>
  );
}
