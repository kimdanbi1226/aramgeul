import { assertMorphologyAdapter, validateMorphologyResult } from './adapter.js';

const JOSA_TAGS = new Set([
  'JKS', 'JKC', 'JKG', 'JKO', 'JKB', 'JKV', 'JKQ', 'JX', 'JC'
]);

const ENDING_TAGS = new Set(['EF', 'EC', 'EP']);
const MODIFIER_TAGS = new Set(['ETM', 'ETN']);

function grammarFunctions(pos, surface) {
  const functions = [];

  for (const tag of String(pos ?? '').split('+').filter(Boolean)) {
    if (tag === 'NNB') functions.push('DEPENDENT_NOUN');
    else if (tag === 'VX') functions.push('AUXILIARY_VERB');
    else if (JOSA_TAGS.has(tag)) functions.push('JOSA');
    else if (ENDING_TAGS.has(tag)) functions.push('ENDING');
    else if (MODIFIER_TAGS.has(tag)) functions.push('MODIFIER');
    else if (['VV', 'VA', 'VCP', 'VCN', 'XSV', 'XSA'].includes(tag)) {
      functions.push('LEXICAL_VERB');
    } else if (tag === 'MAG') {
      functions.push(['안', '못'].includes(surface) ? 'NEGATIVE_ADVERB' : 'ADVERB');
    } else if (tag === 'MM') {
      functions.push('DETERMINER');
    }
  }

  return [...new Set(functions)];
}

function normalizeToken(token, text) {
  const surface = String(token?.form ?? token?.str ?? '');
  const pos = token?.tag ?? token?.pos ?? null;
  const start = Number.isInteger(token?.start) ? token.start : null;
  const length = Number.isInteger(token?.len)
    ? token.len
    : Number.isInteger(token?.length)
      ? token.length
      : null;

  const functions = grammarFunctions(pos, surface);

  return {
    text: surface,
    normalized: surface,
    lemma: token?.lemma ?? null,
    pos,
    morphemes: [{ text: surface, pos }],
    features: {
      grammar_function: functions[0] ?? null,
      grammar_functions: functions
    },
    start,
    end: start !== null && length !== null ? start + length : null,
    confidence: 1
  };
}

/**
 * 이미 초기화된 Kiwi JS/WASM 인스턴스를 아람글 공통 형태소 모델로 감싼다.
 *
 * 모델 로딩/초기화는 이 Adapter의 책임이 아니다.
 * 이를 분리하면 Kiwi 모델 공급 방식이 바뀌어도 규칙 엔진은 영향을 받지 않는다.
 */
export function createKiwiAdapter(kiwi, metadata = {}) {
  if (!kiwi || typeof kiwi.tokenize !== 'function') {
    throw new TypeError('초기화된 Kiwi 인스턴스가 필요합니다.');
  }

  const adapter = {
    async analyze(text) {
      if (typeof text !== 'string') {
        throw new TypeError('형태소 분석 입력은 문자열이어야 합니다.');
      }

      const rawTokens = kiwi.tokenize(text);
      const tokens = rawTokens.map(token => normalizeToken(token, text));

      const result = {
        text,
        tokens,
        candidates: [],
        metadata: {
          analyzer: 'kiwi',
          version: metadata.version ?? null,
          runtime: metadata.runtime ?? 'kiwi-nlp'
        }
      };

      validateMorphologyResult(result);
      return result;
    }
  };

  assertMorphologyAdapter(adapter);
  return adapter;
}

export { grammarFunctions, normalizeToken };
