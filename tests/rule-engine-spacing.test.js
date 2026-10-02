import assert from 'node:assert/strict';
import { evaluateSpacing } from '../lib/rules/engine.js';

function token(text, start, end, functions, pos = 'VV', lemma = null) {
  return {
    text,
    normalized: text,
    lemma,
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
    token('할', 0, 1, ['MODIFIER'], 'ETM'),
    token('수', 1, 2, ['DEPENDENT_NOUN'], 'NNB'),
    token('있', 2, 3, ['LEXICAL_VERB']),
    token('다', 3, 4, ['ENDING'], 'EF')
  ]));
  assert.equal(result.revised, '할 수 있다');
  assert.equal(result.edits.length, 2);
  assert.equal(result.edits[0].rule_id, 'SPACING-042-DEPENDENT-NOUN');
}

{
  const text = '생각해보자';
  const result = evaluateSpacing(analyze(text, [
    token('생각해', 0, 3, ['LEXICAL_VERB'], 'VV', '생각하다'),
    token('보', 3, 4, ['AUXILIARY_VERB'], 'VX'),
    token('자', 4, 5, ['ENDING'], 'EF')
  ]));
  assert.equal(result.revised, '생각해 보자');
  assert.equal(result.edits.length, 1);
  assert.equal(result.edits[0].rule_id, 'SPACING-047-AUXILIARY-VERB');
}

{
  // 실제 형태소 분석기가 파생어 '생각하다'를
  // 생각/NNG + 하/XSV + 어/EC + 보/VX처럼 분해하는 경우를 검증한다.
  const text = '생각해보았다';
  const result = evaluateSpacing(analyze(text, [
    token('생각', 0, 2, [], 'NNG', '생각'),
    token('하', 2, 3, ['LEXICAL_VERB'], 'XSV', '하다'),
    token('어', 3, 4, ['ENDING'], 'EC'),
    token('보', 4, 5, ['AUXILIARY_VERB'], 'VX', '보다'),
    token('았다', 5, 7, ['ENDING'], 'EP')
  ]));
  assert.equal(result.revised, '생각해 보았다');
  assert.equal(result.edits.length, 1);
  assert.equal(result.edits[0].rule_id, 'SPACING-047-AUXILIARY-VERB');
}

{
  const text = '먹어보았다';
  const result = evaluateSpacing(analyze(text, [
    token('먹어', 0, 2, ['LEXICAL_VERB'], 'VV', '먹다'),
    token('보', 2, 3, ['AUXILIARY_VERB'], 'VX', '보다'),
    token('았다', 3, 5, ['ENDING'], 'EP')
  ]));
  assert.equal(result.revised, text);
  assert.equal(result.decision, 'VALID');
}

{
  const text = '공부해보아라';
  const result = evaluateSpacing(analyze(text, [
    token('공부해', 0, 3, ['LEXICAL_VERB'], 'VV', '공부하다'),
    token('보', 3, 4, ['AUXILIARY_VERB'], 'VX', '보다'),
    token('아라', 4, 6, ['ENDING'], 'EF')
  ]));
  assert.equal(result.revised, '공부해 보아라');
  assert.equal(result.edits.length, 1);
  assert.equal(result.edits[0].rule_id, 'SPACING-047-AUXILIARY-VERB');
}

{
  // '안돼요/안 돼요'는 의미와 문맥에 따라 달라질 수 있으므로
  // 현재 규칙 엔진은 자동 교정하지 않는다.
  const text = '안돼요';
  const result = evaluateSpacing(analyze(text, [
    token('안', 0, 1, ['NEGATIVE_ADVERB'], 'MAG'),
    token('돼요', 1, 3, ['LEXICAL_VERB'], 'VA')
  ]));
  assert.equal(result.revised, text);
  assert.equal(result.decision, 'VALID');
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
