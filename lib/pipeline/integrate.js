/**
 * 아람글의 서로 다른 검사 계층 결과를 하나의 판정 구조로 통합한다.
 *
 * 원칙:
 * - 규칙 엔진과 Bareun의 근거를 각각 보존한다.
 * - 한쪽만 교정하면 그 교정을 후보로 채택한다.
 * - 같은 교정이면 하나의 결과로 통합한다.
 * - 서로 다른 교정이면 임의로 하나를 고르지 않고 AMBIGUOUS로 둔다.
 */

function normalizeCandidate(candidate, source) {
  if (!candidate || typeof candidate.revised !== 'string') return null;

  return {
    source,
    revised: candidate.revised,
    edits: Array.isArray(candidate.edits) ? candidate.edits : [],
    decision: candidate.decision || (candidate.revised === candidate.input ? 'VALID' : 'CORRECTION'),
    confidence: candidate.confidence ?? null,
    sources: Array.isArray(candidate.sources) ? candidate.sources : []
  };
}

function isCorrection(candidate, input) {
  return Boolean(candidate && candidate.revised !== input);
}


function applyEdits(input, edits) {
  if (!Array.isArray(edits) || edits.some(edit => !Number.isInteger(edit?.start) || !Number.isInteger(edit?.end))) {
    return null;
  }

  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let revised = input;
  for (const edit of ordered) {
    if (edit.start < 0 || edit.end < edit.start || edit.end > input.length) return null;
    revised = revised.slice(0, edit.start) + String(edit.replacement ?? '') + revised.slice(edit.end);
  }
  return revised;
}

function filterDictionaryBlockedEdits(input, candidate, dictionaryDecisions) {
  if (!candidate || !Array.isArray(candidate.edits) || !Array.isArray(dictionaryDecisions)) return candidate;

  const blockedRules = new Set(
    dictionaryDecisions
      .filter(item => ['SPACING-048-NAME-APPELLATION', 'SPACING-049-PROPER-NOUN'].includes(item?.rule_id) && item?.status === 'BOUNDARY_REQUIRED')
      .map(item => item.rule_id)
  );
  if (!blockedRules.size) return candidate;

  const keptEdits = candidate.edits.filter(edit => !blockedRules.has(edit?.rule_id));
  if (keptEdits.length === candidate.edits.length) return candidate;

  const revised = applyEdits(input, keptEdits);
  if (revised === null) {
    return {
      ...candidate,
      revised: input,
      edits: [],
      decision: 'VALID'
    };
  }

  return {
    ...candidate,
    revised,
    edits: keptEdits,
    decision: revised === input ? 'VALID' : 'CORRECTION'
  };
}

export function integrateCheckResults(input, { ruleResult = null, bareunResult = null, dictionaryDecisions = [] } = {}) {
  if (typeof input !== 'string') {
    throw new TypeError('통합 검사 입력은 문자열이어야 합니다.');
  }

  const rule = filterDictionaryBlockedEdits(input, normalizeCandidate(ruleResult, 'aramgeul-rule'), dictionaryDecisions);
  const bareun = normalizeCandidate(bareunResult, 'bareun');

  const ruleCorrection = isCorrection(rule, input);
  const bareunCorrection = isCorrection(bareun, input);

  if (!rule && !bareun) {
    return {
      input,
      revised: input,
      decision: 'NO_DECISION',
      edits: [],
      sources: [],
      evidence: { rule_result: null, bareun_result: null }
    };
  }

  if (ruleCorrection && bareunCorrection) {
    if (rule.revised === bareun.revised) {
      return {
        input,
        revised: rule.revised,
        decision: 'CORRECTION',
        edits: [...rule.edits],
        sources: [...new Set([...rule.sources, ...bareun.sources])],
        evidence: {
          rule_result: rule,
          bareun_result: bareun
        }
      };
    }

    return {
      input,
      revised: input,
      decision: 'AMBIGUOUS',
      edits: [],
      sources: [...new Set([...rule.sources, ...bareun.sources])],
      candidates: [
        { source: 'aramgeul-rule', revised: rule.revised, edits: rule.edits },
        { source: 'bareun', revised: bareun.revised, edits: bareun.edits }
      ],
      evidence: {
        rule_result: rule,
        bareun_result: bareun
      }
    };
  }

  if (ruleCorrection) {
    return {
      input,
      revised: rule.revised,
      decision: 'CORRECTION',
      edits: [...rule.edits],
      sources: rule.sources,
      evidence: {
        rule_result: rule,
        bareun_result: bareun
      }
    };
  }

  if (bareunCorrection) {
    return {
      input,
      revised: bareun.revised,
      decision: 'CORRECTION',
      edits: [...bareun.edits],
      sources: bareun.sources,
      evidence: {
        rule_result: rule,
        bareun_result: bareun
      }
    };
  }

  return {
    input,
    revised: input,
    decision: 'VALID',
    edits: [],
    sources: [...new Set([...rule?.sources ?? [], ...bareun?.sources ?? []])],
    evidence: {
      rule_result: rule,
      bareun_result: bareun
    }
  };
}

export function createBareunResult(data, input) {
  const revised = typeof data?.revised === 'string' ? data.revised : input;

  const edits = Array.isArray(data?.revised_blocks)
    ? data.revised_blocks
        .filter(block => typeof block?.revised === 'string' && block.revised !== block?.origin?.text)
        .map(block => ({
          origin: block.origin?.text || '',
          revised: block.revised,
          help: block.help || ''
        }))
    : [];

  const sources = [{
    source: 'Bareun',
    source_type: 'correction_engine',
    source_url: 'https://bareun.ai/docs/howtouse/api-correct/'
  }];

  return {
    input,
    revised,
    edits,
    decision: revised === input ? 'VALID' : 'CORRECTION',
    sources
  };
}
