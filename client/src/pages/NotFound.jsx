import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <section style={{
      minHeight: '80vh',
      display: 'grid',
      placeItems: 'center',
      textAlign: 'center',
      padding: '4rem 1rem',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p style={{ fontSize: '5rem', lineHeight: 1, marginBottom: '0.5rem' }}>🏨</p>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', color: 'var(--primary)' }}>404</h1>
        <h2 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Page not found</h2>
        <p style={{ maxWidth: 420, margin: '0 auto 2rem', color: 'var(--muted)' }}>
          The page you are looking for does not exist or has been moved.
          Let us take you back to the hotel.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/">Back to Home</Link>
          <Link className="btn btn-outline" to="/rooms">View Rooms</Link>
          <Link className="btn btn-outline" to="/contact">Contact Us</Link>
        </div>
      </motion.div>
    </section>
  );
}
