import OpenAI from 'openai';
import { LLMProvider, Msg, StreamEvent } from './types';
import { RouterError } from '../router/errors';
import { env } from '../env';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY || '' });
  }

  async *stream(model: string, messages: Msg[]): AsyncIterable<StreamEvent> {
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages: messages as any,
        stream: true,
        stream_options: { include_usage: true }
      });

      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          yield { type: 'delta', content: chunk.choices[0].delta.content };
        }
        if (chunk.usage) {
          yield { type: 'usage', inputTokens: chunk.usage.prompt_tokens, outputTokens: chunk.usage.completion_tokens };
        }
      }
    } catch (e: any) {
      throw new RouterError('provider_unavailable', e.message, 503, true);
    }
  }
}
