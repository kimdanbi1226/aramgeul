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

    return {
      rule_id: ruleId,
      status: personEntries.length && contextualName ? 'SUPPORTS' : 'INSUFFICIENT',
      reason: personEntries.length && contextualName
        ? '인명 사전 증거와 등록된 호칭어 문맥이 함께 확인됩니다.'
        : '인명 증거만으로는 이름·호칭 경계를 확정하지 않으며, 호칭어 문맥이 함께 확인되어야 합니다.',
      queries: normalizedQueries,
      supporting_entries: personEntries.slice(0, 10),
      contexts
    };
  }

  if (ruleId === 'SPACING-049-PROPER-NOUN') {
    const properNounEntries = matchedEntries.filter(entry => entry?.proper_noun === true);
    return {
      rule_id: ruleId,
      status: properNounEntries.length ? 'SUPPORTS' : 'INSUFFICIENT',
      reason: properNounEntries.length
        ? '사전 항목에 고유 명사로 정규화된 증거가 있습니다.'
        : '고유 명사 플래그가 확인되지 않아 명사 경계를 자동 확정하지 않습니다.',
      queries: normalizedQueries,
      supporting_entries: properNounEntries.slice(0, 10)
    };
  }

  // 제57항은 "어느 한쪽이 사전에 있다"만으로는 의미 판정을 할 수 없다.
  // 두 후보가 모두 표준 사전에 존재하면 문맥 판정이 반드시 필요하다.
  const candidateQueries = unique(normalizedQueries.flatMap(lexicalCandidates));
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
    supporting_entries: candidateEntries.slice(0, 10)
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
