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

// 제43항: 고유어 수관형사 + 단위 명사는 공식 답변 간 해석 차이가 있어 자동 교정하지 않는다.
assertValid(
  '한개',
  [
    token('한', 0, 1, ['NUMBER'], 'MM'),
    token('개', 1, 2, ['DEPENDENT_NOUN'], 'NNB')
  ]
);

// 제43항: 명확한 허용 붙여쓰기
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
const rule43 = getRuleById('SPACING-043-UNIT-NOUN');
assert.equal(rule43.deferred_examples.some(example => example.input === '한개'), true);
assert.equal(rule43.deferred_examples.some(example => example.input === '두시간'), true);

// 제44항: 수를 만 단위로 구획한다.
assertCorrection(
  '12억3456만7898',
  [
    token('12', 0, 2, ['NUMBER'], 'SN'),
    token('억', 2, 3, ['NUMBER_UNIT'], 'NNB'),
    token('3456', 3, 7, ['NUMBER'], 'SN'),
    token('만', 7, 8, ['NUMBER_UNIT'], 'NNB'),
    token('7898', 8, 12, ['NUMBER'], 'SN')
  ],
  '12억 3456만 7898',
  'SPACING-044-NUMBER-GROUPING'
);

assertCorrection(
  '12 억 3456 만 7898',
  [
    token('12', 0, 2, ['NUMBER'], 'SN'),
    token('억', 3, 4, ['NUMBER_UNIT'], 'NNB'),
    token('3456', 5, 9, ['NUMBER'], 'SN'),
    token('만', 10, 11, ['NUMBER_UNIT'], 'NNB'),
    token('7898', 12, 16, ['NUMBER'], 'SN')
  ],
  '12억 3456만 7898',
  'SPACING-044-NUMBER-GROUPING'
);

assertValid(
  '12억 3456만 7898',
  [
    token('12', 0, 2, ['NUMBER'], 'SN'),
    token('억', 2, 3, ['NUMBER_UNIT'], 'NNB'),
    token('3456', 4, 8, ['NUMBER'], 'SN'),
    token('만', 8, 9, ['NUMBER_UNIT'], 'NNB'),
    token('7898', 10, 14, ['NUMBER'], 'SN')
  ]
);


// 사전 등재 단어가 의존 명사 형태소로 분해되어도 일반 규칙으로 잘못 띄우지 않는다.
for (const [text, left, right] of [
  ['그동안', '그', '동안'],
  ['그사이', '그', '사이'],
  ['이때', '이', '때'],
  ['그때', '그', '때'],
  ['저때', '저', '때'],
  ['이만큼', '이', '만큼'],
  ['그만큼', '그', '만큼'],
  ['저만큼', '저', '만큼'],
  ['그따위', '그', '따위'],
  ['이따위', '이', '따위'],
  ['저따위', '저', '따위']
]) {
  assertValid(text, [
    token(left, 0, left.length, ['MODIFIER'], 'MM'),
    token(right, left.length, text.length, ['DEPENDENT_NOUN'], 'NNB')
  ]);
}

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

// 제47항: 최신 근거가 확인된 파생어 사례
assertCorrection(
  '깨뜨려버렸다',
  [
    token('깨뜨려', 0, 3, ['LEXICAL_VERB'], 'VV', '깨뜨리다'),
    token('버리', 3, 5, ['AUXILIARY_VERB'], 'VX', '버리다'),
    token('었다', 5, 7, ['ENDING'], 'EP')
  ],
  '깨뜨려 버렸다',
  'SPACING-047-AUXILIARY-VERB'
);

// 제47항: 2음절 활용형의 허용 붙여쓰기는 오류로 만들지 않는다.
for (const [text, lexical, aux, lemma] of [
  ['구해본다', '구해', '본다', '구하다'],
  ['더해줬다', '더해', '줬다', '더하다']
]) {
  const auxStart = lexical.length;
  assertValid(text, [
    token(lexical, 0, lexical.length, ['LEXICAL_VERB'], 'VV', lemma),
    token(aux, auxStart, text.length, ['AUXILIARY_VERB'], 'VX')
  ]);
}

// 제48항: 성명/호칭 구조는 실제 규칙 데이터에서도 자동 판정을 보류한다.
const rule48 = getRuleById('SPACING-048-NAME-APPELLATION');
assert.equal(rule48.decision_type, 'AMBIGUOUS');
assert.equal(rule48.deferred_examples.some(example => example.input === '김모 씨'), true);
assert.equal(rule48.examples.some(example => example.input === '김양수씨' && example.expected === '김양수 씨'), true);
assert.equal(rule48.examples.some(example => example.input === '충무공이순신장군' && example.expected === '충무공 이순신 장군'), true);

console.log('Spacing golden test set: PASS');


const rule49 = getRuleById('SPACING-049-PROPER-NOUN');
assert.equal(rule49.decision_type, 'AMBIGUOUS');
assert.equal(rule49.allowed_examples.some(example => example.input === '대한 중학교'), true);
assert.equal(rule49.allowed_examples.some(example => example.input === '한국 대학교 사범 대학'), true);

const rule50 = getRuleById('SPACING-050-TECHNICAL-TERM');
assert.equal(rule50.decision_type, 'AMBIGUOUS');
assert.equal(rule50.allowed_examples.some(example => example.input === '만성 골수성 백혈병'), true);
assert.equal(rule50.allowed_examples.some(example => example.input === '학교 폭력'), true);
assert.equal(rule50.deferred_examples.some(example => example.input === '결산 소득세'), true);


const rule51 = getRuleById('ORTHO-051-ADVERB-I-HI');
assert.equal(rule51.decision_type, 'CORRECTION');
assert.equal(rule51.examples.some(example => example.input === '깨끗히' && example.expected === '깨끗이'), true);
assert.equal(rule51.examples.some(example => example.input === '정확이' && example.expected === '정확히'), true);
assert.equal(rule51.allowed_examples.some(example => example.input === '솔직히'), true);

const rule52 = getRuleById('ORTHO-052-SINO-KOREAN-READING');
assert.equal(rule52.decision_type, 'CORRECTION');
assert.equal(rule52.examples.some(example => example.input === '승락' && example.expected === '승낙'), true);
assert.equal(rule52.examples.some(example => example.input === '의론' && example.expected === '의논'), true);
assert.equal(rule52.allowed_examples.some(example => example.input === '유월'), true);

const rule53 = getRuleById('ORTHO-053-ENDINGS-TENSE');
assert.equal(rule53.decision_type, 'CORRECTION');
assert.equal(rule53.examples.some(example => example.input === '할께' && example.expected === '할게'), true);
assert.equal(rule53.examples.some(example => example.input === '할찌라도' && example.expected === '할지라도'), true);
assert.equal(rule53.allowed_examples.some(example => example.input === '갈까'), true);
