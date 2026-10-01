import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';

const suite = JSON.parse(
  await fs.readFile(new URL('./golden/morphology.v0.1.json', import.meta.url), 'utf8')
);

const input = suite.cases.map(testCase => testCase.input).join('\n') + '\n';

const result = spawnSync(
  'docker',
  ['run', '--rm', '-i', 'ghcr.io/hephaex/mecab-ko:latest', 'parse'],
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
      if (tag === 'NNB') return ['NNB', 'DEPENDENT_NOUN'];
      if (tag === 'VX') return ['VX', 'AUXILIARY_VERB'];
      if (['JKS', 'JKC', 'JKG', 'JKO', 'JKB', 'JKV', 'JKQ', 'JX', 'JC'].includes(tag)) return [tag, 'JOSA'];
      if (['EF', 'EC', 'EP'].includes(tag)) return [tag, 'ENDING'];
      if (['ETM', 'ETN'].includes(tag)) return [tag, 'MODIFIER'];
      if (['VV', 'VA', 'VCP', 'VCN'].includes(tag)) return [tag, 'LEXICAL_VERB'];
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
  if (missingPos.length === 0) {
    passed += 1;
    console.log('MATCH ' + testCase.id + ' ' + testCase.input);
  } else {
    failed += 1;
    console.error('MISMATCH ' + testCase.id + ' ' + testCase.input);
    console.error('  tokens: ' + JSON.stringify(tokens));
    if (missingPos.length) console.error('  missing POS: ' + missingPos.join(', '));
  }
});

console.log('\nMeCab-Ko Golden Test: ' + passed + ' passed, ' + failed + ' failed, ' + suite.cases.length + ' total');

process.exit(0);
