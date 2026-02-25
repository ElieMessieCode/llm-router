import { MODELS } from '../../config/models.config';

export function calculatePrice(modelId: keyof typeof MODELS, inputTokens: number, outputTokens: number): number {
  const model = MODELS[modelId];
  if (!model) return 0;
  const inputCost = (inputTokens / 1000000) * model.inputPrice;
  const outputCost = (outputTokens / 1000000) * model.outputPrice;
  return inputCost + outputCost;
}
