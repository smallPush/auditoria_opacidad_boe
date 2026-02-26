import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
}

const SEO: React.FC<SEOProps> = ({ title, description, keywords = [], image }) => {
  useEffect(() => {
    // Update Title
    document.title = title + " | Auditoría BOE";

    // Helper to update meta tags
    const updateMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update Description
    updateMeta('description', description);

    // Update Keywords
    if (keywords.length > 0) {
      updateMeta('keywords', keywords.join(', '));
    }

    // Optional: Add Open Graph tags for better social sharing
    const updateOG = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateOG('og:title', title);
    updateOG('og:description', description);

    if (image) {
      updateOG('og:image', image);
      updateOG('twitter:image', image);
    }

  }, [title, description, keywords, image]);

  return null;
};

export default SEO;
