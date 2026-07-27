import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock @google/genai BEFORE importing audit-latest.js
mock.module("@google/genai", () => {
  return {
    GoogleGenAI: class {
      constructor({ apiKey }) {}
      models = {
        generateContent: async () => ({
          text: "{}"
        })
      };
    },
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      NUMBER: "NUMBER",
      ARRAY: "ARRAY"
    }
  };
});

// Mock twitter-client.js BEFORE importing audit-latest.js
mock.module("./twitter-client.js", () => {
  return {
    sendTweet: async () => ({ success: true })
  };
});

// Mock dotenv BEFORE importing audit-latest.js
mock.module("dotenv", () => {
  return {
    default: {
        config: () => ({ parsed: {} })
    }
  };
});

// Now we can safely import it
const { shortenUrl } = await import("./audit-latest.js");

// Mock global fetch
const mockFetch = mock();
global.fetch = mockFetch;

describe("audit-latest.js - shortenUrl", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should return shortened URL when fetch is successful", async () => {
    const originalUrl = "https://example.com/long-url";
    const shortenedUrl = "https://is.gd/short";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => shortenedUrl
    });

    const result = await shortenUrl(originalUrl);

    expect(result).toBe(shortenedUrl);
    expect(mockFetch).toHaveBeenCalledWith(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(originalUrl)}`
    );
  });

  it("should return original URL when response is not ok", async () => {
    const originalUrl = "https://example.com/long-url";

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const result = await shortenUrl(originalUrl);

    expect(result).toBe(originalUrl);
  });

  it("should return original URL when fetch throws an error", async () => {
    const originalUrl = "https://example.com/long-url";

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await shortenUrl(originalUrl);

    expect(result).toBe(originalUrl);
  });
});
