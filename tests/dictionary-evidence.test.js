import assert from 'node:assert/strict';
import { collectDictionaryEvidence } from '../lib/dictionary/evidence.js';

const service = {
  async lookup(query) {
    if (query === '결산 소득세') {
      return [{
        word: query,
        source: 'standard-korean-dictionary',
        entry_id: '1',
        pos: '명사',
        technical_term: true,
        categories: ['전문어'],
        senses: [{ definition: 'fixture' }]
      }];
    }
    return [];
  }
};

const result = await collectDictionaryEvidence({
  text: '결산 소득세를 확인했다.',
  ruleResult: { edits: [] },
  dictionaryService: service
});

assert.equal(result.enabled, true);
assert.equal(result.queries[0].query, '결산 소득세');
assert.equal(result.matches.length, 1);
assert.equal(result.matches[0].rule_id, 'SPACING-050-TECHNICAL-TERM');
assert.equal(result.matches[0].entries[0].technical_term, true);
assert.equal(result.rule_evidence[0].matched, true);

const disabled = await collectDictionaryEvidence({
  text: '결산 소득세',
  dictionaryService: null
});
assert.equal(disabled.enabled, false);

console.log('Dictionary evidence test: PASS');
