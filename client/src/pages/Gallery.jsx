import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import './Gallery.css';

const cats = [
  { id: 'all', label: 'All' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'conference', label: 'Conference' },
  { id: 'wedding', label: 'Wedding' },
  { id: 'events', label: 'Events' },
  { id: 'outside_catering', label: 'Outside Catering' },
  { id: 'videos', label: 'Videos' },
  { id: 'virtual_tour', label: '360° Tour' },
];

function youtubeId(url = '') {
  const m = String(url).match(/(?:embed\/|v=|youtu\.be\/)([\w-]{6,})/);
  return m?.[1] || '';
}

function thumbFor(item) {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.media_type === 'embed') {
    const id = youtubeId(item.media_url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
  }
  return item.media_url;
}

function playableUrl(item) {
  if (item.media_type !== 'embed') return item.media_url;
  const id = youtubeId(item.media_url) || 'TMBnz2O2l58';
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

export default function Gallery() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialCategory =
    tabParam === 'videos'
      ? 'videos'
      : tabParam === 'wedding'
        ? 'wedding'
        : 'all';

  const [items, setItems] = useState([]);
  const [category, setCategory] = useState(initialCategory);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'videos') setCategory('videos');
    else if (tab === 'wedding') setCategory('wedding');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const q = category === 'all' ? '' : `?category=${category}`;
    api
      .get(`/cms/gallery${q}`)
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [category]);

  const featured = useMemo(() => {
    const video = items.find((i) => i.category === 'videos' || i.media_type === 'embed');
    const wedding = items.find((i) => /wedding/i.test(i.category) || /wedding/i.test(i.title));
    return { video, wedding };
  }, [items]);

  return (
    <>
      <section className="page-hero gallery-hero">
        <div>
          <h1>Gallery</h1>
          <p>Hotel experience video, wedding receptions, rooms, dining, and events at SUN CITY NYAKARAMBI.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {(featured.video || featured.wedding) && category === 'all' && (
            <div className="gallery-featured grid-2">
              {featured.video && (
                <article className="card gallery-feature-card">
                  <div className="media-frame">
                    <iframe
                      title={featured.video.title}
                      src={`https://www.youtube.com/embed/${youtubeId(featured.video.media_url) || 'TMBnz2O2l58'}?rel=0&modestbranding=1`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="pad">
                    <span className="badge">Hotel Experience Video</span>
                    <h2>{featured.video.title}</h2>
                    <p>Watch the SUN CITY NYAKARAMBI hospitality experience — comfort, elegance, and warm Rwandan service.</p>
                    <button className="btn btn-primary" onClick={() => setLightbox(featured.video)}>
                      Watch Fullscreen
                    </button>
                  </div>
                </article>
              )}
              {featured.wedding && (
                <article className="card gallery-feature-card">
                  <button type="button" className="gallery-thumb-btn" onClick={() => setLightbox(featured.wedding)}>
                    <img src={thumbFor(featured.wedding)} alt={featured.wedding.title} loading="lazy" />
                    <span className="play-tag">Wedding Reception</span>
                  </button>
                  <div className="pad">
                    <span className="badge">Wedding</span>
                    <h2>{featured.wedding.title}</h2>
                    <p>Elegant receptions and celebration styling in our wedding hall — ideal for memorable ceremonies.</p>
                    <Link className="btn btn-outline" to="/events">
                      Plan Your Wedding
                    </Link>
                  </div>
                </article>
              )}
            </div>
          )}

          <div className="chip-row" role="tablist" aria-label="Gallery categories">
            {cats.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${category === c.id ? 'active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {loading && <div className="empty-state">Loading gallery...</div>}

          {!loading && items.length === 0 && (
            <div className="empty-state">No gallery items in this category yet.</div>
          )}

          <div className="grid-3 gallery-grid">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="card card-hover gallery-card"
                onClick={() => setLightbox(item)}
              >
                <div className="gallery-thumb">
                  <img src={thumbFor(item)} alt={item.title} loading="lazy" />
                  {(item.media_type === 'embed' || item.category === 'videos') && (
                    <span className="play-badge" aria-hidden>
                      ▶
                    </span>
                  )}
                </div>
                <div className="pad">
                  <span className="badge">{item.category.replaceAll('_', ' ')}</span>
                  <strong>{item.title}</strong>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {lightbox && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          onClick={() => setLightbox(null)}
        >
          <div className="lightbox-panel" onClick={(e) => e.stopPropagation()}>
            {lightbox.media_type === 'embed' || lightbox.category === 'videos' ? (
              <iframe
                title={lightbox.title}
                src={playableUrl(lightbox)}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <img src={lightbox.media_url} alt={lightbox.title} />
            )}
            <div className="lightbox-meta">
              <h3>{lightbox.title}</h3>
              <button type="button" className="btn btn-primary" onClick={() => setLightbox(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
