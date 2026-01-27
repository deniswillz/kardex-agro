
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const analyzeDailyLogs = async (data: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analise os seguintes dados do Diário de Bordo da Nano:
    
    Notas Fiscais: ${JSON.stringify(data.notas.slice(0, 20))}
    Comentários: ${JSON.stringify(data.comentarios.slice(0, 20))}
    
    Forneça um resumo executivo de 3-4 frases em português sobre o estado atual do sistema Nano, 
    identificando possíveis gargalos operacionais ou tendências logísticas.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Não foi possível gerar a análise inteligente Nano no momento.";
  }
};
