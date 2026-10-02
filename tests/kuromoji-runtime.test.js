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

const auxiliaryCases = [
  ['공부해보아라', '공부해 보아라'],
  ['깨뜨려버렸다', '깨뜨려 버렸다'],
  ['먹어보았다', '먹어보았다'],
  ['구해본다', '구해본다'],
  ['더해줬다', '더해줬다']
];

for (const [auxiliaryInput, expected] of auxiliaryCases) {
  const auxiliaryAnalysis = await analyze(auxiliaryInput);
  const auxiliaryResult = evaluateSpacing(auxiliaryAnalysis);
  assert.equal(
    auxiliaryResult.revised,
    expected,
    `제47항 실제 kuromoji-ko 런타임 결과가 예상과 다릅니다: ${auxiliaryInput}`
  );
}

const connectiveCases = [
  ['국장겸과장', '국장 겸 과장'],
  ['청군대백군', '청군 대 백군'],
  ['이사장및이사들', '이사장 및 이사들']
];

for (const [connectiveInput, expected] of connectiveCases) {
  const connectiveAnalysis = await analyze(connectiveInput);
  const connectiveResult = evaluateSpacing(connectiveAnalysis);
  assert.equal(
    connectiveResult.revised,
    expected,
    `제45항 실제 kuromoji-ko 런타임 결과가 예상과 다릅니다: ${connectiveInput}`
  );
}

console.log('Kuromoji auxiliary/connective runtime regression test: PASS');

const additionalSpacingCases = [
  ['나 만큼', '나만큼'],
  ['한개', '한개'],
  ['두시간', '두시간'],
  ['10개', '10개'],
  ['2대1', '2 대 1'],
  ['16동502호', '16동502호'],
  ['80원', '80원'],
  ['7미터', '7미터']
];

for (const [spacingInput, expected] of additionalSpacingCases) {
  const spacingAnalysis = await analyze(spacingInput);
  const spacingResult = evaluateSpacing(spacingAnalysis);
  assert.equal(
    spacingResult.revised,
    expected,
    `실제 kuromoji-ko 띄어쓰기 회귀 결과가 예상과 다릅니다: ${spacingInput}`
  );
}

console.log('Kuromoji article 41/43 runtime regression test: PASS');

const article51Cases = [
  ['깨끗히', '깨끗이'],
  ['반듯히', '반듯이'],
  ['번번히', '번번이'],
  ['일일히', '일일이'],
  ['정확이', '정확히'],
  ['엄격이', '엄격히'],
  ['솔직히', '솔직히'],
  ['열심히', '열심히']
];

for (const [article51Input, expected] of article51Cases) {
  const article51Analysis = await analyze(article51Input);
  const article51Result = evaluateSpacing(article51Analysis);
  assert.equal(
    article51Result.revised,
    expected,
    `제51항 실제 kuromoji-ko 결과가 예상과 다릅니다: ${article51Input}`
  );
}

console.log('Kuromoji article 51 runtime: PASS');

const article52Cases = [
  ['승락', '승낙'],
  ['곤난', '곤란'],
  ['논난', '논란'],
  ['의녕', '의령'],
  ['회녕', '회령'],
  ['유월', '유월'],
  ['시월', '시월'],
  ['초파일', '초파일'],
  ['수락', '수락']
];
for (const [input52, expected52] of article52Cases) {
  const a52 = await analyze(input52);
  const r52 = evaluateSpacing(a52);
  assert.equal(r52.revised, expected52, `제52항 실제 kuromoji-ko 결과가 예상과 다릅니다: ${input52}`);
}
console.log('Kuromoji article 52 runtime: PASS');

const article53Cases = [
  ['할께', '할게'],
  ['할께요', '할게요'],
  ['할꺼나', '할거나'],
  ['할껄', '할걸'],
  ['할쑤록', '할수록'],
  ['할찌라도', '할지라도'],
  ['할찌언정', '할지언정'],
  ['올씨다', '올시다'],
  ['갈까', '갈까'],
  ['할꼬', '할꼬'],
  ['합니까', '합니까']
];
for (const [input53, expected53] of article53Cases) {
  const a53 = await analyze(input53);
  const r53 = evaluateSpacing(a53);
  assert.equal(r53.revised, expected53, `제53항 실제 kuromoji-ko 결과가 예상과 다릅니다: ${input53}`);
}
console.log('Kuromoji article 53 runtime: PASS');

const article54Cases = [
  ['나무군', '나무꾼'],
  ['심부름군', '심부름꾼'],
  ['빛갈', '빛깔'],
  ['맛갈', '맛깔'],
  ['귀대기', '귀때기'],
  ['나무꾼', '나무꾼'],
  ['뚝배기', '뚝배기'],
  ['나이배기', '나이배기']
];
for (const [input54, expected54] of article54Cases) {
  const a54 = await analyze(input54);
  const r54 = evaluateSpacing(a54);
  assert.equal(r54.revised, expected54, `제54항 실제 kuromoji-ko 결과가 예상과 다릅니다: ${input54}`);
}
console.log('Kuromoji article 54 runtime: PASS');

const article55Cases = [
  ['마추다', '맞추다'],
  ['마춘다', '맞춘다'],
  ['마춰', '맞춰'],
  ['마췄다', '맞췄다'],
  ['뻐치다', '뻗치다'],
  ['뻐친다', '뻗친다'],
  ['뻐쳐', '뻗쳐'],
  ['뻐쳤다', '뻗쳤다'],
  ['맞추다', '맞추다'],
  ['맞히다', '맞히다']
];
for (const [input55, expected55] of article55Cases) {
  const a55 = await analyze(input55);
  const r55 = evaluateSpacing(a55);
  assert.equal(r55.revised, expected55, `제55항 실제 kuromoji-ko 결과가 예상과 다릅니다: ${input55}`);
}
console.log('Kuromoji article 55 runtime: PASS');

const article56Cases = [
  ['지난겨울은 몹시 춥드라.', '지난겨울은 몹시 춥더라.'],
  ['깊든 물이 얕아졌다.', '깊던 물이 얕아졌다.'],
  ['그렇게 좋든가?', '그렇게 좋던가?'],
  ['그 사람 말 잘하든데!', '그 사람 말 잘하던데!'],
  ['얼마나 놀랐든지 몰라.', '얼마나 놀랐던지 몰라.'],
  ['배던지 사과던지 마음대로 먹어라.', '배든지 사과든지 마음대로 먹어라.'],
  ['가던지 오던지 마음대로 해라.', '가든지 오든지 마음대로 해라.'],
  ['먹든지 말든지 마음대로 하렴.', '먹든지 말든지 마음대로 하렴.']
];
for (const [input56, expected56] of article56Cases) {
  const a56 = await analyze(input56);
  const r56 = evaluateSpacing(a56);
  assert.equal(r56.revised, expected56, `제56항 실제 kuromoji-ko 결과가 예상과 다릅니다: ${input56}`);
}
console.log('Kuromoji article 56 runtime: PASS');

const article57Cases = [
  ['둘로 갈음', '둘로 가름'],
  ['새 책상으로 가름하였다.', '새 책상으로 갈음하였다.'],
  ['영월을 걷혀 왔다.', '영월을 거쳐 왔다.'],
  ['외상값이 잘 거쳐진다.', '외상값이 잘 걷힌다.'],
  ['걷잡아서 이틀 걸릴 일이다.', '겉잡아서 이틀 걸릴 일이다.'],
  ['고무줄을 늘린다.', '고무줄을 늘인다.'],
  ['수출량을 더 늘인다.', '수출량을 더 늘린다.'],
  ['옷을 달인다.', '옷을 다린다.'],
  ['약을 다린다.', '약을 달인다.'],
  ['우표를 부친다.', '우표를 붙인다.'],
  ['편지를 붙인다.', '편지를 부친다.'],
  ['밥을 앉힌다.', '밥을 안친다.'],
  ['아이를 안친다.', '아이를 앉힌다.'],
  ['약속은 반듯이 지켜라.', '약속은 반드시 지켜라.'],
  ['고개를 반드시 들어라.', '고개를 반듯이 들어라.']
];
for (const [input57, expected57] of article57Cases) {
  const a57 = await analyze(input57);
  const r57 = evaluateSpacing(a57);
  assert.equal(r57.revised, expected57, `제57항 실제 kuromoji-ko 결과가 예상과 다릅니다: ${input57}`);
}
console.log('Kuromoji article 57 runtime: PASS');

const article51SafetyCases = [
  ['속이', '속이'],
  ['특이', '특이'],
  ['고히', '고히'],
  ['급이', '급이']
];
for (const [input51Safe, expected51Safe] of article51SafetyCases) {
  const a51Safe = await analyze(input51Safe);
  const r51Safe = evaluateSpacing(a51Safe);
  assert.equal(r51Safe.revised, expected51Safe, `제51항 정상어 보호 실패: ${input51Safe}`);
}

const article52SafetyCases = [
  ['의론', '의론'],
  ['의논', '의논']
];
for (const [input52Safe, expected52Safe] of article52SafetyCases) {
  const a52Safe = await analyze(input52Safe);
  const r52Safe = evaluateSpacing(a52Safe);
  assert.equal(r52Safe.revised, expected52Safe, `제52항 정상어 보호 실패: ${input52Safe}`);
}


const article53SafetyCases = [
  ['할게', '할게'],
  ['할까', '할까'],
  ['합니까', '합니까'],
  ['할수록', '할수록'],
  ['올시다', '올시다']
];
for (const [input53Safe, expected53Safe] of article53SafetyCases) {
  const a53Safe = await analyze(input53Safe);
  const r53Safe = evaluateSpacing(a53Safe);
  assert.equal(r53Safe.revised, expected53Safe, `제53항 정상어 보호 실패: ${input53Safe}`);
}

const article54SafetyCases = [
  ['나무꾼', '나무꾼'],
  ['귀때기', '귀때기'],
  ['코빼기', '코빼기'],
  ['뚝배기', '뚝배기']
];
for (const [input54Safe, expected54Safe] of article54SafetyCases) {
  const a54Safe = await analyze(input54Safe);
  const r54Safe = evaluateSpacing(a54Safe);
  assert.equal(r54Safe.revised, expected54Safe, `제54항 정상어 보호 실패: ${input54Safe}`);
}

const article55SafetyCases = [
  ['맞추다', '맞추다'],
  ['맞춰', '맞춰'],
  ['뻗치다', '뻗치다'],
  ['뻗쳐', '뻗쳐'],
  ['맞히다', '맞히다']
];
for (const [input55Safe, expected55Safe] of article55SafetyCases) {
  const a55Safe = await analyze(input55Safe);
  const r55Safe = evaluateSpacing(a55Safe);
  assert.equal(r55Safe.revised, expected55Safe, `제55항 정상어 보호 실패: ${input55Safe}`);
}

const article56SafetyCases = [
  ['어릴 적 살던 곳.', '어릴 적 살던 곳.'],
  ['먹든지 말든지 마음대로 하렴.', '먹든지 말든지 마음대로 하렴.'],
  ['가든지 오든지 마음대로 해라.', '가든지 오든지 마음대로 해라.'],
  ['얼마나 놀랐던지 몰라.', '얼마나 놀랐던지 몰라.']
];
for (const [input56Safe, expected56Safe] of article56SafetyCases) {
  const a56Safe = await analyze(input56Safe);
  const r56Safe = evaluateSpacing(a56Safe);
  assert.equal(r56Safe.revised, expected56Safe, `제56항 정상어 보호 실패: ${input56Safe}`);
}

const article57SafetyCases = [
  ['그는 부지런하다. 그러므로 잘 산다.', '그는 부지런하다. 그러므로 잘 산다.'],
  ['그는 열심히 공부한다. 그럼으로써 은혜에 보답한다.', '그는 열심히 공부한다. 그럼으로써 은혜에 보답한다.'],
  ['우표를 붙인다.', '우표를 붙인다.'],
  ['편지를 부친다.', '편지를 부친다.'],
  ['밥을 안친다.', '밥을 안친다.'],
  ['아이를 앉힌다.', '아이를 앉힌다.']
];
for (const [input57Safe, expected57Safe] of article57SafetyCases) {
  const a57Safe = await analyze(input57Safe);
  const r57Safe = evaluateSpacing(a57Safe);
  assert.equal(r57Safe.revised, expected57Safe, `제57항 정상어 보호 실패: ${input57Safe}`);
}
