import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    api.get(`/cms/blog?${params}`).then((r) => setPosts(r.data || [])).catch(() => {});
  }, [q, category]);

  return (
    <>
      <section className="page-hero"><div><h1>Blog & News</h1><p>Hotel news, travel tips, tourism, events, and hospitality.</p></div></section>
      <section className="section">
        <div className="container">
          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            <input className="input" placeholder="Search articles..." value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {['news', 'travel', 'tourism', 'events', 'hospitality'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid-3">
            {posts.map((p) => (
              <Link to={`/blog/${p.slug}`} className="card" key={p.id}>
                <img src={p.cover_image} alt={p.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} loading="lazy" />
                <div style={{ padding: '1rem' }}>
                  <span className="badge">{p.category}</span>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
