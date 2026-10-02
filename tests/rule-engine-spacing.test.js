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
  // 형태소 분석 결과가 불완전해도 공식 근거가 등록된 '생각해 보다'를
  // 원문 패턴 fallback으로 검출하는지 확인한다.
  const text = '나는 생각해보았다';
  const result = evaluateSpacing(analyze(text, [
    token('나는', 0, 2, ['NOUN'], 'NP'),
    token('생각해보았다', 3, 9, [], 'NA')
  ]));
  assert.equal(result.revised, '나는 생각해 보았다');
  assert.equal(result.edits.length, 1);
  assert.equal(result.edits[0].rule_id, 'SPACING-047-AUXILIARY-VERB');
}

{
  const text = '한개';
  const result = evaluateSpacing(analyze(text, [
    token('한', 0, 1, ['NUMBER'], 'NR'),
    token('개', 1, 2, ['DEPENDENT_NOUN'], 'NNB')
  ]));
  assert.equal(result.revised, '한 개');
  assert.equal(result.edits.length, 1);
  assert.equal(result.edits[0].rule_id, 'SPACING-043-UNIT-NOUN');
}

{
  // 아라비아 숫자 + 단위 명사는 붙여 쓰기도 허용되므로 자동 교정하지 않는다.
  const text = '10개';
  const result = evaluateSpacing(analyze(text, [
    token('10', 0, 2, ['NUMBER'], 'SN'),
    token('개', 2, 3, ['DEPENDENT_NOUN'], 'NNB')
  ]));
  assert.equal(result.revised, text);
  assert.equal(result.decision, 'VALID');
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


{
  const text = '국장겸과장';
  const result = evaluateSpacing(analyze(text, [
    token('국장', 0, 2, ['NOUN'], 'NNG'),
    token('겸', 2, 3, ['DEPENDENT_NOUN'], 'NNB'),
    token('과장', 3, 5, ['NOUN'], 'NNG')
  ]));
  assert.equal(result.revised, '국장 겸 과장');
  assert.equal(result.edits.length, 2);
  assert.equal(result.edits.every(edit => edit.rule_id === 'SPACING-045-CONNECTIVE-ENUMERATION'), true);
}

{
  const text = '청군대백군';
  const result = evaluateSpacing(analyze(text, [
    token('청군', 0, 2, ['NOUN'], 'NNG'),
    token('대', 2, 3, ['DEPENDENT_NOUN'], 'NNB'),
    token('백군', 3, 5, ['NOUN'], 'NNG')
  ]));
  assert.equal(result.revised, '청군 대 백군');
  assert.equal(result.edits.length, 2);
  assert.equal(result.edits.every(edit => edit.rule_id === 'SPACING-045-CONNECTIVE-ENUMERATION'), true);
}

{
  // 제46항에서 허용하는 붙여쓰기는 기본 검사에서 오류로 취급하지 않는다.
  const text = '좀더';
  const rule = (await import('../lib/rules/rules.v0.1.js')).getRuleById('SPACING-046-MONOSYLLABLE-ALLOWANCE');
  assert.equal(rule.decision_type, 'VALID');
  assert.equal(rule.allowed_examples.some(example => example.input === text && example.allowed === text), true);
}

console.log('Rule engine spacing tests: PASS');
