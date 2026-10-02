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

const numberCases = [
  ['12억3456만7898', '12억 3456만 7898'],
  ['십이억삼천사백오십육만칠천팔백구십팔', '십이억 삼천사백오십육만 칠천팔백구십팔'],
  ['12 억 3456 만 7898', '12억 3456만 7898']
];

for (const [numberInput, expected] of numberCases) {
  const numberAnalysis = await analyze(numberInput);
  const numberResult = evaluateSpacing(numberAnalysis);
  console.log(JSON.stringify({
    input: numberInput,
    tokens: numberAnalysis.tokens.map(token => ({
      text: token.text,
      pos: token.pos,
      functions: token.features.grammar_functions,
      start: token.start,
      end: token.end
    })),
    revised: numberResult.revised
  }, null, 2));

  assert.equal(
    numberResult.revised,
    expected,
    `제44항 실제 kuromoji-ko 런타임 결과가 예상과 다릅니다: ${numberInput}`
  );
}

const lexicalizedCases = [
  '그동안',
  '그사이',
  '이때',
  '그때',
  '저때',
  '이만큼',
  '그만큼',
  '저만큼',
  '그따위',
  '이따위',
  '저따위'
];

for (const lexicalizedInput of lexicalizedCases) {
  const lexicalizedAnalysis = await analyze(lexicalizedInput);
  const lexicalizedResult = evaluateSpacing(lexicalizedAnalysis);
  assert.equal(
    lexicalizedResult.revised,
    lexicalizedInput,
    `사전 등재 표현을 제42항으로 잘못 띄우면 안 됩니다: ${lexicalizedInput}`
  );
}

console.log('Kuromoji lexicalized-form guard test: PASS');
