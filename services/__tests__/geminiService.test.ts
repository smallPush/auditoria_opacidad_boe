import { describe, it, expect, mock } from "bun:test";

const expectedError = "La API Key de Gemini no es válida o falta. Por favor, revisa tu archivo .env (GEMINI_API_KEY).";

// Mock @google/genai before importing geminiService
mock.module("@google/genai", () => {
  return {
    GoogleGenAI: class {
      constructor({ apiKey }: { apiKey: string }) {}
      models = {
        generateContent: async () => ({
          text: JSON.stringify({
            nivel_transparencia: 80,
            analisis_critico: "Test analysis",
            resumen_ciudadano: "Test summary",
            resumen_tweet: "Test tweet",
            banderas_red_flags: [],
            vencedores_vencidos: { ganadores: [], perdedores: [] },
            comunidad_autonoma: "Estatal",
            tipologia: "Social"
          })
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
  it("should throw error if API key is missing", async () => {
    try {
      await analyzeBOE("<xml></xml>", "es");
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain(expectedError);
    }
  });

  it("should work if user API key is provided", async () => {
    const result = await analyzeBOE("<xml></xml>", "es", "valid-api-key-that-is-long-enough");
    expect(result.nivel_transparencia).toBe(80);
  });
});
