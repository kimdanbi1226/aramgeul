/**
 * 아람글 사전 어댑터 계약.
 * 규칙 엔진은 특정 사전/HTTP API의 응답 형식을 직접 알지 않는다.
 */

export const DICTIONARY_SOURCES = Object.freeze({
  STANDARD: 'standard-korean-dictionary',
  URIMAL: 'urimalsaem',
  LOCAL: 'local'
});

export function normalizeDictionaryEntry(raw, source = DICTIONARY_SOURCES.LOCAL) {
  if (!raw || typeof raw !== 'object') return null;
  const word = raw.word ?? raw.lemma ?? raw.entry ?? raw.title;
  if (typeof word !== 'string' || !word.trim()) return null;

  return Object.freeze({
    word: word.trim(),
    source,
    entry_id: raw.entry_id ?? raw.target_code ?? raw.code ?? null,
    pos: raw.pos ?? raw.part_of_speech ?? null,
    senses: Array.isArray(raw.senses) ? raw.senses : [],
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    labels: Array.isArray(raw.labels) ? raw.labels : [],
    variants: Array.isArray(raw.variants) ? raw.variants : [],
    standard: raw.standard === true,
    proper_noun: raw.proper_noun === true,
    technical_term: raw.technical_term === true,
    person_name: raw.person_name === true,
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}
  });
}

export function assertDictionaryProvider(provider) {
  if (!provider || typeof provider.lookup !== 'function') {
    throw new TypeError('Dictionary provider must implement lookup(query).');
  }
}

export function createDictionaryAdapter(provider) {
  assertDictionaryProvider(provider);

  return Object.freeze({
    async lookup(query, options = {}) {
      if (typeof query !== 'string' || !query.trim()) return [];
      const raw = await provider.lookup(query.trim(), options);
      if (!Array.isArray(raw)) return [];
      return raw
        .map(entry => normalizeDictionaryEntry(entry, provider.source ?? DICTIONARY_SOURCES.LOCAL))
        .filter(Boolean);
    }
  });
}
