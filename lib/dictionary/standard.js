import { DICTIONARY_SOURCES, createDictionaryAdapter } from './adapter.js';
import { fetchJson, withQuery } from './http.js';

export function createStandardDictionaryProvider(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.STANDARD_DICTIONARY_API_URL;
  const apiKey = options.apiKey ?? process.env.STANDARD_DICTIONARY_API_KEY;
  if (!baseUrl) throw new Error('표준국어대사전 API URL이 필요합니다.');
  if (!apiKey) throw new Error('표준국어대사전 API 인증키가 필요합니다.');
  return {
    source: DICTIONARY_SOURCES.STANDARD,
    async lookup(query, lookupOptions = {}) {
      const url = withQuery(baseUrl, {
        q: query, key: apiKey, start: lookupOptions.start, num: lookupOptions.num
      });
      const data = await fetchJson(url, { timeoutMs: lookupOptions.timeoutMs ?? 3500 });
      const items = Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.results) ? data.results : [];
      return items.map(item => ({
        word: item.word ?? item.lemma ?? item.title,
        entry_id: item.target_code ?? item.code,
        pos: item.pos ?? item.part_of_speech,
        senses: item.senses ?? [],
        categories: item.categories ?? [],
        labels: item.labels ?? [],
        variants: item.variants ?? [],
        standard: item.standard === true,
        metadata: item
      }));
    }
  };
}

export function createStandardDictionary(options = {}) {
  return createDictionaryAdapter(createStandardDictionaryProvider(options));
}
