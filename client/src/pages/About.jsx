import { Link } from 'react-router-dom';

const team = [
  ['Grace Uwase', 'Front Office'],
  ['Jean Habimana', 'Restaurant'],
  ['Alice Mukamana', 'Events'],
  ['Eric Niyonsenga', 'Operations'],
];

const timeline = [
  ['Founded', 'Established as a hospitality company serving Nyakarambi and Kirehe.'],
  ['Growth', 'Expanded restaurant, conference, and catering capabilities.'],
  ['NGO Partnerships', 'Successfully hosted workshops and institutional events.'],
  ['Today', 'Enterprise digital reservation and guest experience platform.'],
];

export default function About() {
  return (
    <>
      <section className="page-hero">
        <div>
          <h1>About SUN CITY NYAKARAMBI</h1>
          <p>Premium hospitality rooted in professionalism, trust, and exceptional service.</p>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2">
          <div>
            <h2>Company History</h2>
            <p>
              SUN CITY NYAKARAMBI Ltd is a professional hospitality company in Nyakarambi, Kirehe
              District, Eastern Province, Rwanda. We provide premium accommodation, restaurant
              services, conference facilities, wedding and event venues, outside catering, coffee
              station services, and food & beverage solutions.
            </p>
          </div>
          <img
            style={{ borderRadius: 18, width: '100%', height: 320, objectFit: 'cover' }}
            src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1000"
            alt="Hotel lobby"
            loading="lazy"
          />
        </div>
      </section>

      <section className="section" style={{ background: '#f0f3f2' }}>
        <div className="container grid-3">
          <article className="card" style={{ padding: '1.25rem' }}>
            <h3>Mission</h3>
            <p>Provide exceptional hospitality through excellent customer service, comfortable accommodation, quality dining, and memorable guest experiences.</p>
          </article>
          <article className="card" style={{ padding: '1.25rem' }}>
            <h3>Vision</h3>
            <p>To be Eastern Province’s most trusted luxury hospitality destination for guests, events, and institutional partners.</p>
          </article>
          <article className="card" style={{ padding: '1.25rem' }}>
            <h3>Core Values</h3>
            <p>Luxury, comfort, professionalism, trust, elegance, simplicity, and modern hospitality.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Why Choose Us</h2></div>
          <div className="grid-4">
            {['Quality Rooms', 'Event Excellence', 'Reliable Catering', 'Guest-First Culture'].map((t) => (
              <div className="card" style={{ padding: '1.1rem' }} key={t}><h3>{t}</h3><p>Designed for comfort and professional delivery.</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#f0f3f2' }}>
        <div className="container grid-2">
          <div>
            <h2>Our Experience</h2>
            <p>Extensive experience delivering high-quality hospitality services with consistent professional standards.</p>
            <h2>NGO Partnerships</h2>
            <p>We have successfully worked with multiple NGOs and institutions for workshops, meetings, accommodation, and catering.</p>
          </div>
          <div>
            <h2>Timeline</h2>
            {timeline.map(([y, t]) => (
              <div key={y} style={{ marginBottom: '1rem' }}>
                <span className="badge">{y}</span>
                <p>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>Our Team</h2></div>
          <div className="grid-4">
            {team.map(([n, r]) => (
              <div className="card" style={{ padding: '1.2rem', textAlign: 'center' }} key={n}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 0.8rem', background: 'linear-gradient(135deg,#114B3A,#D4AF37)' }} />
                <h3>{n}</h3>
                <p>{r}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link className="btn btn-primary" to="/gallery">Hotel Gallery</Link>
          </div>
        </div>
      </section>
    </>
  );
}
