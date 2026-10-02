import { RULES_V01 } from '../rules/rules.v0.1.js';

const DICTIONARY_BACKED_RULE_IDS = new Set([
  'SPACING-048-NAME-APPELLATION',
  'SPACING-049-PROPER-NOUN',
  'SPACING-050-TECHNICAL-TERM',
  'ORTHO-057-DISTINGUISHING-WORDS'
]);

function unique(values) {
  return [...new Set(values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))];
}

function surfaceExamples(rule) {
  return [
    ...(rule?.examples ?? []).map(example => example?.input),
    ...(rule?.allowed_examples ?? []).map(example => example?.input),
    ...(rule?.deferred_examples ?? []).flatMap(example => [
      example?.input,
      ...(example?.candidates ?? [])
    ])
  ];
}

function matchingSurfaceRecords(text, rule) {
  return (rule?.examples ?? [])
    .filter(example => typeof example?.input === 'string' && text.includes(example.input))
    .map(example => ({ input: example.input, expected: example.expected ?? null }))
    .concat(
      (rule?.allowed_examples ?? [])
        .filter(example => typeof example?.input === 'string' && text.includes(example.input))
        .map(example => ({ input: example.input, expected: example.preferred ?? example.allowed ?? null }))
    )
    .concat(
      (rule?.deferred_examples ?? [])
        .filter(example => typeof example?.input === 'string' && text.includes(example.input))
        .map(example => ({ input: example.input, expected: example.candidates?.[0] ?? null }))
    );
}

function matchingSurfaces(text, rule) {
  return unique(matchingSurfaceRecords(text, rule).map(record => record.input));
}

function lexicalTokens(value) {
  return unique(
    String(value ?? '')
      .split(/[\s/·,，、()[\]{}]+/)
      .map(token => token.replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9]+$/g, ''))
      .filter(token => token.length >= 2)
  );
}

function editSurface(text, edit) {
  if (!Number.isInteger(edit?.start) || !Number.isInteger(edit?.end)) return null;
  return text.slice(edit.start, edit.end);
}

function summarizeEntry(entry) {
  return {
    word: entry.word,
    source: entry.source,
    entry_id: entry.entry_id,
    pos: entry.pos,
    categories: entry.categories,
    labels: entry.labels,
    standard: entry.standard,
    proper_noun: entry.proper_noun,
    technical_term: entry.technical_term,
    person_name: entry.person_name,
    senses: entry.senses?.slice(0, 3) ?? [],
    metadata: entry.metadata
  };
}

/**
 * 사전은 교정 결과를 직접 변경하지 않고, 특정 문맥 의존 규칙에 대한
 * 어휘적 증거만 제공한다.
 *
 * 대상 규칙:
 * - 제48항: 성명·호·호칭어
 * - 제49항: 고유 명사
 * - 제50항: 전문 용어
 * - 제57항: 의미에 따른 구별 표기
 *
 * API 장애/인증키 부재/검색 결과 없음은 모두 "증거 없음"으로 처리한다.
 * 따라서 이 함수의 결과만으로 기존 교정 결과를 자동 승격하지 않는다.
 */
export async function collectDictionaryEvidence({
  text,
  ruleResult = null,
  dictionaryService
} = {}) {
  if (typeof text !== 'string' || !text.trim() || !dictionaryService) {
    return {
      enabled: false,
      queries: [],
      matches: [],
      rule_evidence: []
    };
  }

  const rules = new Map(RULES_V01.map(rule => [rule.rule_id, rule]));
  const queryByRule = new Map();

  for (const edit of ruleResult?.edits ?? []) {
    if (!DICTIONARY_BACKED_RULE_IDS.has(edit?.rule_id)) continue;
    const surface = editSurface(text, edit);
    if (surface) {
      if (!queryByRule.has(edit.rule_id)) queryByRule.set(edit.rule_id, new Set());
      queryByRule.get(edit.rule_id).add(surface);
    }
  }

  const contextByRule = new Map();

  for (const ruleId of DICTIONARY_BACKED_RULE_IDS) {
    const rule = rules.get(ruleId);
    const records = matchingSurfaceRecords(text, rule);
    if (!records.length) continue;
    if (!queryByRule.has(ruleId)) queryByRule.set(ruleId, new Set());
    if (ruleId === 'ORTHO-057-DISTINGUISHING-WORDS') {
      records.forEach(record => {
        // 의미 구별 규칙은 잘못된 표기(input)만 조회해서는
        // 비교 대상(correct/expected)이 사전에 존재하는지 확인할 수 없다.
        // 입력과 기대 표기를 모두 어휘 단위로 조회해야
        // '둘로 갈음' → '둘로 가름'처럼 두 후보가 모두 표준어인 경우
        // CONTEXT_REQUIRED로 올바르게 승격할 수 있다.
        const inputTokens = lexicalTokens(record.input);
        const expectedTokens = lexicalTokens(record.expected);
        inputTokens.forEach(value => queryByRule.get(ruleId).add(value));
        expectedTokens.forEach(value => queryByRule.get(ruleId).add(value));

        if (!contextByRule.has(ruleId)) contextByRule.set(ruleId, []);
        contextByRule.get(ruleId).push({
          input: record.input,
          expected: record.expected,
          input_tokens: inputTokens,
          expected_tokens: expectedTokens
        });
      });
    } else if (ruleId === 'SPACING-048-NAME-APPELLATION' || ruleId === 'SPACING-049-PROPER-NOUN') {
      records.forEach(record => {
        queryByRule.get(ruleId).add(record.input);
        lexicalTokens(record.expected).forEach(value => queryByRule.get(ruleId).add(value));
        if (!contextByRule.has(ruleId)) contextByRule.set(ruleId, []);
        contextByRule.get(ruleId).push({
          input: record.input,
          expected: record.expected,
          tokens: lexicalTokens(record.expected),
          candidate_units: lexicalTokens(record.expected),
          candidate_surface: record.input
        });
      });
    } else {
      records.forEach(record => queryByRule.get(ruleId).add(record.input));
    }
  }

  const jobs = [];
  for (const [ruleId, querySet] of queryByRule.entries()) {
    for (const query of querySet) {
      jobs.push({ ruleId, query });
    }
  }

  const settled = await Promise.allSettled(
    jobs.map(job => dictionaryService.lookup(job.query, { num: 10 }))
  );

  const matches = [];
  for (let i = 0; i < settled.length; i += 1) {
    const job = jobs[i];
    const result = settled[i];
    if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;

    const entries = result.value.slice(0, 10).map(summarizeEntry);
    if (!entries.length) continue;

    matches.push({
      rule_id: job.ruleId,
      query: job.query,
      entries,
      context: contextByRule.get(job.ruleId) ?? []
    });
  }

  const rule_evidence = [...queryByRule.keys()].map(ruleId => {
    const rule = rules.get(ruleId);
    const ruleMatches = matches.filter(match => match.rule_id === ruleId);
    return {
      rule_id: ruleId,
      title: rule?.title ?? null,
      dictionary_match_count: ruleMatches.reduce((count, item) => count + item.entries.length, 0),
      queries: [...new Set(ruleMatches.map(item => item.query))],
      matched: ruleMatches.length > 0,
      contexts: contextByRule.get(ruleId) ?? []
    };
  });

  return {
    enabled: true,
    queries: jobs.map(job => ({ rule_id: job.ruleId, query: job.query })),
    matches,
    rule_evidence
  };
}
