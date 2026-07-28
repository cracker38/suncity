import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Offers() {
  const [offers, setOffers] = useState([]);
  useEffect(() => {
    api.get('/cms/offers').then((r) => setOffers(r.data || [])).catch(() => {});
  }, []);

  return (
    <>
      <section className="page-hero"><div><h1>Offers & Promotions</h1><p>Seasonal deals, packages, and coupons.</p></div></section>
      <section className="section">
        <div className="container grid-3">
          {offers.map((o) => (
            <article className="card" key={o.id}>
              <img src={o.cover_image} alt={o.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} loading="lazy" />
              <div style={{ padding: '1.1rem' }}>
                <span className="badge">{o.offer_type}</span>
                <h3>{o.title}</h3>
                <p>{o.description}</p>
                <p><strong>{o.discount_percent}% off</strong>{o.coupon_code ? ` · Code ${o.coupon_code}` : ''}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
