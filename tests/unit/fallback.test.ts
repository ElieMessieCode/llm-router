import { test, expect } from 'vitest';
import { orchestrateStream } from '../../src/lib/router/fallback';
test('fallback', async () => {
  const iter = orchestrateStream('mock-model', [{role:'user', content:'a'}]);
  const iterator = iter[Symbol.asyncIterator]();
  const first = await iterator.next();
  expect(first.value).toBeDefined();
});
