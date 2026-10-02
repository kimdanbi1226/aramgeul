import { DICTIONARY_SOURCES, createDictionaryAdapter } from './adapter.js';
import { fetchJson, withQuery } from './http.js';

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeStandardItem(item) {
  const senses = asArray(item?.sense).map(sense => ({
    sense_no: sense?.sense_no ?? null,
    definition: sense?.definition ?? null,
    category: sense?.type ?? null,
    link: sense?.link ?? null
  })).filter(sense => sense.definition || sense.sense_no);

  return {
    word: item?.word,
    entry_id: item?.target_code ?? null,
    pos: item?.pos ?? null,
    senses,
    categories: asArray(item?.sense).flatMap(s => s?.cat ? [s.cat] : []).filter(Boolean),
    labels: asArray(item?.sense).flatMap(s => s?.type ? [s.type] : []).filter(Boolean),
    variants: [],
    standard: true,
    technical_term: asArray(item?.sense).some(s => Boolean(s?.cat)),
    metadata: {
      sup_no: item?.sup_no ?? null,
      link: asArray(item?.sense).find(s => s?.link)?.link ?? null
    }
  };
}

export function createStandardDictionaryProvider(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.STANDARD_DICTIONARY_API_URL ?? 'https://stdict.korean.go.kr/api/search.do';
  const apiKey = options.apiKey ?? process.env.STANDARD_DICTIONARY_API_KEY;
  if (!apiKey) throw new Error('표준국어대사전 API 인증키가 필요합니다.');

  return {
    source: DICTIONARY_SOURCES.STANDARD,
    async lookup(query, lookupOptions = {}) {
      const url = withQuery(baseUrl, {
        key: apiKey,
        q: query,
        req_type: 'json',
        start: lookupOptions.start ?? 1,
        num: lookupOptions.num ?? 10,
        advanced: lookupOptions.advanced ?? 'n',
        target: lookupOptions.target,
        method: lookupOptions.method,
        type1: lookupOptions.type1,
        type2: lookupOptions.type2,
        pos: lookupOptions.pos,
        cat: lookupOptions.cat
      });
      const data = await fetchJson(url, { timeoutMs: lookupOptions.timeoutMs ?? 3500 });
      if (data?.error) {
        throw new Error('Standard Dictionary API ' + (data.error.error_code ?? 'error') + ': ' + (data.error.message ?? 'request failed'));
      }
      const items = asArray(data?.channel?.item);
      return items.map(normalizeStandardItem).filter(item => item.word);
    }
  };
}

export function createStandardDictionary(options = {}) {
  return createDictionaryAdapter(createStandardDictionaryProvider(options));
}
