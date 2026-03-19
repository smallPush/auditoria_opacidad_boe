import { describe, it, expect, mock, beforeEach } from "bun:test";

const expectedError = "La API Key de Gemini no es válida o falta. Por favor, revisa tu archivo .env (GEMINI_API_KEY).";

let mockResponseText = JSON.stringify({
  nivel_transparencia: 80,
  analisis_critico: "Test analysis",
  resumen_ciudadano: "Test summary",
  resumen_tweet: "Test tweet",
  banderas_red_flags: [],
  vencedores_vencidos: { ganadores: [], perdedores: [] },
  comunidad_autonoma: "Estatal",
  tipologia: "Social"
});

// Mock @google/genai before importing geminiService
mock.module("@google/genai", () => {
  return {
    GoogleGenAI: class {
      constructor({ apiKey }: { apiKey: string }) {}
      models = {
        generateContent: async () => ({
          text: mockResponseText
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

// Now we can import it
const { analyzeBOE } = await import("../geminiService");

describe("geminiService", () => {
  beforeEach(() => {
    mockResponseText = JSON.stringify({
      nivel_transparencia: 80,
      analisis_critico: "Test analysis",
      resumen_ciudadano: "Test summary",
      resumen_tweet: "Test tweet",
      banderas_red_flags: [],
      vencedores_vencidos: { ganadores: [], perdedores: [] },
      comunidad_autonoma: "Estatal",
      tipologia: "Social"
    });
  });

  it("should throw error if API key is missing", async () => {
    try {
      await analyzeBOE("<xml></xml>", "es");
      expect(true).toBe(false); // Should not reach here
    } catch (error: unknown) {
      if (error instanceof Error) {
        expect(error.message).toContain(expectedError);
      } else {
        expect(true).toBe(false); // Fail if not an Error object
      }
    }
  });

  it("should work if user API key is provided", async () => {
    const result = await analyzeBOE("<xml></xml>", "es", "valid-api-key-that-is-long-enough");
    expect(result.nivel_transparencia).toBe(80);
  });

  it("should provide a fallback if resumen_tweet is missing from AI response", async () => {
    mockResponseText = JSON.stringify({
      nivel_transparencia: 50,
      analisis_critico: "Critical analysis",
      resumen_ciudadano: "Citizen summary",
      // resumen_tweet is missing
      banderas_red_flags: ["Flag 1"],
      vencedores_vencidos: { ganadores: ["Winner"], perdedores: ["Loser"] },
      comunidad_autonoma: "Estatal",
      tipologia: "Political"
    });

    const result = await analyzeBOE("<xml></xml>", "es", "valid-api-key-that-is-long-enough");
    expect(result.resumen_tweet).toBeDefined();
    expect(typeof result.resumen_tweet).toBe("string");
  });
});
