
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://smallpush.github.io/auditoria_opacidad_boe';
const AUDITED_REPORTS_DIR = path.join(__dirname, '../audited_reports');
const OUTPUT_FILE = path.join(__dirname, '../public/sitemap.xml'); // Assuming public folder exists for Vite, or root if not.

// Check if public folder exists, if not, put in root
const publicDir = path.join(__dirname, '../public');
const targetFile = fs.existsSync(publicDir) ? OUTPUT_FILE : path.join(__dirname, '../sitemap.xml');

const staticRoutes = [
  '',
  '/history',
  '/tags',
  '/related-tags'
];

function getAuditIds() {
  if (!fs.existsSync(AUDITED_REPORTS_DIR)) return [];
  const files = fs.readdirSync(AUDITED_REPORTS_DIR);
  const ids = new Set();
  
  files.forEach(file => {
    const match = file.match(/^Audit_(BOE-[A-Z]-\d+-\d+)_/);
    if (match) {
      ids.add(match[1]);
    }
  });
  return Array.from(ids);
}

function generateSitemap() {
  const auditIds = getAuditIds();
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static routes
  staticRoutes.forEach(route => {
    xml += `  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>
`;
  });

  // Dynamic audit routes
  auditIds.forEach(id => {
    xml += `  <url>
    <loc>${BASE_URL}/audit/${id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  xml += `</urlset>`;

  fs.writeFileSync(targetFile, xml);
  console.log(`✅ Sitemap generated at ${targetFile} with ${auditIds.length} audit pages.`);
}

generateSitemap();
