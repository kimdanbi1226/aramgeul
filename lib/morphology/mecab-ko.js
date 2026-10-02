import * as MeCabModule from 'mecab-ko-wasm';
import { assertMorphologyAdapter, validateMorphologyResult } from './adapter.js';

let mecabPromise;

async function getMecab() {
  if (!mecabPromise) {
    mecabPromise = (async () => {
      if (typeof MeCabModule.default === 'function') await MeCabModule.default();
      const Analyzer = MeCabModule.Mecab ?? MeCabModule.Tagger;
      if (!Analyzer) throw new Error('MeCab-Ko WASM 분석기 생성자를 찾을 수 없습니다.');
      return new Analyzer();
    })();
  }
  return mecabPromise;
}

function normalizePos(pos, surface) {
  const tags = String(pos ?? '').split('+').filter(Boolean);
  const functions = [];

  for (const tag of tags) {
    if (tag === 'NNB') functions.push('DEPENDENT_NOUN');
    else if (tag === 'VX') functions.push('AUXILIARY_VERB');
    else if (['JKS', 'JKC', 'JKG', 'JKO', 'JKB', 'JX', 'JC'].includes(tag)) functions.push('JOSA');
    else if (['EF', 'EC', 'EP', 'ETN', 'ETM'].includes(tag)) functions.push(tag === 'ETM' || tag === 'ETN' ? 'MODIFIER' : 'ENDING');
    else if (['VV', 'VA', 'VCP', 'VCN'].includes(tag)) functions.push('LEXICAL_VERB');
    else if (tag === 'MAG') functions.push(['안', '못'].includes(surface) ? 'NEGATIVE_ADVERB' : 'ADVERB');
  }

  return [...new Set(functions)];
}

export async function analyze(text) {
  const adapter = {
    async analyze(input) {
      const tagger = await getMecab();
      const rawTokens = typeof tagger.tokenize === 'function'
        ? tagger.tokenize(input)
        : tagger.parseToNodes(input);

      let cursor = 0;
      const tokens = rawTokens.map(node => {
        const surface = String(node.surface);
        const functions = normalizePos(node.pos, surface);
        const explicitStart = Number.isInteger(node.start) ? node.start : null;
        const explicitEnd = Number.isInteger(node.end) ? node.end : null;
        const start = explicitStart ?? input.indexOf(surface, cursor);
        const end = explicitEnd ?? (start >= 0 ? start + surface.length : null);

        if (end !== null && end >= 0) cursor = end;

        return {
          text: surface,
          normalized: surface,
          lemma: node.lemma ?? null,
          pos: node.pos ?? null,
          morphemes: [{ text: surface, pos: node.pos ?? null }],
          features: {
            reading: node.reading ?? null,
            grammar_function: functions[0] ?? null,
            grammar_functions: functions
          },
          start: start >= 0 ? start : null,
          end,
          confidence: 1
        };
      });

      return {
        text: input,
        tokens,
        candidates: [],
        metadata: {
          analyzer: 'mecab-ko-wasm',
          version: '0.7.0'
        }
      };
    }
  };

  assertMorphologyAdapter(adapter);
  const result = await adapter.analyze(text);
  validateMorphologyResult(result);
  return result;
}
