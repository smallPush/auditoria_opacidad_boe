
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDITED_REPORTS_DIR = path.join(__dirname, '../audited_reports');
const BASE_URL = 'https://radarboe.es/#/a/';

async function shortenUrl(url) {
  try {
    const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
    if (!response.ok) return url;
    return await response.text();
  } catch (e) {
    return url;
  }
}

async function generateTweets() {
  if (!fs.existsSync(AUDITED_REPORTS_DIR)) {
    console.error("Directory not found");
    return;
  }

  const files = fs.readdirSync(AUDITED_REPORTS_DIR)
    .filter(f => f.startsWith('Audit_BOE-A-') && f.endsWith('.json'))
    .sort();

  console.log(`Processing ${files.length} reports...
`);

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(AUDITED_REPORTS_DIR, file), 'utf-8'));
    const boeId = content.boe_id;
    const tweet = content.report?.resumen_tweet;

    if (tweet && boeId) {
      const longUrl = `${BASE_URL}${boeId}`;
      const shortUrl = await shortenUrl(longUrl);
      
      console.log(`--- ${boeId} ---`);
      console.log(tweet);
      console.log(shortUrl);
      console.log();

      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

generateTweets();
