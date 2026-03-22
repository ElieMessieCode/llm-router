import { test, expect } from 'vitest';
import { MockProvider } from '../../src/lib/providers/mock';
test('mock provider', async () => {
  const p = new MockProvider();
  const iter = p.stream('m', [{role:'user', content:'a'}]);
  const iterator = iter[Symbol.asyncIterator]();
  const first = await iterator.next();
  expect(first.value.type).toBe('delta');
});
