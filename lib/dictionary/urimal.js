import { DICTIONARY_SOURCES, createDictionaryAdapter } from './adapter.js';
import { fetchJson, withQuery } from './http.js';

export function createUrimalsaemProvider(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.URIMALSAEM_API_URL;
  const apiKey = options.apiKey ?? process.env.URIMALSAEM_API_KEY;
  if (!baseUrl) throw new Error('우리말샘 API URL이 필요합니다.');
  if (!apiKey) throw new Error('우리말샘 API 인증키가 필요합니다.');
  return {
    source: DICTIONARY_SOURCES.URIMAL,
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
        categories: item.categories ?? item.domains ?? [],
        labels: item.labels ?? [],
        variants: item.variants ?? [],
        standard: item.standard === true,
        technical_term: item.technical_term === true,
        metadata: item
      }));
    }
  };
}

export function createUrimalsaem(options = {}) {
  return createDictionaryAdapter(createUrimalsaemProvider(options));
}
