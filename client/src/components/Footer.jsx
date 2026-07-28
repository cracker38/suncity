import { Link } from 'react-router-dom';
import './Footer.css';

function SocialIcon({ href, label, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="footer-social" aria-label={label}>
      {children}
    </a>
  );
}

export default function Footer() {
  function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand-col">
          <div className="footer-brand">
            <span className="footer-brand-mark">SC</span>
            <div>
              <strong>SUN CITY NYAKARAMBI</strong>
              <small>Luxury Hotel · Rwanda</small>
            </div>
          </div>
          <p>
            Premium accommodation, restaurant, conference, wedding venues, and outside catering in
            Nyakarambi, Kirehe District, Eastern Province, Rwanda.
          </p>
          <div className="footer-socials">
            <SocialIcon href="https://www.facebook.com/suncityny" label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://www.instagram.com/suncityny" label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </SocialIcon>
            <SocialIcon href="https://twitter.com/suncityny" label="Twitter / X">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </SocialIcon>
            <SocialIcon href="https://wa.me/250780219057" label="WhatsApp">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </SocialIcon>
          </div>
        </div>

        <div>
          <h4>Explore</h4>
          <Link to="/rooms">Rooms & Suites</Link>
          <Link to="/restaurant">Restaurant & Coffee</Link>
          <Link to="/events">Conference & Weddings</Link>
          <Link to="/catering">Outside Catering</Link>
          <Link to="/gallery">Gallery</Link>
          <Link to="/gallery?tab=videos">Hotel Video</Link>
          <Link to="/offers">Offers & Deals</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/about">About Us</Link>
        </div>

        <div>
          <h4>Contact</h4>
          <a href="tel:+250780219057">+250 780 219 057</a>
          <a href="tel:+250788525507">+250 788 525 507</a>
          <a href="mailto:suncitynyakarambi@gmail.com">suncitynyakarambi@gmail.com</a>
          <a href="https://www.suncity.rw" target="_blank" rel="noreferrer">www.suncity.rw</a>
          <a href="https://wa.me/250780219057" target="_blank" rel="noreferrer">WhatsApp Chat</a>
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            Nyakarambi, Kirehe District,<br />Eastern Province, Rwanda
          </p>
        </div>

        <div>
          <h4>Hours</h4>
          <p>Reception open <strong>24/7</strong></p>
          <p>Restaurant <strong>06:30 – 22:00</strong></p>
          <p>Check-in from <strong>14:00</strong></p>
          <p>Check-out by <strong>11:00</strong></p>
          <Link className="btn btn-primary" to="/book" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
            Book Your Stay
          </Link>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>© {new Date().getFullYear()} SUN CITY NYAKARAMBI Ltd. All rights reserved.</span>
          <div className="footer-bottom-links">
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/book">Book Now</Link>
          </div>
          <button className="footer-top-btn" onClick={scrollTop} aria-label="Back to top">↑</button>
        </div>
      </div>
    </footer>
  );
}
