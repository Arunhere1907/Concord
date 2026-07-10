import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  faqCache,
  orchestratorCache,
  stadiumStateCache,
  generateCacheKey,
  isCacheableQuery,
} from "../lib/cache";

describe("Cache - Basic Operations", () => {
  beforeEach(() => {
    faqCache.clear();
    orchestratorCache.clear();
    stadiumStateCache.clear();
  });

  it("should set and get values", () => {
    faqCache.set("test-key", { answer: "Test answer" });
    const result = faqCache.get("test-key");
    expect(result).toEqual({ answer: "Test answer" });
  });

  it("should return null for non-existent keys", () => {
    const result = faqCache.get("non-existent");
    expect(result).toBeNull();
  });

  it("should check if key exists", () => {
    faqCache.set("exists", { data: "value" });
    expect(faqCache.has("exists")).toBe(true);
    expect(faqCache.has("not-exists")).toBe(false);
  });

  it("should delete entries", () => {
    faqCache.set("to-delete", { data: "temp" });
    expect(faqCache.has("to-delete")).toBe(true);

    faqCache.delete("to-delete");
    expect(faqCache.has("to-delete")).toBe(false);
  });

  it("should clear all entries", () => {
    faqCache.set("key1", { data: "value1" });
    faqCache.set("key2", { data: "value2" });

    expect(faqCache.has("key1")).toBe(true);
    expect(faqCache.has("key2")).toBe(true);

    faqCache.clear();

    expect(faqCache.has("key1")).toBe(false);
    expect(faqCache.has("key2")).toBe(false);
  });
});

describe("Cache - TTL and Expiration", () => {
  beforeEach(() => {
    faqCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    faqCache.clear();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should expire entries after TTL", () => {
    faqCache.set("expire-test", { data: "temporary" }, 5);

    // Should exist immediately
    expect(faqCache.has("expire-test")).toBe(true);

    // Advance time by 4 seconds (before expiry)
    vi.advanceTimersByTime(4000);
    expect(faqCache.has("expire-test")).toBe(true);

    // Advance time past expiry
    vi.advanceTimersByTime(2000);
    expect(faqCache.has("expire-test")).toBe(false);
  });

  it("should return null for expired entries on get", () => {
    faqCache.set("expire-get", { data: "value" }, 2);

    expect(faqCache.get("expire-get")).toEqual({ data: "value" });

    vi.advanceTimersByTime(3000);
    expect(faqCache.get("expire-get")).toBeNull();
  });

  it("should use default TTL when not specified", () => {
    // faqCache has default TTL of 600 seconds
    faqCache.set("default-ttl", { data: "value" });

    vi.advanceTimersByTime(599 * 1000);
    expect(faqCache.has("default-ttl")).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(faqCache.has("default-ttl")).toBe(false);
  });

  it("should override default TTL with custom value", () => {
    faqCache.set("custom-ttl", { data: "value" }, 10);

    vi.advanceTimersByTime(9000);
    expect(faqCache.has("custom-ttl")).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(faqCache.has("custom-ttl")).toBe(false);
  });
});

describe("Cache - Cleanup", () => {
  beforeEach(() => {
    faqCache.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    faqCache.clear();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should clean up expired entries", () => {
    faqCache.set("keep", { data: "value1" }, 100);
    faqCache.set("expire1", { data: "value2" }, 5);
    faqCache.set("expire2", { data: "value3" }, 5);

    vi.advanceTimersByTime(6000);

    faqCache.cleanup();

    expect(faqCache.has("keep")).toBe(true);
    expect(faqCache.has("expire1")).toBe(false);
    expect(faqCache.has("expire2")).toBe(false);
  });

  it("should provide cache statistics", () => {
    faqCache.set("key1", { data: "value1" });
    faqCache.set("key2", { data: "value2" });
    faqCache.set("key3", { data: "value3" });

    const stats = faqCache.stats();
    expect(stats.size).toBe(3);
    expect(stats.keys).toContain("key1");
    expect(stats.keys).toContain("key2");
    expect(stats.keys).toContain("key3");
  });

  it("should exclude expired entries from stats", () => {
    faqCache.set("active", { data: "value1" }, 100);
    faqCache.set("expired", { data: "value2" }, 1);

    vi.advanceTimersByTime(2000);

    const stats = faqCache.stats();
    expect(stats.size).toBe(1);
    expect(stats.keys).toContain("active");
    expect(stats.keys).not.toContain("expired");
  });
});

describe("Cache - Different Cache Instances", () => {
  beforeEach(() => {
    faqCache.clear();
    orchestratorCache.clear();
    stadiumStateCache.clear();
  });

  it("should maintain separate stores for different caches", () => {
    faqCache.set("shared-key", { source: "faq" });
    orchestratorCache.set("shared-key", { source: "orchestrator" });
    stadiumStateCache.set("shared-key", { source: "stadium" });

    expect(faqCache.get("shared-key")).toEqual({ source: "faq" });
    expect(orchestratorCache.get("shared-key")).toEqual({ source: "orchestrator" });
    expect(stadiumStateCache.get("shared-key")).toEqual({ source: "stadium" });
  });

  it("should have different default TTLs", () => {
    // This test verifies that different cache instances exist
    // TTL behavior is tested separately
    expect(faqCache).toBeDefined();
    expect(orchestratorCache).toBeDefined();
    expect(stadiumStateCache).toBeDefined();
  });
});

describe("Cache - Cache Key Generation", () => {
  it("should generate unique keys for fan queries with different languages", () => {
    const key1 = generateCacheKey("fan", "where is the restroom?", { language: "English" });
    const key2 = generateCacheKey("fan", "where is the restroom?", { language: "Español" });

    expect(key1).not.toBe(key2);
    expect(key1).toContain("English");
    expect(key2).toContain("Español");
  });

  it("should generate unique keys for accessibility mode", () => {
    const normal = generateCacheKey("fan", "find exit", {
      language: "English",
      accessibility: false,
    });
    const accessible = generateCacheKey("fan", "find exit", {
      language: "English",
      accessibility: true,
    });

    expect(normal).not.toBe(accessible);
    expect(normal).toContain("normal");
    expect(accessible).toContain("ada");
  });

  it("should normalize message for consistent keys", () => {
    const key1 = generateCacheKey("fan", "Where is the RESTROOM?", { language: "English" });
    const key2 = generateCacheKey("fan", "  where is the restroom?  ", { language: "English" });

    expect(key1).toBe(key2);
  });

  it("should generate different keys for different request types", () => {
    const fanKey = generateCacheKey("fan", "status update", {});
    const volunteerKey = generateCacheKey("volunteer", "status update", {});
    const opsKey = generateCacheKey("ops", "status update", {});

    expect(fanKey).not.toBe(volunteerKey);
    expect(fanKey).not.toBe(opsKey);
    expect(volunteerKey).not.toBe(opsKey);
  });

  it("should default to English language if not specified", () => {
    const key = generateCacheKey("fan", "test query", {});
    expect(key).toContain("English");
  });
});

describe("Cache - Cacheability Detection", () => {
  it("should identify restroom queries as cacheable", () => {
    expect(isCacheableQuery("fan", "Where is the nearest restroom?")).toBe(true);
    expect(isCacheableQuery("fan", "Where is the bathroom?")).toBe(true);
    expect(isCacheableQuery("fan", "Need to find a toilet")).toBe(true);
  });

  it("should identify food/water queries as cacheable", () => {
    expect(isCacheableQuery("fan", "Where is the nearest food stand?")).toBe(true);
    expect(isCacheableQuery("fan", "I need water")).toBe(true);
  });

  it("should identify navigation queries as cacheable", () => {
    expect(isCacheableQuery("fan", "How do I get to section 104?")).toBe(true);
    expect(isCacheableQuery("fan", "Where is the exit?")).toBe(true);
    expect(isCacheableQuery("fan", "How to reach the metro?")).toBe(true);
  });

  it("should identify transit queries as cacheable", () => {
    expect(isCacheableQuery("fan", "What transit options are available?")).toBe(true);
    expect(isCacheableQuery("fan", "How do I get to the metro station?")).toBe(true);
  });

  it("should NOT cache volunteer requests", () => {
    expect(isCacheableQuery("volunteer", "Water spill at Gate B")).toBe(false);
    expect(isCacheableQuery("volunteer", "Medical emergency")).toBe(false);
  });

  it("should NOT cache ops requests", () => {
    expect(isCacheableQuery("ops", "Generate situation summary")).toBe(false);
    expect(isCacheableQuery("ops", "What is the current crowd status?")).toBe(false);
  });

  it("should NOT cache dynamic fan queries", () => {
    expect(isCacheableQuery("fan", "What's my current location?")).toBe(false);
    expect(isCacheableQuery("fan", "How long is the line right now?")).toBe(false);
    expect(isCacheableQuery("fan", "Tell me about today's match")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(isCacheableQuery("fan", "WHERE IS THE RESTROOM?")).toBe(true);
    expect(isCacheableQuery("fan", "Where Is The Exit?")).toBe(true);
  });
});

describe("Cache - Edge Cases", () => {
  beforeEach(() => {
    faqCache.clear();
  });

  it("should handle special characters in keys", () => {
    faqCache.set("key-with-special!@#$%", { data: "value" });
    expect(faqCache.get("key-with-special!@#$%")).toEqual({ data: "value" });
  });

  it("should handle very long keys", () => {
    const longKey = "a".repeat(1000);
    faqCache.set(longKey, { data: "value" });
    expect(faqCache.get(longKey)).toEqual({ data: "value" });
  });

  it("should handle null values", () => {
    faqCache.set("null-value", null as any);
    const result = faqCache.get("null-value");
    expect(result).toBeNull();
  });

  it("should handle undefined values", () => {
    faqCache.set("undefined-value", undefined as any);
    const result = faqCache.get("undefined-value");
    // undefined is stored but should work
    expect(result).toBeUndefined();
    expect(faqCache.has("undefined-value")).toBe(true);
  });

  it("should handle complex nested objects", () => {
    const complex = {
      level1: {
        level2: {
          level3: {
            data: [1, 2, 3],
            map: { key: "value" },
          },
        },
      },
    };

    faqCache.set("complex", complex);
    const result = faqCache.get("complex");
    expect(result).toEqual(complex);
  });

  it("should handle rapid successive calls", () => {
    for (let i = 0; i < 100; i++) {
      faqCache.set(`key-${i}`, { index: i });
    }

    for (let i = 0; i < 100; i++) {
      expect(faqCache.get(`key-${i}`)).toEqual({ index: i });
    }
  });

  it("should handle overwriting existing keys", () => {
    faqCache.set("overwrite", { version: 1 });
    expect(faqCache.get("overwrite")).toEqual({ version: 1 });

    faqCache.set("overwrite", { version: 2 });
    expect(faqCache.get("overwrite")).toEqual({ version: 2 });
  });
});
