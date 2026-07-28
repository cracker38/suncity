import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatMoney, useAuth } from '../lib/authStore';
import Seo from '../components/Seo';

export default function RoomDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [dates, setDates] = useState({ check_in: '', check_out: '', guests: 2 });
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [occupied, setOccupied] = useState([]);

  useEffect(() => {
    api.get(`/rooms/${slug}`).then((r) => setRoom(r.data)).catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    api
      .get(`/rooms/${slug}/calendar?month=${month}`)
      .then((r) => setOccupied(r.data?.occupied_dates || []))
      .catch(() => setOccupied([]));
  }, [slug, month]);

  const calendarDays = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    const days = [];
    for (let i = 0; i < first.getDay(); i += 1) days.push(null);
    for (let d = 1; d <= last.getDate(); d += 1) {
      const iso = `${month}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, iso, busy: occupied.includes(iso) });
    }
    return days;
  }, [month, occupied]);

  async function checkAvailability(e) {
    e.preventDefault();
    if (!room) return;
    setChecking(true);
    setAvailability(null);
    try {
      const res = await api.get(
        `/rooms/availability?check_in=${dates.check_in}&check_out=${dates.check_out}&guests=${dates.guests}`
      );
      const match = (res.data || []).find((r) => r.id === room.id);
      setAvailability(match || { is_available: false, available_count: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function addFavorite() {
    if (!user) return;
    try {
      await api.post(`/customer/favorites/${room.id}`);
      alert('Added to favorites');
    } catch (e) {
      alert(e.message);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  if (error && !room) {
    return (
      <div className="container section">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }
  if (!room) return <div className="container section"><p>Loading...</p></div>;

  const bookUrl = `/book?room_type_id=${room.id}&check_in=${dates.check_in || ''}&check_out=${dates.check_out || ''}&guests=${dates.guests}`;

  return (
    <>
      <Seo
        title={room.name}
        description={room.short_description || room.description}
        canonical={`https://www.suncity.rw/rooms/${room.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HotelRoom',
          name: room.name,
          description: room.short_description,
          occupancy: { '@type': 'QuantitativeValue', maxValue: room.max_guests },
          offers: {
            '@type': 'Offer',
            price: room.base_price,
            priceCurrency: 'RWF',
          },
        }}
      />
      <section
        className="page-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(12,52,40,.7),rgba(12,52,40,.8)),url(${room.cover_image})`,
        }}
      >
        <div>
          <h1>{room.name}</h1>
          <p>{room.short_description}</p>
        </div>
      </section>
      <section className="section">
        <div className="container grid-2">
          <div>
            <div className="grid-2">
              {(room.images || []).map((img) => (
                <img
                  key={img.id}
                  src={img.image_url}
                  alt={room.name}
                  style={{ width: '100%', borderRadius: 12, objectFit: 'cover', aspectRatio: '4/3' }}
                />
              ))}
            </div>
            <div className="card pad" style={{ marginTop: '1rem' }}>
              <h3>Description</h3>
              <p>{room.description}</p>
              <h3>Amenities</h3>
              <ul>
                {(room.amenities || []).map((a) => (
                  <li key={a.id}>{a.name}</li>
                ))}
              </ul>
              <h3>Guest Reviews</h3>
              {(room.reviews || []).length === 0 && <p>No reviews yet.</p>}
              {(room.reviews || []).map((r) => (
                <div
                  key={r.id}
                  style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.8rem', marginTop: '0.8rem' }}
                >
                  <strong>
                    {r.rating}★ {r.title}
                  </strong>
                  <p>{r.content}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card pad" style={{ alignSelf: 'start' }}>
            <h3>{formatMoney(room.base_price)} / night</h3>
            <p>
              Up to {room.max_guests} guests · {room.bed_type} · {room.size_sqm} m²
            </p>
            <p>
              Rating: {room.rating_avg}★ ({room.review_count} reviews)
            </p>

            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0 }}>Availability calendar</h3>
                <input
                  className="input"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={{ maxWidth: 160 }}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4,
                  marginTop: 10,
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                  <strong key={d}>{d}</strong>
                ))}
                {calendarDays.map((cell, i) =>
                  cell ? (
                    <button
                      key={cell.iso}
                      type="button"
                      title={cell.busy ? 'Occupied' : 'Likely available'}
                      onClick={() => {
                        if (cell.busy) return;
                        setDates((prev) => ({
                          ...prev,
                          check_in: cell.iso,
                          check_out: prev.check_out && prev.check_out > cell.iso ? prev.check_out : '',
                        }));
                      }}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '0.35rem 0',
                        background: cell.busy ? '#f3d6d6' : '#e8f5ef',
                        color: cell.busy ? '#7a1f1f' : '#114B3A',
                        cursor: cell.busy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {cell.day}
                    </button>
                  ) : (
                    <span key={`e-${i}`} />
                  )
                )}
              </div>
              <p style={{ fontSize: 12, marginTop: 8 }}>
                <span style={{ color: '#114B3A' }}>■ Available</span>
                {' · '}
                <span style={{ color: '#7a1f1f' }}>■ Occupied</span>
              </p>
            </div>

            <form onSubmit={checkAvailability} style={{ marginTop: '1.25rem' }}>
              <h3>Check Availability</h3>
              <div className="form-group">
                <label className="label">Check-in</label>
                <input
                  className="input"
                  type="date"
                  required
                  min={today}
                  value={dates.check_in}
                  onChange={(e) => setDates({ ...dates, check_in: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">Check-out</label>
                <input
                  className="input"
                  type="date"
                  required
                  min={dates.check_in || today}
                  value={dates.check_out}
                  onChange={(e) => setDates({ ...dates, check_out: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">Guests</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max={room.max_guests}
                  value={dates.guests}
                  onChange={(e) => setDates({ ...dates, guests: e.target.value })}
                />
              </div>
              <button className="btn btn-outline" type="submit" disabled={checking}>
                {checking ? 'Checking...' : 'Check dates'}
              </button>
            </form>

            {availability && (
              <div
                className={`alert ${availability.is_available ? 'alert-success' : 'alert-error'}`}
                style={{ marginTop: '1rem' }}
              >
                {availability.is_available
                  ? `${availability.available_count} room(s) available for your dates.`
                  : 'Not available for selected dates. Try different dates or another room category.'}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
              <Link className="btn btn-primary" to={bookUrl}>
                Book Now
              </Link>
              {user && (
                <button type="button" className="btn btn-outline" onClick={addFavorite}>
                  Favorite
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
