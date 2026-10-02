/**
 * 사전 증거를 규칙별 판단 보조 신호로 변환한다.
 *
 * 원칙:
 * - 사전 존재 자체를 자동 교정의 근거로 승격하지 않는다.
 * - 명시적으로 정규화된 플래그가 있는 경우에만 강한 지지 신호를 만든다.
 * - 제57항처럼 동형 표기가 모두 표준어일 수 있는 영역은
 *   "둘 다 사전에 있음"을 오히려 자동 교정 금지 신호로 취급한다.
 */

const RULES = new Set([
  'SPACING-048-NAME-APPELLATION',
  'SPACING-049-PROPER-NOUN',
  'SPACING-050-TECHNICAL-TERM',
  'ORTHO-057-DISTINGUISHING-WORDS'
]);

function unique(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
}

function entriesForQuery(evidence, query) {
  return (evidence?.matches ?? [])
    .filter(match => match.query === query)
    .flatMap(match => match.entries ?? []);
}

function lexicalCandidates(query) {
  return unique(
    query
      .split(/[\\s/·,，、()[\\]{}]+/)
      .map(value => value.replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9]+$/g, ''))
      .filter(value => value.length >= 2)
  );
}

function buildRuleDecision(ruleId, queries, evidence) {
  const normalizedQueries = unique(queries);
  const matchedEntries = normalizedQueries.flatMap(query => entriesForQuery(evidence, query));

  if (ruleId === 'SPACING-050-TECHNICAL-TERM') {
    const technicalEntries = matchedEntries.filter(entry => entry?.technical_term === true);
    return {
      rule_id: ruleId,
      status: technicalEntries.length ? 'SUPPORTS' : 'INSUFFICIENT',
      reason: technicalEntries.length
        ? '사전 항목에 전문 용어로 정규화된 증거가 있습니다.'
        : '전문 용어 플래그가 확인되지 않아 자동 판정을 승격하지 않습니다.',
      queries: normalizedQueries,
      supporting_entries: technicalEntries.slice(0, 10)
    };
  }

  if (ruleId === 'SPACING-048-NAME-APPELLATION') {
    const contexts = (evidence?.rule_evidence ?? [])
      .find(item => item?.rule_id === ruleId)?.contexts ?? [];
    const personEntries = matchedEntries.filter(entry => entry?.person_name === true);
    const personWords = new Set(personEntries.map(entry => entry?.word).filter(Boolean));
    const contextualName = contexts.some(context =>
      (context?.tokens ?? []).some(token => personWords.has(token))
    );

    let status = 'INSUFFICIENT';
    let reason = '인명 사전 증거가 없어 자동 판정을 승격하지 않습니다.';
    if (personEntries.length && contextualName) {
      status = 'SUPPORTS';
      reason = '인명 사전 증거와 등록된 호칭어 문맥이 함께 확인됩니다.';
    } else if (personEntries.length) {
      status = 'BOUNDARY_REQUIRED';
      reason = '인명 사전 증거는 있으나 등록된 이름·호칭 경계 문맥이 부족합니다.';
    }

    return {
      rule_id: ruleId,
      status,
      reason,
      queries: normalizedQueries,
      supporting_entries: personEntries.slice(0, 10),
      contexts
    };
  }

  if (ruleId === 'SPACING-049-PROPER-NOUN') {
    const contexts = (evidence?.rule_evidence ?? [])
      .find(item => item?.rule_id === ruleId)?.contexts ?? [];
    const properNounEntries = matchedEntries.filter(entry => entry?.proper_noun === true);
    const properNounWords = new Set(properNounEntries.map(entry => entry?.word).filter(Boolean));
    const candidateUnits = unique(contexts.flatMap(context => context?.candidate_units ?? []));
    const supportedUnits = candidateUnits.filter(unit => properNounWords.has(unit));
    const missingUnits = candidateUnits.filter(unit => !properNounWords.has(unit));
    const hasContext = contexts.length > 0;
    const fullyCovered = hasContext && candidateUnits.length > 0 && missingUnits.length === 0;
    const partiallyCovered = supportedUnits.length > 0 && missingUnits.length > 0;

    let status = 'INSUFFICIENT';
    let reason = '고유 명사 사전 증거와 등록된 경계 문맥이 없어 자동 판정을 승격하지 않습니다.';
    if (fullyCovered) {
      status = 'SUPPORTS';
      reason = '등록된 고유 명사 경계의 모든 후보 단위가 고유 명사 사전 증거로 확인됩니다.';
    } else if (partiallyCovered) {
      status = 'BOUNDARY_REQUIRED';
      reason = '일부 고유 명사 단위만 확인되어 나머지 경계는 추가 근거가 필요합니다.';
    }

    return {
      rule_id: ruleId,
      status,
      reason,
      queries: normalizedQueries,
      supporting_entries: properNounEntries.slice(0, 10),
      candidate_units: candidateUnits,
      supported_units: supportedUnits,
      missing_units: missingUnits,
      contexts
    };
  }

  // 제57항은 "어느 한쪽이 사전에 있다"만으로는 의미 판정을 할 수 없다.
  // 입력/기대 문장에 공통으로 포함된 기능어(예: '둘로')는
  // 구별 후보가 아니므로 비교 대상에서 제외한다.
  const contexts = (evidence?.rule_evidence ?? [])
    .find(item => item?.rule_id === ruleId)?.contexts ?? [];
  const contextualCandidates = unique(contexts.flatMap(context => {
    const inputTokens = unique(context?.input_tokens ?? []);
    const expectedTokens = unique(context?.expected_tokens ?? []);
    const inputSet = new Set(inputTokens);
    const expectedSet = new Set(expectedTokens);
    return [
      ...inputTokens.filter(token => !expectedSet.has(token)),
      ...expectedTokens.filter(token => !inputSet.has(token))
    ];
  }));
  const candidateQueries = contextualCandidates.length
    ? contextualCandidates
    : unique(normalizedQueries.flatMap(lexicalCandidates));
  const candidateEntries = candidateQueries.flatMap(query => entriesForQuery(evidence, query));
  const presentWords = unique(candidateEntries.map(entry => entry?.word));
  const bothPresent = candidateQueries.length >= 2 && candidateQueries.every(query =>
    presentWords.some(word => word === query)
  );

  return {
    rule_id: ruleId,
    status: bothPresent ? 'CONTEXT_REQUIRED' : (candidateEntries.length ? 'EVIDENCE_ONLY' : 'INSUFFICIENT'),
    reason: bothPresent
      ? '구별 후보가 모두 사전에 존재하므로 문맥 의미 판정 없이 자동 교정하지 않습니다.'
      : candidateEntries.length
        ? '사전 어휘 증거는 확보했지만 의미·문맥 판정이 추가로 필요합니다.'
        : '사전 어휘 증거가 없어 자동 판정을 승격하지 않습니다.',
    queries: normalizedQueries,
    lexical_candidates: candidateQueries,
    supporting_entries: candidateEntries.slice(0, 10),
    contexts
  };
}

export function evaluateDictionaryDecisions(dictionaryEvidence) {
  if (!dictionaryEvidence?.enabled) return [];

  const byRule = new Map();
  for (const item of dictionaryEvidence.rule_evidence ?? []) {
    if (!RULES.has(item?.rule_id)) continue;
    byRule.set(item.rule_id, item.queries ?? []);
  }

  return [...byRule.entries()].map(([ruleId, queries]) =>
    buildRuleDecision(ruleId, queries, dictionaryEvidence)
  );
}
