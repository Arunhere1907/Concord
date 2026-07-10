/**
 * Simple in-memory cache for FAQ responses and static content
 * Reduces AI API calls for repeated queries
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache<T = any> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLSeconds: number = 300) {
    // Default 5 minutes
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  /**
   * Set a cache entry
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    const expiresAt = Date.now() + ttl;

    this.store.set(key, {
      value,
      expiresAt,
    });

    // Periodic cleanup
    if (this.store.size > 1000) {
      this.cleanup();
    }
  }

  /**
   * Get a cache entry
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    this.cleanup();
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// Export singleton instances for different cache types
export const faqCache = new SimpleCache<any>(600); // 10 minutes for FAQs
export const orchestratorCache = new SimpleCache<any>(300); // 5 minutes for orchestrator responses
export const stadiumStateCache = new SimpleCache<any>(10); // 10 seconds for stadium state

/**
 * Generate cache key for orchestrator requests
 */
export function generateCacheKey(requestType: string, message: string, context?: any): string {
  // Normalize the message
  const normalized = message.toLowerCase().trim();

  // For FAQ-style queries, use normalized message
  if (requestType === "fan") {
    // Extract language from context
    const lang = context?.language || "English";
    const accessibility = context?.accessibility ? "ada" : "normal";
    return `fan:${lang}:${accessibility}:${normalized}`;
  }

  // For volunteer/ops, include more context
  return `${requestType}:${normalized}`;
}

/**
 * Check if a query is FAQ-like (cacheable)
 */
export function isCacheableQuery(requestType: string, message: string): boolean {
  if (requestType !== "fan") {
    // Only cache fan queries for now
    return false;
  }

  const normalized = message.toLowerCase();

  // Common FAQ patterns
  const faqPatterns = [
    /where.*restroom/i,
    /where.*bathroom/i,
    /where.*toilet/i,
    /nearest.*food/i,
    /nearest.*water/i,
    /how.*get.*section/i,
    /where.*parking/i,
    /exit/i,
    /metro/i,
    /transit/i,
  ];

  return faqPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Decorator function to add caching to async functions
 */
export function withCache<T>(
  cache: SimpleCache<T>,
  keyGenerator: (...args: any[]) => string,
  ttlSeconds?: number
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator(...args);

      // Check cache first
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Call original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      cache.set(key, result, ttlSeconds);

      return result;
    };

    return descriptor;
  };
}
