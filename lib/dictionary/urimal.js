import { DICTIONARY_SOURCES, createDictionaryAdapter } from './adapter.js';
import { fetchJson, withQuery } from './http.js';

function asArray(value) { return value == null ? [] : Array.isArray(value) ? value : [value]; }

function normalizeUrimalItem(item) {
  const senses = asArray(item?.sense).map(sense => ({
    sense_no: sense?.sense_no ?? null,
    definition: sense?.definition ?? null,
    category: sense?.type ?? null,
    link: sense?.link ?? null
  })).filter(sense => sense.definition || sense.sense_no);
  return {
    word: item?.word,
    entry_id: item?.target_code ?? null,
    pos: asArray(item?.sense).map(s => s?.pos).find(Boolean) ?? null,
    senses,
    categories: asArray(item?.sense).flatMap(s => s?.cat ? [s.cat] : []),
    labels: asArray(item?.sense).flatMap(s => s?.type ? [s.type] : []),
    variants: [],
    standard: false,
    proper_noun: asArray(item?.sense).some(s => ['인명', '지명', '책명', '고유명 일반'].includes(s?.cat)),
    person_name: asArray(item?.sense).some(s => s?.cat === '인명'),
    technical_term: asArray(item?.sense).some(s => s?.type4 === '전문어'),
    metadata: { link: senses.find(s => s.link)?.link ?? null }
  };
}

export function createUrimalsaemProvider(options = {}) {
  const baseUrl = options.baseUrl ?? process.env.URIMALSAEM_API_URL ?? 'https://opendict.korean.go.kr/api/search';
  const apiKey = options.apiKey ?? process.env.URIMALSAEM_API_KEY;
  if (!apiKey) throw new Error('우리말샘 API 인증키가 필요합니다.');
  return {
    source: DICTIONARY_SOURCES.URIMAL,
    async lookup(query, lookupOptions = {}) {
      const url = withQuery(baseUrl, {
        key: apiKey, q: query, req_type: 'json',
        start: lookupOptions.start ?? 1, num: lookupOptions.num ?? 10,
        part: lookupOptions.part ?? 'word', sort: lookupOptions.sort ?? 'dict',
        advanced: lookupOptions.advanced ?? 'n', target: lookupOptions.target,
        method: lookupOptions.method, type1: lookupOptions.type1,
        type2: lookupOptions.type2, type3: lookupOptions.type3,
        type4: lookupOptions.type4, pos: lookupOptions.pos,
        cat: lookupOptions.cat, norm: lookupOptions.norm
      });
      const data = await fetchJson(url, { timeoutMs: lookupOptions.timeoutMs ?? 3500 });
      if (data?.error) throw new Error('Urimalsaem API ' + (data.error.error_code ?? 'error') + ': ' + (data.error.message ?? 'request failed'));
      return asArray(data?.channel?.item).map(normalizeUrimalItem).filter(item => item.word);
    }
  };
}
export function createUrimalsaem(options = {}) {
  return createDictionaryAdapter(createUrimalsaemProvider(options));
}