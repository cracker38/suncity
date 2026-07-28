import { useEffect } from 'react';

/**
 * Lightweight SEO helper — sets document title/meta and optional JSON-LD.
 */
export default function Seo({
  title,
  description,
  canonical,
  jsonLd,
}) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | SUN CITY NYAKARAMBI`
      : 'SUN CITY NYAKARAMBI Hotel | Luxury Stay in Kirehe';
    document.title = fullTitle;

    const setMeta = (name, content, prop = false) => {
      if (!content) return;
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('og:title', fullTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:type', 'website', true);
    setMeta('twitter:card', 'summary_large_image');

    let link = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    const scriptId = 'dynamic-jsonld';
    let script = document.getElementById(scriptId);
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }
  }, [title, description, canonical, jsonLd]);

  return null;
}
