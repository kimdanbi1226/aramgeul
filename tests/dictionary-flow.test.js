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



const distinguishingText = '둘로 갈음';
const distinguishingService = {
  async lookup(query) {
    const entries = {
      갈음: [
        {
          word: '갈음',
          source: 'standard-korean-dictionary'
        }
      ],
      가름: [
        {
          word: '가름',
          source: 'standard-korean-dictionary'
        }
      ]
    };
    return entries[query] ?? [];
  }
};

const distinguishingEvidence = await collectDictionaryEvidence({
  text: distinguishingText,
  ruleResult: {
    edits: [
      {
        rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
        start: 3,
        end: 5,
        replacement: '가름'
      }
    ]
  },
  dictionaryService: distinguishingService
});

const distinguishingRuleEvidence = distinguishingEvidence.rule_evidence.find(
  item => item.rule_id === 'ORTHO-057-DISTINGUISHING-WORDS'
);

assert.ok(distinguishingRuleEvidence);
assert.ok(distinguishingEvidence.queries.some(item => item.query === '갈음'));
assert.ok(distinguishingEvidence.queries.some(item => item.query === '가름'));
assert.deepEqual(
  distinguishingRuleEvidence.contexts[0]?.input_tokens,
  ['둘로', '갈음']
);
assert.deepEqual(
  distinguishingRuleEvidence.contexts[0]?.expected_tokens,
  ['둘로', '가름']
);

const distinguishingDecision = evaluateDictionaryDecisions(distinguishingEvidence).find(
  item => item.rule_id === 'ORTHO-057-DISTINGUISHING-WORDS'
);

assert.ok(distinguishingDecision);
assert.equal(distinguishingDecision.status, 'CONTEXT_REQUIRED');
assert.deepEqual(distinguishingDecision.lexical_candidates, ['갈음', '가름']);

console.log('dictionary flow test passed');
