import path from 'path';
import { createHash } from 'node:crypto';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, '.', '') };

  // Detect valid GA ID, ignoring mock values and ensuring safe format
  const getValidGaId = () => {
    const ids = [env.VITE_GOOGLE_ANALYTICS_ID, env.GOOGLE_ANALYTICS_ID];
    const gaRegex = /^[a-zA-Z0-9-]+$/;
    return ids.find(id => id && id !== 'G-XXXXXXXXXX' && id !== 'your_ga_id_here' && gaRegex.test(id));
  };

  const gaId = getValidGaId();
  const bridgeSecret = env.VITE_BRIDGE_SECRET || 'fallback_secret_for_dev_bridge';

  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'generate-clean-route-pages',
        apply: 'build',
        async closeBundle() {
          const fs = await import('node:fs/promises');
          const outputDir = path.resolve(__dirname, 'dist');
          const reportsDir = path.resolve(__dirname, 'audited_reports');
          const indexHtml = await fs.readFile(path.join(outputDir, 'index.html'), 'utf8');
          const files = await fs.readdir(reportsDir);

          const auditMetaMap = new Map<string, { title: string; score: number; summary: string }>();
          for (const file of files) {
            const match = file.match(/^Audit_(BOE-[A-Z]-\d+-\d+)_/);
            if (match && !auditMetaMap.has(match[1])) {
              try {
                const raw = await fs.readFile(path.join(reportsDir, file), 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed?.report) {
                  auditMetaMap.set(match[1], {
                    title: parsed.title || match[1],
                    score: parsed.report.nivel_transparencia ?? 50,
                    summary: (parsed.report.resumen_ciudadano || '').slice(0, 200),
                  });
                }
              } catch {
                // Ignore parse errors on individual files
              }
            }
          }

          const auditIds = Array.from(auditMetaMap.keys());
          const routes = [
            'history',
            'tags',
            'related-tags',
            'privacy',
            ...auditIds.flatMap(id => [`audit/${id}`, `a/${id}`]),
          ];

          await Promise.all(routes.map(async route => {
            const routeDir = path.join(outputDir, route);
            const canonicalUrl = `https://radarboe.es/${route}`;
            let routeHtml = indexHtml
              .replace('<link rel="canonical" href="https://radarboe.es/">', `<link rel="canonical" href="${canonicalUrl}">`)
              .replace('<meta property="og:url" content="https://radarboe.es/">', `<meta property="og:url" content="${canonicalUrl}">`)
              .replace(/\s*<script id="homepage-faq-schema" type="application\/ld\+json">[\s\S]*?<\/script>/, '');

            const auditIdMatch = route.match(/^(?:audit|a)\/(BOE-[A-Z]-\d+-\d+)$/);
            if (auditIdMatch) {
              const meta = auditMetaMap.get(auditIdMatch[1]);
              if (meta) {
                const escapeAttr = (str: string) => str.replace(/"/g, '&quot;');
                const pageTitle = `Auditoría ${auditIdMatch[1]} (${meta.score}% transparencia) | Radar BOE`;
                const pageDesc = escapeAttr(meta.summary || meta.title);
                routeHtml = routeHtml
                  .replace(/<title>.*?<\/title>/, `<title>${pageTitle}</title>`)
                  .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${pageDesc}">`)
                  .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${escapeAttr(pageTitle)}">`)
                  .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${pageDesc}">`)
                  .replace(/<meta name="twitter:title" content=".*?">/, `<meta name="twitter:title" content="${escapeAttr(pageTitle)}">`)
                  .replace(/<meta name="twitter:description" content=".*?">/, `<meta name="twitter:description" content="${pageDesc}">`);
              }
            }

            await fs.mkdir(routeDir, { recursive: true });
            await fs.writeFile(path.join(routeDir, 'index.html'), routeHtml);
          }));
        },
      },
      {
        name: 'google-analytics',
        transformIndexHtml(html) {
          if (!gaId) return html;
          return html.replace(
            '</head>',
            `
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
    window.GA_INITIALIZED = true;
  </script>
</head>`
          );
        }
      },
      {
        name: 'twitter-bridge',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/post-tweet' && req.method === 'POST') {
              if (req.headers['x-bridge-secret'] !== bridgeSecret) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
              }
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { sendTweet } = await import('./scripts/twitter-client.js');
                  const { text } = JSON.parse(body);

                  // Post Tweet using the shared helper
                  await sendTweet(text);

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));
                } catch (err) {
                  console.error("Twitter Error:", err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      },
      {
        name: 'save-audit-bridge',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/save-audit' && req.method === 'POST') {
              if (req.headers['x-bridge-secret'] !== bridgeSecret) {
                res.statusCode = 403;
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
              }
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const data = JSON.parse(body);
                  const boeId = String(data.boeId).replace(/[^a-zA-Z0-9_-]/g, '');
                  const title = data.title;
                  const audit = data.audit;

                  const fs = await import('fs/promises');
                  const path = await import('path');
                  const reportsDir = path.resolve(__dirname, 'audited_reports');

                  const timestamp = Date.now();
                  const fileName = `Audit_${boeId}_${timestamp}.json`;
                  const filePath = path.join(reportsDir, fileName);
                  const auditRecord = {
                    boe_id: boeId,
                    timestamp: new Date(timestamp).toISOString(),
                    title: title || boeId,
                    report: audit
                  };

                  await fs.writeFile(filePath, JSON.stringify(auditRecord, null, 2));

                  // Update Index
                  const files = await fs.readdir(reportsDir);
                  const indexFiles = files.filter(f => f.startsWith('BOE_Audit_Index_'));

                  const indexContents = await Promise.all(indexFiles.map(async f => {
                    try {
                      const data = await fs.readFile(path.join(reportsDir, f), 'utf8');
                      const parsed = JSON.parse(data);
                      return Array.isArray(parsed) ? parsed : [];
                    } catch (e) {
                      return [];
                    }
                  }));

                  const currentIndex = indexContents.flat();

                  const entry = {
                    id: boeId,
                    titulo: title || boeId,
                    url_boe: `https://www.boe.es/buscar/doc.php?id=${boeId}`,
                    transparencia: audit.nivel_transparencia,
                    fecha_auditoria: auditRecord.timestamp
                  };

                  const seen = new Set();
                  const updatedIndex = [entry, ...currentIndex].filter(item => {
                    if (seen.has(item.id)) return false;
                    seen.add(item.id);
                    return true;
                  }).sort((a, b) => new Date(b.fecha_auditoria).getTime() - new Date(a.fecha_auditoria).getTime());

                  const newIndexName = `BOE_Audit_Index_${Date.now()}.json`;
                  await fs.writeFile(path.join(reportsDir, newIndexName), JSON.stringify(updatedIndex, null, 2));
                  await Promise.all(indexFiles.map(f => fs.unlink(path.join(reportsDir, f))));

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));
                } catch (err) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'import.meta.env.VITE_AGENT_PASSWORD_HASH': JSON.stringify(
        env.AGENT_PASSWORD
          ? createHash('sha256').update(env.AGENT_PASSWORD).digest('hex')
          : ''
      ),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL || ""),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ""),
      'import.meta.env.VITE_GOOGLE_ANALYTICS_ID': JSON.stringify(gaId),
      'import.meta.env.VITE_BRIDGE_SECRET': JSON.stringify(bridgeSecret)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
