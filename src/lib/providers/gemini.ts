import { GoogleGenAI } from '@google/genai';
import { LLMProvider, Msg, StreamEvent } from './types';
import { RouterError } from '../router/errors';
import { env } from '../env';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenAI;
  constructor() {
    this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY || '' });
  }

  async *stream(model: string, messages: Msg[]): AsyncIterable<StreamEvent> {
    try {
      const responseStream = await this.client.models.generateContentStream({
        model,
        contents: messages.map(m => m.content),
      });
      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield { type: 'delta', content: chunk.text };
        }
      }
      yield { type: 'usage', inputTokens: 0, outputTokens: 0 };
    } catch (e: any) {
      throw new RouterError('provider_unavailable', e.message, 503, true);
    }
  }
}
