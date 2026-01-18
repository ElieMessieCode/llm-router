import { LLMProvider } from './types';
import { AnthropicProvider } from './anthropic';
import { GeminiProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { MockProvider } from './mock';
import { env } from '../env';

const providers = new Map<string, LLMProvider>();

if (env.ANTHROPIC_API_KEY) providers.set('anthropic', new AnthropicProvider());
if (env.GEMINI_API_KEY) providers.set('gemini', new GeminiProvider());
if (env.OPENAI_API_KEY) providers.set('openai', new OpenAIProvider());
if (env.MOCK_PROVIDER) providers.set('mock', new MockProvider());

export function getProvider(name: string): LLMProvider | undefined {
  return providers.get(name);
}
