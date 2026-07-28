import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from 'recharts';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/authStore';
import StatusBadge from '../../components/StatusBadge';

export { StatusBadge };

// ── Skeleton loader ──────────────────────────────────────────────────────────
export function Skeleton({ rows = 5 }) {
  return (
    <div style={{ padding: '0.5rem 0' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 38,
            borderRadius: 8,
            background: 'linear-gradient(90deg,#e8eeeb 25%,#f3f7f5 50%,#e8eeeb 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
            marginBottom: 8,
          }}
        />
      ))}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

// ── Overview stat cards + charts ─────────────────────────────────────────────
export function OverviewCards({ filterKeys } = {}) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/reports/overview').then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <Skeleton rows={4} />;

  const all = [
    ['Today bookings', data.todays_bookings, 'todays_bookings'],
    ['Available rooms', data.available_rooms, 'available_rooms'],
    ['Occupied', data.occupied_rooms, 'occupied_rooms'],
    ['Revenue', formatMoney(data.revenue), 'revenue'],
    ['Restaurant sales', formatMoney(data.restaurant_sales), 'restaurant_sales'],
    ['Event bookings', data.event_bookings, 'event_bookings'],
    ['Catering requests', data.catering_requests, 'catering_requests'],
    ['Cleaning pending', data.cleaning_pending, 'cleaning_pending'],
    ['Satisfaction', data.customer_satisfaction, 'customer_satisfaction'],
    ['AI usage', data.ai_usage, 'ai_usage'],
  ];

  const cards = filterKeys?.length ? all.filter((c) => filterKeys.includes(c[2])) : all;

  return (
    <>
      <div className="grid-4" style={{ marginBottom: '1.15rem' }}>
        {cards.map(([l, v]) => (
          <div className="stat-card" key={l}>
            <div className="value">{v ?? '—'}</div>
            <p className="label">{l}</p>
          </div>
        ))}
      </div>
      <div className="grid-2" style={{ marginBottom: '1.15rem' }}>
        <div className="card">
          <h3>Monthly Revenue</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data.monthly_revenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="total" fill="#114B3A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3>Booking Trends</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={data.booking_trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, action }) {
  return (
    <div className="dash-panel-title">
      <h2 style={{ margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

// ── Data table with pagination + status badge auto-render ─────────────────────
const PAGE_SIZE = 20;

export function DataTable({ columns, rows, empty = 'No records found.', pageSize = PAGE_SIZE }) {
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [rows]);

  if (!rows?.length) {
    return (
      <div className="dash-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ marginBottom: 8 }}>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p style={{ margin: 0 }}>{empty}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(rows.length / pageSize);
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);

  const STATUS_KEYS = new Set(['status', 'payment_status', 'booking_status', 'priority']);

  return (
    <>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key || c.label}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {slice.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((c) => {
                  let cell;
                  if (c.render) {
                    cell = c.render(row);
                  } else if (STATUS_KEYS.has(c.key)) {
                    cell = <StatusBadge status={row[c.key]} />;
                  } else {
                    cell = row[c.key] ?? '—';
                  }
                  return <td key={c.key || c.label}>{cell}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            Page {page} of {totalPages} ({rows.length} records)
          </span>
          <button
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}

// ── useApiList hook ───────────────────────────────────────────────────────────
export function useApiList(path, deps = []) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function reload() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(path);
      setRows(res.data || []);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { rows, loading, error, reload, setRows };
}

// ── Confirm dialog helper ─────────────────────────────────────────────────────
import Modal from '../../components/Modal';

export function ConfirmModal({ open, onClose, onConfirm, title = 'Confirm action', message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p style={{ marginBottom: '1.25rem' }}>{message}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" type="button" onClick={onClose}>Cancel</button>
        <button
          className={`btn ${danger ? 'btn-dark' : 'btn-primary'}`}
          type="button"
          onClick={() => { onConfirm(); onClose(); }}
          style={danger ? { background: '#dc2626', color: '#fff' } : {}}
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}
