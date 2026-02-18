import { getProvider } from '../providers/registry';
import { MODELS } from '../../config/models.config';
import { Msg } from '../providers/types';
import { formatSSE } from './sse';
import { calculatePrice } from './pricing';

export async function* orchestrateStream(modelId: keyof typeof MODELS, messages: Msg[]) {
  const config = MODELS[modelId];
  let providerName = config.provider;
  let provider = getProvider(providerName);
  
  if (!provider) {
    providerName = 'mock';
    provider = getProvider('mock');
    if (!provider) yield formatSSE('error', { code: 'provider_unavailable' });
  }

  if (provider) {
    let hasEmittedDelta = false;
    try {
      const stream = provider.stream(modelId, messages);
      let totalInput = 0;
      let totalOutput = 0;
      
      for await (const event of stream) {
        if (!hasEmittedDelta && event.type === 'delta') {
          yield formatSSE('meta', { model: modelId, provider: providerName });
          hasEmittedDelta = true;
        }
        if (event.type === 'delta') {
          yield formatSSE('delta', event.content);
        }
        if (event.type === 'usage') {
          totalInput = event.inputTokens ?? totalInput;
          totalOutput = event.outputTokens ?? totalOutput;
          const price = calculatePrice(modelId, totalInput, totalOutput);
          yield formatSSE('usage', { input: totalInput, output: totalOutput, price });
        }
      }
      yield formatSSE('done', {});
    } catch (e: any) {
      if (e.retryable && !hasEmittedDelta) {
        const mock = getProvider('mock');
        if (mock) {
           const fallbackStream = mock.stream('mock-model', messages);
           for await (const ev of fallbackStream) {
             if (ev.type === 'delta') yield formatSSE('delta', ev.content);
           }
           yield formatSSE('done', {});
        }
      } else {
        yield formatSSE('error', { message: e.message, retryable: false });
      }
    }
  }
}
