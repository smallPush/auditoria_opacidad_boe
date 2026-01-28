import { BOEAuditResponse } from "../types";

export const postTweet = async (auditData: BOEAuditResponse): Promise<void> => {
  const response = await fetch('/api/post-tweet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: auditData.resumen_tweet
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to post tweet');
  }
};
