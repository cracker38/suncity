import { useState } from 'react';

export default function CookieBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('sc_cookie_ok') === '1'
  );

  if (dismissed) return null;

  function accept() {
    localStorage.setItem('sc_cookie_ok', '1');
    setDismissed(true);
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 300,
      background: 'rgba(12,52,40,0.97)',
      color: 'rgba(255,255,255,0.9)',
      padding: '1rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flexWrap: 'wrap',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid rgba(212,175,55,0.25)',
    }}>
      <p style={{ margin: 0, flex: 1, minWidth: 220, fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)' }}>
        🍪 We use cookies to improve your experience on our website. By continuing to browse, you agree to our use of cookies.
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button className="btn btn-primary btn-sm" onClick={accept}>Accept</button>
        <button
          className="btn btn-sm"
          style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
          onClick={accept}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
