import { test, expect } from 'vitest';
import { RouterError } from '../../src/lib/router/errors';
test('error', () => {
  const err = new RouterError('auth', 'msg', 401, false);
  expect(err.code).toBe('auth');
});
