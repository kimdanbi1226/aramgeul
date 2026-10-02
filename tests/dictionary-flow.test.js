import assert from 'node:assert/strict';
import { collectDictionaryEvidence } from '../lib/dictionary/evidence.js';
import { evaluateDictionaryDecisions } from '../lib/dictionary/decision.js';

const text = '한국대학교의과대학';

const dictionaryService = {
  async lookup(query) {
    const entries = {
      한국대학교: [
        {
          word: '한국대학교',
          source: 'standard-korean-dictionary',
          proper_noun: true
        }
      ],
      의과대학: []
    };
    return entries[query] ?? [];
  }
};

const evidence = await collectDictionaryEvidence({
  text,
  ruleResult: {
    edits: [
      {
        rule_id: 'SPACING-049-PROPER-NOUN',
        start: 0,
        end: text.length,
        replacement: '한국대학교 의과대학'
      }
    ]
  },
  dictionaryService
});

assert.equal(evidence.enabled, true);
assert.ok(evidence.rule_evidence.some(item => item.rule_id === 'SPACING-049-PROPER-NOUN'));
assert.deepEqual(
  evidence.rule_evidence.find(item => item.rule_id === 'SPACING-049-PROPER-NOUN')?.contexts[0]?.candidate_units,
  ['한국대학교', '의과대학']
);

const decisions = evaluateDictionaryDecisions(evidence);
const properNounDecision = decisions.find(
  item => item.rule_id === 'SPACING-049-PROPER-NOUN'
);

assert.ok(properNounDecision);
assert.equal(properNounDecision.status, 'BOUNDARY_REQUIRED');
assert.deepEqual(properNounDecision.supported_units, ['한국대학교']);
assert.deepEqual(properNounDecision.missing_units, ['의과대학']);

console.log('dictionary flow test passed');
