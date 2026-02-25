export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private refillRatePerMs: number;
  
  constructor(private maxTokens: number, refillIntervalMs: number) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRatePerMs = maxTokens / refillIntervalMs;
  }

  consume(tokensToConsume: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokensToConsume) {
      this.tokens -= tokensToConsume;
      return true;
    }
    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRatePerMs;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

const limits = new Map<string, RateLimiter>();

export function checkRateLimit(id: string): boolean {
  let limiter = limits.get(id);
  if (!limiter) {
    limiter = new RateLimiter(50, 60000);
    limits.set(id, limiter);
  }
  return limiter.consume();
}
