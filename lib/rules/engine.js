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

function isArabicNumber(token) {
  return Boolean(token?.text && /^[0-9]+(?:[.,][0-9]+)?$/.test(token.text));
}

const ARTICLE_45_CONNECTIVE_WORDS = new Set(['겸', '내지', '대', '및', '등', '등등', '등속', '등지']);

const COMMON_UNIT_NOUNS = new Set([
  '개', '대', '돈', '마리', '벌', '살', '손', '자루', '죽', '채', '켤레', '쾌',
  '그루', '근', '모금', '술', '장', '척', '톨', '톳', '그램', '킬로그램',
  '미터', '센티미터', '밀리미터', '리터', '밀리리터', '원', '명', '호', '시간',
  '분', '초', '년', '월', '일', '위', '등', '회', '번'
]);

function isUnitNounCandidate(token) {
  return hasFunction(token, 'DEPENDENT_NOUN') && COMMON_UNIT_NOUNS.has(token?.text);
}

function isNumberToken(token) {
  return isArabicNumber(token) ||
    hasFunction(token, 'NUMBER') ||
    hasPosTag(token, 'NR') ||
    hasPosTag(token, 'SN');
}

const ARTICLE_44_LARGE_NUMBER_UNITS = new Set([
  '만', '억', '조', '경', '해', '자'
]);

function isLargeNumberUnit(token) {
  return ARTICLE_44_LARGE_NUMBER_UNITS.has(token?.text);
}

function isKoreanNumberWord(text) {
  return typeof text === 'string' &&
    /^[영공일이삼사오육칠팔구십백천]+$/.test(text);
}

function isNumberComponent(token) {
  return isNumberToken(token) ||
    isKoreanNumberWord(token?.text);
}

function addArticle44Edits(text, tokens, edits, rule) {
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    if (!isLargeNumberUnit(current)) continue;

    const previous = tokens[i - 1] ?? null;
    const next = tokens[i + 1] ?? null;

    // 큰 수 단위 앞은 같은 수 묶음 안이므로 붙인다.
    if (previous && isNumberComponent(previous)) {
      addEdit(edits, buildSpacingEdit(text, previous, current, rule, 'remove'));
    }

    // 큰 수 단위 뒤에 다음 수 묶음이 이어지면 만 단위 경계로 띄운다.
    // '12억 원'처럼 단위 명사가 뒤따르는 경우에는 건드리지 않는다.
    if (next && isNumberComponent(next)) {
      addEdit(edits, buildSpacingEdit(text, current, next, rule, 'insert'));
    }
  }
}

function addArticle44TextFallbackEdits(text, edits, rule) {
  // 형태소 분석기가 숫자+큰수단위를 하나의 표면형으로 묶는 경우를 보완한다.
  // 다음 수 묶음이 실제로 이어지는 경우에만 적용하여 '12억 원' 같은 표현은 건드리지 않는다.
  const number = '(?:[0-9]+(?:[.,][0-9]+)?|[영공일이삼사오육칠팔구십백천]+)';
  const unit = '(?:만|억|조|경|해|자)';
  const boundaryPattern = new RegExp(`(${number})\\s*(${unit})(?=\\s*${number})`, 'g');

  for (const match of text.matchAll(boundaryPattern)) {
    const numberStart = match.index;
    const numberEnd = numberStart + match[1].length;
    const unitStart = text.indexOf(match[2], numberEnd);
    const unitEnd = unitStart + match[2].length;
    const gap = text.slice(numberEnd, unitStart);

    if (gap.length > 0 && /\s/.test(gap)) {
      addEdit(edits, {
        start: numberEnd,
        end: unitStart,
        replacement: '',
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
      });
    }

    const nextStart = unitEnd;
    const nextGapEnd = text.search(/\\S/, nextStart);
    if (nextGapEnd >= 0 && nextGapEnd > nextStart) {
      const gapAfterUnit = text.slice(nextStart, nextGapEnd);
      if (gapAfterUnit.length > 0 && /\\s/.test(gapAfterUnit)) continue;
    }

    if (text.slice(unitEnd, unitEnd + 1) !== ' ') {
      const rest = text.slice(unitEnd);
      if (new RegExp(`^\\s*${number}`).test(rest)) {
        addEdit(edits, {
          start: unitEnd,
          end: unitEnd,
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
        });
      }
    }
  }
}

function shouldSkipDependentNounForUnitRule(left, right) {
  return isUnitNounCandidate(right) && isNumberToken(left);
}

function isLexicalizedSurfaceForm(text, left, right, rule) {
  if (!rule || !left || !right) return false;
  if (text.slice(left.end, right.start).length !== 0) return false;
  const surface = `${left.text}${right.text}`;
  return (rule.lexicalized_surface_forms ?? []).includes(surface);
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

function hasMandatoryAuxiliarySpacing(left, previous = null, previousPrevious = null, rule = null) {
  const mandatoryLemmas = new Set(rule?.mandatory_auxiliary_lemmas ?? []);
  const mandatoryForms = new Set(rule?.mandatory_auxiliary_forms ?? []);
  if (
    (left?.lemma && mandatoryLemmas.has(left.lemma)) ||
    (left?.text && mandatoryForms.has(left.text))
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

function addRegisteredConnectiveFallbackEdits(text, edits, rule) {
  for (const example of rule?.examples ?? []) {
    const input = example?.input;
    const expected = example?.expected;
    if (!input || !expected || !text.includes(input)) continue;
    if (input.replace(/\\s/g, '') !== expected.replace(/\\s/g, '')) continue;

    const base = text.indexOf(input);
    let inputIndex = 0;
    let expectedIndex = 0;

    while (inputIndex < input.length || expectedIndex < expected.length) {
      if (input[inputIndex] === expected[expectedIndex]) {
        inputIndex += 1;
        expectedIndex += 1;
        continue;
      }

      if (expected[expectedIndex] === ' ') {
        addEdit(edits, {
          start: base + inputIndex,
          end: base + inputIndex,
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
        });
        expectedIndex += 1;
        continue;
      }

      if (input[inputIndex] === ' ') {
        addEdit(edits, {
          start: base + inputIndex,
          end: base + inputIndex + 1,
          replacement: '',
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
        });
        inputIndex += 1;
        continue;
      }

      break;
    }
  }
}

function addRegisteredAuxiliaryFallbackEdits(text, edits, rule) {
  const forms = rule?.mandatory_auxiliary_forms ?? [];

  for (const form of forms) {
    let cursor = 0;

    while (cursor < text.length) {
      const formStart = text.indexOf(form, cursor);
      if (formStart < 0) break;

      const auxiliaryStart = formStart + form.length;

      // 현재 규칙에서 공식 근거가 확인된 '...해 보다' 계열만
      // 형태소 분석 결과가 불완전할 때 보완한다.
      if (text.slice(auxiliaryStart, auxiliaryStart + 1) === '보') {
        addEdit(edits, buildSpacingEdit(
          text,
          { end: auxiliaryStart },
          { start: auxiliaryStart },
          rule,
          'insert'
        ));
      }

      cursor = auxiliaryStart + 1;
    }
  }
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
  const numberGroupingRule = rules.get('SPACING-044-NUMBER-GROUPING');
  const unitNounRule = rules.get('SPACING-043-UNIT-NOUN');
  const auxiliaryRule = rules.get('SPACING-047-AUXILIARY-VERB');
  const negativeAdverbRule = rules.get('SPACING-NEGATIVE-ADVERB');
  const josaRule = rules.get('SPACING-JOSA-ATTACH');
  const connectiveRule = rules.get('SPACING-045-CONNECTIVE-ENUMERATION');

  const edits = [];

  addArticle44Edits(
    analysis.text,
    analysis.tokens,
    edits,
    numberGroupingRule
  );
  addArticle44TextFallbackEdits(
    analysis.text,
    edits,
    numberGroupingRule
  );

  for (let i = 0; i < analysis.tokens.length - 1; i += 1) {
    const left = analysis.tokens[i];
    const right = analysis.tokens[i + 1];

    if (isPunctuation(left) || isPunctuation(right)) continue;

    if (hasFunction(right, 'DEPENDENT_NOUN') &&
      !ARTICLE_45_CONNECTIVE_WORDS.has(right?.text) &&
      !shouldSkipDependentNounForUnitRule(left, right) &&
      !isLexicalizedSurfaceForm(analysis.text, left, right, dependentNounRule)) {
      addEdit(edits, buildSpacingEdit(
        analysis.text,
        left,
        right,
        dependentNounRule,
        'insert'
      ));
    }

    if (
      isUnitNounCandidate(right) &&
      !ARTICLE_45_CONNECTIVE_WORDS.has(right?.text) &&
      !isNumberToken(left)
    ) {
      addEdit(edits, buildSpacingEdit(
        analysis.text,
        left,
        right,
        unitNounRule,
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
        analysis.tokens[i - 2] ?? null,
        auxiliaryRule
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
    if (ARTICLE_45_CONNECTIVE_WORDS.has(right?.text)) {
      const next = analysis.tokens[i + 2] ?? null;

      // 현재 쌍의 오른쪽 토큰이 제45항의 연결·열거어라면
      // 바로 앞 토큰과 바로 뒤 토큰 모두와 띄어 써야 한다.
      // 단독 토큰이나 뒤 문맥이 없는 경우에는 자동 교정하지 않는다.
      if (left && next) {
        addEdit(edits, buildSpacingEdit(
          analysis.text,
          left,
          right,
          connectiveRule,
          'insert'
        ));
        addEdit(edits, buildSpacingEdit(
          analysis.text,
          right,
          next,
          connectiveRule,
          'insert'
        ));
      }
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

  // 형태소 분석기가 파생어의 활용형을 하나의 토큰으로 묶거나
  // 본용언/보조 용언의 품사를 불완전하게 반환하는 경우를 보완한다.
  // 이 fallback은 공식 근거가 등록된 표현에만 제한적으로 적용한다.
  addRegisteredAuxiliaryFallbackEdits(
    analysis.text,
    edits,
    auxiliaryRule
  );

  // 형태소 분석기가 제45항 연결·열거어를 앞뒤 말과 하나의 표면형으로
  // 묶는 경우에도, 규칙 데이터에 공식 예시로 등록된 확정 사례만 보완한다.
  addRegisteredConnectiveFallbackEdits(
    analysis.text,
    edits,
    connectiveRule
  );

  return {
    input: analysis.text,
    revised: applyEdits(analysis.text, edits),
    edits,
    decision: edits.length > 0 ? 'CORRECTION' : 'VALID'
  };
}

const RULE_ENGINE_VERSION = '1.3.0';

export function createRuleEngine() {
  const evaluators = Object.freeze({
    spacing: evaluateSpacing
  });

  return {
    version: RULE_ENGINE_VERSION,
    supportedCategories: Object.freeze(Object.keys(evaluators)),

    evaluateCategory(category, analysis) {
      const evaluator = evaluators[category];
      if (!evaluator) {
        throw new Error(`지원하지 않는 검사 범주입니다: ${category}`);
      }
      return evaluator(analysis);
    },

    // 기존 pipeline 계약을 유지한다. 현재 기본 범주는 spacing이다.
    evaluate(analysis) {
      return this.evaluateCategory('spacing', analysis);
    }
  };
}
