export const MODELS = {
  'claude-3-5-sonnet-latest': { provider: 'anthropic', inputPrice: 3.0, outputPrice: 15.0 },
  'gpt-4o': { provider: 'openai', inputPrice: 5.0, outputPrice: 15.0 },
  'gemini-1.5-pro-latest': { provider: 'gemini', inputPrice: 3.5, outputPrice: 10.5 },
  'mock-model': { provider: 'mock', inputPrice: 0.0, outputPrice: 0.0 }
} as const;
