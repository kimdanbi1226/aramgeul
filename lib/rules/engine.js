import { RULES_V01 } from './rules.v0.1.js';

function functionsOf(token) {
  return new Set(token?.features?.grammar_functions ?? []);
}

function hasFunction(token, name) {
  return functionsOf(token).has(name);
}

function hasWhitespace(text) {
  return /\\s/.test(text);
}

function isPunctuation(token) {
  return ['SF', 'SP', 'SS', 'SE', 'SO', 'SW'].includes(token?.pos);
}

function buildSpacingEdit(text, left, right, rule, mode) {
  if (!Number.isInteger(left?.end) || !Number.isInteger(right?.start)) {
    return null;
  }

  const gapStart = left.end;
  const gapEnd = right.start;

  if (gapEnd < gapStart) {
    return null;
  }

  const gap = text.slice(gapStart, gapEnd);

  if (mode === 'insert' && gap.length === 0) {
    return {
      start: gapStart,
      end: gapEnd,
      replacement: ' ',
      rule_id: rule.rule_id,
      decision: rule.decision_type,
      source: {
        source_type: rule.source_type,
        source_name: rule.source_name,
        source_url: rule.source_url,
        source_reference: rule.source_reference
      },
      confidence: rule.confidence
    };
  }

  if (mode === 'remove' && gap.length > 0 && hasWhitespace(gap)) {
    return {
      start: gapStart,
      end: gapEnd,
      replacement: '',
      rule_id: rule.rule_id,
      decision: rule.decision_type,
      source: {
        source_type: rule.source_type,
        source_name: rule.source_name,
        source_url: rule.source_url,
        source_reference: rule.source_reference
      },
      confidence: rule.confidence
    };
  }

  return null;
}

function addEdit(edits, edit) {
  if (!edit) return;

  const duplicate = edits.some(existing =>
    existing.start === edit.start &&
    existing.end === edit.end &&
    existing.replacement === edit.replacement
  );

  if (!duplicate) edits.push(edit);
}

function applyEdits(text, edits) {
  return [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (current, edit) =>
        current.slice(0, edit.start) +
        edit.replacement +
        current.slice(edit.end),
      text
    );
}

/**
 * 형태소 분석 결과를 이용해 띄어쓰기 후보를 만든다.
 *
 * 이 버전은 의존 명사/보조 용언/부정 부사/조사처럼
 * 문맥 의존성이 비교적 명확한 초기 규칙만 다룬다.
 * 의미 판단이 필요한 안되다/안 되다 등의 예외는 후속 규칙에서 처리한다.
 */
export function evaluateSpacing(analysis) {
  if (!analysis || typeof analysis.text !== 'string' || !Array.isArray(analysis.tokens)) {
    throw new TypeError('유효한 형태소 분석 결과가 필요합니다.');
  }

  const rules = new Map(RULES_V01.map(rule => [rule.rule_id, rule]));
  const dependentNounRule = rules.get('SPACING-042-DEPENDENT-NOUN');
  const auxiliaryRule = rules.get('SPACING-047-AUXILIARY-VERB');
  const negativeAdverbRule = rules.get('SPACING-NEGATIVE-ADVERB');
  const josaRule = rules.get('SPACING-JOSA-ATTACH');

  const edits = [];

  for (let i = 0; i < analysis.tokens.length - 1; i += 1) {
    const left = analysis.tokens[i];
    const right = analysis.tokens[i + 1];

    if (isPunctuation(left) || isPunctuation(right)) continue;

    if (hasFunction(right, 'DEPENDENT_NOUN')) {
      addEdit(edits, buildSpacingEdit(
        analysis.text,
        left,
        right,
        dependentNounRule,
        'insert'
      ));
    }

    if (hasFunction(right, 'AUXILIARY_VERB')) {
      addEdit(edits, buildSpacingEdit(
        analysis.text,
        left,
        right,
        auxiliaryRule,
        'insert'
      ));
    }

    if (hasFunction(left, 'NEGATIVE_ADVERB') && hasFunction(right, 'LEXICAL_VERB')) {
      addEdit(edits, buildSpacingEdit(
        analysis.text,
        left,
        right,
        negativeAdverbRule,
        'insert'
      ));
    }

    if (hasFunction(right, 'JOSA')) {
      addEdit(edits, buildSpacingEdit(
        analysis.text,
        left,
        right,
        josaRule,
        'remove'
      ));
    }
  }

  return {
    input: analysis.text,
    revised: applyEdits(analysis.text, edits),
    edits,
    decision: edits.length > 0 ? 'CORRECTION' : 'VALID'
  };
}

export function createRuleEngine() {
  return {
    evaluate(analysis) {
      return evaluateSpacing(analysis);
    }
  };
}
