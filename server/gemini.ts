import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export function getAiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'schrodingers-lens-ats',
        },
      },
    });
  } catch {
    return null;
  }
}

// Supported models in priority order
const MODEL_CANDIDATES = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];

export async function generateContentWithFallback(params: {
  contents: any;
  systemInstruction?: string;
  responseSchema?: any;
  responseMimeType?: string;
  thinkingLevel?: ThinkingLevel;
}): Promise<string | null> {
  const ai = getAiClient();
  if (!ai) return null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const config: any = {};
      if (params.systemInstruction) {
        config.systemInstruction = params.systemInstruction;
      }
      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (params.responseSchema) {
        config.responseSchema = params.responseSchema;
      }
      if (params.thinkingLevel !== undefined) {
        config.thinkingConfig = { thinkingLevel: params.thinkingLevel };
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      const text = (response.text ?? '').trim();
      if (text) {
        return text;
      }
    } catch (err: any) {
      // If thinkingConfig is unsupported on this model, retry without it
      if (params.thinkingLevel !== undefined && (err?.message?.includes?.('thinking') || err?.status === 400)) {
        try {
          const configNoThinking: any = {};
          if (params.systemInstruction) configNoThinking.systemInstruction = params.systemInstruction;
          if (params.responseMimeType) configNoThinking.responseMimeType = params.responseMimeType;
          if (params.responseSchema) configNoThinking.responseSchema = params.responseSchema;

          const response = await ai.models.generateContent({
            model,
            contents: params.contents,
            config: configNoThinking,
          });
          const text = (response.text ?? '').trim();
          if (text) return text;
        } catch {
          // continue to next model
        }
      }
      // Continue to next model
      continue;
    }
  }

  return null;
}

export async function chatWithFallback(params: {
  history: Array<{ role: string; parts: any[] }>;
  message: any[];
  systemInstruction: string;
  withHighThinking?: boolean;
}): Promise<string | null> {
  const ai = getAiClient();
  if (!ai) return null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const chat = ai.chats.create({
        model,
        history: params.history,
        config: {
          systemInstruction: params.systemInstruction,
          ...(params.withHighThinking
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
            : {}),
        },
      });

      const response = await chat.sendMessage({ message: params.message });
      const reply = (response.text ?? '').trim();
      if (reply) return reply;
    } catch (err: any) {
      if (params.withHighThinking) {
        // Retry without high thinking
        try {
          const chat = ai.chats.create({
            model,
            history: params.history,
            config: {
              systemInstruction: params.systemInstruction,
            },
          });
          const response = await chat.sendMessage({ message: params.message });
          const reply = (response.text ?? '').trim();
          if (reply) return reply;
        } catch {
          // continue to next model
        }
      }
      continue;
    }
  }

  return null;
}
