import { DICTIONARY_SOURCES, createDictionaryAdapter } from './adapter.js';

export function createLocalDictionaryProvider(entries = []) {
  const records = Array.isArray(entries) ? entries : [];
  return {
    source: DICTIONARY_SOURCES.LOCAL,
    async lookup(query) {
      const normalized = query.trim();
      return records.filter(entry =>
        String(entry?.word ?? entry?.lemma ?? '').trim() === normalized
      );
    }
  };
}

export function createLocalDictionary(entries = []) {
  return createDictionaryAdapter(createLocalDictionaryProvider(entries));
}
