
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";

// Standard __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env for Node < 20.6
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// Constants
const AUDITED_REPORTS_DIR = path.join(__dirname, '../audited_reports');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SYSTEM_INSTRUCTION = `
Eres un Agente de Inteligencia Cívica de Élite. Tu misión es desmantelar la opacidad del lenguaje legislativo español.
Analiza el BOE buscando:
- 'Gastos Fantasma': Partidas presupuestarias sin destino claro.
- 'Incongruencia Ideológica': Comparar el texto con promesas electorales previas o lógica de transparencia.
- 'Impacto de Género y Clase': Quiénes son los ganadores y perdedores socioeconómicos.

Tu respuesta debe ser un objeto JSON válido.
`;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY not found in environment.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function shortenUrl(url) {
  try {
    const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
    if (!response.ok) return url;
    return await response.text();
  } catch (e) {
    return url;
  }
}

async function analyzeBOE(xmlContent) {
  // Using the same pattern as geminiService.ts
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview', // Using the same model as in the UI service
    contents: `AUDITA ESTA LEY DEL BOE (XML):

    ${xmlContent.substring(0, 30000)}

    La respuesta DEBE estar íntegramente en ESPAÑOL.
    Proporciona un JSON con los campos especificados.`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\nIMPORTANTE: Genera también un campo 'resumen_tweet' de máximo 250 caracteres que use emojis y hashtags (#BOE #Opacidad #Transparencia) para denunciar o informar sobre los hallazgos.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nivel_transparencia: { type: Type.NUMBER },
          analisis_critico: { type: Type.STRING },
          resumen_ciudadano: { type: Type.STRING },
          resumen_tweet: { type: Type.STRING },
          banderas_red_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
          vencedores_vencidos: {
            type: Type.OBJECT,
            properties: {
              ganadores: { type: Type.ARRAY, items: { type: Type.STRING } },
              perdedores: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          comunidad_autonoma: { type: Type.STRING },
          tipologia: { type: Type.STRING }
        },
        required: ["nivel_transparencia", "analisis_critico", "resumen_ciudadano", "resumen_tweet", "banderas_red_flags", "vencedores_vencidos", "comunidad_autonoma", "tipologia"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  try {
    const rawData = JSON.parse(text.trim());
    return {
      ...rawData,
      banderas_rojas: rawData.banderas_red_flags || rawData.banderas_rojas || []
    };
  } catch (e) {
    console.error("Failed to parse JSON from AI response:", text);
    throw new Error("Invalid response format from AI");
  }
}

async function fetchWithHeaders(url) {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/xml, text/xml, */*',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    }
  });
}

function parseItemsFromXml(text) {
  const items = [];
  const itemRegex = /<item>[\s\S]*?<identificador>([\s\S]*?)<\/identificador>[\s\S]*?<titulo>([\s\S]*?)<\/titulo>/g;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    items.push({
      id: match[1].trim(),
      titulo: match[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
    });
  }
  if (items.length === 0) {
    const legacyRegex = /<item id="([^"]+)">[\s\S]*?<titulo>([\s\S]*?)<\/titulo>/g;
    while ((match = legacyRegex.exec(text)) !== null) {
      items.push({
        id: match[1].trim(),
        titulo: match[2].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
      });
    }
  }
  return items;
}

async function fetchLatestBOE(targetDate) {
  let urls = [];
  
  if (targetDate) {
     urls.push(`https://www.boe.es/datosabiertos/api/boe/sumario/${targetDate}`);
  } else {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    urls = [
      `https://www.boe.es/datosabiertos/api/boe/sumario/${today}`,
      `https://www.boe.es/datosabiertos/api/boe/sumario/${yesterday}`,
      'https://www.boe.es/diario_boe/xml.php'
    ];
  }

  for (const url of urls) {
    console.log(`🔍 Try fetching: ${url}`);
    try {
      const response = await fetchWithHeaders(url);
      const text = await response.text();
      if (response.status === 200) {
        const items = parseItemsFromXml(text);
        if (items.length > 0) {
          console.log(`   ✅ Success: Found ${items.length} items.`);
          return items;
        }
      }
    } catch (err) { }
  }
  return [];
}

async function run() {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    let targetDate = null;
    let limit = 20; // Default limit

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--date') {
        targetDate = args[i + 1];
        i++;
      } else if (args[i] === '--limit') {
        limit = parseInt(args[i + 1], 10);
        i++;
      }
    }

    if (targetDate) {
        console.log(`📅 Targeting specific date: ${targetDate}`);
    }
    console.log(`🔢 Limit set to: ${limit}`);

    const latestItems = await fetchLatestBOE(targetDate);
    const filteredItems = latestItems.filter(item => item.id.startsWith('BOE-A-'));
    const itemsToProcess = filteredItems.slice(0, limit); 
    console.log(`🚀 Processing ${itemsToProcess.length} newest legislative items.`);

    const files = fs.readdirSync(AUDITED_REPORTS_DIR);
    const auditedIds = new Set();
    files.forEach(file => {
      const match = file.match(/Audit_(BOE-A-\d+-\d+)_/);
      if (match) auditedIds.add(match[1]);
    });

    const newAudits = [];
    let processedCount = 0;
    for (const item of itemsToProcess) {
      if (auditedIds.has(item.id)) {
        console.log(`⏩ Skipping ${item.id} (already exist)`);
        continue;
      }

      // Rate Limiting: Wait 1 minute between items to avoid Gemini API limits
      if (processedCount > 0) {
        console.log("⏳ Waiting 1 minute before next audit...");
        await new Promise(resolve => setTimeout(resolve, 60000));
      }

      console.log(`🤖 Auditing ${item.id}: ${item.titulo}...`);
      try {
        const itemXmlResponse = await fetchWithHeaders(`https://www.boe.es/diario_boe/xml.php?id=${item.id}`);
        const itemXml = await itemXmlResponse.text();
        const audit = await analyzeBOE(itemXml);
        const timestamp = Date.now();
        const fileName = `Audit_${item.id}_${timestamp}.json`;
        const filePath = path.join(AUDITED_REPORTS_DIR, fileName);
        const auditRecord = { boe_id: item.id, timestamp: new Date(timestamp).toISOString(), title: item.titulo, report: audit };
        fs.writeFileSync(filePath, JSON.stringify(auditRecord, null, 2));
        console.log(`💾 Saved to ${fileName}`);

        if (audit.resumen_tweet) {
          const shortUrl = await shortenUrl(`https://radarboe.es/#/a/${item.id}`);
          console.log(`\n--- TWEET PARA ${item.id} ---`);
          console.log(audit.resumen_tweet);
          console.log(shortUrl);
          console.log('----------------------------\n');
        }

        newAudits.push({ id: item.id, titulo: item.titulo, url_boe: `https://www.boe.es/buscar/doc.php?id=${item.id}`, transparencia: audit.nivel_transparencia, fecha_auditoria: auditRecord.timestamp });

        processedCount++;
      } catch (err) {
        console.error(`❌ Error auditing ${item.id}:`, err.message);
      }
    }

    if (newAudits.length > 0) {
      console.log("🔄 Updating index...");
      const indexFiles = files.filter(f => f.startsWith('BOE_Audit_Index_'));
      let currentIndex = [];
      indexFiles.forEach(f => {
        try {
          const contents = fs.readFileSync(path.join(AUDITED_REPORTS_DIR, f), 'utf8');
          if (contents.trim()) {
            const data = JSON.parse(contents);
            currentIndex = [...currentIndex, ...(Array.isArray(data) ? data : [])];
          }
        } catch (e) { }
      });
      const seen = new Set();
      const mergedIndex = [...newAudits, ...currentIndex].filter(item => {
        if (!item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      mergedIndex.sort((a, b) => new Date(b.fecha_auditoria).getTime() - new Date(a.fecha_auditoria).getTime());
      const newIndexName = `BOE_Audit_Index_${Date.now()}.json`;
      fs.writeFileSync(path.join(AUDITED_REPORTS_DIR, newIndexName), JSON.stringify(mergedIndex, null, 2));
      indexFiles.forEach(f => fs.unlinkSync(path.join(AUDITED_REPORTS_DIR, f)));
      console.log(`✨ Process finished. ${newAudits.length} new audits added.`);
    } else {
      console.log("💤 No new audits needed.");
    }
  } catch (err) {
    console.error("💥 Script failed:", err);
  }
}

run();
