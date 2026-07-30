import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  canonicalPath?: string;
  type?: string;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  image = 'https://radarboe.es/favicon.svg',
  canonicalPath = '',
  type = 'website'
}) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title + " | Auditoría BOE";

    // Helper to update or create meta tags by name or property
    const updateMeta = (key: 'name' | 'property', attrValue: string, content: string) => {
      let meta = document.querySelector(`meta[${key}="${attrValue}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(key, attrValue);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    updateMeta('name', 'description', description);
    if (keywords.length > 0) {
      updateMeta('name', 'keywords', keywords.join(', '));
    }

    // 3. Open Graph Tags
    const baseUrl = 'https://radarboe.es';
    const currentCanonicalUrl = `${baseUrl}${canonicalPath || (typeof window !== 'undefined' && window.location.hash ? `/#${window.location.hash.substring(1)}` : '')}`;

    updateMeta('property', 'og:title', title);
    updateMeta('property', 'og:description', description);
    updateMeta('property', 'og:type', type);
    updateMeta('property', 'og:url', currentCanonicalUrl);
    updateMeta('property', 'og:image', image);
    updateMeta('property', 'og:site_name', 'Radar BOE - Auditoría de Opacidad');
    updateMeta('property', 'og:locale', 'es_ES');

    // 4. Twitter Card Tags
    updateMeta('name', 'twitter:card', 'summary');
    updateMeta('name', 'twitter:title', title);
    updateMeta('name', 'twitter:description', description);
    updateMeta('name', 'twitter:image', image);
    updateMeta('property', 'twitter:image', image);

    // 5. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentCanonicalUrl);

  }, [title, description, keywords, image, canonicalPath, type]);

  return null;
};

export default SEO;
