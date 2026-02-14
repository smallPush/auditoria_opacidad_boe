import { TwitterApi } from 'twitter-api-v2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

export async function sendTweet(text) {
  // Load latest .env values manually to ensure we have fresh tokens
  let localEnv = {};
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const [key, ...val] = line.split('=');
      if (key) localEnv[key.trim()] = val.join('=').trim();
    });
  }

  const clientId = localEnv.TWITTER_CLIENT_ID || process.env.TWITTER_CLIENT_ID;
  const clientSecret = localEnv.TWITTER_CLIENT_SECRET || process.env.TWITTER_CLIENT_SECRET;
  const refreshToken = localEnv.TWITTER_REFRESH_TOKEN || process.env.TWITTER_REFRESH_TOKEN;
  const accessToken = localEnv.TWITTER_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN;

  if (!clientId || !clientSecret || (!refreshToken && !accessToken)) {
    throw new Error("Twitter OAuth 2.0 keys are missing in .env (Need Client ID/Secret and either Access Token or Refresh Token)");
  }

  let loggedClient;

  // 1. Try with Access Token first (to save a refresh call if it's still valid)
  if (accessToken) {
    try {
      const client = new TwitterApi(accessToken);
      // Test if token is valid
      await client.v2.me();
      loggedClient = client;
      console.log("Using existing TWITTER_ACCESS_TOKEN");
    } catch (e) {
      // Token probably expired, fall through to refresh
    }
  }

  // 2. Fallback to Refresh Token
  if (!loggedClient && refreshToken) {
    console.log("Refreshing Twitter Token...");
    const client = new TwitterApi({
      clientId: clientId,
      clientSecret: clientSecret,
    });

    try {
      const { client: refreshedClient, accessToken: newAccessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refreshToken);
      loggedClient = refreshedClient;

      // Persist new Tokens
      let currentEnvContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

      if (newRefreshToken && newRefreshToken !== refreshToken) {
        if (currentEnvContent.includes('TWITTER_REFRESH_TOKEN=')) {
          currentEnvContent = currentEnvContent.replace(/TWITTER_REFRESH_TOKEN=.*/, `TWITTER_REFRESH_TOKEN=${newRefreshToken}`);
        } else {
          currentEnvContent += `\nTWITTER_REFRESH_TOKEN=${newRefreshToken}`;
        }
      }

      if (newAccessToken) {
        if (currentEnvContent.includes('TWITTER_ACCESS_TOKEN=')) {
          currentEnvContent = currentEnvContent.replace(/TWITTER_ACCESS_TOKEN=.*/, `TWITTER_ACCESS_TOKEN=${newAccessToken}`);
        } else {
          currentEnvContent += `\nTWITTER_ACCESS_TOKEN=${newAccessToken}`;
        }
      }

      fs.writeFileSync(envPath, currentEnvContent);
      console.log("✅ New Twitter Tokens saved to .env");
    } catch (refreshErr) {
      console.error("❌ Failed to refresh Twitter token:", refreshErr.message);
      throw refreshErr;
    }
  }

  if (!loggedClient) {
    throw new Error("Could not initialize Twitter client with provided tokens.");
  }

  // 3. Post Tweet
  try {
    const response = await loggedClient.v2.tweet(text);
    console.log("✅ Tweet posted successfully!");
    return response;
  } catch (twitterErr) {
    const errorData = twitterErr.data || {};
    if (errorData.title === 'CreditsDepleted') {
      console.warn("\n⚠️  TWITTER CREDITS DEPLETED: The official API cannot post this tweet.");
      console.warn("Manual action required or use the 'Share on X (Free)' button in the dashboard.");
      console.warn("Tweet content would have been:\n", text, "\n");

      // We don't throw here so the script can continue and save the audit record
      return { success: false, reason: 'CreditsDepleted' };
    }

    console.error("❌ Twitter API Error:", twitterErr.data || twitterErr.message);
    throw twitterErr;
  }
}
