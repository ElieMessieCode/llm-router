import { test, expect } from 'vitest';
import { secureCompare } from '../../src/lib/auth/session';
test('secureCompare', () => {
  expect(secureCompare('a', 'a')).toBe(true);
  expect(secureCompare('a', 'b')).toBe(false);
  expect(secureCompare('aa', 'a')).toBe(false);
});
