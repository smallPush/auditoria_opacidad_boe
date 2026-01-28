import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'save-audit-bridge',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/save-audit' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { boeId, title, audit } = JSON.parse(body);
                  const fs = await import('fs');
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

                  fs.writeFileSync(filePath, JSON.stringify(auditRecord, null, 2));

                  // Update Index
                  const files = fs.readdirSync(reportsDir);
                  const indexFiles = files.filter(f => f.startsWith('BOE_Audit_Index_'));
                  let currentIndex = [];
                  indexFiles.forEach(f => {
                    try {
                      const data = JSON.parse(fs.readFileSync(path.join(reportsDir, f), 'utf8'));
                      currentIndex = [...currentIndex, ...(Array.isArray(data) ? data : [])];
                    } catch (e) { }
                  });

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
                  fs.writeFileSync(path.join(reportsDir, newIndexName), JSON.stringify(updatedIndex, null, 2));
                  indexFiles.forEach(f => fs.unlinkSync(path.join(reportsDir, f)));

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
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env.AGENT_PASSWORD': JSON.stringify(env.AGENT_PASSWORD),
      'process.env.GOOGLE_ANALYTICS_ID': JSON.stringify(env.GOOGLE_ANALYTICS_ID)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
