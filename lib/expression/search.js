import { RULES_V01 } from '../rules/rules.v0.1.js';

function normalize(value) {
  return String(value ?? '')
    .trim()
    .replace(/\\s+/g, ' ')
    .toLocaleLowerCase('ko-KR');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function exampleRecords(rule) {
  const records = [];

  for (const example of rule?.examples ?? []) {
    if (typeof example?.input !== 'string') continue;
    records.push({
      input: example.input,
      expected: typeof example.expected === 'string' ? example.expected : null,
      candidates: Array.isArray(example.candidates) ? example.candidates : [],
      reason: example.reason ?? null,
      decision: example.decision ?? rule.decision_type ?? null
    });
  }

  for (const example of rule?.allowed_examples ?? []) {
    if (typeof example?.input !== 'string') continue;
    records.push({
      input: example.input,
      expected: typeof example.preferred === 'string'
        ? example.preferred
        : (typeof example.allowed === 'string' ? example.allowed : null),
      candidates: Array.isArray(example.alternatives)
        ? example.alternatives
        : (typeof example.allowed === 'string' ? [example.allowed] : []),
      reason: example.reason ?? null,
      decision: 'ALLOWED'
    });
  }

  for (const example of rule?.deferred_examples ?? []) {
    if (typeof example?.input !== 'string') continue;
    records.push({
      input: example.input,
      expected: typeof example.preferred === 'string' ? example.preferred : null,
      candidates: Array.isArray(example.candidates) ? example.candidates : [],
      reason: example.reason ?? null,
      decision: 'CONTEXT_REQUIRED'
    });
  }

  return records;
}

function isExpressionRule(rule) {
  return rule?.decision_type === 'AMBIGUOUS' ||
    rule?.category === 'expression' ||
    rule?.rule_id === 'ORTHO-057-DISTINGUISHING-WORDS';
}

export function searchLocalExpressions(query, limit = 8) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const results = [];

  for (const rule of RULES_V01) {
    if (!isExpressionRule(rule)) continue;

    for (const record of exampleRecords(rule)) {
      const haystack = normalize([
        record.input,
        record.expected,
        ...(record.candidates ?? []),
        record.reason
      ].join(' '));

      if (!haystack.includes(normalizedQuery)) continue;

      const exact =
        normalize(record.input) === normalizedQuery ||
        normalize(record.expected) === normalizedQuery ||
        (record.candidates ?? []).some(candidate => normalize(candidate) === normalizedQuery);

      results.push({
        type: 'rule',
        match: exact ? 'exact' : 'related',
        rule_id: rule.rule_id,
        title: rule.title,
        description: rule.description ?? '',
        input: record.input,
        expected: record.expected,
        candidates: unique(record.candidates),
        reason: record.reason,
        decision: record.decision,
        source_name: rule.source_name ?? null,
        source_url: rule.source_url ?? null,
        source_reference: rule.source_reference ?? null,
        source_detail_url: rule.source_detail_url ?? null,
        source_detail_label: rule.source_detail_label ?? null
      });
    }
  }

  results.sort((a, b) => {
    if (a.match !== b.match) return a.match === 'exact' ? -1 : 1;
    if (a.rule_id !== b.rule_id) return a.rule_id.localeCompare(b.rule_id);
    return a.input.localeCompare(b.input, 'ko');
  });

  return results.slice(0, Math.max(1, Math.min(limit, 20)));
}
