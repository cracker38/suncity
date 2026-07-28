import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatMoney } from '../lib/authStore';
import './Events.css';

export default function Events() {
  const [halls, setHalls] = useState([]);
  const [packages, setPackages] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [weddingGallery, setWeddingGallery] = useState([]);
  const [form, setForm] = useState({
    hall_id: '',
    package_id: '',
    event_date: '',
    start_time: '09:00',
    end_time: '17:00',
    guests: 50,
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    event_type: 'conference',
    notes: '',
  });
  const [msg, setMsg] = useState('');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    api.get('/events/halls').then((r) => setHalls(r.data || [])).catch(() => {});
    api.get('/events/packages').then((r) => setPackages(r.data || [])).catch(() => {});
    api.get('/events/equipment').then((r) => setEquipment(r.data || [])).catch(() => {});
    api.get('/cms/gallery?category=wedding').then((r) => setWeddingGallery(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get(`/events/calendar?month=${month}${form.hall_id ? `&hall_id=${form.hall_id}` : ''}`)
      .then((r) => setCalendarEvents(r.data?.events || []))
      .catch(() => setCalendarEvents([]));
  }, [month, form.hall_id]);

  const busyDates = new Set(calendarEvents.map((e) => String(e.event_date).slice(0, 10)));
  const weddingHall = halls.find((h) => h.type === 'wedding' || /wedding/i.test(h.name));

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post('/events/bookings', {
        ...form,
        hall_id: Number(form.hall_id),
        package_id: form.package_id ? Number(form.package_id) : null,
      });
      setMsg(`${res.message} Code: ${res.data.booking_code}`);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <>
      <section className="page-hero events-hero">
        <div>
          <h1>Conference, Wedding & Events</h1>
          <p>Professional halls, wedding receptions, corporate meetings, and celebration packages.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Weddings</p>
            <h2>Wedding Reception & Celebration</h2>
            <p>Elegant wedding hall capacity, decor-ready spaces, and full hospitality support.</p>
          </div>
          <div className="grid-2 events-wedding-spotlight">
            <div className="media-frame">
              <iframe
                title="Hotel and wedding experience"
                src="https://www.youtube.com/embed/TMBnz2O2l58?rel=0&modestbranding=1"
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div>
              {weddingHall && (
                <article className="card pad">
                  <span className="badge">Wedding Hall</span>
                  <h3>{weddingHall.name}</h3>
                  <p>{weddingHall.description}</p>
                  <p>
                    Capacity up to <strong>{weddingHall.capacity}</strong> guests · from{' '}
                    <strong>{formatMoney(weddingHall.base_price)}</strong>
                  </p>
                  <Link className="btn btn-primary" to="/gallery?tab=wedding">
                    Wedding Gallery
                  </Link>
                </article>
              )}
              <div className="grid-3 events-wedding-thumbs">
                {(weddingGallery.length ? weddingGallery : [{ id: 1, media_url: 'https://images.unsplash.com/photo-1519167758481-83f150bd4e3e?w=800', title: 'Wedding' }])
                  .slice(0, 3)
                  .map((w) => (
                    <img key={w.id} src={w.media_url} alt={w.title} loading="lazy" />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Venues</p>
            <h2>Event Halls</h2>
          </div>
          <div className="grid-3">
            {halls.map((h) => (
              <article className="card card-hover" key={h.id}>
                <img src={h.cover_image} alt={h.name} className="events-hall-img" loading="lazy" />
                <div className="pad">
                  <span className="badge">{h.type}</span>
                  <h3>{h.name}</h3>
                  <p>{h.description}</p>
                  <p>
                    Capacity {h.capacity} · from {formatMoney(h.base_price)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div>
            <h2>Packages & Pricing</h2>
            {packages.map((p) => (
              <div className="card pad" key={p.id} style={{ marginBottom: '0.8rem' }}>
                <strong>{p.name}</strong> — {formatMoney(p.price)}
                <p style={{ margin: 0 }}>{p.description}</p>
              </div>
            ))}
            <h2>Equipment</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {equipment.map((e) => (
                <span className="badge" key={e.id}>
                  {e.name}
                </span>
              ))}
            </div>
          </div>
          <form className="card pad" onSubmit={submit}>
            <h2>Event Booking Form</h2>
            {msg && <div className="alert alert-success">{msg}</div>}
            <div className="form-group">
              <label className="label">Hall</label>
              <select
                className="select"
                required
                value={form.hall_id}
                onChange={(e) => setForm({ ...form, hall_id: e.target.value })}
              >
                <option value="">Select hall</option>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Package</label>
              <select
                className="select"
                value={form.package_id}
                onChange={(e) => setForm({ ...form, package_id: e.target.value })}
              >
                <option value="">Optional</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {['contact_name', 'contact_email', 'contact_phone', 'event_type'].map((f) => (
              <div className="form-group" key={f}>
                <label className="label">{f.replaceAll('_', ' ')}</label>
                <input
                  className="input"
                  required={f === 'contact_name'}
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              </div>
            ))}
            <div className="form-group">
              <label className="label">Event date</label>
              <input
                className="input"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
              {form.event_date && busyDates.has(form.event_date) && (
                <small style={{ color: '#7a1f1f' }}>This date already has a booking for the selected hall/filter.</small>
              )}
            </div>
            <div className="form-group">
              <label className="label">Availability month</label>
              <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              <div style={{ marginTop: 8, maxHeight: 140, overflow: 'auto', fontSize: 13 }}>
                {calendarEvents.length === 0 ? (
                  <p style={{ margin: 0 }}>No events booked this month{form.hall_id ? ' for this hall' : ''}.</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {calendarEvents.map((ev, i) => (
                      <li key={`${ev.event_date}-${i}`}>
                        {String(ev.event_date).slice(0, 10)} — {ev.hall_name} ({ev.event_type}, {ev.status})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="label">Guests</label>
              <input
                className="input"
                type="number"
                value={form.guests}
                onChange={(e) => setForm({ ...form, guests: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="label">Notes</label>
              <textarea
                className="textarea"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <button className="btn btn-primary">Submit Booking</button>
          </form>
        </div>
      </section>
    </>
  );
}
