import { DICTIONARY_SOURCES, createDictionaryAdapter } from './adapter.js';
import { fetchJson, withQuery } from './http.js';

function asArray(value) { return value == null ? [] : Array.isArray(value) ? value : [value]; }

function normalizeStandardItem(item) {
  const rawSenses = asArray(item?.sense);
  const senses = rawSenses.map(sense => ({
    sense_no: sense?.sense_no ?? null,
    definition: sense?.definition ?? null,
    category: sense?.type ?? null,
    link: sense?.link ?? null
  })).filter(sense => sense.definition || sense.sense_no);

  const categories = rawSenses.flatMap(s => s?.cat ? [s.cat] : []);
  const labels = rawSenses.flatMap(s => s?.type ? [s.type] : []);
  const technicalTerm = rawSenses.some(s => s?.cat === '전문어');

  return {
    word: item?.word,
    entry_id: item?.target_code ?? null,
    pos: item?.pos ?? null,
    senses,
    categories,
    labels,
    variants: [],
    standard: true,
    // 'cat' 존재 여부만으로 전문어를 판정하지 않는다.
    // 공식 사전의 전문어 범주가 명시적으로 확인된 경우에만 true로 둔다.
    technical_term: technicalTerm,
    metadata: {
      sup_no: item?.sup_no ?? null,
      link: senses.find(s => s.link)?.link ?? null
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
        key: apiKey, q: query, req_type: 'json',
        start: lookupOptions.start ?? 1, num: lookupOptions.num ?? 10,
        advanced: lookupOptions.advanced ?? 'n', target: lookupOptions.target,
        method: lookupOptions.method, type1: lookupOptions.type1,
        type2: lookupOptions.type2, pos: lookupOptions.pos, cat: lookupOptions.cat
      });
      const data = await fetchJson(url, { timeoutMs: lookupOptions.timeoutMs ?? 3500 });
      if (data?.error) throw new Error('Standard Dictionary API ' + (data.error.error_code ?? 'error') + ': ' + (data.error.message ?? 'request failed'));
      return asArray(data?.channel?.item).map(normalizeStandardItem).filter(item => item.word);
    }
  };
}

export function createStandardDictionary(options = {}) {
  return createDictionaryAdapter(createStandardDictionaryProvider(options));
}
