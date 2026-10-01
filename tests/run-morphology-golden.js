import fs from 'node:fs/promises';
import { analyze } from '../lib/morphology/mecab-ko.js';

const path = new URL('./golden/morphology.v0.1.json', import.meta.url);
const suite = JSON.parse(await fs.readFile(path, 'utf8'));

let passed = 0;
let failed = 0;

for (const testCase of suite.cases) {
  const result = await analyze(testCase.input);
  const pos = result.tokens.map(token => token.features.grammar_function).filter(Boolean);
  const surfaces = result.tokens.map(token => token.text);

  const missingPos = (testCase.required_pos ?? []).filter(tag => !pos.includes(tag));
  const missingSurface = (testCase.expected_features ?? [])
    .map(feature => feature.split('/')[0].split('+').pop())
    .filter(Boolean)
    .filter(surface => !surfaces.includes(surface));

  const ok = missingPos.length === 0 && missingSurface.length === 0;

  if (ok) {
    passed += 1;
    console.log('PASS ' + testCase.id + ' ' + testCase.input);
  } else {
    failed += 1;
    console.error('FAIL ' + testCase.id + ' ' + testCase.input);
    console.error('  tokens: ' + JSON.stringify(result.tokens));
    if (missingPos.length) console.error('  missing POS: ' + missingPos.join(', '));
    if (missingSurface.length) console.error('  missing surface: ' + missingSurface.join(', '));
  }
}

console.log('\nMorphology Golden Test: ' + passed + ' passed, ' + failed + ' failed, ' + suite.cases.length + ' total');

if (failed > 0) process.exit(1);
