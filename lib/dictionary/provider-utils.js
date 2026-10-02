import { createDictionaryAdapter } from './adapter.js';

export function memoizeLookup(provider, options = {}) {
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 60_000;
  const maxEntries = Number.isInteger(options.maxEntries) ? Math.max(1, options.maxEntries) : 500;
  const cache = new Map();
  return {
    source: provider.source,
    async lookup(query, lookupOptions = {}) {
      const key = JSON.stringify([query.trim(), lookupOptions]);
      const now = Date.now();
      const hit = cache.get(key);
      if (hit && hit.expiresAt > now) return hit.value;
      if (hit) cache.delete(key);
      const value = await provider.lookup(query, lookupOptions);
      cache.set(key, { value, expiresAt: now + ttlMs });
      while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
      return value;
    }
  };
}

export function withRetry(provider, options = {}) {
  const retries = Number.isInteger(options.retries) ? Math.max(0, options.retries) : 2;
  const baseDelayMs = Number.isFinite(options.baseDelayMs) ? Math.max(0, options.baseDelayMs) : 150;
  const retryable = typeof options.retryable === 'function'
    ? options.retryable
    : error => /HTTP 408|HTTP 429|HTTP 5\d\d|timeout/i.test(String(error?.message || error));
  return {
    source: provider.source,
    async lookup(query, lookupOptions = {}) {
      let lastError;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try { return await provider.lookup(query, lookupOptions); }
        catch (error) {
          lastError = error;
          if (attempt === retries || !retryable(error)) throw error;
          await new Promise(resolve => setTimeout(resolve, baseDelayMs * (2 ** attempt)));
        }
      }
      throw lastError;
    }
  };
}

export function createResilientDictionary(provider, options = {}) {
  return createDictionaryAdapter(memoizeLookup(withRetry(provider, options), options));
}
