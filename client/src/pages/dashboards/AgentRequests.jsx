import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/authStore';
import { PageHeader, DataTable } from './SharedDash.jsx';

function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-error">{error}</div>;
}

/**
 * Shared Agent Requests inbox for Reception and Admin.
 * Shows full customer profile, bookings, and AI chat transcript.
 */
export function AgentRequestsInbox({ basePath = '/reception' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('open');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');

  async function loadList() {
    setLoading(true);
    setError('');
    try {
      const path = status ? `/ai/agent-requests?status=${encodeURIComponent(status)}` : '/ai/agent-requests';
      const res = await api.get(path);
      setRows(res.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load agent requests');
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(row) {
    setSelected(row.id);
    setMsg('');
    try {
      const res = await api.get(`/ai/agent-requests/${row.id}`);
      setDetail(res.data);
      setNotes(res.data.staff_notes || '');
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateRequest(payload) {
    if (!selected) return;
    try {
      await api.patch(`/ai/agent-requests/${selected}`, payload);
      setMsg('Request updated');
      await loadList();
      const res = await api.get(`/ai/agent-requests/${selected}`);
      setDetail(res.data);
    } catch (e) {
      setMsg(e.message);
    }
  }

  useEffect(() => {
    loadList();
  }, [status]);

  const openCount = rows.filter((r) => r.status === 'open').length;

  return (
    <div>
      <PageHeader
        title="AI Agent Requests"
        action={
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        }
      />

      {msg && <div className="alert alert-success">{msg}</div>}
      <ErrorAlert error={error} />

      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="value">{openCount || rows.filter((r) => r.status === 'open').length}</div>
          <p className="label">Open in view</p>
        </div>
        <div className="stat-card">
          <div className="value">{rows.length}</div>
          <p className="label">Listed requests</p>
        </div>
        <div className="stat-card">
          <div className="value">{rows.filter((r) => r.priority === 'urgent' || r.priority === 'high').length}</div>
          <p className="label">High / urgent</p>
        </div>
        <div className="stat-card">
          <div className="value" style={{ fontSize: '1rem' }}>Reception + Admin</div>
          <p className="label">Visible to</p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3>Incoming requests</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <DataTable
              columns={[
                { key: 'request_code', label: 'Code' },
                { key: 'guest_name', label: 'Guest' },
                {
                  label: 'Contact',
                  render: (r) => r.guest_email || r.guest_phone || '—',
                },
                { key: 'status', label: 'Status' },
                { key: 'priority', label: 'Priority' },
                {
                  label: 'Opened',
                  render: (r) => (r.created_at ? String(r.created_at).slice(0, 16) : '—'),
                },
                {
                  label: '',
                  render: (r) => (
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => openDetail(r)}>
                      View
                    </button>
                  ),
                },
              ]}
              rows={rows}
              empty="No agent requests. Guests can ask the AI to “talk to an agent”."
            />
          )}
          <button className="btn btn-outline" style={{ marginTop: 12 }} type="button" onClick={loadList}>
            Refresh
          </button>
        </div>

        <div className="card">
          <h3>Customer & conversation detail</h3>
          {!detail ? (
            <p className="dash-empty">Select a request to see full guest information.</p>
          ) : (
            <div>
              <p>
                <strong>{detail.request_code}</strong> · {detail.status} · {detail.priority}
              </p>
              <div style={{ background: '#f3f6f5', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <h4 style={{ marginTop: 0 }}>Guest profile</h4>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Name:</strong> {detail.guest_name}
                  {detail.first_name ? ` (${detail.first_name} ${detail.last_name})` : ''}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Email:</strong> {detail.guest_email || detail.user_email || 'Not provided'}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Phone:</strong> {detail.guest_phone || detail.user_phone || 'Not provided'}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Location:</strong>{' '}
                  {[detail.address, detail.city, detail.country].filter(Boolean).join(', ') || '—'}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Customer since:</strong>{' '}
                  {detail.customer_since ? String(detail.customer_since).slice(0, 10) : 'Guest / not logged in'}
                </p>
                <p style={{ margin: '0.25rem 0' }}>
                  <strong>Session:</strong> {detail.session_id}
                </p>
              </div>

              <h4>Latest message</h4>
              <p>{detail.message}</p>

              <h4>Booking history</h4>
              {(detail.bookings || []).length === 0 ? (
                <p>No bookings on file.</p>
              ) : (
                <DataTable
                  columns={[
                    { key: 'booking_code', label: 'Code' },
                    { render: (b) => `${b.check_in} → ${b.check_out}`, label: 'Dates' },
                    { key: 'status', label: 'Status' },
                    { key: 'payment_status', label: 'Payment' },
                    { render: (b) => formatMoney(b.total_amount), label: 'Total' },
                  ]}
                  rows={detail.bookings || []}
                />
              )}

              <h4 style={{ marginTop: '1rem' }}>AI chat transcript</h4>
              <div
                style={{
                  maxHeight: 220,
                  overflow: 'auto',
                  background: '#f8faf9',
                  borderRadius: 10,
                  padding: '0.75rem',
                  marginBottom: '1rem',
                }}
              >
                {(detail.chat_history || []).length === 0 ? (
                  <p>No transcript stored for this session.</p>
                ) : (
                  (detail.chat_history || []).map((c, i) => (
                    <div key={i} style={{ marginBottom: 8, fontSize: '0.9rem' }}>
                      <strong>{c.role === 'user' ? 'Guest' : 'AI'}:</strong> {c.message}
                    </div>
                  ))
                )}
              </div>

              <div className="form-group">
                <label className="label">Staff notes</label>
                <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => updateRequest({ assign_to_me: true, status: 'assigned', staff_notes: notes })}
                >
                  Assign to me
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => updateRequest({ status: 'in_progress', staff_notes: notes })}
                >
                  In progress
                </button>
                <button
                  className="btn btn-dark"
                  type="button"
                  onClick={() => updateRequest({ status: 'resolved', staff_notes: notes })}
                >
                  Resolve
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => updateRequest({ status: 'closed', staff_notes: notes })}
                >
                  Close
                </button>
                <button className="btn btn-outline" type="button" onClick={() => updateRequest({ staff_notes: notes })}>
                  Save notes
                </button>
              </div>

              <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>
                Inbox path: {basePath}/agent-requests
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
