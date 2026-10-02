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
    } else if (['VV', 'VA', 'VCP', 'VCN', 'XSV'].includes(tag)) {
      functions.push('LEXICAL_VERB');
    } else if (tag === 'MAG') {
      functions.push(['안', '못'].includes(surface) ? 'NEGATIVE_ADVERB' : 'ADVERB');
    }
  }

  return [...new Set(functions)];
}

function addGrammarFunction(token, functionName) {
  const functions = token.features.grammar_functions ?? [];
  if (!functions.includes(functionName)) {
    token.features.grammar_functions = [...functions, functionName];
  }
  if (!token.features.grammar_function) {
    token.features.grammar_function = functionName;
  }
}

function previousNonSpace(tokens, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (tokens[i].pos !== 'SP') return tokens[i];
  }
  return null;
}

function nextNonSpace(tokens, index) {
  for (let i = index + 1; i < tokens.length; i += 1) {
    if (tokens[i].pos !== 'SP') return tokens[i];
  }
  return null;
}

function previousLexicalVerb(tokens, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (tokens[i].pos === 'SF') return null;
    if (tokens[i].features.grammar_functions?.includes('LEXICAL_VERB')) {
      return tokens[i];
    }
  }
  return null;
}

function nextLexicalVerb(tokens, index) {
  for (let i = index + 1; i < tokens.length; i += 1) {
    if (tokens[i].pos === 'SF') return null;
    if (tokens[i].features.grammar_functions?.includes('LEXICAL_VERB')) {
      return tokens[i];
    }
  }
  return null;
}

function applyContextualGrammarFunctions(tokens) {
  tokens.forEach((token, index) => {
    const previous = previousNonSpace(tokens, index);
    const next = nextNonSpace(tokens, index);

    // kuromoji-ko는 문맥에 따라 의존 명사/조사 동형어를 한쪽으로
    // 기울여 태깅할 수 있으므로, 아람글의 띄어쓰기 판정에 필요한
    // 대표적인 문맥 조건을 보정한다.
    if (
      token.text === '만큼' &&
      previous?.features.grammar_functions?.includes('MODIFIER')
    ) {
      addGrammarFunction(token, 'DEPENDENT_NOUN');
    }

    if (
      token.text === '수' &&
      previous?.features.grammar_functions?.includes('MODIFIER')
    ) {
      addGrammarFunction(token, 'DEPENDENT_NOUN');
    }

    if (
      token.text === '시' &&
      previous &&
      ['NNG', 'NNP', 'NP', 'NR'].some(tag => previous.pos?.split('+').includes(tag)) &&
      nextLexicalVerb(tokens, index)?.features.grammar_functions?.includes('LEXICAL_VERB')
    ) {
      addGrammarFunction(token, 'DEPENDENT_NOUN');
    }

    // '생각해 보자', '살아 있는'처럼 앞선 용언 뒤에서 띄어 쓰이는
    // 보조용언은 kuromoji-ko가 VV/VA로 태깅하는 경우가 있다.
    if (
      token.lemma === '보다' &&
      previous?.features.grammar_functions?.includes('LEXICAL_VERB')
    ) {
      addGrammarFunction(token, 'AUXILIARY_VERB');
    }

    if (
      token.lemma === '있다' &&
      previousLexicalVerb(tokens, index)?.features.grammar_functions?.includes('LEXICAL_VERB') &&
      token.text !== '있다'
    ) {
      addGrammarFunction(token, 'AUXILIARY_VERB');
    }
  });

  return tokens;
}

function normalizeTokens(input, rawTokens) {
  let cursor = 0;

  const tokens = rawTokens.map(node => {
    const surface = String(node.surface ?? node.surface_form ?? '');
    const pos = Array.isArray(node.pos) ? node.pos.join('+') : (node.pos ?? null);
    const functions = normalizePos(node.pos, surface);

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

  return applyContextualGrammarFunctions(tokens);
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
