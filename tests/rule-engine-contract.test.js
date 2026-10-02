import assert from 'node:assert/strict';
import { createRuleEngine } from '../lib/rules/engine.js';

const engine = createRuleEngine();

assert.equal(engine.version, '1.3.0');
assert.deepEqual(engine.supportedCategories, ['spacing']);

const analysis = {
  text: '할수있다',
  tokens: [
    {
      text: '할',
      normalized: '할',
      lemma: null,
      pos: 'ETM',
      morphemes: [{ text: '할', pos: 'ETM' }],
      features: {
        grammar_function: 'MODIFIER',
        grammar_functions: ['MODIFIER']
      },
      start: 0,
      end: 1,
      confidence: 1
    },
    {
      text: '수',
      normalized: '수',
      lemma: null,
      pos: 'NNB',
      morphemes: [{ text: '수', pos: 'NNB' }],
      features: {
        grammar_function: 'DEPENDENT_NOUN',
        grammar_functions: ['DEPENDENT_NOUN']
      },
      start: 1,
      end: 2,
      confidence: 1
    },
    {
      text: '있다',
      normalized: '있다',
      lemma: '있다',
      pos: 'VA',
      morphemes: [{ text: '있다', pos: 'VA' }],
      features: {
        grammar_function: 'LEXICAL_VERB',
        grammar_functions: ['LEXICAL_VERB']
      },
      start: 2,
      end: 4,
      confidence: 1
    }
  ]
};

const result = engine.evaluateCategory('spacing', analysis);
assert.equal(result.revised, '할 수 있다');
assert.equal(engine.evaluate(analysis).revised, '할 수 있다');

assert.throws(
  () => engine.evaluateCategory('spelling', analysis),
  /지원하지 않는 검사 범주/
);

console.log('Rule engine contract tests: PASS');
