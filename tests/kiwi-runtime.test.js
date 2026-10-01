import assert from 'node:assert/strict';
import { REQUIRED_MODEL_FILES, validateModelFiles, validateWasmPath } from '../lib/morphology/kiwi-runtime.js';

assert.equal(REQUIRED_MODEL_FILES.length, 5);

const fakeFiles = Object.fromEntries(
  REQUIRED_MODEL_FILES.map(name => [name, new Uint8Array([1])])
);

assert.doesNotThrow(() => validateModelFiles(fakeFiles));
assert.throws(
  () => validateModelFiles({ ...fakeFiles, 'sj.morph': undefined }),
  /Kiwi 모델 파일이 없습니다/
);

assert.doesNotThrow(() => validateWasmPath('/tmp/kiwi-wasm.wasm'));
assert.throws(
  () => validateWasmPath(''),
  /Kiwi WASM 파일 경로가 필요합니다/
);

console.log('Kiwi runtime configuration test: PASS');
