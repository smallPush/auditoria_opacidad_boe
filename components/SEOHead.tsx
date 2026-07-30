import React, { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  type?: string;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = 'Herramienta de inteligencia cívica para auditar la opacidad y claridad del Boletín Oficial del Estado (BOE).',
  canonicalPath = '',
  type = 'website'
}) => {
  useEffect(() => {
    const fullTitle = title
      ? `${title} | Radar BOE`
      : 'Civic Intelligence BOE Auditor | Radar BOE - Auditoría de Opacidad';
    
    document.title = fullTitle;

    const setMetaTag = (selector: string, attr: string, value: string) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (selector.startsWith('meta[name=')) {
          element.setAttribute('name', selector.slice(11, -2));
        } else if (selector.startsWith('meta[property=')) {
          element.setAttribute('property', selector.slice(15, -2));
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attr, value);
    };

    setMetaTag('meta[name="description"]', 'content', description);
    setMetaTag('meta[property="og:title"]', 'content', fullTitle);
    setMetaTag('meta[property="og:description"]', 'content', description);
    setMetaTag('meta[property="og:type"]', 'content', type);
    setMetaTag('meta[name="twitter:title"]', 'content', fullTitle);
    setMetaTag('meta[name="twitter:description"]', 'content', description);

    const baseUrl = 'https://radarboe.es';
    const canonicalUrl = `${baseUrl}${canonicalPath}`;
    setMetaTag('meta[property="og:url"]', 'content', canonicalUrl);

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);
  }, [title, description, canonicalPath, type]);

  return null;
};

export default SEOHead;
