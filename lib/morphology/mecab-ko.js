import { MeCab } from 'kuromoji-ko';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertMorphologyAdapter, validateMorphologyResult } from './adapter.js';

let tokenizerPromise;

function getDictionaryPath() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '../../node_modules/kuromoji-ko/dict');
}

async function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = MeCab.create({
      engine: 'ko',
      dictPath: getDictionaryPath()
    });
  }

  return tokenizerPromise;
}

function normalizePos(pos, surface) {
  const tags = Array.isArray(pos) ? pos : String(pos ?? '').split('+').filter(Boolean);
  const functions = [];

  for (const tag of tags) {
    if (tag === 'NNB') functions.push('DEPENDENT_NOUN');
    else if (tag === 'VX') functions.push('AUXILIARY_VERB');
    else if (['JKS', 'JKC', 'JKG', 'JKO', 'JKB', 'JX', 'JC'].includes(tag)) functions.push('JOSA');
    else if (['EF', 'EC', 'EP', 'ETN', 'ETM'].includes(tag)) {
      functions.push(tag === 'ETM' || tag === 'ETN' ? 'MODIFIER' : 'ENDING');
    } else if (['VV', 'VA', 'VCP', 'VCN'].includes(tag)) {
      functions.push('LEXICAL_VERB');
    } else if (tag === 'MAG') {
      functions.push(['안', '못'].includes(surface) ? 'NEGATIVE_ADVERB' : 'ADVERB');
    }
  }

  return [...new Set(functions)];
}

function normalizeTokens(input, rawTokens) {
  let cursor = 0;

  return rawTokens.map(node => {
    const surface = String(node.surface ?? node.surface_form ?? '');
    const pos = Array.isArray(node.pos) ? node.pos.join('+') : (node.pos ?? null);
    const functions = normalizePos(node.pos, surface);

    // kuromoji-ko의 word_position은 1-indexed이지만,
    // 규칙 엔진에서는 원문 기준 0-indexed offset이 필요하다.
    // 표면형을 현재 cursor 이후에서 직접 찾으면 공백/반복 어절에서도
    // 실제 입력 문자열과 동일한 위치를 보장할 수 있다.
    const locatedStart = surface
      ? input.indexOf(surface, cursor)
      : -1;

    const start = locatedStart >= 0
      ? locatedStart
      : (Number.isInteger(node.start)
        ? node.start
        : (Number.isInteger(node.word_position) ? node.word_position - 1 : null));
    const end = start >= 0 ? start + surface.length : null;

    if (end !== null) cursor = end;

    return {
      text: surface,
      normalized: surface,
      lemma: node.lemma ?? null,
      pos,
      morphemes: [{ text: surface, pos }],
      features: {
        reading: node.reading ?? node.pronunciation ?? null,
        grammar_function: functions[0] ?? null,
        grammar_functions: functions
      },
      start: start >= 0 ? start : null,
      end,
      confidence: 1
    };
  });
}

export async function analyze(text) {
  const adapter = {
    async analyze(input) {
      const tokenizer = await getTokenizer();
      const rawTokens = tokenizer.parse(input);

      return {
        text: input,
        tokens: normalizeTokens(input, rawTokens),
        candidates: [],
        metadata: {
          analyzer: 'kuromoji-ko',
          version: '1.0.8'
        }
      };
    }
  };

  assertMorphologyAdapter(adapter);
  const result = await adapter.analyze(text);
  validateMorphologyResult(result);
  return result;
}
