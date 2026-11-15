
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.SITE_URL || 'https://radarboe.es';
const AUDITED_REPORTS_DIR = path.join(__dirname, '../audited_reports');
const OUTPUT_FILE = path.join(__dirname, '../public/sitemap.xml'); // Assuming public folder exists for Vite, or root if not.

// Check if public folder exists, if not, put in root
const publicDir = path.join(__dirname, '../public');
const targetFile = fs.existsSync(publicDir) ? OUTPUT_FILE : path.join(__dirname, '../sitemap.xml');

const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/history', changefreq: 'daily', priority: '0.9' },
  { path: '/tags', changefreq: 'weekly', priority: '0.7' },
  { path: '/related-tags', changefreq: 'weekly', priority: '0.7' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
];

function getAuditEntries() {
  if (!fs.existsSync(AUDITED_REPORTS_DIR)) return [];
  const files = fs.readdirSync(AUDITED_REPORTS_DIR);
  const entriesMap = new Map();
  const today = new Date().toISOString().split('T')[0];

  files.forEach(file => {
    const match = file.match(/^Audit_(BOE-[A-Z]-\d+-\d+)_/);
    if (match && !entriesMap.has(match[1])) {
      let lastmod = today;
      try {
        const fullPath = path.join(AUDITED_REPORTS_DIR, file);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp) {
          const parsedDate = new Date(parsed.timestamp);
          if (!Number.isNaN(parsedDate.getTime())) {
            lastmod = parsedDate.toISOString().split('T')[0];
          }
        }
      } catch {
        // Fallback to today on parse error
      }
      entriesMap.set(match[1], { id: match[1], lastmod });
    }
  });
  return Array.from(entriesMap.values());
}

function generateSitemap() {
  const auditEntries = getAuditEntries();
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static routes
  staticRoutes.forEach(route => {
    xml += `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  });

  // Dynamic audit routes
  auditEntries.forEach(entry => {
    xml += `  <url>
    <loc>${BASE_URL}/audit/${entry.id}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  });

  xml += `</urlset>`;

  fs.writeFileSync(targetFile, xml);
  console.log(`✅ Sitemap generated at ${targetFile} with ${auditEntries.length} audit pages and ${staticRoutes.length} static routes.`);
}

generateSitemap();
