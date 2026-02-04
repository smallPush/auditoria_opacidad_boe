import { GoogleGenAI, Type } from "@google/genai";
import { BOEAuditResponse } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
import { translations, Language } from "../translations";

let isApiBlocked = false;

const validateApiKey = (lang: Language, userApiKey?: string) => {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.length < 15) {
    throw new Error(translations[lang].apiKeyError);
  }
  return apiKey;
};

// Audits a BOE law XML content using Gemini 3 Flash.
export const analyzeBOE = async (xmlContent: string, lang: Language = 'es', userApiKey?: string): Promise<BOEAuditResponse> => {
  const apiKey = validateApiKey(lang, userApiKey);
  if (isApiBlocked && !userApiKey) throw new Error("API calls are blocked due to a previous error.");
  
  try {
    const ai = new GoogleGenAI({ apiKey });

    const langInstruction = lang === 'es'
      ? "La respuesta DEBE estar íntegramente en ESPAÑOL."
      : "The response MUST be entirely in ENGLISH.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `AUDITA ESTA LEY DEL BOE (XML):

      ${xmlContent.substring(0, 30000)}

      ${langInstruction}
      Proporciona un JSON con los campos especificados.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\nIMPORTANTE: Genera también un campo 'resumen_tweet' de máximo 250 caracteres que use emojis y hashtags (#BOE #Opacidad #Transparencia) para denunciar o informar sobre los hallazgos.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nivel_transparencia: { type: Type.NUMBER, description: "Scale 1-100" },
            analisis_critico: { type: Type.STRING },
            resumen_ciudadano: { type: Type.STRING },
            resumen_tweet: { type: Type.STRING, description: "Short summary for X/Twitter with emojis" },
            banderas_red_flags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            vencedores_vencidos: {
              type: Type.OBJECT,
              properties: {
                ganadores: { type: Type.ARRAY, items: { type: Type.STRING } },
                perdedores: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            comunidad_autonoma: { type: Type.STRING, description: "Estatal, Madrid, Cataluña, etc." },
            tipologia: { type: Type.STRING, description: "Económica, Política, Administrativa, Social, etc." }
          },
          required: ["nivel_transparencia", "analisis_critico", "resumen_ciudadano", "resumen_tweet", "banderas_red_flags", "vencedores_vencidos", "comunidad_autonoma", "tipologia"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const rawData = JSON.parse(text.trim());
    return {
      ...rawData,
      banderas_rojas: rawData.banderas_red_flags || rawData.banderas_rojas || []
    };
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("api key") || error.message?.includes("401") || error.message?.includes("403")) {
      isApiBlocked = true;
      throw new Error(`${translations[lang].apiKeyError} Details: ${error.message}`);
    }
    throw error;
  }
};