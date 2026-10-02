import assert from 'node:assert/strict';
import { analyze } from '../lib/morphology/mecab-ko.js';
import { evaluateSpacing } from '../lib/rules/engine.js';

const input = '나는 이것을 할수있다고 생각해보았다.';
const analysis = await analyze(input);

console.log(JSON.stringify({
  input,
  tokens: analysis.tokens.map(token => ({
    text: token.text,
    pos: token.pos,
    functions: token.features.grammar_functions,
    start: token.start,
    end: token.end,
    lemma: token.lemma
  }))
}, null, 2));

const result = evaluateSpacing(analysis);

assert.equal(
  result.revised,
  '나는 이것을 할 수 있다고 생각해 보았다.',
  '실제 kuromoji-ko 런타임의 규칙 엔진 결과가 예상과 다릅니다.'
);

const auxiliaryEdits = result.edits.filter(
  edit => edit.rule_id === 'SPACING-047-AUXILIARY-VERB'
);
assert.ok(auxiliaryEdits.length >= 1, '생각해 보았다 보조 용언 교정이 생성되어야 합니다.');

console.log('Kuromoji production runtime spacing test: PASS');
