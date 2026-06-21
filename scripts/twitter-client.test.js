import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from "bun:test";

let mockTweet = mock();
let mockMe = mock();

mock.module("twitter-api-v2", () => {
  return {
    TwitterApi: class {
      constructor(tokens) {
        this.v2 = {
          me: mockMe,
          tweet: mockTweet
        };
      }
      async refreshOAuth2Token() {
        return { client: this, accessToken: "new_access", refreshToken: "new_refresh" };
      }
    }
  };
});

mock.module("dotenv", () => {
  return {
    config: mock()
  };
});

import { sendTweet } from "./twitter-client.js";

describe("twitter-client error handling", () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.TWITTER_CLIENT_ID = "test_client_id";
    process.env.TWITTER_CLIENT_SECRET = "test_client_secret";
    process.env.TWITTER_ACCESS_TOKEN = "test_access_token";

    mockMe.mockReset();
    mockTweet.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should handle CreditsDepleted error and return success: false", async () => {
    mockMe.mockResolvedValueOnce({ data: { id: "123" } }); // Make it succeed to use access token

    // Make tweet throw CreditsDepleted
    mockTweet.mockRejectedValueOnce({
      data: { title: 'CreditsDepleted' }
    });

    const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendTweet("Test tweet");

    expect(result).toEqual({ success: false, reason: 'CreditsDepleted' });
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should throw other errors", async () => {
    mockMe.mockResolvedValueOnce({ data: { id: "123" } });

    mockTweet.mockRejectedValueOnce({
      data: { title: 'SomeOtherError' },
      message: 'Some other error'
    });

    const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    await expect(sendTweet("Test tweet")).rejects.toThrow();

    consoleErrorSpy.mockRestore();
  });
});
