import { BOEAuditResponse } from "../types";

export const postTweet = async (auditData: BOEAuditResponse, boeUrl?: string): Promise<void> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const bridgeSecret = import.meta.env.VITE_BRIDGE_SECRET;
  if (bridgeSecret) {
    headers['X-Bridge-Secret'] = bridgeSecret;
  }

  const response = await fetch('/api/post-tweet', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: auditData.resumen_tweet + (boeUrl ? `\n\n${boeUrl}` : '')
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to post tweet');
  }
};
