import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { formatMoney } from '../lib/authStore';
import Seo from '../components/Seo';
import './Home.css';

function galleryPreviewImage(item) {
  if (!item) return '';
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.media_type === 'embed' || item.category === 'videos') {
    const m = String(item.media_url).match(/(?:embed\/|v=|youtu\.be\/)([\w-]{6,})/);
    const id = m?.[1] || 'TMBnz2O2l58';
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  return item.media_url;
}

export default function Home() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [posts, setPosts] = useState([]);
  const [weddingItems, setWeddingItems] = useState([]);
  const [search, setSearch] = useState({ check_in: '', check_out: '', guests: 2 });
  const [email, setEmail] = useState('');
  const [newsMsg, setNewsMsg] = useState('');
  const [availRooms, setAvailRooms] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    api.get('/rooms/featured').then((r) => setRooms(r.data || [])).catch(() => {});
    api.get('/cms/testimonials').then((r) => setTestimonials(r.data || [])).catch(() => {});
    api.get('/cms/gallery').then((r) => {
      const list = r.data || [];
      const sorted = [...list].sort((a, b) => {
        const score = (x) =>
          (x.category === 'videos' ? 100 : 0) + (x.category === 'wedding' ? 50 : 0) - (x.sort_order || 0);
        return score(b) - score(a);
      });
      setGallery(sorted.slice(0, 6));
    }).catch(() => {});
    api.get('/cms/gallery?category=wedding').then((r) => setWeddingItems(r.data || [])).catch(() => {});
    api.get('/cms/blog').then((r) => setPosts((r.data || []).slice(0, 3))).catch(() => {});
  }, []);

  async function onSearch(e) {
    e.preventDefault();
    setSearchError('');
    setSearching(true);
    setAvailRooms(null);
    try {
      const q = new URLSearchParams({
        check_in: search.check_in,
        check_out: search.check_out,
        guests: String(search.guests || 2),
      });
      const res = await api.get(`/rooms/availability?${q}`);
      setAvailRooms(res.data || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function subscribe(e) {
    e.preventDefault();
    try {
      const res = await api.post('/cms/newsletter', { email });
      setNewsMsg(res.message || 'Subscribed');
      setEmail('');
    } catch (err) {
      setNewsMsg(err.message);
    }
  }

  return (
    <div className="home">
      <Seo
        title="Luxury Hotel in Nyakarambi, Kirehe"
        description="Premium accommodation, restaurant, conference, wedding venues and outside catering at SUN CITY NYAKARAMBI Ltd."
        canonical="https://www.suncity.rw/"
      />
      <section className="hero-video">
        <div className="hero-video-bg">
          <iframe
            src="https://www.youtube.com/embed/TMBnz2O2l58?autoplay=1&mute=1&controls=0&loop=1&playlist=TMBnz2O2l58&modestbranding=1&playsinline=1&rel=0&showinfo=0"
            title="SUN CITY NYAKARAMBI Hotel Experience Video"
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
        <div className="hero-overlay" />
        <motion.div
          className="hero-content container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
        >
          <p className="hero-eyebrow">Nyakarambi · Kirehe · Rwanda</p>
          <h1>Welcome to SUN CITY NYAKARAMBI HOTEL</h1>
          <p className="hero-sub">Experience Comfort, Luxury and Exceptional Hospitality</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/book">Book Your Stay</Link>
            <Link className="btn btn-secondary" to="/about">Explore Our Services</Link>
          </div>
        </motion.div>
        <div className="scroll-indicator" aria-hidden>
          <span />
        </div>
      </section>

      <section className="booking-search section">
        <div className="container">
          <form className="search-card glass-card" onSubmit={onSearch}>
            <h2>Live Room Search</h2>
            <p>Check real availability for your dates — then book instantly.</p>
            <div className="search-grid">
              <div className="form-group">
                <label className="label">Check-in</label>
                <input className="input" type="date" required value={search.check_in}
                  onChange={(e) => setSearch({ ...search, check_in: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Check-out</label>
                <input className="input" type="date" required value={search.check_out}
                  onChange={(e) => setSearch({ ...search, check_out: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Guests</label>
                <input className="input" type="number" min="1" max="8" value={search.guests}
                  onChange={(e) => setSearch({ ...search, guests: e.target.value })} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={searching}>
                {searching ? 'Searching…' : 'Search Rooms'}
              </button>
            </div>
            {searchError && <div className="alert alert-error" style={{ marginTop: 12 }}>{searchError}</div>}
            {availRooms && (
              <div className="home-avail-results" style={{ marginTop: '1.25rem' }}>
                {availRooms.length === 0 ? (
                  <p>No rooms available for those dates. Try different dates or contact reception.</p>
                ) : (
                  <div className="grid-3">
                    {availRooms.slice(0, 6).map((r) => (
                      <article key={r.id} className="card pad">
                        <h3 style={{ marginTop: 0 }}>{r.name}</h3>
                        <p>{r.short_description}</p>
                        <p>
                          <strong>{formatMoney(r.base_price)}</strong>/night · {r.available_count} left
                        </p>
                        <Link
                          className="btn btn-primary"
                          to={`/book?check_in=${search.check_in}&check_out=${search.check_out}&guests=${search.guests}&room_type_id=${r.id}`}
                        >
                          Book this room
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
                <div className="center mt">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      const q = new URLSearchParams(search).toString();
                      navigate(`/book?${q}`);
                    }}
                  >
                    Open full booking page
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2 welcome-grid">
          <div>
            <p className="eyebrow">About the hotel</p>
            <h2>Welcome to SUN CITY NYAKARAMBI</h2>
            <p>
              SUN CITY NYAKARAMBI Ltd is a professional hospitality company providing premium
              accommodation, restaurant services, conference facilities, wedding and event venues,
              outside catering, and coffee station experiences in Eastern Province, Rwanda.
            </p>
            <p>
              Trusted by NGOs and institutions, we deliver comfort, luxury, and memorable guest
              experiences with consistently high professional standards.
            </p>
            <Link className="btn btn-outline" to="/about">Our Story</Link>
          </div>
          <img
            className="rounded-img"
            src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1000"
            alt="SUN CITY hotel exterior"
            loading="lazy"
          />
        </div>
      </section>

      <section className="section experience-band">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">See & feel SUN CITY</p>
            <h2>Hotel Experience Video & Wedding Reception</h2>
            <p>Watch our hospitality story and explore elegant wedding celebration spaces.</p>
          </div>
          <div className="grid-2 experience-grid">
            <article className="card experience-card">
              <div className="media-frame">
                <iframe
                  title="Hotel Experience Video"
                  src="https://www.youtube.com/embed/TMBnz2O2l58?rel=0&modestbranding=1"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="pad">
                <span className="badge">Hotel Experience Video</span>
                <h3>Feel the SUN CITY welcome</h3>
                <p>A full look at our rooms, dining atmosphere, and guest hospitality in Nyakarambi.</p>
                <Link className="btn btn-primary" to="/gallery?tab=videos">Open in Gallery</Link>
              </div>
            </article>
            <article className="card experience-card">
              <img
                className="experience-cover"
                src={(weddingItems[0] && weddingItems[0].media_url) || 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200'}
                alt="Wedding reception at SUN CITY"
                loading="lazy"
              />
              <div className="pad">
                <span className="badge">Wedding Reception</span>
                <h3>Celebrate in elegance</h3>
                <p>Wedding hall styling, reception setups, and celebration packages for your special day.</p>
                <div className="row-between" style={{ flexWrap: 'wrap' }}>
                  <Link className="btn btn-outline" to="/gallery?tab=wedding">Wedding Gallery</Link>
                  <Link className="btn btn-primary" to="/events">Book Wedding Hall</Link>
                </div>
              </div>
            </article>
          </div>
          {weddingItems.length > 1 && (
            <div className="grid-3" style={{ marginTop: '1.25rem' }}>
              {weddingItems.slice(0, 3).map((w) => (
                <img key={w.id} className="rounded-img wedding-thumb" src={w.media_url} alt={w.title} loading="lazy" />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Stay with us</p>
            <h2>Featured Rooms</h2>
            <p>Choose from Standard, Deluxe, Twin, Family, and Executive Suite accommodations.</p>
          </div>
          <div className="grid-3">
            {rooms.map((room, i) => (
              <motion.article
                className="card card-hover room-card"
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -6 }}
              >
                <img src={room.cover_image} alt={room.name} loading="lazy" />
                <div className="pad">
                  <h3>{room.name}</h3>
                  <p>{room.short_description}</p>
                  <div className="row-between">
                    <strong>{formatMoney(room.base_price)}/night</strong>
                    <Link className="btn btn-primary" to={`/rooms/${room.slug}`}>View</Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section services-section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Hospitality suite</p>
            <h2>Hotel Services</h2>
            <p>Everything you need for a refined stay, celebration, or business gathering — in one place.</p>
          </div>
          <div className="services-grid">
            {[
              {
                title: 'Accommodation',
                text: 'Premium rooms and suites with modern amenities, quiet rest, and thoughtful details.',
                to: '/rooms',
                image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
                label: 'Rooms',
              },
              {
                title: 'Restaurant & Coffee',
                text: 'Breakfast to dinner, chef recommendations, and a welcoming coffee station.',
                to: '/restaurant',
                image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
                label: 'Dining',
              },
              {
                title: 'Events & Weddings',
                text: 'Conference halls, wedding venues, and celebration packages with full support.',
                to: '/events',
                image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
                label: 'Venues',
              },
              {
                title: 'Outside Catering',
                text: 'Corporate, NGO, school, wedding, and private event catering with quotations.',
                to: '/catering',
                image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
                label: 'Catering',
              },
              {
                title: 'Business Support',
                text: 'Reliable hosting for institutions and NGOs with professional service standards.',
                to: '/about',
                image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
                label: 'Partners',
              },
              {
                title: 'Guest Concierge',
                text: '24/7 reception, local guidance, and personalized assistance whenever you need it.',
                to: '/contact',
                image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
                label: 'Support',
              },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
              >
                <Link to={s.to} className="service-tile">
                  <div className="service-tile-media">
                    <img src={s.image} alt="" loading="lazy" />
                    <span className="service-tile-label">{s.label}</span>
                  </div>
                  <div className="service-tile-body">
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                    <span className="service-tile-cta">Explore</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {[
        {
          title: 'Restaurant',
          text: 'Digital menus, chef recommendations, and table reservations for every meal of the day.',
          img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1000',
          to: '/restaurant',
        },
        {
          title: 'Conference, Wedding & Events',
          text: 'From corporate meetings to elegant weddings — halls, packages, and full event support.',
          img: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1000',
          to: '/events',
        },
        {
          title: 'Outside Catering',
          text: 'Professional catering for corporate, wedding, school, NGO, and private events.',
          img: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=1000',
          to: '/catering',
        },
        {
          title: 'Coffee Station',
          text: 'Fresh Rwanda single-origin coffee and specialty drinks in a welcoming lounge setting.',
          img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000',
          to: '/restaurant',
        },
      ].map((block, i) => (
        <section className={`section feature-spotlight ${i % 2 ? 'alt' : ''}`} key={block.title}>
          <div className={`container grid-2 feature-row ${i % 2 ? 'reverse' : ''}`}>
            <motion.div
              className="feature-media"
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
            >
              <img className="rounded-img" src={block.img} alt={block.title} loading="lazy" />
            </motion.div>
            <motion.div
              className="feature-copy"
              initial={{ opacity: 0, x: i % 2 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="eyebrow">Signature experience</p>
              <h2>{block.title}</h2>
              <p>{block.text}</p>
              <Link className="btn btn-outline" to={block.to}>Learn More</Link>
            </motion.div>
          </div>
        </section>
      ))}

      <section className="section why-section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Our promise</p>
            <h2>Why Choose Us</h2>
            <p>Luxury, comfort, professionalism, and trust — delivered with Rwandan hospitality.</p>
          </div>
          <div className="why-grid">
            {[
              {
                title: 'Premium Comfort',
                text: 'Thoughtfully appointed rooms, restful atmospheres, and amenities designed for longer stays.',
                icon: 'comfort',
              },
              {
                title: 'NGO-Trusted Service',
                text: 'Proven hosting for institutions and partners who expect reliable, professional delivery.',
                icon: 'trust',
              },
              {
                title: 'Full Event Capability',
                text: 'Halls, packages, catering, and coordination for conferences, weddings, and celebrations.',
                icon: 'events',
              },
              {
                title: 'Local Expertise',
                text: 'Deep knowledge of Nyakarambi and Kirehe — guidance that makes every visit smoother.',
                icon: 'local',
              },
            ].map((item, i) => (
              <motion.article
                key={item.title}
                className="why-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                whileHover={{ y: -6 }}
              >
                <div className={`why-icon why-icon-${item.icon}`} aria-hidden>
                  <span />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section stats-band">
        <div className="container grid-4">
          {[
            ['12+', 'Guest Rooms'],
            ['250', 'Event Capacity'],
            ['24/7', 'Reception'],
            ['100%', 'Guest Focus'],
          ].map(([v, l], i) => (
            <motion.div
              key={l}
              className="stat-pill"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <strong>{v}</strong>
              <span>{l}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section testimonials-section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Guest voices</p>
            <h2>Testimonials</h2>
            <p>What our guests say about staying and celebrating with us.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <motion.article
                key={t.id}
                className="testimonial-card"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4 }}
              >
                <div className="testimonial-quote" aria-hidden>“</div>
                <div className="badge">{t.rating}★</div>
                <p>“{t.content}”</p>
                <div className="testimonial-meta">
                  <strong>{t.guest_name}</strong>
                  <small>{t.guest_title}</small>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Visual tour</p>
            <h2>Gallery Preview</h2>
            <p>Rooms, dining, weddings, and our hotel experience video.</p>
          </div>
          <div className="grid-3">
            {gallery.map((g) => (
              <Link
                key={g.id}
                to={
                  g.category === 'videos' || g.media_type === 'embed'
                    ? '/gallery?tab=videos'
                    : g.category === 'wedding'
                      ? '/gallery?tab=wedding'
                      : '/gallery'
                }
                className="gallery-preview-item card-hover"
              >
                <img src={galleryPreviewImage(g)} alt={g.title} loading="lazy" />
                {(g.media_type === 'embed' || g.category === 'videos') && (
                  <span className="preview-play" aria-hidden>
                    ▶
                  </span>
                )}
              </Link>
            ))}
          </div>
          <div className="center mt">
            <Link className="btn btn-outline" to="/gallery">View Full Gallery</Link>
            <Link className="btn btn-primary" style={{ marginLeft: 8 }} to="/gallery?tab=videos">
              Watch Hotel Video
            </Link>
          </div>
        </div>
      </section>

      <section className="section attractions-section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Explore beyond</p>
            <h2>Nearby Attractions</h2>
            <p>Discover Eastern Province around Nyakarambi and Kirehe — then return to comfort at SUN CITY.</p>
          </div>
          <div className="attractions-grid">
            {[
              {
                title: 'Lake landscapes',
                text: 'Peaceful water views and open skies — ideal for quiet mornings and weekend photography.',
                image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=900',
                tag: 'Nature',
              },
              {
                title: 'Cultural heritage',
                text: 'Local stories, community spaces, and heritage moments that deepen your Rwanda journey.',
                image: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=900',
                tag: 'Culture',
              },
              {
                title: 'Countryside drives',
                text: 'Scenic routes through green hills — perfect day trips before dinner at the hotel.',
                image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900',
                tag: 'Scenic',
              },
            ].map((a, i) => (
              <motion.article
                key={a.title}
                className="attraction-card"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="attraction-media">
                  <img src={a.image} alt={a.title} loading="lazy" />
                  <span className="attraction-tag">{a.tag}</span>
                </div>
                <div className="attraction-body">
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                </div>
              </motion.article>
            ))}
          </div>
          <div className="center mt">
            <Link className="btn btn-outline" to="/contact">Ask reception for routes</Link>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-head"><h2>Latest News</h2></div>
          <div className="grid-3 news-grid">
            {posts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <Link to={`/blog/${p.slug}`} className="card card-hover news-card-link">
                  <img src={p.cover_image} alt={p.title} loading="lazy" />
                  <div className="pad"><h3>{p.title}</h3><p>{p.excerpt}</p></div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Find Us</h2><p>Nyakarambi, Kirehe District, Eastern Province, Rwanda</p></div>
          <iframe
            className="map"
            title="SUN CITY location map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=Nyakarambi+Kirehe+Rwanda&output=embed"
          />
        </div>
      </section>

      <section className="section newsletter">
        <div className="container">
          <form className="news-card" onSubmit={subscribe}>
            <h2>Newsletter</h2>
            <p>Receive offers, events, and hospitality news from SUN CITY.</p>
            <div className="news-row">
              <input className="input" type="email" required placeholder="Your email" value={email}
                onChange={(e) => setEmail(e.target.value)} />
              <button className="btn btn-primary">Subscribe</button>
            </div>
            {newsMsg && <p className="ok">{newsMsg}</p>}
          </form>
        </div>
      </section>
    </div>
  );
}
