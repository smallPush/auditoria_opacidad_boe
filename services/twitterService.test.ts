import { describe, it, expect, mock, beforeEach } from "bun:test";
import { postTweet } from "./twitterService";
import { BOEAuditResponse } from "../types";

// Mock global fetch
const mockFetch = mock();
global.fetch = mockFetch;

// Mock VITE_BRIDGE_SECRET for the test environment
const env = import.meta.env as any;
env.VITE_BRIDGE_SECRET = 'test_secret';

describe("twitterService", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockAuditData: BOEAuditResponse = {
    nivel_transparencia: 85,
    analisis_critico: "Análisis crítico",
    resumen_ciudadano: "Resumen ciudadano",
    resumen_tweet: "¡Nuevo BOE auditado! 📄✨ #BOE #Transparencia",
    banderas_rojas: ["Poca claridad en plazos"],
    vencedores_vencidos: {
      ganadores: ["Ciudadanos"],
      perdedores: ["Opacidad"]
    },
    comunidad_autonoma: "Estatal",
    tipologia: "Administrativa"
  };

  it("should call fetch with correct parameters without boeUrl", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await postTweet(mockAuditData);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/post-tweet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Secret': 'test_secret' },
      body: JSON.stringify({
        text: mockAuditData.resumen_tweet
      })
    });
  });

  it("should call fetch with correct parameters with boeUrl", async () => {
    const boeUrl = "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2024-1234";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await postTweet(mockAuditData, boeUrl);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/post-tweet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Secret': 'test_secret' },
      body: JSON.stringify({
        text: `${mockAuditData.resumen_tweet}\n\n${boeUrl}`
      })
    });
  });

  it("should throw error when fetch is not ok with error message from response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Rate limit exceeded" })
    });

    await expect(postTweet(mockAuditData)).rejects.toThrow("Rate limit exceeded");
  });

  it("should throw default error when fetch is not ok and no error message is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({})
    });

    await expect(postTweet(mockAuditData)).rejects.toThrow("Failed to post tweet");
  });
});
