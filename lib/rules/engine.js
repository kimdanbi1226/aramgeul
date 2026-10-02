import { RULES_V01, toRuleEvidence } from './rules.v0.1.js';

function functionsOf(token) {
  return new Set(token?.features?.grammar_functions ?? []);
}

function hasFunction(token, name) {
  return functionsOf(token).has(name);
}

function hasPosTag(token, tag) {
  const pos = Array.isArray(token?.pos)
    ? token.pos
    : String(token?.pos ?? '').split('+').filter(Boolean);
  return pos.includes(tag);
}

function hasWhitespace(text) {
  return /\s/.test(text);
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
      rule: toRuleEvidence(rule),
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

const MANDATORY_AUXILIARY_SPACING_LEMMAS = new Set([
  '생각하다',
  '공부하다',
  '예측하다',
  '사용하다',
  '쫓아내다',
  '매달다',
  '집어넣다',
  '파고들다',
  '깨뜨리다',
  '깨트리다'
]);

const MANDATORY_AUXILIARY_SPACING_FORMS = new Set([
  '생각해',
  '공부해',
  '예측해',
  '사용해'
]);

function hasMandatoryAuxiliarySpacing(left, previous = null, previousPrevious = null) {
  if (
    (left?.lemma && MANDATORY_AUXILIARY_SPACING_LEMMAS.has(left.lemma)) ||
    (left?.text && MANDATORY_AUXILIARY_SPACING_FORMS.has(left.text))
  ) {
    return true;
  }

  // 분석기가 '생각해'를 '생각' + '해'처럼 분해하는 경우에도
  // 본용언 활용형 전체를 기준으로 제47항 판정을 이어 간다.
  // 단순히 '해'만 보고 교정하지 않고, 바로 앞 토큰이 실제 용언이면
  // '용언 어간 + 해 + 보조 용언' 구조로 제한한다.
  if (
    left &&
    previous &&
    hasPosTag(previous, 'XSV') &&
    ['아', '어', '여'].includes(left.text)
  ) {
    // '생각하 + 어 + 보아라'처럼 파생어 본용언이 형태소 단위로
    // 분해된 경우에도 제47항의 '파생어 + 보조 용언' 예외를 적용한다.
    return true;
  }

  return Boolean(
    left?.text === '해' &&
    previous &&
    hasFunction(previous, 'LEXICAL_VERB')
  );
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

    if (hasFunction(left, 'DEPENDENT_NOUN') && hasFunction(right, 'LEXICAL_VERB')) {
      addEdit(edits, buildSpacingEdit(
        analysis.text,
        left,
        right,
        dependentNounRule,
        'insert'
      ));
    }

    if (
      hasFunction(right, 'AUXILIARY_VERB') &&
      hasMandatoryAuxiliarySpacing(
        left,
        analysis.tokens[i - 1] ?? null,
        analysis.tokens[i - 2] ?? null
      )
    ) {
      addEdit(edits, buildSpacingEdit(
        analysis.text,
        left,
        right,
        auxiliaryRule,
        'insert'
      ));
    }

    // '안/못'은 의미와 문맥에 따라 붙여 쓰는 경우가 있어
    // 현재 형태소 정보만으로 자동 교정하지 않는다.
    // 예: '안 돼요'와 '안돼요'는 문맥에 따라 모두 가능한 표기가 있다.
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
