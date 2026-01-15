
import { GoogleGenAI, Type } from "@google/genai";
import { BOEAuditResponse } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export const analyzeBOE = async (xmlContent: string, lang: 'es' | 'en' = 'es'): Promise<BOEAuditResponse> => {
  const apiKey = process.env.API_KEY || "";
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
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nivel_transparencia: { type: Type.NUMBER, description: "Scale 1-100" },
          analisis_critico: { type: Type.STRING },
          resumen_ciudadano: { type: Type.STRING },
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
          }
        },
        required: ["nivel_transparencia", "analisis_critico", "resumen_ciudadano", "banderas_red_flags", "vencedores_vencidos"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  // Normalizing field names as Gemini might slightly vary in some cases if not strict
  const rawData = JSON.parse(text.trim());
  return {
    ...rawData,
    banderas_rojas: rawData.banderas_red_flags || rawData.banderas_rojas || []
  };
};
