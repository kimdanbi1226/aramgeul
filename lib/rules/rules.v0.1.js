/**
 * 아람글 규칙 데이터 v0.1
 *
 * 규칙은 문자열 치환표가 아니라 형태소 기능과 문맥 조건을 기준으로 정의한다.
 */

const NIKL_RULEBOOK_URL = 'https://www.korean.go.kr/kornorms/m/m_regltn.do';
const NIKL_RULE_041_URL = NIKL_RULEBOOK_URL;
const NIKL_RULE_042_URL = 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=309202';
const NIKL_RULE_043_URL = 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=314750';
const NIKL_RULE_044_URL = 'https://www.korean.go.kr/kornorms/m/m_regltn.do';
const NIKL_RULE_047_URL = 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=334645';
const NIKL_NEGATIVE_URL = 'https://korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=27&qna_seq=331685';

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
    source_url: NIKL_RULEBOOK_URL,
    source_detail_url: NIKL_RULE_042_URL,
    source_detail_label: '국립국어원 온라인가나다 사례: ‘할 수’ 띄어쓰기',
    source_reference: '한글 맞춤법 제42항',
    source_version: null,
    priority: 1,
    confidence: 'high',
    notes: '만큼, 뿐, 데, 시, 수 등은 문법 기능에 따라 별도 판단이 필요하다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-043-UNIT-NOUN',
    category: 'spacing',
    title: '단위 명사 띄어쓰기',
    description: '단위를 나타내는 명사는 앞말과 띄어 쓰는 것을 원칙으로 하며, 숫자와 어울리는 경우 등 제43항에서 허용하는 붙여 쓰기는 별도로 보존한다.',
    decision_type: 'CORRECTION',
    conditions: ['target has DEPENDENT_NOUN function', 'target is used as a unit noun', 'target is not an allowed numeral + unit form'],
    exceptions: ['Numeral + unit noun may be written without a space when Article 43 allows it'],
    examples: [
      { input: '한개', expected: '한 개' },
      { input: '세마리', expected: '세 마리' }
    ],
    allowed_examples: [
      { input: '10개', preferred: '10 개', allowed: '10개' },
      { input: '20그램', preferred: '20 그램', allowed: '20그램' },
      { input: '두시간', preferred: '두 시간', allowed: '두시간' },
      { input: '삼학년', preferred: '삼 학년', allowed: '삼학년' }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_RULEBOOK_URL,
    source_detail_url: NIKL_RULE_043_URL,
    source_detail_label: '국립국어원 온라인가나다 사례: 단위 명사 띄어쓰기',
    source_reference: '한글 맞춤법 제43항',
    source_version: null,
    priority: 1,
    confidence: 'high',
    notes: '숫자와 단위 명사가 결합한 경우 제43항에서 붙여쓰기가 허용될 수 있으므로 자동 교정하지 않는다. 숫자는 아라비아 숫자와 고유어 수를 포함한다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-044-NUMBER-GROUPING',
    category: 'spacing',
    title: '수의 만 단위 띄어쓰기',
    description: '수를 적을 때 만(萬) 단위로 구획하여 띄어 쓴다. 만·억·조·경·해·자와 같은 큰 단위 뒤에서 다음 수 단위가 이어질 때 구획을 나눈다.',
    decision_type: 'CORRECTION',
    conditions: ['target is a Korean number expression', 'number groups cross a man-based large-number unit', 'the expression is not a monetary notation convention'],
    exceptions: ['pure Arabic-digit strings without Korean number units are outside this rule', 'monetary notation may follow a conventional no-space form'],
    examples: [
      { input: '12억3456만7898', expected: '12억 3456만 7898' },
      { input: '십이억삼천사백오십육만칠천팔백구십팔', expected: '십이억 삼천사백오십육만 칠천팔백구십팔' },
      { input: '12 억 3456 만 7898', expected: '12억 3456만 7898' }
    ],
    allowed_examples: [],
    deferred_examples: [
      { input: '일금 삼십일만오천육백칠십팔원정', reason: '금액 표기 관례' }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_RULE_044_URL,
    source_detail_url: NIKL_RULE_044_URL,
    source_detail_label: '한국어 어문 규범: 한글 맞춤법 제44항',
    source_reference: '한글 맞춤법 제44항',
    source_version: '2017-03-28 시행 규정',
    priority: 1,
    confidence: 'high',
    notes: '제44항은 만 단위로 수를 구획한다. 국립국어원 규범 예시는 12억 3456만 7898이며, 해설에서는 만·억·조·경·해·자 등의 단위를 예로 든다. 아라비아 숫자만으로 이루어진 10000000 같은 표기는 이 규칙으로 임의 변경하지 않는다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-045-CONNECTIVE-ENUMERATION',
    category: 'spacing',
    title: '이어 주거나 열거하는 말 띄어쓰기',
    description: '두 말을 이어 주거나 열거할 때 쓰이는 겸, 내지, 대, 및, 등, 등등, 등속, 등지 등은 앞뒤 말과 띄어 쓴다.',
    decision_type: 'CORRECTION',
    conditions: ['target is a connective or enumeration word covered by Article 45', 'target is used as an independent word between two phrases or items'],
    exceptions: ['dictionary-established compounds or lexicalized forms require separate lexical judgment'],
    examples: [
      { input: '국장겸과장', expected: '국장 겸 과장' },
      { input: '청군대백군', expected: '청군 대 백군' },
      { input: '이사장및이사들', expected: '이사장 및 이사들' }
    ],
    allowed_examples: [],
    deferred_examples: [
      { input: '일대일', candidates: ['일대일'] }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_RULEBOOK_URL,
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=303321',
    source_detail_label: '국립국어원 온라인가나다 사례: 제45항 ‘대’ 띄어쓰기',
    source_reference: '한글 맞춤법 제45항',
    source_version: null,
    priority: 1,
    confidence: 'high',
    notes: '‘일대일’처럼 사전에 등재된 하나의 명사는 문자열만으로 교정하지 않는다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-046-MONOSYLLABLE-ALLOWANCE',
    category: 'spacing',
    title: '단음절어 연속 붙여쓰기 허용',
    description: '단음절로 된 단어가 연이어 나타나는 경우에는 일부를 붙여 쓸 수 있다.',
    decision_type: 'VALID',
    conditions: ['consecutive words are monosyllabic', 'construction falls within Article 46 allowance'],
    exceptions: ['not every adjacent monosyllabic sequence may be attached', 'a following particle can prevent the relevant allowance'],
    examples: [],
    allowed_examples: [
      { input: '좀더 큰 이 새차', preferred: '좀 더 큰 이 새 차', allowed: '좀더 큰 이 새차' },
      { input: '내것 네것', preferred: '내 것 네 것', allowed: '내것 네것' },
      { input: '물 한병', preferred: '물 한 병', allowed: '물 한병' },
      { input: '한명 한명', preferred: '한 명 한 명', allowed: '한명 한명' }
    ],
    deferred_examples: [
      { input: '물한병', candidates: ['물 한 병'] },
      { input: '김모 씨', candidates: ['김 모 씨', '김모 씨'] }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_RULEBOOK_URL,
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=324658',
    source_detail_label: '국립국어원 온라인가나다 사례: 제46항 적용 범위',
    source_reference: '한글 맞춤법 제46항',
    source_version: null,
    priority: 2,
    confidence: 'high',
    notes: '허용되는 붙여쓰기는 기본 맞춤법 검사에서 오류로 처리하거나 강제로 띄어쓰기로 교정하지 않는다. 문서 유형별 원칙 표기는 별도 register 레이어에서 처리한다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-047-AUXILIARY-VERB',
    category: 'spacing',
    title: '보조 용언 띄어쓰기',
    description: '보조 용언은 앞말과 띄어 쓰는 것을 원칙으로 하되, 제47항에서 허용하는 붙여 쓰기와 예외를 별도로 판정한다.',
    decision_type: 'CORRECTION',
    conditions: ['target has AUXILIARY_VERB function', 'target follows a lexical predicate'],
    exceptions: [],
    examples: [
      { input: '생각해보자', expected: '생각해 보자' },
      { input: '공부해보아라', expected: '공부해 보아라' }
    ],
    allowed_examples: [
      { input: '먹어보았다', preferred: '먹어 보았다', allowed: '먹어보았다' }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_RULEBOOK_URL,
    source_detail_url: NIKL_RULE_047_URL,
    source_detail_label: '국립국어원 온라인가나다 사례: ‘생각해 보다’ 띄어쓰기',
    source_reference: '한글 맞춤법 제47항',
    source_version: null,
    priority: 1,
    confidence: 'medium',
    notes: '제47항은 붙여 쓰기를 허용하는 경우가 있으므로 원칙형을 일률적으로 오류 처리하지 않는다. 현재 엔진은 최신 국립국어원 온라인가나다에서 본용언이 합성·파생어이고 활용형이 3음절 이상인 경우 등 붙여 쓰기가 허용되지 않는 것으로 확인된 사례만 교정한다. 규정 본문과 해설 사이에 불일치가 확인된 사례(예: 깨뜨리다)는 최신 해설·온라인가나다 설명을 우선 근거로 삼고, 그 근거가 불명확한 경우 자동 교정을 보류한다.',
    updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-048-NAME-APPELLATION',
    category: 'spacing',
    title: '성명·호칭어 띄어쓰기',
    description: '성과 이름, 성과 호 등에 덧붙는 호칭어·관직명 등의 띄어쓰기는 성명 구조와 단음절어 허용 여부를 함께 판단해야 한다.',
    decision_type: 'AMBIGUOUS',
    conditions: ['name or appellation structure is identified', 'the spacing decision depends on name/appellation and Article 46 context'],
    exceptions: ['Article 46 may allow attachment in some consecutive monosyllabic constructions'],
    examples: [],
    allowed_examples: [
      { input: '김모 씨', preferred: '김 모 씨', allowed: '김모 씨' }
    ],
    deferred_examples: [
      { input: '김모 씨', candidates: ['김 모 씨', '김모 씨'] }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_RULEBOOK_URL,
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=323810',
    source_detail_label: '국립국어원 온라인가나다: 한글맞춤법 제48항 적용 여부',
    source_reference: '한글 맞춤법 제48항 및 제46항',
    source_version: null,
    priority: 2,
    confidence: 'high',
    notes: '김 모 씨가 원칙형이며, 뒤에 조사가 붙지 않는 등 제46항 조건에 해당하면 김모 씨도 허용될 수 있다. 현재 엔진은 성명·호칭 구조를 식별하는 어휘 계층이 없으므로 자동 교정하지 않는다.',
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
    examples: [],
    deferred_examples: [
      { input: '안돼요', candidates: ['안 돼요', '안돼요'] },
      { input: '안되나요', candidates: ['안 되나요', '안되나요'] }
    ],
    source_type: 'norm',
    source_name: '국립국어원',
    source_url: NIKL_RULEBOOK_URL,
    source_detail_url: NIKL_NEGATIVE_URL,
    source_detail_label: '국립국어원 온라인가나다: 안/되다 관련 띄어쓰기',
    source_reference: '한글 맞춤법 관련 띄어쓰기 규정',
    source_version: null,
    priority: 1,
    confidence: 'medium',
    notes: '안/못은 의미와 문맥에 따라 띄어쓰기와 붙여쓰기가 달라질 수 있으므로 현재 엔진에서는 자동 교정하지 않는다. 의미·문맥 판정 계층을 구현한 뒤 적용한다.',
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
    source_url: NIKL_RULEBOOK_URL,
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=306003',
    source_detail_label: '국립국어원 온라인가나다 사례: ‘만큼’ 조사·의존 명사 구분',
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
    source_detail_url: rule.source_detail_url ?? null,
    source_detail_label: rule.source_detail_label ?? null,
    source_reference: rule.source_reference,
    confidence: rule.confidence,
    notes: rule.notes,
    updated_at: rule.updated_at
  };
}
