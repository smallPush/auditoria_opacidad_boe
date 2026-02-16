import { TwitterApi } from 'twitter-api-v2';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Standard __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split(/\r?\n/).forEach(line => {    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// Instructions:
// 1. Fill in your CLIENT_ID and CLIENT_SECRET below (or set them as env vars).
// 2. Ensure 'http://127.0.0.1:3000/callback' is added to your Redirect URIs in the Twitter Developer Portal.
// 3. Run this script: node scripts/generate-twitter-token.js

const CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌ Error: TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET not found in .env file.");
  process.exit(1);
}

const client = new TwitterApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    'http://127.0.0.1:3000/callback',
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );

  console.log('\nPlease visit the following URL to authorize the app:\n');
  console.log(url);
  console.log('\nAfter authorizing, you will be redirected to a URL like: http://127.0.0.1:3000/callback?state=...&code=...');
  console.log('Copy the entire redirected URL and paste it here:\n');

  rl.question('Paste Redirect URL here: ', async (fullUrl) => {
    try {
      const urlParams = new URL(fullUrl).searchParams;
      const code = urlParams.get('code');
      const returnedState = urlParams.get('state');

      if (state !== returnedState) {
        throw new Error("State mismatch! Possible CSRF attack.");
      }

      const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: 'http://127.0.0.1:3000/callback',
      });

      console.log('\n✅ Authentication Successful!');

      // Update .env file automatically
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      const updateVar = (key, value, comment = '') => {
        const line = `${key}=${value}${comment ? ` # ${comment}` : ''}`;
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (envContent.match(regex)) {
          envContent = envContent.replace(regex, () => line);
        } else {
          envContent += (envContent.length > 0 && !envContent.endsWith('\n') ? '\n' : '') + line + '\n';
        }
      };

      updateVar('TWITTER_CLIENT_ID', CLIENT_ID);
      updateVar('TWITTER_CLIENT_SECRET', CLIENT_SECRET);
      updateVar('TWITTER_ACCESS_TOKEN', accessToken, '(TEMPORAL: 2 HORAS)');
      updateVar('TWITTER_REFRESH_TOKEN', refreshToken, '(PERMANENTE: 6 MESES)');

      fs.writeFileSync(envPath, envContent);
      console.log('--------------------------------------------------');
      console.log('✅ Tokens have been automatically saved to your .env file.');
      console.log('--------------------------------------------------');

    } catch (err) {
      console.error('\n❌ Error:', err);
    } finally {
      rl.close();
    }
  });
}

main();
