import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';

const suite = JSON.parse(
  await fs.readFile(new URL('./golden/morphology.v0.1.json', import.meta.url), 'utf8')
);

const input = suite.cases.map(testCase => testCase.input).join('\n') + '\n';

const result = spawnSync(
  'docker',
  ['run', '--rm', '-i', 'ghcr.io/hephaex/mecab-ko:latest'],
  {
    input,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(result.stderr || 'MeCab-Ko Docker 실행 실패');
  process.exit(result.status ?? 1);
}

const blocks = result.stdout.split(/^EOS\s*$/m);
let passed = 0;
let failed = 0;

function grammarFunctions(pos, surface) {
  return String(pos ?? '')
    .split('+')
    .flatMap(tag => {
      if (tag === 'NNB') return ['DEPENDENT_NOUN'];
      if (tag === 'VX') return ['AUXILIARY_VERB'];
      if (['JKS', 'JKC', 'JKG', 'JKO', 'JKB', 'JKV', 'JKQ', 'JX', 'JC'].includes(tag)) return ['JOSA'];
      if (['EF', 'EC', 'EP'].includes(tag)) return ['ENDING'];
      if (['ETM', 'ETN'].includes(tag)) return ['MODIFIER'];
      if (['VV', 'VA', 'VCP', 'VCN'].includes(tag)) return ['LEXICAL_VERB'];
      if (tag === 'MAG' && ['안', '못'].includes(surface)) return ['NEGATIVE_ADVERB'];
      return [];
    });
}

suite.cases.forEach((testCase, index) => {
  const lines = (blocks[index] ?? '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const tokens = lines.map(line => {
    const [surface, feature = ''] = line.split('\t');
    const pos = feature.split(',')[0] ?? '';
    return { surface, pos };
  });

  const surfaces = tokens.map(token => token.surface);
  const functions = tokens.flatMap(token => grammarFunctions(token.pos, token.surface));

  const missingPos = (testCase.required_pos ?? []).filter(tag => !functions.includes(tag));
  const missingSurface = (testCase.expected_features ?? [])
    .map(feature => feature.split('/')[0].split('+').pop())
    .filter(Boolean)
    .filter(surface => !surfaces.includes(surface));

  if (missingPos.length === 0 && missingSurface.length === 0) {
    passed += 1;
    console.log('PASS ' + testCase.id + ' ' + testCase.input);
  } else {
    failed += 1;
    console.error('FAIL ' + testCase.id + ' ' + testCase.input);
    console.error('  tokens: ' + JSON.stringify(tokens));
    if (missingPos.length) console.error('  missing POS: ' + missingPos.join(', '));
    if (missingSurface.length) console.error('  missing surface: ' + missingSurface.join(', '));
  }
});

console.log('\nMeCab-Ko Golden Test: ' + passed + ' passed, ' + failed + ' failed, ' + suite.cases.length + ' total');

if (failed > 0) process.exit(1);
