import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REQUIRED_MODEL_FILES, createKiwiRuntime } from '../lib/morphology/kiwi-runtime.js';

const modelDir = process.env.KIWI_MODEL_DIR;
const wasmPath = process.env.KIWI_WASM_PATH;

assert.ok(modelDir, 'KIWI_MODEL_DIR가 필요합니다.');
assert.ok(wasmPath, 'KIWI_WASM_PATH가 필요합니다.');

const modelFiles = Object.fromEntries(
  await Promise.all(
    REQUIRED_MODEL_FILES.map(async name => [
      name,
      new Uint8Array(await readFile(`${modelDir}/${name}`))
    ])
  )
);

const { kiwi, version, match } = await createKiwiRuntime({
  wasmPath,
  modelFiles
});

assert.ok(version, 'Kiwi 버전 정보를 확인할 수 있어야 합니다.');
assert.equal(typeof kiwi.tokenize, 'function');

const cases = [
  '할 수 있다.',
  '안 돼요.',
  '생각해 보자.',
  '할 만큼 했다.',
  '공부가 잘 안돼요.',
  '해야 돼요.'
];

for (const text of cases) {
  const tokens = kiwi.tokenize(text, match?.allWithNormalizing);
  assert.ok(Array.isArray(tokens), `토큰 결과가 배열이어야 합니다: ${text}`);
  assert.ok(tokens.length > 0, `토큰이 비어 있습니다: ${text}`);

  console.log(
    JSON.stringify({
      text,
      tokens: tokens.map(token => ({
        str: token.str,
        tag: token.tag,
        position: token.position,
        length: token.length
      }))
    })
  );
}

const hasTag = (text, form, tag) => {
  const tokens = kiwi.tokenize(text, match?.allWithNormalizing);
  return tokens.some(token => token.str === form && token.tag === tag);
};

assert.equal(hasTag('할 수 있다.', '수', 'NNB'), true);
assert.equal(hasTag('생각해 보자.', '보', 'VX'), true);
assert.equal(hasTag('안 돼요.', '안', 'MAG'), true);

console.log(`Kiwi real runtime test: PASS (version=${version})`);

