// lib/rateLimiter.ts
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000
) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    
    // Disable in development and test environments
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return null;
    }

    // PRODUCTION ONLY - Rate limiting enabled
    const ip = 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'unknown';
    
    const now = Date.now();
    const key = `rate_limit:${ip}`;
    
    if (Math.random() < 0.01) {
      cleanupExpiredEntries(now);
    }
    
    let entry = store.get(key);
    
    if (!entry || entry.resetTime < now) {
      entry = { count: 1, resetTime: now + windowMs };
      store.set(key, entry);
      return null;
    }
    
    entry.count++;
    
    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      return NextResponse.json(
        { 
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString()
          }
        }
      );
    }
    
    return null;
  };
}

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}

export function getRateLimitStats() {
  const now = Date.now();
  const entries = Array.from(store.entries());
  return {
    totalEntries: store.size,
    entries: entries.map(([key, entry]) => ({
      ip: key.replace('rate_limit:', ''),
      count: entry.count,
      resetsIn: Math.ceil((entry.resetTime - now) / 1000) + 's'
    }))
  };
}

export function clearRateLimits(): void {
  store.clear();
}

export function clearRateLimitForIP(ip: string): boolean {
  return store.delete(`rate_limit:${ip}`);
}

export default {
  rateLimit,
  getStats: getRateLimitStats,
  clear: clearRateLimits,
  clearForIP: clearRateLimitForIP
};