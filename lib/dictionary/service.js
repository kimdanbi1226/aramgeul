import { createDictionaryAdapter, DICTIONARY_SOURCES } from './adapter.js';
import { createResilientDictionary } from './provider-utils.js';

export function createDictionaryService({ standard, urimal, local } = {}, options = {}) {
  const providers = [standard, urimal, local].filter(Boolean);
  const adapters = providers.map(provider => {
    try { return provider.lookup ? createResilientDictionary(provider, options) : createDictionaryAdapter(provider); }
    catch { return null; }
  }).filter(Boolean);

  return Object.freeze({
    async lookup(query, lookupOptions = {}) {
      if (typeof query !== 'string' || !query.trim()) return [];
      const settled = await Promise.allSettled(adapters.map(adapter => adapter.lookup(query, lookupOptions)));
      return settled.flatMap((item, index) => {
        if (item.status !== 'fulfilled' || !Array.isArray(item.value)) return [];
        return item.value.map(entry => ({
          ...entry,
          source_priority: entry.source === DICTIONARY_SOURCES.STANDARD ? 1
            : entry.source === DICTIONARY_SOURCES.URIMAL ? 2 : 3,
          provider_index: index
        }));
      });
    }
  });
}
