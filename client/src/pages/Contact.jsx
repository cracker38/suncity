import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Contact() {
  const [faqs, setFaqs] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/cms/faqs').then((r) => setFaqs(r.data || [])).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post('/cms/contact', form);
      setMsg(res.message);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <>
      <section className="page-hero"><div><h1>Contact Us</h1><p>We are ready to assist with bookings, events, and catering.</p></div></section>
      <section className="section">
        <div className="container grid-2">
          <div>
            <h2>Get in Touch</h2>
            <p><a href="tel:+250780219057">+250 780 219 057</a></p>
            <p><a href="tel:+250788525507">+250 788 525 507</a></p>
            <p><a href="mailto:suncitynyakarambi@gmail.com">suncitynyakarambi@gmail.com</a></p>
            <p>Nyakarambi, Kirehe District, Eastern Province, Rwanda</p>
            <p>Reception open 24/7 · Restaurant 06:30–22:00</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <a className="btn btn-primary" href="https://wa.me/250780219057" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
              <a className="btn btn-outline" href="https://www.facebook.com" target="_blank" rel="noreferrer">
                Facebook
              </a>
              <a className="btn btn-outline" href="https://www.instagram.com" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <iframe title="map" style={{ width: '100%', minHeight: 280, border: 0, borderRadius: 16 }}
                src="https://www.google.com/maps?q=Nyakarambi+Kirehe+Rwanda&output=embed" loading="lazy" />
            </div>
          </div>
          <form className="card" style={{ padding: '1.25rem' }} onSubmit={submit}>
            <h2>Contact Form</h2>
            {msg && <div className="alert alert-success">{msg}</div>}
            {['name', 'email', 'phone', 'subject'].map((f) => (
              <div className="form-group" key={f}>
                <label className="label">{f}</label>
                <input className="input" required={['name', 'email'].includes(f)} value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="form-group"><label className="label">Message</label>
              <textarea className="textarea" required value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <button className="btn btn-primary">Send Message</button>
          </form>
        </div>
      </section>
      <section className="section" style={{ background: '#f0f3f2' }}>
        <div className="container">
          <div className="section-head"><h2>FAQ</h2></div>
          <div className="grid-2">
            {faqs.map((f) => (
              <article className="card" key={f.id} style={{ padding: '1.1rem' }}>
                <h3>{f.question}</h3>
                <p>{f.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
