import assert from 'node:assert/strict';
import {
  DICTIONARY_SOURCES,
  assertDictionaryProvider,
  createDictionaryAdapter,
  createLocalDictionary
} from '../lib/dictionary/index.js';

assert.throws(() => assertDictionaryProvider(null), TypeError);
assert.throws(() => assertDictionaryProvider({}), TypeError);

const dictionary = createLocalDictionary([
  { word: '한국어', pos: '명사', standard: true, categories: ['일반어'] },
  { word: '학교폭력', pos: '명사', technical_term: true, categories: ['전문어'] }
]);

const korean = await dictionary.lookup('한국어');
assert.equal(korean.length, 1);
assert.equal(korean[0].word, '한국어');
assert.equal(korean[0].source, DICTIONARY_SOURCES.LOCAL);
assert.equal(korean[0].standard, true);

const technical = await dictionary.lookup('학교폭력');
assert.equal(technical[0].technical_term, true);
assert.deepEqual(technical[0].categories, ['전문어']);

assert.deepEqual(await dictionary.lookup('없는말'), []);
assert.deepEqual(await dictionary.lookup('   '), []);

const malformedProvider = createDictionaryAdapter({
  source: 'test',
  async lookup() {
    return [null, {}, { word: '테스트', standard: true }];
  }
});
const malformedResult = await malformedProvider.lookup('테스트');
assert.equal(malformedResult.length, 1);
assert.equal(malformedResult[0].word, '테스트');
assert.equal(malformedResult[0].source, 'test');

console.log('Dictionary adapter test: PASS');
