import assert from 'node:assert/strict';
import { evaluateSpacing } from '../lib/rules/engine.js';

function token(text, start, end, functions, pos = 'VV') {
  return {
    text,
    normalized: text,
    lemma: null,
    pos,
    morphemes: [{ text, pos }],
    features: {
      grammar_function: functions[0] ?? null,
      grammar_functions: functions
    },
    start,
    end,
    confidence: 1
  };
}

function analyze(text, tokens) {
  return { text, tokens, candidates: [], metadata: { analyzer: 'fixture' } };
}

{
  const text = '할수있다';
  const result = evaluateSpacing(analyze(text, [
    token('하', 0, 1, ['LEXICAL_VERB']),
    token('ᆯ', 1, 2, ['MODIFIER'], 'ETM'),
    token('수', 2, 3, ['DEPENDENT_NOUN'], 'NNB'),
    token('있', 3, 4, ['LEXICAL_VERB']),
    token('다', 4, 5, ['ENDING'], 'EF')
  ]));
  assert.equal(result.revised, '할 수있다');
  assert.equal(result.edits.length, 1);
  assert.equal(result.edits[0].rule_id, 'SPACING-042-DEPENDENT-NOUN');
}

{
  const text = '생각해보자';
  const result = evaluateSpacing(analyze(text, [
    token('해', 0, 2, ['LEXICAL_VERB']),
    token('보', 2, 3, ['AUXILIARY_VERB'], 'VX'),
    token('자', 3, 4, ['ENDING'], 'EF')
  ]));
  assert.equal(result.revised, '생각해 보자');
  assert.equal(result.edits.length, 1);
  assert.equal(result.edits[0].rule_id, 'SPACING-047-AUXILIARY-VERB');
}

{
  const text = '안돼요';
  const result = evaluateSpacing(analyze(text, [
    token('안', 0, 1, ['NEGATIVE_ADVERB'], 'MAG'),
    token('돼요', 1, 3, ['LEXICAL_VERB'], 'VA')
  ]));
  assert.equal(result.revised, '안 돼요');
  assert.equal(result.edits[0].rule_id, 'SPACING-NEGATIVE-ADVERB');
}

{
  const text = '안 되어요';
  const result = evaluateSpacing(analyze(text, [
    token('안', 0, 1, ['NEGATIVE_ADVERB'], 'MAG'),
    token('되', 2, 3, ['LEXICAL_VERB'], 'VV')
  ]));
  assert.equal(result.revised, text);
  assert.equal(result.decision, 'VALID');
}

{
  const text = '나만큼';
  const result = evaluateSpacing(analyze(text, [
    token('나', 0, 1, ['NOUN'], 'NP'),
    token('만큼', 1, 3, ['JOSA'], 'JX')
  ]));
  assert.equal(result.revised, text);
  assert.equal(result.decision, 'VALID');
}

{
  const text = '나 만큼';
  const result = evaluateSpacing(analyze(text, [
    token('나', 0, 1, ['NOUN'], 'NP'),
    token('만큼', 2, 4, ['JOSA'], 'JX')
  ]));
  assert.equal(result.revised, '나만큼');
  assert.equal(result.edits[0].rule_id, 'SPACING-JOSA-ATTACH');
}

console.log('Rule engine spacing tests: PASS');
