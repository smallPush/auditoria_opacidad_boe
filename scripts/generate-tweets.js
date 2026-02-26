
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTweet } from './twitter-client.js';

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
  const args = process.argv.slice(2);
  const shouldSend = args.includes('--send');

  if (!fs.existsSync(AUDITED_REPORTS_DIR)) {
    console.error("Directory not found");
    return;
  }

  const files = fs.readdirSync(AUDITED_REPORTS_DIR)
    .filter(f => f.startsWith('Audit_BOE-A-') && f.endsWith('.json'))
    .sort();

  console.log(`Processing ${files.length} reports... ${shouldSend ? '(SEND MODE ENABLED)' : '(PREVIEW ONLY)'}
`);

  for (const file of files) {
    const filePath = path.join(AUDITED_REPORTS_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const boeId = content.boe_id;
    const tweet = content.report?.resumen_tweet;
    const alreadyTweeted = !!content.tweeted;

    if (tweet && boeId) {
      if (alreadyTweeted && shouldSend) {
        console.log(`⏩ Skipping ${boeId} (already tweeted)`);
        continue;
      }

      const longUrl = `${BASE_URL}${boeId}`;
      const shortUrl = await shortenUrl(longUrl);
      const tweetText = `${tweet}\n\n${shortUrl}`;

      console.log(`--- ${boeId} ---`);
      console.log(tweetText);

      if (shouldSend) {
        try {
          await sendTweet(tweetText);
          console.log(`✅ Sent ${boeId}`);

          // Update the file to mark as tweeted
          content.tweeted = true;
          fs.writeFileSync(filePath, JSON.stringify(content, null, 2));

          // Add extra delay when sending to avoid hitting Twitter rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          console.error(`❌ Error sending ${boeId}: ${err.message}`);
        }
      }

      console.log();

      // Small delay to be respectful to the URL shortener API
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
}

generateTweets();
