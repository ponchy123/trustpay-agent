interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  tryAcquire(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1, resetIn: this.windowMs };
    }

    if (entry.count >= this.maxRequests) {
      const resetIn = entry.resetAt - now;
      return { allowed: false, remaining: 0, resetIn };
    }

    entry.count++;
    return { allowed: true, remaining: this.maxRequests - entry.count, resetIn: entry.resetAt - now };
  }

  reset(key: string): void {
    this.limits.delete(key);
  }

  resetAll(): void {
    this.limits.clear();
  }

  getStats(key: string): { count: number; remaining: number } | undefined {
    const entry = this.limits.get(key);
    if (!entry || Date.now() > entry.resetAt) return undefined;
    return { count: entry.count, remaining: this.maxRequests - entry.count };
  }
}
