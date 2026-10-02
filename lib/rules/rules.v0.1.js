/**
 * 아람글 규칙 데이터 v0.1
 *
 * 규칙은 문자열 치환표가 아니라 형태소 기능과 문맥 조건을 기준으로 정의한다.
 */

const NIKL_KOREAN_URL = 'https://www.korean.go.kr/';

export const RULES_V01 = Object.freeze([
  {
    rule_id: 'SPACING-042-DEPENDENT-NOUN',
    category: 'spacing',
    title: '의존 명사 띄어쓰기',
    description: '관형사형 뒤의 의존 명사는 앞말과 띄어 쓴다.',
    decision_type: 'CORRECTION',
    conditions: ['target has DEPENDENT_NOUN function', 'target follows a modifier or a lexical predicate ending in a modifier'],
    exceptions: [],
    examples: [
      { input: '할수있다', expected: '할 수 있다' },
      { input: '할만큼', expected: '할 만큼' }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_KOREAN_URL,
    source_reference: '한글 맞춤법 제42항',
    source_version: null,
    priority: 1,
    confidence: 'high',
    notes: '만큼, 뿐, 데, 시, 수 등은 문법 기능에 따라 별도 판단이 필요하다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-047-AUXILIARY-VERB',
    category: 'spacing',
    title: '보조 용언 띄어쓰기',
    description: '보조 용언은 앞말과 띄어 쓰는 것을 기본으로 판정한다.',
    decision_type: 'CORRECTION',
    conditions: ['target has AUXILIARY_VERB function', 'target follows a lexical predicate'],
    exceptions: [],
    examples: [
      { input: '생각해보자', expected: '생각해 보자' },
      { input: '먹어보았다', expected: '먹어 보았다' }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_KOREAN_URL,
    source_reference: '한글 맞춤법 제47항',
    source_version: null,
    priority: 1,
    confidence: 'medium',
    notes: '보조 용언은 문맥에 따라 붙여 쓰기가 허용되는 경우가 있으므로 후속 예외 규칙이 필요하다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-NEGATIVE-ADVERB',
    category: 'spacing',
    title: '부정 부사 띄어쓰기',
    description: '부정 부사 안/못이 뒤의 용언과 결합한 표기가 아닌 문맥에서는 띄어 쓴다.',
    decision_type: 'CORRECTION',
    conditions: ['target has NEGATIVE_ADVERB function', 'target precedes a lexical predicate'],
    exceptions: [],
    examples: [
      { input: '안돼요', expected: '안 돼요' },
      { input: '안되나요', expected: '안 되나요' }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_KOREAN_URL,
    source_reference: '한글 맞춤법 관련 띄어쓰기 규정',
    source_version: null,
    priority: 1,
    confidence: 'medium',
    notes: '안되다/안 되다의 의미 차이를 고려하는 별도 어휘·문맥 규칙이 필요하다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-JOSA-ATTACH',
    category: 'spacing',
    title: '조사 붙여 쓰기',
    description: '조사는 앞말에 붙여 쓴다.',
    decision_type: 'CORRECTION',
    conditions: ['target has JOSA function'],
    exceptions: [],
    examples: [
      { input: '나 만큼', expected: '나만큼' },
      { input: '이것 뿐이다', expected: '이것뿐이다' }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_KOREAN_URL,
    source_reference: '한글 맞춤법 제41항',
    source_version: null,
    priority: 1,
    confidence: 'high',
    notes: '같은 표면형이 의존 명사로 쓰이는 경우에는 별도 문맥 판정이 우선한다.',
    updated_at: '2026-10-02'
  }
]);

export function getRuleById(ruleId) {
  return RULES_V01.find(rule => rule.rule_id === ruleId) ?? null;
}

export function findRuleForExample(input, revised) {
  for (const rule of RULES_V01) {
    const matched = rule.examples?.some(example =>
      example?.input === input && example?.expected === revised
    );
    if (matched) return rule;
  }
  return null;
}

export function toRuleEvidence(rule) {
  if (!rule) return null;

  return {
    rule_id: rule.rule_id,
    category: rule.category,
    title: rule.title,
    description: rule.description,
    source_type: rule.source_type,
    source_name: rule.source_name,
    source_url: rule.source_url,
    source_reference: rule.source_reference,
    confidence: rule.confidence,
    notes: rule.notes,
    updated_at: rule.updated_at
  };
}
