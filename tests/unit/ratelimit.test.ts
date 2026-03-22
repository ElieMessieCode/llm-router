import { test, expect } from 'vitest';
import { checkRateLimit, RateLimiter } from '../../src/lib/router/ratelimit';
test('ratelimit', () => {
  const limiter = new RateLimiter(1, 1000);
  expect(limiter.consume()).toBe(true);
  expect(limiter.consume()).toBe(false);
});
