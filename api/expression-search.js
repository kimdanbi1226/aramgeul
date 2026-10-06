import { createDictionaryService, createStandardDictionaryProvider, createUrimalsaemProvider } from '../lib/dictionary/index.js';
import { searchLocalExpressions } from '../lib/expression/search.js';

function normalizeEntry(entry) {
  return {
    word: entry.word,
    source: entry.source,
    entry_id: entry.entry_id,
    pos: entry.pos,
    categories: entry.categories ?? [],
    labels: entry.labels ?? [],
    senses: (entry.senses ?? []).slice(0, 3),
    link: entry.metadata?.link ?? null,
    standard: entry.standard === true,
    proper_noun: entry.proper_noun === true,
    technical_term: entry.technical_term === true
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const query = typeof body?.query === 'string'
      ? body.query.trim()
      : (typeof body?.q === 'string' ? body.q.trim() : '');

    if (!query) {
      return res.status(400).json({ error: '검색할 표현을 입력해 주세요.' });
    }

    if (query.length > 80) {
      return res.status(400).json({ error: '검색어는 80자 이내로 입력해 주세요.' });
    }

    const local = searchLocalExpressions(query, 8);

    const hasDictionaryKey = Boolean(
      process.env.STANDARD_DICTIONARY_API_KEY ||
      process.env.URIMALSAEM_API_KEY
    );

    let dictionaryEntries = [];
    let dictionaryError = null;

    if (hasDictionaryKey) {
      try {
        const standard = process.env.STANDARD_DICTIONARY_API_KEY
          ? createStandardDictionaryProvider()
          : null;
        const urimal = process.env.URIMALSAEM_API_KEY
          ? createUrimalsaemProvider()
          : null;

        const service = createDictionaryService(
          { standard, urimal },
          { retries: 2, baseDelayMs: 150, ttlMs: 60_000, maxEntries: 300 }
        );

        const entries = await service.lookup(query, { num: 10 });
        const seen = new Set();

        dictionaryEntries = entries
          .map(normalizeEntry)
          .filter(entry => {
            const key = [
              entry.source,
              entry.word,
              entry.entry_id,
              entry.pos
            ].join('|');

            if (!entry.word || seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 12);
      } catch (error) {
        dictionaryError = error instanceof Error ? error.message : String(error);
        console.error('Expression dictionary search error:', error);
      }
    }

    return res.status(200).json({
      query,
      local,
      dictionary: dictionaryEntries,
      dictionary_enabled: hasDictionaryKey,
      warning: dictionaryError
        ? '연결된 사전 검색 중 일부 문제가 발생해 아람글 등록 표현만 먼저 표시했습니다.'
        : (!hasDictionaryKey
          ? '사전 API 인증 정보가 없어 아람글에 등록된 표현 데이터만 검색했습니다.'
          : null)
    });
  } catch (error) {
    console.error('Expression search API error:', error);
    return res.status(500).json({ error: '표현 검색 중 오류가 발생했습니다.' });
  }
}
