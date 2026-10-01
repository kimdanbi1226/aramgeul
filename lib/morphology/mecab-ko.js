import init, { Mecab, Tagger } from 'mecab-ko-wasm';
import { assertMorphologyAdapter, validateMorphologyResult } from './adapter.js';

let taggerPromise;

async function getTagger() {
  if (!taggerPromise) {
    taggerPromise = (async () => {
      await init();
      const Analyzer = Mecab ?? Tagger;
      if (!Analyzer) {
        throw new Error('MeCab-Ko WASM 분석기 생성자를 찾을 수 없습니다.');
      }
      return new Analyzer();
    })();
  }
  return taggerPromise;
}

function normalizePos(pos) {
  const map = {
    NNB: 'DEPENDENT_NOUN',
    VX: 'AUXILIARY_VERB',
    MAG: 'ADVERB',
    JX: 'JOSA',
    JKS: 'JOSA',
    JKB: 'JOSA',
    JKG: 'JOSA',
    EF: 'ENDING',
    EC: 'ENDING',
    ETM: 'MODIFIER',
    VV: 'LEXICAL_VERB',
    VA: 'LEXICAL_VERB',
    VCP: 'LEXICAL_VERB',
    VCN: 'LEXICAL_VERB'
  };
  return map[pos] ?? pos ?? null;
}

function parseFeature(feature) {
  if (!feature) return {};
  const values = String(feature).split(',');
  return {
    raw: feature,
    semantic: values[0] ?? null,
    reading: values[3] ?? null
  };
}

export async function analyze(text) {
  const adapter = {
    async analyze(input) {
      const tagger = await getTagger();
      const nodes = typeof tagger.parseToNodes === 'function'
        ? tagger.parseToNodes(input)
        : [];

      const tokens = nodes
        .filter(node => node && node.surface && node.surface !== 'EOS')
        .map(node => {
          const pos = node.pos ?? null;
          const start = Number.isInteger(node.start)
            ? node.start
            : Number.isInteger(node.begin)
              ? node.begin
              : null;
          const end = Number.isInteger(node.end)
            ? node.end
            : start === null
              ? null
              : start + String(node.surface).length;

          return {
            text: String(node.surface),
            normalized: String(node.surface),
            lemma: node.lemma ?? null,
            pos,
            morphemes: [{ text: String(node.surface), pos }],
            features: {
              ...parseFeature(node.feature),
              grammar_function: normalizePos(pos)
            },
            start,
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
