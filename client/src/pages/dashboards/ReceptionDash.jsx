import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/authStore';
import { OverviewCards, PageHeader, DataTable, useApiList, ConfirmModal, Skeleton } from './SharedDash.jsx';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

const RECEPTION_KEYS = ['todays_bookings', 'available_rooms', 'occupied_rooms', 'revenue'];

function bookingColumns(actions) {
  return [
    { key: 'booking_code', label: 'Code' },
    { key: 'guest_name', label: 'Guest' },
    { render: (r) => `${r.room_type_name || ''} ${r.room_number ? `(${r.room_number})` : ''}`.trim(), label: 'Room' },
    { render: (r) => `${r.check_in} → ${r.check_out}`, label: 'Dates' },
    { key: 'status', label: 'Status' },
    ...(actions ? [{ render: actions, label: 'Actions' }] : []),
  ];
}

// ── Payment modal ─────────────────────────────────────────────────────────────
function PaymentModal({ booking, open, onClose, onDone }) {
  const [method, setMethod] = useState('cash');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setMethod('cash'); setPhone(booking?.guest_phone || ''); setError(''); }
  }, [open, booking]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/payments/charge', {
        booking_id: booking.id,
        method,
        phone: (method === 'mtn_momo' || method === 'airtel_money') ? phone : undefined,
      });
      onDone(`Payment recorded: ${res.data?.payment_ref || res.message}`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Collect Payment — ${booking?.booking_code}`} size="sm">
      <form onSubmit={submit}>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="form-group">
          <label className="label">Payment method</label>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash at reception</option>
            <option value="mtn_momo">MTN MoMo</option>
            <option value="airtel_money">Airtel Money</option>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
          </select>
        </div>
        {(method === 'mtn_momo' || method === 'airtel_money') && (
          <div className="form-group">
            <label className="label">Mobile number</label>
            <input
              className="input"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={method === 'mtn_momo' ? '078xxxxxxx' : '072xxxxxxx'}
            />
          </div>
        )}
        <p style={{ fontSize: '0.88rem', color: '#6b7280', marginBottom: 12 }}>
          Amount: <strong>{formatMoney(booking?.total_amount)}</strong>
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing…' : 'Confirm payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
export function ReceptionOverview() {
  const { rows, loading, error } = useApiList('/bookings');
  const { rows: agentRows } = useApiList('/ai/agent-requests?status=open');

  return (
    <div>
      <PageHeader title="Reception Overview" />
      <OverviewCards filterKeys={RECEPTION_KEYS} />
      {agentRows.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #D4AF37' }}>
          <h3>⚠ {agentRows.length} open AI agent request{agentRows.length > 1 ? 's' : ''}</h3>
          <p>Guests waiting for a receptionist — check the inbox.</p>
          <Link className="btn btn-primary" to="/reception/agent-requests">Open agent inbox</Link>
        </div>
      )}
      <div className="card">
        <h3>Recent Reservations</h3>
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Skeleton /> : (
          <DataTable columns={bookingColumns()} rows={rows.slice(0, 15)} empty="No reservations yet." />
        )}
      </div>
    </div>
  );
}

// ── Reservations ──────────────────────────────────────────────────────────────
export function ReceptionReservations() {
  const [status, setStatus] = useState('');
  const path = status ? `/bookings?status=${encodeURIComponent(status)}` : '/bookings';
  const { rows, loading, error, reload } = useApiList(path, [status]);
  const [msg, setMsg] = useState('');
  const [payBooking, setPayBooking] = useState(null);

  return (
    <div>
      <PageHeader
        title="All Reservations"
        action={
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">All statuses</option>
            {['pending','confirmed','checked_in','checked_out','cancelled'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        }
      />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Skeleton /> : (
          <DataTable
            columns={[
              ...bookingColumns((r) =>
                r.payment_status !== 'paid' && r.status !== 'cancelled' ? (
                  <button className="btn btn-primary btn-sm" type="button" onClick={() => setPayBooking(r)}>
                    Collect pay
                  </button>
                ) : null
              ),
              { key: 'payment_status', label: 'Payment' },
              { render: (r) => formatMoney(r.total_amount), label: 'Total' },
            ]}
            rows={rows}
          />
        )}
        <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={reload}>Refresh</button>
      </div>
      <PaymentModal
        booking={payBooking}
        open={!!payBooking}
        onClose={() => setPayBooking(null)}
        onDone={(m) => { setMsg(m); reload(); }}
      />
    </div>
  );
}

// ── Check-in / Check-out ──────────────────────────────────────────────────────
export function ReceptionCheckIn() {
  const { rows, loading, error, reload } = useApiList('/bookings');
  const [msg, setMsg] = useState('');
  const [payBooking, setPayBooking] = useState(null);
  const [confirm, setConfirm] = useState(null); // { id, action }

  async function handleAction(id, action) {
    try {
      await api.post(`/bookings/${id}/${action}`);
      setMsg(`${action === 'check-in' ? 'Check-in' : 'Check-out'} successful.`);
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  }

  const actionable = rows.filter((b) => ['confirmed', 'checked_in'].includes(b.status));

  return (
    <div>
      <PageHeader title="Check-in / Check-out" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Skeleton /> : (
          <DataTable
            columns={bookingColumns((r) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {r.payment_status !== 'paid' && (
                  <button className="btn btn-primary btn-sm" onClick={() => setPayBooking(r)}>Collect cash</button>
                )}
                {r.status === 'confirmed' && (
                  <button className="btn btn-outline btn-sm" onClick={() => setConfirm({ id: r.id, action: 'check-in', label: `Check-in ${r.guest_name}` })}>
                    Check-in
                  </button>
                )}
                {r.status === 'checked_in' && (
                  <button className="btn btn-dark btn-sm" onClick={() => setConfirm({ id: r.id, action: 'check-out', label: `Check-out ${r.guest_name}` })}>
                    Check-out
                  </button>
                )}
              </div>
            ))}
            rows={actionable}
            empty="No guests awaiting check-in or check-out."
          />
        )}
      </div>
      <PaymentModal
        booking={payBooking}
        open={!!payBooking}
        onClose={() => setPayBooking(null)}
        onDone={(m) => { setMsg(m); reload(); }}
      />
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => handleAction(confirm.id, confirm.action)}
        title={confirm?.label}
        message={`Are you sure you want to ${confirm?.action} this guest?`}
      />
    </div>
  );
}

// ── Room inventory ────────────────────────────────────────────────────────────
export function ReceptionRooms() {
  const { rows, loading, error, reload } = useApiList('/rooms/inventory/all');
  const [msg, setMsg] = useState('');

  async function updateStatus(id, status) {
    try {
      await api.patch(`/rooms/inventory/${id}/status`, { status });
      setMsg('Room status updated.');
      reload();
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Room Inventory" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Skeleton /> : (
          <DataTable
            columns={[
              { key: 'room_number', label: 'Room' },
              { key: 'room_type_name', label: 'Type' },
              { key: 'floor', label: 'Floor' },
              { key: 'status', label: 'Status' },
              {
                render: (r) => (
                  <select className="input" value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)} style={{ maxWidth: 140 }}>
                    {['available','occupied','cleaning','maintenance','reserved'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ),
                label: 'Update',
              },
            ]}
            rows={rows}
          />
        )}
      </div>
    </div>
  );
}

// ── Walk-in ───────────────────────────────────────────────────────────────────
export function ReceptionWalkIn() {
  const [roomTypes, setRoomTypes] = useState([]);
  const [walkin, setWalkin] = useState({
    room_type_id: '', check_in: '', check_out: '',
    guest_name: '', guest_phone: '', guest_email: '',
    adults: 1, source: 'walk_in',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/rooms').then((r) => {
      const list = r.data || [];
      setRoomTypes(list);
      if (list[0]) setWalkin((w) => ({ ...w, room_type_id: list[0].id }));
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await api.post('/bookings', {
        ...walkin,
        room_type_id: Number(walkin.room_type_id),
        adults: Number(walkin.adults),
      });
      setSuccess(`Walk-in booking created: ${res.data?.booking_code}`);
      setWalkin((w) => ({ ...w, guest_name: '', guest_phone: '', guest_email: '', check_in: '', check_out: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader title="Walk-in Guest" />
      <form className="card" onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <div className="grid-2">
          {['guest_name', 'guest_phone', 'guest_email'].map((f) => (
            <div className="form-group" key={f}>
              <label className="label">{f.replace(/_/g, ' ')}</label>
              <input className="input" type={f === 'guest_email' ? 'email' : 'text'}
                required={f !== 'guest_email'} value={walkin[f]}
                onChange={(e) => setWalkin({ ...walkin, [f]: e.target.value })} />
            </div>
          ))}
          <div className="form-group">
            <label className="label">Adults</label>
            <input className="input" type="number" min="1" value={walkin.adults}
              onChange={(e) => setWalkin({ ...walkin, adults: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="label">Check-in</label>
            <input className="input" type="date" required value={walkin.check_in}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setWalkin({ ...walkin, check_in: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Check-out</label>
            <input className="input" type="date" required value={walkin.check_out}
              min={walkin.check_in || new Date().toISOString().slice(0, 10)}
              onChange={(e) => setWalkin({ ...walkin, check_out: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label className="label">Room type</label>
          <select className="input" required value={walkin.room_type_id}
            onChange={(e) => setWalkin({ ...walkin, room_type_id: e.target.value })}>
            <option value="">Select room type</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>{rt.name} — {formatMoney(rt.base_price)}/night</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create walk-in booking'}
        </button>
      </form>
    </div>
  );
}

// ── Guest directory ───────────────────────────────────────────────────────────
export function ReceptionGuests() {
  const { rows, loading, error } = useApiList('/bookings');

  const guests = useMemo(() => {
    const map = new Map();
    rows.forEach((b) => {
      const key = b.guest_email || b.guest_phone || b.guest_name;
      if (!key || map.has(key)) return;
      map.set(key, {
        id: key,
        guest_name: b.guest_name,
        guest_email: b.guest_email || '—',
        guest_phone: b.guest_phone || '—',
        last_stay: b.check_out,
        bookings: rows.filter((x) => x.guest_name === b.guest_name).length,
      });
    });
    return Array.from(map.values());
  }, [rows]);

  return (
    <div>
      <PageHeader title="Guest Directory" />
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Skeleton /> : (
          <DataTable
            columns={[
              { key: 'guest_name', label: 'Name' },
              { key: 'guest_email', label: 'Email' },
              { key: 'guest_phone', label: 'Phone' },
              { key: 'bookings', label: 'Stays' },
              { key: 'last_stay', label: 'Last checkout' },
            ]}
            rows={guests}
            empty="No guest records from bookings."
          />
        )}
      </div>
    </div>
  );
}

// ── Invoices ──────────────────────────────────────────────────────────────────
export function ReceptionInvoices() {
  const { rows, loading, error, reload } = useApiList('/reports/invoices');

  return (
    <div>
      <PageHeader title="Invoices" action={<button className="btn btn-outline btn-sm" onClick={reload}>Refresh</button>} />
      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Skeleton /> : (
          <DataTable
            columns={[
              { key: 'invoice_number', label: 'Invoice #' },
              { key: 'booking_code', label: 'Booking' },
              { key: 'guest_name', label: 'Guest' },
              { render: (r) => formatMoney(r.total_amount || r.amount), label: 'Amount' },
              { key: 'status', label: 'Status' },
              { key: 'issued_at', label: 'Issued' },
            ]}
            rows={rows}
            empty="No invoices yet."
          />
        )}
      </div>
    </div>
  );
}

// ── Occupancy ─────────────────────────────────────────────────────────────────
export function ReceptionOccupancy() {
  const { rows, loading, error } = useApiList('/rooms/inventory/all');

  const summary = useMemo(() => {
    const counts = {};
    rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [rows]);

  const total = rows.length;
  const occupied = summary.occupied || 0;
  const rate = total ? Math.round((occupied / total) * 100) : 0;

  return (
    <div>
      <PageHeader title="Occupancy Summary" />
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <Skeleton rows={4} /> : (
        <>
          <div className="grid-4" style={{ marginBottom: '1rem' }}>
            <div className="stat-card"><div className="value">{total}</div><p className="label">Total rooms</p></div>
            <div className="stat-card"><div className="value">{occupied}</div><p className="label">Occupied</p></div>
            <div className="stat-card"><div className="value">{summary.available || 0}</div><p className="label">Available</p></div>
            <div className="stat-card"><div className="value">{rate}%</div><p className="label">Occupancy rate</p></div>
          </div>
          <div className="card">
            <h3>Status breakdown</h3>
            <div className="grid-3">
              {Object.entries(summary).map(([status, count]) => (
                <div key={status} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="value">{count}</div>
                  <StatusBadge status={status} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function ReceptionNotifications() {
  const { rows, loading, error, reload } = useApiList('/customer/notifications');
  const { rows: arrivals } = useApiList('/bookings?status=confirmed');
  const { rows: agents } = useApiList('/ai/agent-requests?status=open');

  const today = new Date().toISOString().slice(0, 10);
  const todaysArrivals = arrivals.filter((b) => String(b.check_in).slice(0, 10) === today);

  async function markRead(id) {
    try { await api.post(`/customer/notifications/${id}/read`); reload(); } catch { /* ignore */ }
  }

  return (
    <div>
      <PageHeader title="Desk Alerts" />
      <div className="grid-3" style={{ marginBottom: '1rem' }}>
        <div className="stat-card"><div className="value">{rows.filter((n) => !n.is_read).length}</div><p className="label">Unread</p></div>
        <div className="stat-card"><div className="value">{todaysArrivals.length}</div><p className="label">Arrivals today</p></div>
        <div className="stat-card"><div className="value">{agents.length}</div><p className="label">Open agent requests</p></div>
      </div>
      {todaysArrivals.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #D4AF37' }}>
          <h3>Today's arrivals ({todaysArrivals.length})</h3>
          <DataTable
            columns={[
              { key: 'booking_code', label: 'Code' },
              { key: 'guest_name', label: 'Guest' },
              { key: 'guest_phone', label: 'Phone' },
              { render: (r) => r.room_type_name || '—', label: 'Room' },
            ]}
            rows={todaysArrivals}
          />
          <Link className="btn btn-outline btn-sm" style={{ marginTop: 8 }} to="/reception/checkin">Go to check-in</Link>
        </div>
      )}
      {agents.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #dc2626' }}>
          <h3>⚠ Open AI agent requests ({agents.length})</h3>
          <p>{agents.length} guest(s) waiting for a receptionist.</p>
          <Link className="btn btn-primary" to="/reception/agent-requests">Open agent inbox</Link>
        </div>
      )}
      <div className="card">
        <h3>Notifications</h3>
        {error && <div className="alert alert-error">{error}</div>}
        {loading ? <Skeleton /> : rows.length === 0 ? (
          <div className="dash-empty">No notifications yet.</div>
        ) : (
          rows.map((n) => (
            <div key={n.id} className="card" style={{ marginBottom: 8, opacity: n.is_read ? 0.65 : 1, padding: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <strong>{n.title}</strong>
                <StatusBadge status={n.type} />
              </div>
              <p style={{ margin: '0.3rem 0 0.5rem', fontSize: '0.9rem' }}>{n.message}</p>
              <small style={{ color: '#6b7280' }}>{n.created_at}</small>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {n.link && <Link className="btn btn-outline btn-sm" to={n.link}>Open</Link>}
                {!n.is_read && (
                  <button className="btn btn-outline btn-sm" onClick={() => markRead(n.id)}>Mark read</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
