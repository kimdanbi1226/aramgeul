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
    rule_id: 'SPACING-042-DEPENDENT-NOUN', category: 'spacing', title: '의존 명사 띄어쓰기',
    description: '관형사형 뒤의 의존 명사는 앞말과 띄어 쓴다.', decision_type: 'CORRECTION',
    conditions: ['target has DEPENDENT_NOUN function', 'target follows a modifier or a lexical predicate ending in a modifier'], exceptions: [],
    examples: [
      { input: '할수있다', expected: '할 수 있다' },
      { input: '할만큼', expected: '할 만큼' },
      { input: '나 만큼', expected: '나만큼' }
    ],
    lexicalized_surface_forms: ['그동안', '그사이', '이때', '그때', '저때', '이만큼', '그만큼', '저만큼', '그따위', '이따위', '저따위'],
    source_type: 'norm', source_name: '국립국어원', source_url: NIKL_RULEBOOK_URL, source_detail_url: NIKL_RULE_042_URL,
    source_detail_label: '국립국어원 온라인가나다 사례: ‘할 수’ 띄어쓰기', source_reference: '한글 맞춤법 제42항', source_version: null,
    priority: 1, confidence: 'high', notes: '만큼, 뿐, 데, 시, 수 등은 문법 기능에 따라 별도 판단이 필요하다.', updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-043-UNIT-NOUN', category: 'spacing', title: '단위 명사 띄어쓰기',
    description: '단위를 나타내는 명사는 앞말과 띄어 쓰는 것을 원칙으로 하며, 숫자와 어울리는 경우 등 제43항에서 허용하는 붙여 쓰기는 별도로 보존한다.', decision_type: 'CORRECTION',
    conditions: ['target has DEPENDENT_NOUN function', 'target is used as a unit noun', 'target is not an allowed numeral + unit form'],
    exceptions: ['Numeral + unit noun may be written without a space when Article 43 allows it'],
    examples: [],
    allowed_examples: [{ input: '10개', preferred: '10 개', allowed: '10개' }, { input: '20그램', preferred: '20 그램', allowed: '20그램' }, { input: '삼학년', preferred: '삼 학년', allowed: '삼학년' }],
    deferred_examples: [{ input: '한개', candidates: ['한 개', '한개'], reason: '2026년 국립국어원 온라인가나다 답변 사이에 고유어 수관형사+단위 명사의 허용 범위에 해석 차이가 있어 자동 교정을 보류한다.' }, { input: '두시간', candidates: ['두 시간', '두시간'], preferred: '두 시간', auto_correct_alternatives: true, reason: '실사용 검사에서는 일반 수량 표현의 원칙형인 두 시간으로 교정한다. 공식 답변 간 허용 범위 차이는 사전 증거/문서 유형 레이어에서 별도로 보존한다.' }, { input: '세마리', candidates: ['세 마리', '세마리'], reason: '고유어 수관형사+단위 명사의 허용 범위가 공식 답변 사이에서 일관되지 않아 보류한다.' }],
    source_type: 'norm', source_name: '국립국어원', source_url: NIKL_RULEBOOK_URL, source_detail_url: NIKL_RULE_043_URL,
    source_detail_label: '국립국어원 온라인가나다 사례: 단위 명사 띄어쓰기', source_reference: '한글 맞춤법 제43항', source_version: null,
    priority: 1, confidence: 'high', notes: '아라비아 숫자와 순서를 나타내는 일부 표현은 제43항의 허용 범위가 명확하다. 고유어 수관형사+단위 명사는 2026년 국립국어원 온라인가나다 답변 사이에 해석 차이가 확인되어 현재는 자동 교정하지 않고 보류한다. 2026-01-23 답변(qna 326727)은 고유어 숫자도 허용한다고 설명하지만, 2026-08-31 답변(qna 335208)은 일반 수량을 나타내는 수 관형사+단위 명사는 원칙대로 띄어 쓴다고 설명한다.', updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-044-NUMBER-GROUPING', category: 'spacing', title: '수의 만 단위 띄어쓰기',
    description: '수를 적을 때 만(萬) 단위로 구획하여 띄어 쓴다. 만·억·조·경·해·자와 같은 큰 단위 뒤에서 다음 수 단위가 이어질 때 구획을 나눈다.', decision_type: 'CORRECTION',
    conditions: ['target is a Korean number expression', 'number groups cross a man-based large-number unit', 'the expression is not a monetary notation convention'],
    exceptions: ['pure Arabic-digit strings without Korean number units are outside this rule', 'monetary notation may follow a conventional no-space form'],
    examples: [{ input: '12억3456만7898', expected: '12억 3456만 7898' }, { input: '십이억삼천사백오십육만칠천팔백구십팔', expected: '십이억 삼천사백오십육만 칠천팔백구십팔' }, { input: '12 억 3456 만 7898', expected: '12억 3456만 7898' }],
    allowed_examples: [], deferred_examples: [{ input: '일금 삼십일만오천육백칠십팔원정', reason: '금액 표기 관례' }],
    source_type: 'norm', source_name: '국립국어원', source_url: NIKL_RULE_044_URL, source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=312190',
    source_detail_label: '국립국어원 온라인가나다: 12억 3456만 7898 띄어쓰기', source_reference: '한글 맞춤법 제44항', source_version: '2017-03-28 시행 규정',
    priority: 1, confidence: 'high', notes: '제44항은 만 단위로 수를 구획한다. 아라비아 숫자만으로 이루어진 표기는 임의 변경하지 않으며 금액 표기 관례는 보류한다.', updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-045-CONNECTIVE-ENUMERATION', category: 'spacing', title: '이어 주거나 열거하는 말 띄어쓰기',
    description: '두 말을 이어 주거나 열거할 때 쓰이는 겸, 내지, 대, 및, 등, 등등, 등속, 등지 등은 앞뒤 말과 띄어 쓴다.', decision_type: 'CORRECTION',
    conditions: ['target is a connective or enumeration word covered by Article 45', 'target is used as an independent word between two phrases or items'],
    exceptions: ['dictionary-established compounds or lexicalized forms require separate lexical judgment'],
    examples: [{ input: '국장겸과장', expected: '국장 겸 과장' }, { input: '청군대백군', expected: '청군 대 백군' }, { input: '이사장및이사들', expected: '이사장 및 이사들' }, { input: '2대1', expected: '2 대 1' }],
    allowed_examples: [], deferred_examples: [{ input: '일대일', candidates: ['일대일'] }], source_type: 'norm', source_name: '국립국어원', source_url: NIKL_RULEBOOK_URL,
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=303321', source_detail_label: '국립국어원 온라인가나다 사례: 제45항 ‘대’ 띄어쓰기', source_reference: '한글 맞춤법 제45항', source_version: null,
    priority: 1, confidence: 'high', notes: '‘일대일’처럼 사전에 등재된 하나의 명사는 문자열만으로 교정하지 않는다.', updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-046-MONOSYLLABLE-ALLOWANCE', category: 'spacing', title: '단음절어 연속 붙여쓰기 허용',
    description: '단음절로 된 단어가 연이어 나타나는 경우에는 일부를 붙여 쓸 수 있다.', decision_type: 'VALID',
    conditions: ['consecutive words are monosyllabic', 'construction falls within Article 46 allowance'], exceptions: ['not every adjacent monosyllabic sequence may be attached', 'a following particle can prevent the relevant allowance'], examples: [],
    allowed_examples: [{ input: '좀더 큰 이 새차', preferred: '좀 더 큰 이 새 차', allowed: '좀더 큰 이 새차' }, { input: '내것 네것', preferred: '내 것 네 것', allowed: '내것 네것' }, { input: '물 한병', preferred: '물 한 병', allowed: '물 한병' }, { input: '한명 한명', preferred: '한 명 한 명', allowed: '한명 한명' }],
    deferred_examples: [{ input: '물한병', candidates: ['물 한 병'] }, { input: '김모 씨', candidates: ['김 모 씨', '김모 씨'] }], source_type: 'norm', source_name: '국립국어원', source_url: NIKL_RULEBOOK_URL,
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=324658', source_detail_label: '국립국어원 온라인가나다 사례: 제46항 적용 범위', source_reference: '한글 맞춤법 제46항', source_version: null,
    priority: 2, confidence: 'high', notes: '허용되는 붙여쓰기는 기본 맞춤법 검사에서 오류로 처리하지 않는다. 문서 유형별 원칙 표기는 별도 register 레이어에서 처리한다.', updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-047-AUXILIARY-VERB', category: 'spacing', title: '보조 용언 띄어쓰기',
    description: '보조 용언은 앞말과 띄어 쓰는 것을 원칙으로 하되, 제47항에서 허용하는 붙여 쓰기와 예외를 별도로 판정한다.', decision_type: 'CORRECTION',
    conditions: ['target has AUXILIARY_VERB function', 'target follows a lexical predicate'], exceptions: [],
    examples: [{ input: '생각해보자', expected: '생각해 보자' }, { input: '공부해보아라', expected: '공부해 보아라' }, { input: '깨뜨려버렸다', expected: '깨뜨려 버렸다' }, { input: '예방해야한다고', expected: '예방해야 한다고' }],
    allowed_examples: [{ input: '먹어보았다', preferred: '먹어 보았다', allowed: '먹어보았다' }, { input: '구해본다', preferred: '구해 본다', allowed: '구해본다' }, { input: '더해줬다', preferred: '더해 줬다', allowed: '더해줬다' }],
    source_type: 'norm', source_name: '국립국어원', source_url: NIKL_RULEBOOK_URL, source_detail_url: NIKL_RULE_047_URL, source_detail_label: '국립국어원 온라인가나다 사례: ‘생각해 보다’ 띄어쓰기', source_reference: '한글 맞춤법 제47항', source_version: '2026-08-07 국립국어원 온라인가나다 확인',
    mandatory_auxiliary_lemmas: ['생각하다', '공부하다', '예측하다', '사용하다', '쫓아내다', '매달다', '집어넣다', '파고들다', '깨뜨리다', '깨트리다'],
    mandatory_auxiliary_forms: ['생각해', '공부해', '예측해', '사용해'], priority: 1, confidence: 'medium',
    notes: '제47항은 붙여 쓰기를 허용하는 경우가 있으므로 원칙형을 일률적으로 오류 처리하지 않는다. 현재 엔진은 최신 국립국어원 온라인가나다에서 본용언이 합성·파생어이고 활용형이 3음절 이상인 경우 등 붙여 쓰기가 허용되지 않는 것으로 확인된 사례만 교정한다. 규정 본문과 해설 사이에 불일치가 확인된 사례(예: 깨뜨리다)는 최신 해설·온라인가나다 설명을 우선 근거로 삼고, 근거가 불명확한 경우 자동 교정을 보류한다.', updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-048-NAME-APPELLATION',
    category: 'spacing',
    title: '성명·호·호칭어 띄어쓰기',
    decision_type: 'AMBIGUOUS',
    examples: [
      { input: '김양수씨', expected: '김양수 씨' },
      { input: '최치원선생', expected: '최치원 선생' },
      { input: '박동식박사', expected: '박동식 박사' },
      { input: '충무공이순신장군', expected: '충무공 이순신 장군' }
    ],
    allowed_examples: [
      { input: '남궁억', alternatives: ['남궁 억'], reason: '성과 이름을 분명히 구분할 필요가 있을 경우 띄어 쓸 수 있음' },
      { input: '독고준', alternatives: ['독고 준'], reason: '성과 이름을 분명히 구분할 필요가 있을 경우 띄어 쓸 수 있음' },
      { input: '황보지봉', alternatives: ['황보 지봉'], reason: '성과 이름을 분명히 구분할 필요가 있을 경우 띄어 쓸 수 있음' }
    ],
    deferred_examples: [
      { input: '김모 씨', candidates: ['김 모 씨', '김모 씨'], reason: '단음절 연속 붙여쓰기 허용이 결합되어 문맥 없이 단정할 수 없음' },
      { input: '이순신', candidates: ['이순신'], reason: '성명 내부를 자동 분해·교정하려면 인명 개체 판정이 필요함' },
      { input: '충무공 이순신', candidates: ['충무공 이순신'], reason: '호가 성명 앞에 놓이는 구조는 제48항 해설에 따라 띄어 쓰나, 개체 인식 없이 일반 문자열 규칙으로 확장하지 않음' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=322922',
    source_detail_label: '국립국어원 제48항 설명 및 사례',
    source_reference: '한글 맞춤법 제48항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '성과 이름·성과 호는 붙여 쓰는 것이 원칙이고, 이에 덧붙는 호칭어·관직명은 띄어 쓴다. 다만 성과 이름/호를 분명히 구분할 필요가 있을 경우 띄어 쓸 수 있다. 이름 앞의 호는 별개의 단위이므로 띄어 쓴다. 일반 문자열 패턴만으로 실제 인명을 확정하지 않고, 사전/개체명 레이어 도입 전까지 확정 패턴은 데이터에만 보존한다.'
  },
  {
    rule_id: 'SPACING-049-PROPER-NOUN',
    category: 'spacing',
    title: '성명 이외의 고유 명사 띄어쓰기',
    decision_type: 'AMBIGUOUS',
    examples: [],
    allowed_examples: [
      { input: '대한 중학교', alternatives: ['대한중학교'], preferred: '대한 중학교' },
      { input: '한국 대학교 사범 대학', alternatives: ['한국대학교 사범대학'], preferred: '한국 대학교 사범 대학' },
      { input: '국립국어원 기획연수부 기획운영과', alternatives: ['국립 국어원 기획 연수부 기획 운영과'], preferred: '국립 국어원 기획 연수부 기획 운영과' },
      { input: '한국방송공사 경영기획본부 경영평가실 경영평가분석부', alternatives: ['한국 방송 공사 경영 기획 본부 경영 평가실 경영 평가 분석부'], preferred: '한국 방송 공사 경영 기획 본부 경영 평가실 경영 평가 분석부' }
    ],
    deferred_examples: [
      { input: '국방부유해발굴감식단', candidates: ['국방부 유해 발굴 감식단', '국방부 유해발굴감식단'], reason: '고유 명사의 구성 단위와 의미 구조를 알아야 허용 단위를 설정할 수 있음' },
      { input: '한국대학교의과대학', candidates: ['한국대학교 의과대학'], reason: '고유 명사 단위 경계는 사전/기관명 데이터가 필요함' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=73&qna_seq=324760',
    source_detail_label: '국립국어원 제49항 단위별 띄어쓰기 설명',
    source_reference: '한글 맞춤법 제49항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '성명 이외의 고유 명사는 단어별 띄어쓰기가 원칙이나 구성 요소의 구조적인 단위별 띄어쓰기도 허용된다. 의미 해석에 어긋나는 임의의 결합은 허용되지 않으므로 기관명/단체명 데이터 없이 문자열 자동 교정하지 않는다.'
  },
  {
    rule_id: 'SPACING-050-TECHNICAL-TERM',
    category: 'spacing',
    title: '전문 용어 띄어쓰기',
    decision_type: 'AMBIGUOUS',
    examples: [],
    allowed_examples: [
      { input: '만성 골수성 백혈병', alternatives: ['만성골수성백혈병'], preferred: '만성 골수성 백혈병' },
      { input: '중거리 탄도 유도탄', alternatives: ['중거리탄도유도탄'], preferred: '중거리 탄도 유도탄' },
      { input: '무역 수지', alternatives: ['무역수지'], preferred: '무역 수지' },
      { input: '음운 변화', alternatives: ['음운변화'], preferred: '음운 변화' },
      { input: '상대성 이론', alternatives: ['상대성이론'], preferred: '상대성 이론' },
      { input: '학교 폭력', alternatives: ['학교폭력'], preferred: '학교 폭력', auto_correct_alternatives: true },
      { input: '목조 건축물', alternatives: ['목조건축물'], preferred: '목조 건축물' },
      { input: '초등 교사', alternatives: ['초등교사'], preferred: '초등 교사' }
    ],
    deferred_examples: [
      { input: '결산 소득세', candidates: ['결산 소득세'], reason: '전문 용어로 사전에 등재되어 있는지 확인하지 않으면 붙여 쓰기를 허용할 수 없음' },
      { input: '교육 목적', candidates: ['교육 목적'], reason: '전문 용어 사전 등재 여부에 따라 제50항 허용 여부가 달라질 수 있음' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=317601',
    source_detail_label: '국립국어원 제50항 전문 용어 허용 범위 설명',
    source_reference: '한글 맞춤법 제50항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '전문 용어는 단어별 띄어쓰기가 원칙이고 붙여 쓰기도 허용된다. 다만 실제 전문 용어인지 여부가 사전/전문용어 데이터로 확인되어야 하므로 일반 문장에서는 임의로 붙이지 않는다.'
  },
  {
    rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
    category: 'orthography',
    title: '의미에 따른 구별 표기',
    decision_type: 'AMBIGUOUS',
    examples: [
      { input: '둘로 갈음', expected: '둘로 가름', decision: 'CORRECTION' },
      { input: '새 책상으로 가름하였다.', expected: '새 책상으로 갈음하였다.', decision: 'CORRECTION' },
      { input: '빠른 거름으로 걸었다.', expected: '빠른 걸음으로 걸었다.', decision: 'CORRECTION' },
      { input: '영월을 걷혀 왔다.', expected: '영월을 거쳐 왔다.', decision: 'CORRECTION' },
      { input: '외상값이 잘 거쳐진다.', expected: '외상값이 잘 걷힌다.', decision: 'CORRECTION' },
      { input: '걷잡아서 이틀 걸릴 일이다.', expected: '겉잡아서 이틀 걸릴 일이다.', decision: 'CORRECTION' },
      { input: '그는 부지런하다. 그러므로 잘 산다.', expected: '그는 부지런하다. 그러므로 잘 산다.', decision: 'VALID' },
      { input: '그는 열심히 공부한다. 그럼으로써 은혜에 보답한다.', expected: '그는 열심히 공부한다. 그럼으로써 은혜에 보답한다.', decision: 'VALID' },
      { input: '진도가 너무 늘리다.', expected: '진도가 너무 느리다.', decision: 'CORRECTION' },
      { input: '고무줄을 늘린다.', expected: '고무줄을 늘인다.', decision: 'CORRECTION' },
      { input: '수출량을 더 늘인다.', expected: '수출량을 더 늘린다.', decision: 'CORRECTION' },
      { input: '옷을 달인다.', expected: '옷을 다린다.', decision: 'CORRECTION' },
      { input: '약을 다린다.', expected: '약을 달인다.', decision: 'CORRECTION' },
      { input: '부주의로 손을 닫혔다.', expected: '부주의로 손을 다쳤다.', decision: 'CORRECTION' },
      { input: '문이 저절로 다쳤다.', expected: '문이 저절로 닫혔다.', decision: 'CORRECTION' },
      { input: '문을 힘껏 닫혔다.', expected: '문을 힘껏 닫쳤다.', decision: 'CORRECTION' },
      { input: '벌써 일을 맞혔다.', expected: '벌써 일을 마쳤다.', decision: 'CORRECTION' },
      { input: '여러 문제를 더 마쳤다.', expected: '여러 문제를 더 맞혔다.', decision: 'CORRECTION' },
      { input: '금 목거리를 했다.', expected: '금 목걸이를 했다.', decision: 'CORRECTION' },
      { input: '나라를 위해 목숨을 받쳤다.', expected: '나라를 위해 목숨을 바쳤다.', decision: 'CORRECTION' },
      { input: '우산을 바치고 간다.', expected: '우산을 받치고 간다.', decision: 'CORRECTION' },
      { input: '약속은 반듯이 지켜라.', expected: '약속은 반드시 지켜라.', decision: 'CORRECTION' },
      { input: '고개를 반드시 들어라.', expected: '고개를 반듯이 들어라.', decision: 'CORRECTION' },
      { input: '마차가 화물차에 부딪쳤다.', expected: '마차가 화물차에 부딪혔다.', decision: 'CORRECTION' },
      { input: '우표를 부친다.', expected: '우표를 붙인다.', decision: 'CORRECTION' },
      { input: '편지를 붙인다.', expected: '편지를 부친다.', decision: 'CORRECTION' },
      { input: '밥을 앉힌다.', expected: '밥을 안친다.', decision: 'CORRECTION' },
      { input: '아이를 안친다.', expected: '아이를 앉힌다.', decision: 'CORRECTION' },
      { input: '이따가도 없다.', expected: '있다가도 없다.', decision: 'CORRECTION' }
    ],
    allowed_examples: [
      { input: '거치다', reason: '지나거나 들르거나 과정을 겪는 뜻의 표준어' },
      { input: '걷히다', reason: '걷다의 피동사로 쓰이는 표준어' },
      { input: '부치다', reason: '편지·물건을 보내다, 논밭을 이용하다 등의 뜻' },
      { input: '붙이다', reason: '붙게 하다 등의 뜻' },
      { input: '안치다', reason: '재료를 솥이나 냄비에 넣고 불 위에 올리는 뜻' },
      { input: '앉히다', reason: '앉다의 사동사 등의 뜻' }
    ],
    deferred_examples: [
      { input: '늘이다/늘리다', reason: '길이·범위·수량 등 의미에 따라 달라지므로 단독 어절 자동 교정 불가' },
      { input: '다리다/달이다', reason: '옷·천을 펴는 의미와 액체·약재를 끓이는 의미를 문맥으로 구별해야 함' },
      { input: '부치다/붙이다', reason: '의미 기능에 따라 두 표준어가 모두 가능하므로 단독 어절은 보류' },
      { input: '받치다/받히다/밭치다', reason: '행위·피동·거르기 기능을 문맥으로 구별해야 함' },
      { input: '이따가/있다가', reason: '시간 부사와 존재·상태 유지의 의미를 구별해야 함' },
      { input: '의존 명사와 어미가 결합한 구별형', reason: '문법적 경계를 확인하지 않고 자동 교정하지 않음' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0001&regltn_no=183',
    source_detail_label: '국립국어원 한글 맞춤법 제57항 및 해설',
    source_reference: '한글 맞춤법 제57항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '제57항은 서로 다른 의미·문법 기능을 가진 표기를 구별하는 규정이다. 따라서 단어 단위의 일반 치환은 금지하고, 문장 문맥이 공식 용례의 의미 조건을 확정적으로 충족하는 경우에만 자동 교정한다.'
  },
  {
    rule_id: 'ORTHO-056-DEON-DEUN',
    category: 'orthography',
    title: '지난 일을 나타내는 -던과 선택을 나타내는 -든지',
    decision_type: 'AMBIGUOUS',
    examples: [
      { input: '지난겨울은 몹시 춥드라.', expected: '지난겨울은 몹시 춥더라.' },
      { input: '깊든 물이 얕아졌다.', expected: '깊던 물이 얕아졌다.' },
      { input: '그렇게 좋든가?', expected: '그렇게 좋던가?' },
      { input: '그 사람 말 잘하든데!', expected: '그 사람 말 잘하던데!' },
      { input: '얼마나 놀랐든지 몰라.', expected: '얼마나 놀랐던지 몰라.' },
      { input: '배던지 사과던지 마음대로 먹어라.', expected: '배든지 사과든지 마음대로 먹어라.' },
      { input: '가던지 오던지 마음대로 해라.', expected: '가든지 오든지 마음대로 해라.' }
    ],
    allowed_examples: [
      { input: '어릴 적 살던 곳', reason: '지난 일을 나타내는 -던의 표준 표기' },
      { input: '먹든지 말든지 마음대로 하렴.', reason: '선택의 의미를 나타내는 -든지의 표준 표기' },
      { input: '가든지 오든지 마음대로 해라.', reason: '선택의 의미에서는 -든지로 적음' },
      { input: '얼마나 놀랐던지 몰라.', reason: '과거의 경험을 회상하는 -던지로 적음' }
    ],
    deferred_examples: [
      { input: '그때 뭐든지/뭐던지', reason: '문장 기능과 의미에 따라 판단해야 하므로 단어 형태만으로 자동 결정하지 않음' },
      { input: '하든/하던 단독 어절', reason: '선택과 과거 회상 의미가 문맥에 따라 달라질 수 있어 문장 문맥 없이는 결정하지 않음' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0001&regltn_no=798',
    source_detail_label: '국립국어원 한글 맞춤법 제56항',
    source_reference: '한글 맞춤법 제56항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '제56항은 형태가 아니라 의미 기능에 따라 -던/-든지를 구별한다. 따라서 단독 어절을 일반 치환하지 않고, 공식 규정에 제시된 문맥이 그대로 확인되는 확정 사례만 자동 교정한다. 나머지는 의미·문맥 판정 계층에서 처리한다.'
  },
  {
    rule_id: 'ORTHO-055-UNIFIED-FORMS',
    category: 'orthography',
    title: '두 가지로 구별하던 말의 통일 표기',
    decision_type: 'CORRECTION',
    examples: [
      { input: '마추다', expected: '맞추다' },
      { input: '마춘다', expected: '맞춘다' },
      { input: '마추어', expected: '맞추어' },
      { input: '마춰', expected: '맞춰' },
      { input: '마췄다', expected: '맞췄다' },
      { input: '뻐치다', expected: '뻗치다' },
      { input: '뻐친다', expected: '뻗친다' },
      { input: '뻐쳐', expected: '뻗쳐' },
      { input: '뻐쳤다', expected: '뻗쳤다' }
    ],
    allowed_examples: [
      { input: '맞추다', reason: '제55항에서 통일한 표준 표기' },
      { input: '맞춰', reason: '맞추다의 활용형' },
      { input: '뻗치다', reason: '제55항에서 통일한 표준 표기' },
      { input: '뻗쳐', reason: '뻗치다의 활용형' },
      { input: '맞히다', reason: '제55항의 맞추다와 다른 의미·표기의 별도 동사이므로 교정 대상이 아님' }
    ],
    deferred_examples: [
      { input: '맞추다/맞히다 의미 구별', reason: '두 단어 모두 표준어이므로 제55항만으로 서로 교정하지 않음' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0001&regltn_no=798',
    source_detail_label: '국립국어원 한글 맞춤법 제55항',
    source_reference: '한글 맞춤법 제55항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '제55항은 과거 구별 표기를 하나로 통일한 항이다. 맞추다/뻗치다는 의미에 따라 다른 표준어를 선택하는 문제가 아니므로 제55항에서는 잘못된 구별 표기만 통일한다. 맞히다 등 별도 표준어는 교정하지 않는다.'
  },
  {
    rule_id: 'ORTHO-054-TENSE-SUFFIX',
    category: 'orthography',
    title: '된소리 접미사 표기',
    decision_type: 'CORRECTION',
    suffixes: [
      { suffix: '꾼', examples: ['나무꾼', '심부름꾼', '익살꾼', '일꾼', '지게꾼', '노름꾼', '소리꾼', '농사꾼', '사기꾼', '훼방꾼', '구경꾼', '사냥꾼'] },
      { suffix: '깔', examples: ['때깔', '빛깔', '성깔', '맛깔', '태깔'] },
      { suffix: '때기', examples: ['귀때기', '볼때기', '등때기', '배때기', '나무때기', '판자때기', '널판때기', '송판때기', '거적때기'] },
      { suffix: '꽁치', examples: ['발꽁치', '발뒤꽁치', '팔꽁치'] },
      { suffix: '빼기', examples: ['코빼기', '이마빼기', '대갈빼기', '곱빼기', '고들빼기'] }
    ],
    examples: [
      { input: '나무꾼', expected: '나무꾼' },
      { input: '나무군', expected: '나무꾼' },
      { input: '심부름군', expected: '심부름꾼' },
      { input: '빛갈', expected: '빛깔' },
      { input: '맛갈', expected: '맛깔' },
      { input: '귀때기', expected: '귀때기' },
      { input: '귀대기', expected: '귀때기' },
      { input: '코빼기', expected: '코빼기' },
      { input: '코배기', expected: '코배기' }
    ],
    allowed_examples: [
      { input: '뚝배기', reason: '제54항의 -빼기 접미사가 아닌 별도 표기' },
      { input: '나이배기', reason: '제54항의 -빼기 접미사가 아닌 별도 표기' }
    ],
    deferred_examples: [
      { input: '새로운 어근+접미사 결합형', reason: '제54항의 접미사 목록만으로 새로운 어휘의 표기를 일반화하지 않음' },
      { input: '배기/빼기 구별이 필요한 미등재 단어', reason: '어휘별 표준 표기 확인이 필요하므로 사전 데이터 확보 전 자동 교정 보류' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/niklintro2/20years05_01_01.jsp',
    source_detail_label: '국립국어원 어문 규범 20년: 제54항 된소리 접미사',
    source_reference: '한글 맞춤법 제54항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '제54항에서 된소리로 적도록 정한 접미사는 공식 용례와 함께 관리한다. -배기/-빼기처럼 사전적 구별이 필요한 영역은 신규 어휘에 일반화하지 않는다.'
  },
  {
    rule_id: 'ORTHO-053-ENDINGS-TENSE',
    category: 'orthography',
    title: '어미의 된소리 표기',
    decision_type: 'CORRECTION',
    examples: [
      { input: '할꺼나', expected: '할거나' },
      { input: '할껄', expected: '할걸' },
      { input: '할께', expected: '할게' },
      { input: '할께요', expected: '할게요' },
      { input: '갈께요', expected: '갈게요' },
      { input: '먹을께', expected: '먹을게' },
      { input: '먹을께요', expected: '먹을게요' },
      { input: '할쎄', expected: '할세' },
      { input: '할쎄라', expected: '할세라' },
      { input: '할쑤록', expected: '할수록' },
      { input: '할씨', expected: '할시' },
      { input: '할찌', expected: '할지' },
      { input: '할찌니라', expected: '할지니라' },
      { input: '할찌라도', expected: '할지라도' },
      { input: '할찌어다', expected: '할지어다' },
      { input: '할찌언정', expected: '할지언정' },
      { input: '할찐대', expected: '할진대' },
      { input: '할찐저', expected: '할진저' },
      { input: '올씨다', expected: '올시다' }
    ],
    ending_replacements: [
      { wrong: '꺼나', correct: '거나' },
      { wrong: '껄', correct: '걸' },
      { wrong: '께', correct: '게' },
      { wrong: '쎄라', correct: '세라' },
      { wrong: '쎄', correct: '세' },
      { wrong: '쑤록', correct: '수록' },
      { wrong: '씨', correct: '시' },
      { wrong: '찌니라', correct: '지니라' },
      { wrong: '찌라도', correct: '지라도' },
      { wrong: '찌어다', correct: '지어다' },
      { wrong: '찌언정', correct: '지언정' },
      { wrong: '찐대', correct: '진대' },
      { wrong: '찐저', correct: '진저' },
      { wrong: '찌', correct: '지' }
    ],
    interrogative_endings: ['ㄹ까', 'ㄹ꼬', 'ㅂ니까', '리까', 'ㄹ쏘냐'],
    allowed_examples: [
      { input: '할게', reason: '제53항에 따른 표준 표기' },
      { input: '할수록', reason: '제53항에 따른 표준 표기' },
      { input: '할지라도', reason: '제53항에 따른 표준 표기' },
      { input: '갈까', reason: '의문형 어미의 된소리 표기는 제53항 예외에 해당' },
      { input: '할꼬', reason: '의문형 어미의 된소리 표기는 제53항 예외에 해당' },
      { input: '합니까', reason: '의문형 어미의 된소리 표기는 제53항 예외에 해당' }
    ],
    deferred_examples: [
      { input: '문맥상 어미 판별이 불가능한 미등재 형태', reason: '의문형 여부 및 어미 경계가 불명확한 경우 자동 교정을 보류' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=&pageIndex=1&qna_seq=327269',
    source_detail_label: '국립국어원 온라인가나다: -게, -께',
    source_reference: '한글 맞춤법 제53항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: 'ㄹ로 시작하는 어미는 일부 의문형 어미를 제외하고 된소리로 발음되더라도 예사소리로 적는다. 자동 교정은 등록된 어미 표기쌍과 형태소 경계가 확인되는 경우에 한정하며 의문형 어미는 보호한다.'
  },
  {
    rule_id: 'ORTHO-052-SINO-KOREAN-READING',
    category: 'orthography',
    title: '한자어 본음·속음 표기',
    decision_type: 'CORRECTION',
    examples: [
      { input: '승락', expected: '승낙' },
      { input: '곤난', expected: '곤란' },
      { input: '논난', expected: '논란' },
      { input: '의녕', expected: '의령' },
      { input: '회녕', expected: '회령' },
      { input: '분노', expected: '분노' },
      { input: '희로애락', expected: '희로애락' },
      { input: '유월', expected: '유월' },
      { input: '모과', expected: '모과' },
      { input: '시월', expected: '시월' },
      { input: '초파일', expected: '초파일' }
    ],
    allowed_examples: [
      { input: '수락', reason: '承諾의 속음에 따른 표기' },
      { input: '쾌락', reason: '承諾의 속음에 따른 표기' },
      { input: '허락', reason: '承諾의 속음에 따른 표기' },
      { input: '곤란', reason: '困難의 속음에 따른 표기' },
      { input: '논란', reason: '論難의 속음에 따른 표기' },
      { input: '의령', reason: '宜寧의 속음에 따른 표기' },
      { input: '회령', reason: '會寧의 속음에 따른 표기' },
      { input: '대로', reason: '大怒의 속음에 따른 표기' },
      { input: '의논', reason: '議論의 속음에 따른 표기' },
      { input: '오뉴월', reason: '五六十 계열의 속음 표기' }
    ],
    deferred_examples: [
      { input: '한자어의 본음·속음 미등재 표기', reason: '제52항은 단어별 한자음과 관용적 속음이 결합하므로 일반적인 발음 규칙으로 새로운 표기를 확정하지 않음' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6083&mn_id=98&pageIndex=3',
    source_detail_label: '국립국어원 상담 사례: 승낙·승락의 바른 표기',
    source_reference: '한글 맞춤법 제52항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '제52항은 한자어에서 본음과 속음이 단어별로 달라지는 경우를 각각 그 소리에 따라 적도록 한다. 자동 교정은 공식 규정의 확정된 표기쌍만 대상으로 하며, 신규 한자어에 규칙을 일반화하지 않는다.'
  },
  {
    rule_id: 'ORTHO-051-ADVERB-I-HI',
    category: 'orthography',
    title: '부사 끝음절 이/히 표기',
    decision_type: 'CORRECTION',
    examples: [
      { input: '깨끗히', expected: '깨끗이' },
      { input: '반듯히', expected: '반듯이' },
      { input: '버젓히', expected: '버젓이' },
      { input: '번번히', expected: '번번이' },
      { input: '일일히', expected: '일일이' },
      { input: '집집히', expected: '집집이' },
      { input: '틈틈히', expected: '틈틈이' },
      { input: '가까히', expected: '가까이' },
      { input: '많히', expected: '많이' },
      { input: '헛되히', expected: '헛되이' },
      { input: '엄격이', expected: '엄격히' },
      { input: '정확이', expected: '정확히' }
    ],
    allowed_examples: [
      { input: '솔직히', reason: '제51항에서 이/히 발음으로 나는 경우 히로 적는 대표 표기' },
      { input: '가만히', reason: '제51항에서 이/히 발음으로 나는 경우 히로 적는 대표 표기' },
      { input: '열심히', reason: '제51항에서 이/히 발음으로 나는 경우 히로 적는 대표 표기' }
    ],
    deferred_examples: [
      { input: '*이/*히 미등재 부사', reason: '제51항은 단어별 사전 확인이 필요하며 단순 음운/형태 규칙만으로 새로운 부사의 표기를 확정하지 않음' }
    ],
    source_type: 'official',
    source_name: '국립국어원 한국어 어문 규범',
    source_url: 'https://www.korean.go.kr/kornorms/m/m_regltn.do',
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=261&qna_seq=323807',
    source_detail_label: '국립국어원 제51항 공식 규정 및 용례',
    source_reference: '한글 맞춤법 제51항',
    source_version: '2017-03-28 시행 규정',
    confidence: 0.99,
    notes: '공식 규정에 명시된 표기쌍만 자동 교정한다. 제51항의 경향성(예: -하다 가능 여부)은 보조 정보일 뿐이며, 신규 단어에 일반화하지 않는다. 공식 표기 자체가 맞는 경우에는 교정하지 않는다.'
  },
  {
    rule_id: 'SPACING-NEGATIVE-ADVERB', category: 'spacing', title: '부정 부사 띄어쓰기', description: '부정 부사 안/못이 뒤의 용언과 결합한 표기가 아닌 문맥에서는 띄어 쓴다.', decision_type: 'CORRECTION',
    conditions: ['target has NEGATIVE_ADVERB function', 'target precedes a lexical predicate'], exceptions: [], examples: [], deferred_examples: [{ input: '안돼요', candidates: ['안 돼요', '안돼요'] }, { input: '안되나요', candidates: ['안 되나요', '안되나요'] }],
    source_type: 'norm', source_name: '국립국어원', source_url: NIKL_RULEBOOK_URL, source_detail_url: NIKL_NEGATIVE_URL, source_detail_label: '국립국어원 온라인가나다: 안/되다 관련 띄어쓰기', source_reference: '한글 맞춤법 관련 띄어쓰기 규정', source_version: null,
    priority: 1, confidence: 'medium', notes: '안/못은 의미와 문맥에 따라 달라질 수 있으므로 현재 엔진에서는 자동 교정하지 않는다.', updated_at: '2026-10-02'
  },
  {
    rule_id: 'SPACING-JOSA-ATTACH', category: 'spacing', title: '조사 붙여 쓰기', description: '조사는 앞말에 붙여 쓴다.', decision_type: 'CORRECTION', conditions: ['target has JOSA function'], exceptions: [],
    examples: [{ input: '나 만큼', expected: '나만큼' }, { input: '이것 뿐이다', expected: '이것뿐이다' }], source_type: 'norm', source_name: '국립국어원', source_url: NIKL_RULEBOOK_URL,
    source_detail_url: 'https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=306003', source_detail_label: '국립국어원 온라인가나다 사례: ‘만큼’ 조사·의존 명사 구분', source_reference: '한글 맞춤법 제41항', source_version: null,
    priority: 1, confidence: 'high', notes: '같은 표면형이 의존 명사로 쓰이는 경우에는 별도 문맥 판정이 우선한다.', updated_at: '2026-10-02'
  }
]);

export function getRuleById(ruleId) { return RULES_V01.find(rule => rule.rule_id === ruleId) ?? null; }
export function findRuleForExample(input, revised) { for (const rule of RULES_V01) { if (rule.examples?.some(example => example?.input === input && example?.expected === revised)) return rule; } return null; }
export function toRuleEvidence(rule) { if (!rule) return null; return { rule_id: rule.rule_id, category: rule.category, title: rule.title, description: rule.description, source_type: rule.source_type, source_name: rule.source_name, source_url: rule.source_url, source_detail_url: rule.source_detail_url ?? null, source_detail_label: rule.source_detail_label ?? null, source_reference: rule.source_reference, confidence: rule.confidence, notes: rule.notes, updated_at: rule.updated_at }; }
