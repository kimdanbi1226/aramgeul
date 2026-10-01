/**
 * 아람글 형태소 분석기 공통 어댑터 인터페이스
 *
 * 특정 분석기(MeCab-Ko, KOMORAN, Khaiii, Kiwi)에 규칙 엔진이
 * 직접 의존하지 않도록 원시 분석 결과를 공통 모델로 변환한다.
 */

/**
 * @typedef {Object} MorphToken
 * @property {string} text
 * @property {string} normalized
 * @property {string|null} lemma
 * @property {string|null} pos
 * @property {Array<Object>} morphemes
 * @property {Object} features
 * @property {number|null} start
 * @property {number|null} end
 * @property {number} confidence
 */

/**
 * @typedef {Object} MorphAnalysis
 * @property {string} text
 * @property {MorphToken[]} tokens
 * @property {Array<Object>} candidates
 * @property {Object} metadata
 */

/**
 * 분석기 구현체가 반드시 제공해야 하는 최소 인터페이스.
 *
 * analyze(text) -> MorphAnalysis
 *
 * 실제 분석기 패키지는 별도 adapter에서 연결한다.
 */
export function assertMorphologyAdapter(adapter) {
  if (!adapter || typeof adapter.analyze !== 'function') {
    throw new TypeError('형태소 분석기는 analyze(text) 인터페이스를 제공해야 합니다.');
  }
}

/**
 * 형태소 분석 결과의 최소 공통 구조를 검증한다.
 */
export function validateMorphologyResult(result) {
  if (!result || typeof result.text !== 'string' || !Array.isArray(result.tokens)) {
    throw new TypeError('형태소 분석 결과 형식이 올바르지 않습니다.');
  }

  for (const token of result.tokens) {
    if (!token || typeof token.text !== 'string') {
      throw new TypeError('형태소 토큰의 text가 없습니다.');
    }

    if (!Array.isArray(token.morphemes)) {
      throw new TypeError('형태소 토큰의 morphemes가 배열이어야 합니다.');
    }

    if (typeof token.features !== 'object' || token.features === null) {
      throw new TypeError('형태소 토큰의 features가 객체여야 합니다.');
    }
  }

  return true;
}
