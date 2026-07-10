/**
 * Simple in-memory cache for FAQ responses and static content
 * Reduces AI API calls for repeated queries
 */

import { CACHE_TTL } from "./constants";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Generic cache implementation with TTL support
 */
class SimpleCache<T = unknown> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;
  private readonly maxStoreSize = 1000;

  constructor(defaultTTLSeconds: number = CACHE_TTL.ORCHESTRATOR) {
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  /**
   * Set a cache entry with optional custom TTL
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    const expiresAt = Date.now() + ttl;

    this.store.set(key, {
      value,
      expiresAt,
    });

    // Periodic cleanup to prevent memory leaks
    if (this.store.size > this.maxStoreSize) {
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
export const faqCache = new SimpleCache<Record<string, unknown>>(CACHE_TTL.FAQ);
export const orchestratorCache = new SimpleCache<Record<string, unknown>>(CACHE_TTL.ORCHESTRATOR);
export const stadiumStateCache = new SimpleCache<Record<string, unknown>>(CACHE_TTL.STADIUM_STATE);

/**
 * Generate cache key for orchestrator requests
 * Creates a unique key based on request type, message, and context
 */
export function generateCacheKey(
  requestType: string,
  message: string,
  context?: Record<string, unknown>
): string {
  // Normalize the message
  const normalized = message.toLowerCase().trim();

  // For FAQ-style queries, use normalized message
  if (requestType === "fan") {
    // Extract language from context
    const language = (context?.language as string) || "English";
    const accessibility = context?.accessibility ? "ada" : "normal";
    return `fan:${language}:${accessibility}:${normalized}`;
  }

  // For volunteer/ops, include more context
  return `${requestType}:${normalized}`;
}

/**
 * Check if a query is FAQ-like (cacheable)
 * Identifies common repeated queries that can be cached
 */
export function isCacheableQuery(requestType: string, message: string): boolean {
  if (requestType !== "fan") {
    // Only cache fan queries for now
    return false;
  }

  const normalized = message.toLowerCase();

  // Common FAQ patterns that are safe to cache
  const faqPatterns = [
    /restroom/i,
    /bathroom/i,
    /toilet/i,
    /food/i,
    /water/i,
    /section/i,
    /parking/i,
    /exit/i,
    /metro/i,
    /transit/i,
  ];

  return faqPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Decorator function to add caching to async functions
 * Wraps a function to automatically cache its results
 */
export function withCache<T>(
  cache: SimpleCache<T>,
  keyGenerator: (...args: unknown[]) => string,
  ttlSeconds?: number
) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
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
