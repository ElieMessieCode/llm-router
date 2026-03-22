import { test, expect } from 'vitest';
import { env } from '../../src/lib/env';
test('env parses correctly', () => {
  expect(env).toBeDefined();
});
