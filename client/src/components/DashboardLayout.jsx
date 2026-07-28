import { Navigate, Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/authStore';
import { api } from '../lib/api';
import AIAssistant from './AIAssistant';
import './DashboardLayout.css';

// Icon map for sidebar links
const ICONS = {
  'Overview': '⊞', 'Profile': '👤', 'My Bookings': '📋', 'Invoices': '🧾',
  'Payment History': '💳', 'Reviews': '⭐', 'Favorites': '♡', 'Notifications': '🔔',
  'AI Assistant': '🤖', 'Reservations': '📅', 'Check-in / Check-out': '🏨',
  'Room Assignment': '🛏', 'Walk-in Guests': '🚶', 'Guest History': '👥',
  'Occupancy': '📊', 'AI Agent Requests': '💬', 'Restaurant Menu': '🍽',
  'Table Reservations': '🪑', 'Orders & Kitchen': '👨‍🍳', 'Inventory Overview': '📦',
  'Sales': '💰', 'Reports': '📈', 'Promotions': '🎁', 'Customer Feedback': '💬',
  'Event Bookings': '🎪', 'Conference': '🏛', 'Weddings': '💍', 'Corporate Events': '🏢',
  'Hall Management': '🏟', 'Equipment': '🎛', 'Packages': '📦', 'Calendar': '📆',
  'Cleaning Schedules': '🧹', 'Room Inspection': '🔍', 'Laundry': '👕',
  'Maintenance': '🔧', 'Lost & Found': '🔑', 'Room Readiness': '✅',
  'Catering Requests': '🍱', 'Quotations': '📝', 'Staff & Vehicles': '🚐',
  'Payments': '💳', 'Refunds': '↩', 'Revenue Breakdown': '📊',
  'Expenses & Taxes': '🧮', 'Financial Reports': '📑', 'Export Reports': '⬇',
  'User Management': '👥', 'Roles & Permissions': '🔐', 'Rooms': '🛏',
  'Bookings': '📋', 'Restaurant': '🍽', 'Events': '🎪', 'Outside Catering': '🍱',
  'Housekeeping': '🧹', 'Finance': '💰', 'CMS & Content': '📝', 'Gallery & Media': '🖼',
  'Offers': '🎁', 'Website Settings': '⚙', 'AI Configuration': '🤖',
  'Analytics & Reports': '📈', 'Audit & Activity': '📋', 'Security & 2FA': '🔒',
  'System Health': '💻', 'Backups': '💾',
};

export default function DashboardLayout({ title, subtitle = '', links = [], roles = [], accent = 'green' }) {
  const { user, logout, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('sc_dash_theme') || 'light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    localStorage.setItem('sc_dash_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    api.get('/customer/notifications')
      .then((r) => setUnread((r.data || []).filter((n) => !n.is_read).length))
      .catch(() => {});
  }, [location.pathname]);

  if (!user) return <Navigate to="/login" replace />;

  const allowed = user.role === 'admin' || !roles.length || roles.includes(user.role);
  if (!allowed) return <Navigate to={dashboardPath()} replace />;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  // Breadcrumb from current path
  const crumbs = location.pathname.split('/').filter(Boolean);

  return (
    <div className={`dash dash-${accent} theme-${theme} ${menuOpen ? 'menu-open' : ''}`}>
      {menuOpen && (
        <div className="dash-overlay" onClick={() => setMenuOpen(false)} aria-hidden />
      )}

      <aside className="dash-aside">
        <Link to="/" className="dash-brand">
          <span className="dash-brand-mark">SC</span>
          <span>
            <strong>SUN CITY</strong>
            <small>{title}</small>
          </span>
        </Link>

        <div className="dash-role-pill">{user.role_display || user.role}</div>

        <nav aria-label="Dashboard modules">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end === true} onClick={() => setMenuOpen(false)}>
              <span className="dash-nav-icon" aria-hidden>{ICONS[l.label] || '•'}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="dash-aside-actions">
          <button
            type="button"
            className="dash-theme-btn"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? '🌙 Dark mode' : '☀ Light mode'}
          </button>
          <Link to="/" className="dash-web-link" onClick={() => setMenuOpen(false)}>
            🌐 Public website
          </Link>
          <button type="button" className="btn btn-primary" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-top">
          <button
            type="button"
            className="dash-menu-btn"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ☰
          </button>

          <div className="dash-top-title">
            <h1>{title}</h1>
            <p>
              {subtitle || `${user.first_name} ${user.last_name}`} ·{' '}
              <strong>{user.role_display || user.role}</strong>
            </p>
          </div>

          <div className="dash-top-right">
            <Link
              to={links.find((l) => l.label === 'Notifications' || l.label === 'Desk Alerts')?.to || '#'}
              className="dash-notif-btn"
              aria-label={`${unread} unread notifications`}
            >
              🔔
              {unread > 0 && <span className="dash-notif-badge">{unread > 9 ? '9+' : unread}</span>}
            </Link>

            <div className="dash-user-chip">
              <span>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </span>
              <div>
                <strong>{user.first_name} {user.last_name}</strong>
                <small>{user.email}</small>
              </div>
            </div>
          </div>
        </header>

        {crumbs.length > 1 && (
          <nav className="dash-breadcrumb" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="dash-bc-sep">›</span>}
                <span className="dash-bc-item">{c.replace(/-/g, ' ')}</span>
              </span>
            ))}
          </nav>
        )}

        <div className="dash-content">
          <Outlet />
        </div>
      </div>

      <AIAssistant />
    </div>
  );
}
