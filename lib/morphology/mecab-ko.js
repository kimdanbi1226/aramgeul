import * as MeCabModule from 'mecab-ko-wasm';
import { assertMorphologyAdapter, validateMorphologyResult } from './adapter.js';

let taggerPromise;

async function getTagger() {
  if (!taggerPromise) {
    taggerPromise = (async () => {
      const init = MeCabModule.default;
      if (typeof init === 'function') await init();

      const Analyzer = MeCabModule.Mecab ?? MeCabModule.Tagger;
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
    JKO: 'JOSA',
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
    raw: String(feature),
    semantic: values[0] ?? null,
    reading: values[3] ?? null
  };
}

function parseNodes(tagger, input) {
  if (typeof tagger.parseToNodes === 'function') {
    return tagger.parseToNodes(input);
  }

  if (typeof tagger.tokenize === 'function') {
    return tagger.tokenize(input);
  }

  if (typeof tagger.parseToObject === 'function') {
    return tagger.parseToObject(input)?.nodes ?? [];
  }

  throw new Error('MeCab-Ko WASM에서 지원되는 노드 분석 API를 찾을 수 없습니다.');
}

export async function analyze(text) {
  const adapter = {
    async analyze(input) {
      const tagger = await getTagger();
      const nodes = parseNodes(tagger, input);

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
