import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/authStore';
import { OverviewCards, PageHeader, DataTable, useApiList } from './SharedDash.jsx';

const EVENTS_KEYS = ['event_bookings', 'revenue', 'customer_satisfaction', 'catering_requests'];

function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-error">{error}</div>;
}

function Loading({ loading, children }) {
  if (loading) return <p>Loading...</p>;
  return children;
}

function EventBookingsList({ title, filterFn }) {
  const { rows, loading, error, reload } = useApiList('/events/bookings');
  const filtered = useMemo(() => (filterFn ? rows.filter(filterFn) : rows), [rows, filterFn]);

  async function setStatus(id, status) {
    try {
      await api.patch(`/events/bookings/${id}`, { status });
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <PageHeader title={title} action={<button className="btn btn-outline" onClick={() => reload()}>Refresh</button>} />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          <DataTable
            columns={[
              { key: 'booking_code', label: 'Code' },
              { key: 'hall_name', label: 'Hall' },
              { key: 'event_type', label: 'Type' },
              { key: 'event_date', label: 'Date' },
              { key: 'contact_name', label: 'Contact' },
              { key: 'guests', label: 'Guests' },
              { render: (r) => formatMoney(r.total_amount), label: 'Amount' },
              { key: 'status', label: 'Status' },
              {
                render: (r) => (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.status === 'pending' && (
                      <button className="btn btn-outline btn-sm" onClick={() => setStatus(r.id, 'confirmed')}>Confirm</button>
                    )}
                    {['pending', 'confirmed'].includes(r.status) && (
                      <button className="btn btn-dark btn-sm" onClick={() => setStatus(r.id, 'completed')}>Complete</button>
                    )}
                    {!['cancelled', 'completed'].includes(r.status) && (
                      <button className="btn btn-outline btn-sm" onClick={() => setStatus(r.id, 'cancelled')}>Cancel</button>
                    )}
                  </div>
                ),
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

export function EventsOverview() {
  const { rows } = useApiList('/events/bookings');
  const pending = rows.filter((b) => b.status === 'pending').length;

  return (
    <div>
      <PageHeader title="Events Overview" />
      <OverviewCards filterKeys={EVENTS_KEYS} />
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>Pending confirmations</h3>
        <p className="value" style={{ fontSize: '1.5rem' }}>{pending}</p>
      </div>
    </div>
  );
}

export function EventsBookings() {
  return <EventBookingsList title="All Event Bookings" />;
}

export function EventsConference() {
  return (
    <EventBookingsList
      title="Conference Events"
      filterFn={(b) => /conference/i.test(b.event_type || '')}
    />
  );
}

export function EventsWeddings() {
  return (
    <EventBookingsList
      title="Wedding Events"
      filterFn={(b) => /wedding/i.test(b.event_type || '')}
    />
  );
}

export function EventsCorporate() {
  return (
    <EventBookingsList
      title="Corporate & Private Events"
      filterFn={(b) => /corporate|private|meeting/i.test(b.event_type || '')}
    />
  );
}

export function EventsHalls() {
  const { rows, loading, error } = useApiList('/events/halls');

  return (
    <div>
      <PageHeader title="Event Halls" />
      <ErrorAlert error={error} />
      {loading ? <p>Loading...</p> : (
        <div className="grid-3">
          {rows.map((h) => (
            <div key={h.id} className="card">
              <h3>{h.name}</h3>
              <p><strong>Type:</strong> {h.type}</p>
              <p><strong>Capacity:</strong> {h.capacity} guests</p>
              <p><strong>Base price:</strong> {formatMoney(h.base_price)}</p>
              {h.description && <p>{h.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventsEquipment() {
  const { rows, loading, error } = useApiList('/events/equipment');

  return (
    <div>
      <PageHeader title="Event Equipment" />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          <DataTable
            columns={[
              { key: 'name', label: 'Item' },
              { key: 'category', label: 'Category' },
              { key: 'quantity', label: 'Qty' },
              { render: (r) => formatMoney(r.rental_price), label: 'Rental price' },
              { key: 'status', label: 'Status' },
            ]}
            rows={rows}
          />
        </Loading>
      </div>
    </div>
  );
}

export function EventsPackages() {
  const { rows, loading, error } = useApiList('/events/packages');

  return (
    <div>
      <PageHeader title="Event Packages" />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          {rows.length === 0 ? (
            <div className="dash-empty">No packages configured.</div>
          ) : (
            <div className="grid-2">
              {rows.map((p) => (
                <div key={p.id} className="card">
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <strong>{formatMoney(p.price)}</strong>
                  {p.includes && <p><small>{p.includes}</small></p>}
                </div>
              ))}
            </div>
          )}
        </Loading>
      </div>
    </div>
  );
}

export function EventsCalendar() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/events/calendar?month=${encodeURIComponent(month)}`)
      .then((r) => setEvents(r.data?.events || []))
      .catch((e) => {
        setError(e.message);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const byDate = useMemo(() => {
    const map = {};
    events.forEach((b) => {
      const d = String(b.event_date).slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(b);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  return (
    <div>
      <PageHeader
        title="Events Calendar"
        action={
          <input
            className="input"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ maxWidth: 180 }}
          />
        }
      />
      <ErrorAlert error={error} />
      {loading ? <p>Loading...</p> : byDate.length === 0 ? (
        <div className="dash-empty">No pending/confirmed events in {month}.</div>
      ) : (
        byDate.map(([date, list]) => (
          <div key={date} className="card" style={{ marginBottom: '1rem' }}>
            <h3>{date}</h3>
            {list.map((e, i) => (
              <div key={`${date}-${i}`} style={{ padding: '0.5rem 0', borderTop: '1px solid #eee' }}>
                <strong>{e.hall_name}</strong> — {e.event_type} — <em>{e.status}</em>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export function EventsReports() {
  return (
    <div>
      <PageHeader title="Events Reports" />
      <OverviewCards filterKeys={EVENTS_KEYS} />
    </div>
  );
}
