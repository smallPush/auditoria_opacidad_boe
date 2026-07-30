---
name: seo-optimization
description: |
  Comprehensive SEO audit and optimization guidelines for Single Page Applications (SPA), civic intelligence tools, and web applications. Covers meta tags, dynamic title/description management, Open Graph & Twitter Cards, JSON-LD structured data (schema.org), sitemaps, robots.txt, and web performance.

  Trigger when:
  - Performing SEO audits or optimizing meta tags on web applications.
  - Adding or updating sitemaps, robots.txt, canonical tags, or structured data (JSON-LD).
  - Enhancing search visibility, social sharing previews, or accessibility of dynamic routes.
---

# SEO Optimization & Audit Skill

This skill outlines guidelines and best practices for auditing and implementing Search Engine Optimization (SEO) in Single Page Applications (SPAs) and modern web applications.

---

## 1. Document Head & Essential Meta Tags

Every page should feature complete, standardized `<head>` tags:

### Language & Viewport
- Set `<html lang="es">` (or appropriate primary target language).
- Include standard viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.

### Title & Description
- **Title Tag**: Clear, concise (50-60 chars max), formatted as `[Page Title] - [Brand/App Name]`.
- **Meta Description**: Informative, action-oriented (150-160 chars max) summarizing the page purpose.
- **Meta Keywords**: Relevant comma-separated terms.

### Canonical URLs
- Always specify `<link rel="canonical" href="https://yourdomain.ext/path" />` to avoid duplicate content indexing.

---

## 2. Social Media Sharing Meta (Open Graph & Twitter Cards)

Ensure preview cards display correctly when shared on X (Twitter), LinkedIn, WhatsApp, Telegram, etc.

```html
<!-- Open Graph -->
<meta property="og:title" content="Title of the page" />
<meta property="og:description" content="Summary of the content" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://radarboe.es/" />
<meta property="og:image" content="https://radarboe.es/og-image.png" />
<meta property="og:site_name" content="Radar BOE - Auditoría de Opacidad" />
<meta property="og:locale" content="es_ES" />

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Title of the page" />
<meta name="twitter:description" content="Summary of the content" />
<meta name="twitter:image" content="https://radarboe.es/og-image.png" />
```

---

## 3. Structured Data (JSON-LD / schema.org)

Structured data enables rich snippets in Google Search results.

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Civic Intelligence BOE Auditor",
  "applicationCategory": "GovernmentApplication",
  "operatingSystem": "Web",
  "url": "https://radarboe.es/",
  "description": "Herramienta de inteligencia cívica para auditar la opacidad y claridad del Boletín Oficial del Estado (BOE).",
  "inLanguage": "es"
}
```

---

## 4. Single Page Application (SPA) Dynamic SEO

In Client-Side Rendered (CSR) applications (e.g. React / Vite):

1. **Dynamic Head Management**:
   Use a dedicated `<SEOHead />` component or `useEffect` hook to dynamically update `document.title`, `<meta name="description">`, `og:title`, `og:description`, and `canonical` link whenever the route or active report changes.

2. **Hash Router Compatibility**:
   Ensure canonical tags and sitemaps cleanly map hash routes or clean fallback URLs for crawlers.

---

## 5. Robots & Sitemap Directives

- **`public/robots.txt`**:
  - Allow web crawlers access to public routes.
  - Reference the canonical `sitemap.xml` URL with `https://`.

- **`sitemap.xml`**:
  - Generate XML sitemaps containing all static routes and dynamic audit report URLs.
  - Include `<lastmod>`, `<changefreq>`, and `<priority>` attributes.

---

## 6. Semantic HTML & Accessibility Check

- Use a single `<h1>` tag per view.
- Maintain sequential heading levels (`<h1>` -> `<h2>` -> `<h3>`).
- Provide informative `alt` attributes for images and `aria-label` attributes for icon-only buttons.
