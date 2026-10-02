import fs from 'node:fs/promises';
import { analyze } from '../lib/morphology/mecab-ko.js';

const path = new URL('./golden/morphology.v0.1.json', import.meta.url);
const suite = JSON.parse(await fs.readFile(path, 'utf8'));

let passed = 0;
let failed = 0;

for (const testCase of suite.cases) {
  const result = await analyze(testCase.input);
  const tokens = result.tokens;
  const functions = tokens.flatMap(token => token.features.grammar_functions ?? []).filter(Boolean);
  const pos = tokens.flatMap(token => String(token.pos ?? '').split('+')).filter(Boolean);
  const availableTags = new Set([...functions, ...pos]);

  const missingPos = (testCase.required_pos ?? [])
    .filter(tag => !availableTags.has(tag));

  // expected_targets는 실제 토큰 표면형을 검증하고,
  // expected_features는 설명용 형태소 분석 메모로 취급한다.
  // '거 + 야', '되 + 나요'처럼 한 어절이 여러 토큰으로 분해되는
  // 경우를 expected_features 문자열로 직접 비교하면 정상 분석도
  // 잘못 실패할 수 있기 때문이다.
  const surfaces = new Set(tokens.map(token => token.text));
  const missingSurface = (testCase.expected_targets ?? [])
    .map(target => target.surface)
    .filter(Boolean)
    .filter(surface => !surfaces.has(surface));

  const ok = missingPos.length === 0 && missingSurface.length === 0;

  if (ok) {
    passed += 1;
    console.log('PASS ' + testCase.id + ' ' + testCase.input);
  } else {
    failed += 1;
    console.error('FAIL ' + testCase.id + ' ' + testCase.input);
    console.error('  tokens: ' + JSON.stringify(tokens));
    if (missingPos.length) console.error('  missing POS: ' + missingPos.join(', '));
    if (missingSurface.length) console.error('  missing surface: ' + missingSurface.join(', '));
  }
}

console.log('\nMorphology Golden Test: ' + passed + ' passed, ' + failed + ' failed, ' + suite.cases.length + ' total');

if (failed > 0) process.exit(1);
