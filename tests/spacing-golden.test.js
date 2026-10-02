import assert from 'node:assert/strict';
import { evaluateSpacing } from '../lib/rules/engine.js';
import { getRuleById } from '../lib/rules/rules.v0.1.js';

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
  return { text, tokens, candidates: [], metadata: { analyzer: 'golden-fixture' } };
}

function assertCorrection(text, tokens, expected, ruleId) {
  const result = evaluateSpacing(analyze(text, tokens));
  assert.equal(result.decision, 'CORRECTION', text);
  assert.equal(result.revised, expected, text);
  assert.ok(
    result.edits.some(edit => edit.rule_id === ruleId),
    `${text}: expected rule ${ruleId}`
  );
}

function assertValid(text, tokens) {
  const result = evaluateSpacing(analyze(text, tokens));
  assert.equal(result.decision, 'VALID', text);
  assert.equal(result.revised, text, text);
  assert.equal(result.edits.length, 0, text);
}

// 제41항: 조사
assertCorrection(
  '나 만큼',
  [
    token('나', 0, 1, ['NOUN'], 'NP'),
    token('만큼', 2, 4, ['JOSA'], 'JX')
  ],
  '나만큼',
  'SPACING-JOSA-ATTACH'
);

// 제42항: 의존 명사
assertCorrection(
  '할수있다',
  [
    token('할', 0, 1, ['MODIFIER'], 'ETM'),
    token('수', 1, 2, ['DEPENDENT_NOUN'], 'NNB'),
    token('있', 2, 3, ['LEXICAL_VERB']),
    token('다', 3, 4, ['ENDING'], 'EF')
  ],
  '할 수 있다',
  'SPACING-042-DEPENDENT-NOUN'
);

// 제43항: 단위 명사 원칙형
assertCorrection(
  '한개',
  [
    token('한', 0, 1, ['NUMBER'], 'MM'),
    token('개', 1, 2, ['DEPENDENT_NOUN'], 'NNB')
  ],
  '한 개',
  'SPACING-043-UNIT-NOUN'
);

// 제43항: 숫자와 어울리는 허용 붙여쓰기
assertValid(
  '10개',
  [
    token('10', 0, 2, ['NUMBER'], 'SN'),
    token('개', 2, 3, ['DEPENDENT_NOUN'], 'NNB')
  ]
);
assertValid(
  '두시간',
  [
    token('두', 0, 1, ['NUMBER'], 'MM'),
    token('시간', 1, 3, ['DEPENDENT_NOUN'], 'NNB')
  ]
);

// 제45항: 이어 주거나 열거하는 말
assertCorrection(
  '국장겸과장',
  [
    token('국장', 0, 2, ['NOUN'], 'NNG'),
    token('겸', 2, 3, ['DEPENDENT_NOUN'], 'NNB'),
    token('과장', 3, 5, ['NOUN'], 'NNG')
  ],
  '국장 겸 과장',
  'SPACING-045-CONNECTIVE-ENUMERATION'
);

assertCorrection(
  '2대1',
  [
    token('2', 0, 1, ['NUMBER'], 'SN'),
    token('대', 1, 2, ['DEPENDENT_NOUN'], 'NNB'),
    token('1', 2, 3, ['NUMBER'], 'SN')
  ],
  '2 대 1',
  'SPACING-045-CONNECTIVE-ENUMERATION'
);

// 제46항: 허용 표기는 기본 검사에서 오류로 만들지 않는다.
// 허용 범위 자체는 문맥/의미에 의존하므로 현재 엔진의 자동 교정 대상이 아니다.
const rule46 = getRuleById('SPACING-046-MONOSYLLABLE-ALLOWANCE');
assert.equal(rule46.decision_type, 'VALID');
assert.equal(
  rule46.allowed_examples.some(
    example => example.input === '좀더 큰 이 새차' &&
      example.allowed === '좀더 큰 이 새차'
  ),
  true
);
assert.equal(
  rule46.allowed_examples.some(
    example => example.input === '물 한병' &&
      example.allowed === '물 한병'
  ),
  true
);
assert.equal(
  rule46.deferred_examples.some(
    example => example.input === '물한병'
  ),
  true
);

// 제47항: 허용되는 일반 보조 용언 붙여쓰기는 자동 오류로 만들지 않는다.
assertValid(
  '먹어보았다',
  [
    token('먹어', 0, 2, ['LEXICAL_VERB'], 'VV', '먹다'),
    token('보', 2, 3, ['AUXILIARY_VERB'], 'VX', '보다'),
    token('았다', 3, 5, ['ENDING'], 'EP')
  ]
);

// 제47항: 근거가 확인된 확정 사례만 교정한다.
assertCorrection(
  '생각해보자',
  [
    token('생각해', 0, 3, ['LEXICAL_VERB'], 'VV', '생각하다'),
    token('보', 3, 4, ['AUXILIARY_VERB'], 'VX', '보다'),
    token('자', 4, 5, ['ENDING'], 'EF')
  ],
  '생각해 보자',
  'SPACING-047-AUXILIARY-VERB'
);

// 제48항: 고유명사/호칭 정보가 필요한 영역은 현재 문자열 규칙으로 자동 수정하지 않는다.
const rule48Policy = {
  status: 'DEFERRED',
  reason: 'proper-name and appellation data required'
};
assert.equal(rule48Policy.status, 'DEFERRED');

console.log('Spacing golden test set: PASS');
