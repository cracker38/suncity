import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/authStore';
import './Navbar.css';

const experienceLinks = [
  { to: '/restaurant', label: 'Restaurant & Coffee', desc: 'Dining and coffee station' },
  { to: '/events', label: 'Conference & Weddings', desc: 'Meetings, celebrations, events' },
  { to: '/catering', label: 'Outside Catering', desc: 'Corporate, NGO and private catering' },
];

const discoverLinks = [
  { to: '/gallery', label: 'Gallery', desc: 'Photos, videos and virtual tour' },
  { to: '/offers', label: 'Offers', desc: 'Seasonal deals and packages' },
  { to: '/blog', label: 'Blog', desc: 'News, travel and hospitality' },
];

function Dropdown({ label, items, active, open, onOpen, onClose, onNavigate }) {
  return (
    <div
      className={`nav-dropdown ${open ? 'is-open' : ''} ${active ? 'is-active' : ''}`}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        className="nav-link nav-dropdown-trigger"
        aria-expanded={open}
        onClick={() => (open ? onClose() : onOpen())}
      >
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <div className="nav-dropdown-menu" role="menu">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            role="menuitem"
            className="nav-dropdown-item"
            onClick={onNavigate}
          >
            <strong>{item.label}</strong>
            <span>{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef(null);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const experienceActive = experienceLinks.some((l) => location.pathname.startsWith(l.to));
  const discoverActive = discoverLinks.some((l) => location.pathname.startsWith(l.to));

  useEffect(() => {
    setOpen(false);
    setExperienceOpen(false);
    setDiscoverOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setExperienceOpen(false);
        setDiscoverOpen(false);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function closeAll() {
    setOpen(false);
    setExperienceOpen(false);
    setDiscoverOpen(false);
  }

  return (
    <header className={`nav${scrolled ? ' nav-scrolled' : ''}`}>
      <div className="nav-top">
        <div className="container nav-top-inner">
          <div className="nav-top-left">
            <a href="tel:+250780219057">+250 780 219 057</a>
            <span className="nav-dot" aria-hidden />
            <a href="mailto:suncitynyakarambi@gmail.com">suncitynyakarambi@gmail.com</a>
          </div>
          <div className="nav-top-right">
            <a href="https://wa.me/250780219057" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            {user ? (
              <>
                <Link to={dashboardPath()}>Dashboard</Link>
                <button
                  type="button"
                  className="nav-text-btn"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </div>
        </div>
      </div>

      <div className="nav-main">
        <div className="nav-inner container" ref={panelRef}>
          <Link to="/" className="brand" onClick={closeAll}>
            <span className="brand-mark">SC</span>
            <span className="brand-text">
              <strong>SUN CITY</strong>
              <small>NYAKARAMBI HOTEL</small>
            </span>
          </Link>

          <button
            className={`nav-toggle ${open ? 'is-open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Primary">
            <NavLink to="/" end className="nav-link" onClick={closeAll}>
              Home
            </NavLink>
            <NavLink to="/about" className="nav-link" onClick={closeAll}>
              About
            </NavLink>
            <NavLink to="/rooms" className="nav-link" onClick={closeAll}>
              Rooms
            </NavLink>

            <Dropdown
              label="Experience"
              items={experienceLinks}
              active={experienceActive}
              open={experienceOpen}
              onOpen={() => {
                setExperienceOpen(true);
                setDiscoverOpen(false);
              }}
              onClose={() => setExperienceOpen(false)}
              onNavigate={closeAll}
            />

            <Dropdown
              label="Discover"
              items={discoverLinks}
              active={discoverActive}
              open={discoverOpen}
              onOpen={() => {
                setDiscoverOpen(true);
                setExperienceOpen(false);
              }}
              onClose={() => setDiscoverOpen(false)}
              onNavigate={closeAll}
            />

            <NavLink to="/contact" className="nav-link" onClick={closeAll}>
              Contact
            </NavLink>

            <div className="nav-actions">
              <Link className="btn btn-primary nav-cta" to="/book" onClick={closeAll}>
                Book Now
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
