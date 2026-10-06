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

function analyze(text, tokens = []) {
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
  // 형태소 분석기가 '할수있는' 전체를 하나의 표면형으로 반환해도
  // 등록된 표면형 fallback이 두 개의 띄어쓰기 경계를 복원해야 한다.
  const text = '오늘 할수있는 일을 먼저 확인했다.';
  const result = evaluateSpacing(analyze(text));
  assert.equal(result.revised, '오늘 할 수 있는 일을 먼저 확인했다.');
  assert.equal(
    result.edits.filter(edit => edit.rule_id === 'SPACING-042-DEPENDENT-NOUN').length,
    2
  );
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
  // 최신 근거가 확인된 파생어 사례: '깨뜨리다' + 보조 용언은 띄어 쓴다.
  const text = '깨뜨려버렸다';
  const result = evaluateSpacing(analyze(text, [
    token('깨뜨려', 0, 3, ['LEXICAL_VERB'], 'VV', '깨뜨리다'),
    token('버리', 3, 5, ['AUXILIARY_VERB'], 'VX', '버리다'),
    token('었다', 5, 7, ['ENDING'], 'EP')
  ]));
  assert.equal(result.revised, '깨뜨려 버렸다');
  assert.equal(result.edits.length, 1);
  assert.equal(result.edits[0].rule_id, 'SPACING-047-AUXILIARY-VERB');
}

{
  // 2음절 활용형은 붙여쓰기가 허용되는 사례이므로 자동 교정하지 않는다.
  for (const [text, lexical, aux, lemma] of [
    ['구해본다', '구해', '본다', '구하다'],
    ['더해줬다', '더해', '줬다', '더하다']
  ]) {
    const auxStart = lexical.length;
    const result = evaluateSpacing(analyze(text, [
      token(lexical, 0, lexical.length, ['LEXICAL_VERB'], 'VV', lemma),
      token(aux, auxStart, text.length, ['AUXILIARY_VERB'], 'VX')
    ]));
    assert.equal(result.revised, text);
    assert.equal(result.decision, 'VALID');
  }
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
  assert.equal(result.revised, text);
  assert.equal(result.decision, 'VALID');
}

{
  // 실사용 검사 프로필에서는 일반 수량 표현의 원칙형을 우선 제시한다.
  const text = '두시간';
  const result = evaluateSpacing(analyze(text, [
    token('두', 0, 1, ['NUMBER'], 'MM'),
    token('시간', 1, 3, ['DEPENDENT_NOUN'], 'NNB')
  ]));
  assert.equal(result.revised, '두 시간');
  assert.equal(result.decision, 'CORRECTION');
  assert.equal(result.edits.some(edit => edit.rule_id === 'SPACING-043-UNIT-NOUN'), true);
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
  const text = '나 만큼';
  const result = evaluateSpacing(analyze(text, [
    // 실제 형태소 분석기가 '만큼'을 의존 명사로 태깅하더라도
    // 문맥 보정에서 조사 후보가 추가되는 경우를 재현한다.
    token('나', 0, 1, ['NOUN'], 'NP'),
    token('만큼', 2, 4, ['DEPENDENT_NOUN'], 'NNB')
  ]));
  assert.equal(result.revised, '나만큼');
  assert.equal(result.edits.some(edit => edit.rule_id === 'SPACING-JOSA-ATTACH'), true);
}

{
  const text = '김양수씨가 말했다.';
  const result = evaluateSpacing(analyze(text, [
    token('김양수', 0, 3, ['NOUN'], 'NNP'),
    token('씨', 3, 4, ['DEPENDENT_NOUN'], 'NNB'),
    token('가', 4, 5, ['JOSA'], 'JKS'),
    token('말했다', 5, 8, ['LEXICAL_VERB'], 'VV', '말하다')
  ]));
  assert.equal(result.revised, '김양수 씨가 말했다.');
  assert.equal(result.edits.some(edit => edit.rule_id === 'SPACING-048-NAME-APPELLATION'), true);
}

{
  const text = '충무공이순신장군을 기렸다.';
  const result = evaluateSpacing(analyze(text, [
    token('충무공이순신장군', 0, 8, ['NOUN'], 'NNP'),
    token('을', 8, 9, ['JOSA'], 'JKO'),
    token('기렸다', 10, 13, ['LEXICAL_VERB'], 'VV', '기리다')
  ]));
  assert.equal(result.revised, '충무공 이순신 장군을 기렸다.');
  assert.equal(result.edits.some(edit => edit.rule_id === 'SPACING-048-NAME-APPELLATION'), true);
}

{
  const text = '학교폭력을 예방해야한다고 말했다.';
  const result = evaluateSpacing(analyze(text, [
    token('학교폭력', 0, 4, ['NOUN'], 'NNG'),
    token('을', 4, 5, ['JOSA'], 'JKO'),
    token('예방해야한다고', 6, 13, ['LEXICAL_VERB'], 'VV', '예방하다'),
    token('말했다', 14, 17, ['LEXICAL_VERB'], 'VV', '말하다')
  ]));
  assert.equal(result.revised, '학교 폭력을 예방해야 한다고 말했다.');
  assert.equal(result.edits.some(edit => edit.rule_id === 'SPACING-050-TECHNICAL-TERM'), true);
  assert.equal(result.edits.some(edit => edit.rule_id === 'SPACING-047-AUXILIARY-VERB'), true);
}

{
  const text = '나는 두시간 동안 공부해보았다.';
  const result = evaluateSpacing(analyze(text, [
    token('나는', 0, 2, ['NOUN'], 'NP'),
    token('두시간', 3, 6, ['NOUN'], 'NNG'),
    token('동안', 7, 9, ['NOUN'], 'NNG'),
    token('공부해보았다', 10, 16, [], 'NA')
  ]));
  assert.equal(result.revised, '나는 두 시간 동안 공부해 보았다.');
  assert.equal(result.edits.some(edit => edit.rule_id === 'SPACING-043-UNIT-NOUN'), true);
  assert.equal(result.edits.some(edit => edit.rule_id === 'SPACING-047-AUXILIARY-VERB'), true);
}

{
  const text = '승락을 받았다.';
  const result = evaluateSpacing(analyze(text, [
    token('승락', 0, 2, ['NOUN'], 'NNG'),
    token('을', 2, 3, ['JOSA'], 'JKO'),
    token('받았다', 4, 7, ['LEXICAL_VERB'], 'VV', '받다')
  ]));
  assert.equal(result.revised, '승낙을 받았다.');
  assert.equal(result.edits.some(edit => edit.rule_id === 'ORTHO-052-SINO-KOREAN-READING'), true);
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
  const text = '좀더 큰 이 새차';
  const rule = (await import('../lib/rules/rules.v0.1.js')).getRuleById('SPACING-046-MONOSYLLABLE-ALLOWANCE');
  assert.equal(rule.decision_type, 'VALID');
  assert.equal(rule.allowed_examples.some(example => example.input === text && example.allowed === text), true);
}

{
  // 사전 등재 단어가 형태소 분석기에서 관형사+의존 명사로 분해되어도 잘못 띄우지 않는다.
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
    const result = evaluateSpacing(analyze(text, [
      token(left, 0, left.length, ['MODIFIER'], 'MM'),
      token(right, left.length, text.length, ['DEPENDENT_NOUN'], 'NNB')
    ]));
    assert.equal(result.revised, text);
    assert.equal(result.decision, 'VALID');
  }
}

{
  const rule49 = getRuleById('SPACING-049-PROPER-NOUN');
  const rule50 = getRuleById('SPACING-050-TECHNICAL-TERM');
  assert.equal(rule49.decision_type, 'AMBIGUOUS');
  assert.equal(rule50.decision_type, 'AMBIGUOUS');

  // D 단계: 인명·기관명·전문 용어는 사전/개체 경계가 없는 상태에서
  // 무조건 교정하지 않고, 등록된 확정/허용 사례만 제한적으로 처리한다.
  assert.equal(evaluateSpacing(analyze('김모 씨가 말했다.')).revised, '김모 씨가 말했다.');
  assert.equal(evaluateSpacing(analyze('대한 중학교에 다닌다.')).revised, '대한 중학교에 다닌다.');
  assert.equal(evaluateSpacing(analyze('한국 대학교 사범 대학에 다닌다.')).revised, '한국 대학교 사범 대학에 다닌다.');
  assert.equal(evaluateSpacing(analyze('만성 골수성 백혈병을 연구한다.')).revised, '만성 골수성 백혈병을 연구한다.');
  assert.equal(evaluateSpacing(analyze('학교폭력을 예방한다.')).revised, '학교 폭력을 예방한다.');
  assert.equal(evaluateSpacing(analyze('결산 소득세를 확인한다.')).revised, '결산 소득세를 확인한다.');
}

{
  const rule51 = getRuleById('ORTHO-051-ADVERB-I-HI');
  assert.equal(rule51.decision_type, 'CORRECTION');
  assert.equal(evaluateSpacing(analyze('깨끗히')).revised, '깨끗이');
  assert.equal(evaluateSpacing(analyze('정확이')).revised, '정확히');
  assert.equal(evaluateSpacing(analyze('솔직히')).revised, '솔직히');
}

{
  const rule52 = getRuleById('ORTHO-052-SINO-KOREAN-READING');
  assert.equal(evaluateSpacing(analyze('승락')).revised, '승낙');
  assert.equal(evaluateSpacing(analyze('곤난')).revised, '곤란');
  assert.equal(evaluateSpacing(analyze('수락')).revised, '수락');
  assert.equal(rule52.decision_type, 'CORRECTION');
}

{
  const rule53 = getRuleById('ORTHO-053-ENDINGS-TENSE');
  assert.equal(evaluateSpacing(analyze('할께')).revised, '할게');
  assert.equal(evaluateSpacing(analyze('할꺼나')).revised, '할거나');
  assert.equal(evaluateSpacing(analyze('할찌라도')).revised, '할지라도');
  assert.equal(evaluateSpacing(analyze('할게')).revised, '할게');
  assert.equal(evaluateSpacing(analyze('갈까')).revised, '갈까');
  assert.equal(evaluateSpacing(analyze('합니까')).revised, '합니까');
  assert.equal(rule53.decision_type, 'CORRECTION');
}

{
  const rule54 = getRuleById('ORTHO-054-TENSE-SUFFIX');
  assert.equal(evaluateSpacing(analyze('나무군')).revised, '나무꾼');
  assert.equal(evaluateSpacing(analyze('심부름군')).revised, '심부름꾼');
  assert.equal(evaluateSpacing(analyze('빛갈')).revised, '빛깔');
  assert.equal(evaluateSpacing(analyze('귀대기')).revised, '귀때기');
  assert.equal(evaluateSpacing(analyze('나무꾼')).revised, '나무꾼');
  assert.equal(evaluateSpacing(analyze('뚝배기')).revised, '뚝배기');
  assert.equal(rule54.decision_type, 'CORRECTION');
}

{
  const rule55 = getRuleById('ORTHO-055-UNIFIED-FORMS');
  assert.equal(evaluateSpacing(analyze('마추다')).revised, '맞추다');
  assert.equal(evaluateSpacing(analyze('마춰')).revised, '맞춰');
  assert.equal(evaluateSpacing(analyze('뻐치다')).revised, '뻗치다');
  assert.equal(evaluateSpacing(analyze('뻐쳐')).revised, '뻗쳐');
  assert.equal(evaluateSpacing(analyze('맞추다')).revised, '맞추다');
  assert.equal(evaluateSpacing(analyze('맞히다')).revised, '맞히다');
  assert.equal(rule55.decision_type, 'CORRECTION');
}

{
  const rule56 = getRuleById('ORTHO-056-DEON-DEUN');
  assert.equal(evaluateSpacing(analyze('지난겨울은 몹시 춥드라.')).revised, '지난겨울은 몹시 춥더라.');
  assert.equal(evaluateSpacing(analyze('배던지 사과던지 마음대로 먹어라.')).revised, '배든지 사과든지 마음대로 먹어라.');
  assert.equal(evaluateSpacing(analyze('먹든지 말든지 마음대로 하렴.')).revised, '먹든지 말든지 마음대로 하렴.');
  assert.equal(evaluateSpacing(analyze('하든')).revised, '하든');
  assert.equal(evaluateSpacing(analyze('하던')).revised, '하던');
  assert.equal(rule56.decision_type, 'AMBIGUOUS');
}

{
  const rule57 = getRuleById('ORTHO-057-DISTINGUISHING-WORDS');
  assert.equal(evaluateSpacing(analyze('약속은 반듯이 지켜라.')).revised, '약속은 반드시 지켜라.');
  assert.equal(evaluateSpacing(analyze('약속은 반듯이 지켜라')).revised, '약속은 반드시 지켜라');
  assert.equal(evaluateSpacing(analyze('고무줄을 늘린다.')).revised, '고무줄을 늘인다.');
  assert.equal(evaluateSpacing(analyze('수출량을 더 늘인다.')).revised, '수출량을 더 늘린다.');
  assert.equal(evaluateSpacing(analyze('우표를 부친다.')).revised, '우표를 붙인다.');
  assert.equal(evaluateSpacing(analyze('우표를 부친다')).revised, '우표를 붙인다');
  assert.equal(evaluateSpacing(analyze('편지를 붙인다.')).revised, '편지를 부친다.');
  assert.equal(evaluateSpacing(analyze('편지를 붙인다')).revised, '편지를 부친다');
  assert.equal(evaluateSpacing(analyze('늘이다')).revised, '늘이다');
  assert.equal(evaluateSpacing(analyze('부치다')).revised, '부치다');
  assert.equal(evaluateSpacing(analyze('지난겨울은 몹시 춥드라')).revised, '지난겨울은 몹시 춥더라');
  assert.equal(rule57.decision_type, 'AMBIGUOUS');
}


{
  // E 단계: 복합 실사용 문장에서 서로 다른 규칙의 교정이 함께 유지되는지 확인한다.
  const cases = [
    ['나는 오늘 할수있는 일을 먼저 생각해보자고 말했다.', '나는 오늘 할 수 있는 일을 먼저 생각해 보자고 말했다.'],
    ['김양수씨는 학교폭력을 예방해야한다고 말했다.', '김양수 씨는 학교 폭력을 예방해야 한다고 말했다.'],
    ['약속은 반드시 지키고 편지도 부쳐야 한다.', '약속은 반드시 지키고 편지도 부쳐야 한다.'],
    ['그는 깨끗히 정리하고 정확이 확인했다.', '그는 깨끗이 정리하고 정확히 확인했다.'],
    ['나는 두시간 동안 공부해보았다.', '나는 두 시간 동안 공부해 보았다.'],
    ['12억3456만7898원의 계약을 체결했다.', '12억 3456만 7898원의 계약을 체결했다.']
  ];

  for (const [input, expected] of cases) {
    const result = evaluateSpacing(analyze(input));
    assert.equal(result.revised, expected, input);

    if (input === '12억3456만7898원의 계약을 체결했다.') {
      const spacingEdits = result.edits.filter(edit => edit.replacement === ' ');
      assert.equal(spacingEdits.length, 2, 'E06 must preserve both number-group spacing edits');
    }
  }
}

console.log('Rule engine spacing tests: PASS');
