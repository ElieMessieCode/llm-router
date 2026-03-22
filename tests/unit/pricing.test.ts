import { test, expect } from 'vitest';
import { calculatePrice } from '../../src/lib/router/pricing';
test('pricing', () => {
  expect(calculatePrice('mock-model', 1000, 1000)).toBe(0);
});
