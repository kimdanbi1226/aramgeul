import assert from 'node:assert/strict';
import { createKiwiAdapter } from '../lib/morphology/kiwi.js';

const fakeKiwi = {
  tokenize(text) {
    assert.equal(text, '할 수 있다.');
    return [
      { form: '하', tag: 'VV', start: 0, len: 1 },
      { form: 'ᆯ', tag: 'ETM', start: 1, len: 1 },
      { form: '수', tag: 'NNB', start: 3, len: 1 },
      { form: '있', tag: 'VA', start: 5, len: 1 },
      { form: '다', tag: 'EF', start: 6, len: 1 },
      { form: '.', tag: 'SF', start: 7, len: 1 }
    ];
  }
};

const adapter = createKiwiAdapter(fakeKiwi, {
  version: 'test',
  runtime: 'fixture'
});

const result = await adapter.analyze('할 수 있다.');

assert.equal(result.metadata.analyzer, 'kiwi');
assert.equal(result.metadata.version, 'test');
assert.equal(result.tokens.find(token => token.text === '수').features.grammar_function, 'DEPENDENT_NOUN');
assert.deepEqual(
  result.tokens.find(token => token.text === 'ᆯ').features.grammar_functions,
  ['MODIFIER']
);
assert.equal(
  result.tokens.find(token => token.text === '있').features.grammar_function,
  'LEXICAL_VERB'
);

console.log('Kiwi adapter fixture test: PASS');
