import { LLMProvider, Msg, StreamEvent } from './types';
import { RouterError } from '../router/errors';

export class MockProvider implements LLMProvider {
  async *stream(model: string, messages: Msg[]): AsyncIterable<StreamEvent> {
    if (messages.some(m => m.content.includes('error'))) {
      throw new RouterError('provider_unavailable', 'Mock error', 503, true);
    }
    yield { type: 'delta', content: 'Mock' };
    yield { type: 'delta', content: ' response' };
    yield { type: 'usage', inputTokens: 10, outputTokens: 2 };
  }
}
