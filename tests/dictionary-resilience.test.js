import assert from 'node:assert/strict';
import { createResilientDictionary } from '../lib/dictionary/provider-utils.js';

let calls = 0;
const provider = {
  source: 'test',
  async lookup(query) {
    calls += 1;
    if (calls === 1) throw new Error('Dictionary API HTTP 429');
    return [{ word: query }];
  }
};

const dictionary = createResilientDictionary(provider, {
  retries: 2, baseDelayMs: 0, ttlMs: 60_000, maxEntries: 10
});

const first = await dictionary.lookup('테스트');
assert.equal(first[0].word, '테스트');
assert.equal(calls, 2);
const second = await dictionary.lookup('테스트');
assert.equal(second[0].word, '테스트');
assert.equal(calls, 2, '동일 질의는 TTL 동안 캐시되어야 합니다.');
console.log('Dictionary resilience test: PASS');
