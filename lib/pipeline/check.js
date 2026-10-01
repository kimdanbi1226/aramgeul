import { assertMorphologyAdapter } from '../morphology/adapter.js';
import { createRuleEngine } from '../rules/engine.js';

/**
 * 형태소 분석기와 규칙 엔진을 실제 검사 흐름으로 연결한다.
 *
 * 분석기 구현체 자체(Kiwi JS/WASM 등)는 이 함수에 주입한다.
 * 따라서 모델 파일 공급 방식과 규칙 엔진을 분리해서 검증할 수 있다.
 */
export async function checkText(text, morphologyAdapter, ruleEngine = createRuleEngine()) {
  if (typeof text !== 'string') {
    throw new TypeError('검사 입력은 문자열이어야 합니다.');
  }

  assertMorphologyAdapter(morphologyAdapter);

  if (!ruleEngine || typeof ruleEngine.evaluate !== 'function') {
    throw new TypeError('규칙 엔진은 evaluate(analysis) 인터페이스를 제공해야 합니다.');
  }

  const analysis = await morphologyAdapter.analyze(text);
  const evaluation = ruleEngine.evaluate(analysis);

  return {
    input: text,
    analysis,
    result: evaluation
  };
}
