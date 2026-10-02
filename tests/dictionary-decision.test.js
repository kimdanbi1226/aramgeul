import assert from 'node:assert/strict';
import { evaluateDictionaryDecisions } from '../lib/dictionary/decision.js';

const technical = evaluateDictionaryDecisions({
  enabled: true,
  rule_evidence: [
    { rule_id: 'SPACING-050-TECHNICAL-TERM', queries: ['결산 소득세'] }
  ],
  matches: [
    {
      rule_id: 'SPACING-050-TECHNICAL-TERM',
      query: '결산 소득세',
      entries: [
        {
          word: '결산 소득세',
          source: 'standard-korean-dictionary',
          technical_term: true
        }
      ]
    }
  ]
});
assert.equal(technical[0].status, 'SUPPORTS');

const semantic = evaluateDictionaryDecisions({
  enabled: true,
  rule_evidence: [
    { rule_id: 'ORTHO-057-DISTINGUISHING-WORDS', queries: ['새 책상으로 가름하였다.'] }
  ],
  matches: [
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      query: '새 책상으로 가름하였다.',
      entries: [
        { word: '가름', source: 'standard-korean-dictionary' },
        { word: '갈음', source: 'standard-korean-dictionary' }
      ]
    }
  ]
});
assert.equal(semantic[0].status, 'EVIDENCE_ONLY');

const bothCandidates = evaluateDictionaryDecisions({
  enabled: true,
  rule_evidence: [
    { rule_id: 'ORTHO-057-DISTINGUISHING-WORDS', queries: ['부치다/붙이다'] }
  ],
  matches: [
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      query: '부치다/붙이다',
      entries: [
        { word: '부치다', source: 'standard-korean-dictionary' },
        { word: '붙이다', source: 'standard-korean-dictionary' }
      ]
    }
  ]
});
assert.equal(bothCandidates[0].status, 'CONTEXT_REQUIRED');

const disabled = evaluateDictionaryDecisions({ enabled: false });
assert.deepEqual(disabled, []);

console.log('dictionary decision tests passed');
