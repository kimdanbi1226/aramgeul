import { Mecab } from '@mecab-ko/node';
import { assertMorphologyAdapter, validateMorphologyResult } from './adapter.js';

let mecab;

function getMecab() {
  if (!mecab) mecab = new Mecab();
  return mecab;
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

export function analyze(text) {
  const adapter = {
    analyze(input) {
      const tokens = getMecab().tokenize(input).map(node => {
        const functions = normalizePos(node.pos, node.surface);
        return {
          text: String(node.surface),
          normalized: String(node.surface),
          lemma: node.lemma ?? null,
          pos: node.pos ?? null,
          morphemes: [{ text: String(node.surface), pos: node.pos ?? null }],
          features: {
            reading: node.reading ?? null,
            grammar_function: functions[0] ?? null,
            grammar_functions: functions
          },
          start: Number.isInteger(node.start) ? node.start : null,
          end: Number.isInteger(node.end) ? node.end : null,
          confidence: 1
        };
      });

      return {
        text: input,
        tokens,
        candidates: [],
        metadata: {
          analyzer: 'mecab-ko-node',
          version: '0.7.0'
        }
      };
    }
  };

  assertMorphologyAdapter(adapter);
  const result = adapter.analyze(text);
  validateMorphologyResult(result);
  return result;
}
