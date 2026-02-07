import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, Msg, StreamEvent } from './types';
import { RouterError } from '../router/errors';
import { env } from '../env';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  constructor() {
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY || '' });
  }

  async *stream(model: string, messages: Msg[]): AsyncIterable<StreamEvent> {
    try {
      const stream = await this.client.messages.create({
        model,
        messages: messages.filter(m => m.role !== 'system') as any,
        system: messages.find(m => m.role === 'system')?.content,
        max_tokens: 4096,
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield { type: 'delta', content: chunk.delta.text };
        }
        if (chunk.type === 'message_start') {
          yield { type: 'usage', inputTokens: chunk.message.usage.input_tokens };
        }
        if (chunk.type === 'message_delta' && chunk.usage) {
          yield { type: 'usage', outputTokens: chunk.usage.output_tokens };
        }
      }
    } catch (e: any) {
      throw new RouterError('provider_unavailable', e.message, 503, true);
    }
  }
}
