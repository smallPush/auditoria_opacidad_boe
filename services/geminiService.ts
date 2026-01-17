
import { GoogleGenAI, Type } from "@google/genai";
import { BOEAuditResponse } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// Audits a BOE law XML content using Gemini 3 Flash.
export const analyzeBOE = async (xmlContent: string, lang: 'es' | 'en' = 'es'): Promise<BOEAuditResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
          }
        },
        required: ["nivel_transparencia", "analisis_critico", "resumen_ciudadano", "resumen_tweet", "banderas_red_flags", "vencedores_vencidos"]
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
};

// Generates a thumbnail image for social media reels using gemini-2.5-flash-image.
export const generateThumbnail = async (auditData: BOEAuditResponse, lang: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const redFlagsText = auditData.banderas_rojas.length > 0 
    ? `Alertas críticas detectadas: ${auditData.banderas_rojas.join(", ")}.` 
    : "Sin alertas críticas específicas.";

  const prompt = `
    Crea una miniatura cinemática para un Reel de redes sociales sobre una auditoría ciudadana de una ley del BOE.
    CONTEXTO DE LA LEY: "${auditData.resumen_ciudadano.substring(0, 150)}".
    PELIGROS Y ALERTAS (Banderas Rojas): ${redFlagsText}.
    ESTÉTICA: Cyberpunk cívico, futurismo oscuro, interfaz de vigilancia digital. 
    Usa colores que reflejen la gravedad: si hay muchas alertas usa rojos y naranjas neón sobre negro; si es transparente usa verdes y azules eléctricos.
    Representa visualmente la idea de "desenmascarar la verdad oculta en los datos".
    Sin texto legible, solo simbología de datos y atmósfera de inteligencia artificial auditora.
    Formato vertical para Reel (9:16).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    // Always use { parts: [...] } structure for multiple parts or for clarity.
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image part found in response");
};

// Generates a cinematic video summary using veo-3.1-fast-generate-preview.
export const generateVideoSummary = async (auditData: BOEAuditResponse, lang: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const redFlagsText = auditData.banderas_rojas.join(", ");
  
  const prompt = `
    A cinematic digital data visualization of a high-security government server being audited. 
    The screen flashes with red warning messages and glitchy text snippets: "${redFlagsText.substring(0, 100)}".
    Cyberpunk laboratory environment, dramatic red lighting, floating digital holograms of complex law structures being broken down. 
    High tension, investigative mood, hyper-detailed 3D rendering.
    Format vertical for social media (9:16).
  `;

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video generated");
    
    // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
    return `${downloadLink}&key=${process.env.API_KEY}`;
  } catch (err: any) {
    // If the request fails with an error message containing "Requested entity was not found.",
    // reset the key selection state and prompt the user to select a key again via openSelectKey().
    if (err.message?.includes("Requested entity was not found.") && typeof window !== 'undefined' && (window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
    }
    throw err;
  }
};
