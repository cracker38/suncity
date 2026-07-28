import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { formatMoney, useAuth } from '../lib/authStore';
import Seo from '../components/Seo';

export default function Rooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [maxGuests, setMaxGuests] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('price_asc');

  useEffect(() => {
    api.get('/rooms').then((r) => setRooms(r.data || [])).catch(() => {});
    if (user) {
      api.get('/customer/favorites').then((r) => {
        setFavorites(new Set((r.data || []).map((f) => f.room_type_id)));
      }).catch(() => {});
    }
  }, [user]);

  async function toggleFav(id) {
    if (!user) return;
    if (favorites.has(id)) {
      await api.delete(`/customer/favorites/${id}`).catch(() => {});
      setFavorites((s) => { const n = new Set(s); n.delete(id); return n; });
    } else {
      await api.post('/customer/favorites', { room_type_id: id }).catch(() => {});
      setFavorites((s) => new Set([...s, id]));
    }
  }

  const filtered = useMemo(() => {
    let list = [...rooms];
    if (maxGuests) list = list.filter((r) => r.max_guests >= Number(maxGuests));
    if (maxPrice)  list = list.filter((r) => r.base_price <= Number(maxPrice));
    if (sort === 'price_asc')  list.sort((a, b) => a.base_price - b.base_price);
    if (sort === 'price_desc') list.sort((a, b) => b.base_price - a.base_price);
    if (sort === 'guests')     list.sort((a, b) => b.max_guests - a.max_guests);
    return list;
  }, [rooms, maxGuests, maxPrice, sort]);

  return (
    <>
      <Seo
        title="Rooms & Suites — SUN CITY NYAKARAMBI"
        description="Standard, Deluxe, Twin, Family, and Executive Suite rooms in Nyakarambi, Rwanda."
        canonical="https://www.suncity.rw/rooms"
      />
      <section className="page-hero">
        <div>
          <h1>Rooms & Suites</h1>
          <p>Standard, Deluxe, Twin, Family, and Executive Suite accommodations.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* Filters */}
          <div className="rooms-filters">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Min. guests</label>
              <select className="select" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)}>
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Max price / night</label>
              <select className="select" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
                <option value="">Any</option>
                <option value="50000">Up to RWF 50,000</option>
                <option value="70000">Up to RWF 70,000</option>
                <option value="100000">Up to RWF 100,000</option>
                <option value="150000">Up to RWF 150,000</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label">Sort by</label>
              <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="price_asc">Price: low → high</option>
                <option value="price_desc">Price: high → low</option>
                <option value="guests">Most guests</option>
              </select>
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <span style={{ fontSize: '0.88rem', color: '#6b7280' }}>{filtered.length} room{filtered.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="grid-3">
            {filtered.map((room, i) => (
              <motion.article
                className="card card-hover room-card"
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <div style={{ position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={room.cover_image}
                    alt={room.name}
                    style={{ width: '100%', height: 210, objectFit: 'cover', transition: 'transform 0.45s ease', display: 'block' }}
                    loading="lazy"
                  />
                  {user && (
                    <button
                      type="button"
                      onClick={() => toggleFav(room.id)}
                      style={{
                        position: 'absolute', top: 10, right: 10,
                        width: 34, height: 34, borderRadius: '50%',
                        border: 0, background: 'rgba(255,255,255,0.9)',
                        fontSize: '1.1rem', cursor: 'pointer',
                        display: 'grid', placeItems: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'transform 0.2s ease',
                      }}
                      aria-label={favorites.has(room.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorites.has(room.id) ? '❤' : '♡'}
                    </button>
                  )}
                  {room.featured === 1 && (
                    <span style={{
                      position: 'absolute', top: 10, left: 10,
                      background: 'var(--gold)', color: '#0c3428',
                      fontSize: '0.68rem', fontWeight: 700,
                      padding: '0.2rem 0.55rem', borderRadius: 6,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                    }}>Featured</span>
                  )}
                </div>
                <div style={{ padding: '1.1rem' }}>
                  <h3 style={{ marginBottom: '0.3rem' }}>{room.name}</h3>
                  <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>{room.short_description}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.85rem' }}>
                    {room.bed_type && <span>🛏 {room.bed_type}</span>}
                    {room.size_sqm && <span>📐 {room.size_sqm} m²</span>}
                    <span>👥 Up to {room.max_guests} guests</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <strong style={{ color: 'var(--primary)', fontSize: '1.05rem' }}>{formatMoney(room.base_price)}<span style={{ fontWeight: 400, fontSize: '0.82rem', color: '#6b7280' }}>/night</span></strong>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link className="btn btn-outline btn-sm" to={`/rooms/${room.slug}`}>Details</Link>
                      <Link className="btn btn-primary btn-sm" to={`/book?room_type_id=${room.id}`}>Book</Link>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">
              <p>No rooms match your filters. <button className="btn btn-outline btn-sm" onClick={() => { setMaxGuests(''); setMaxPrice(''); }}>Clear filters</button></p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
