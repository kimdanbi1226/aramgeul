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
    { rule_id: 'ORTHO-057-DISTINGUISHING-WORDS', queries: ['가름', '갈음'] }
  ],
  matches: [
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      query: '가름',
      entries: [
        { word: '가름', source: 'standard-korean-dictionary' }
      ]
    },
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      query: '갈음',
      entries: [
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
      query: '부치다',
      entries: [
        { word: '부치다', source: 'standard-korean-dictionary' }
      ]
    },
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      query: '붙이다',
      entries: [
        { word: '붙이다', source: 'standard-korean-dictionary' }
      ]
    }
  ]
});
assert.equal(bothCandidates[0].status, 'CONTEXT_REQUIRED');

const disabled = evaluateDictionaryDecisions({ enabled: false });
assert.deepEqual(disabled, []);

console.log('dictionary decision tests passed');


const nameAppellation = evaluateDictionaryDecisions({
  enabled: true,
  rule_evidence: [
    {
      rule_id: 'SPACING-048-NAME-APPELLATION',
      queries: ['김양수씨', '김양수'],
      contexts: [
        { input: '김양수씨', expected: '김양수 씨', tokens: ['김양수', '씨'] }
      ]
    }
  ],
  matches: [
    {
      rule_id: 'SPACING-048-NAME-APPELLATION',
      query: '김양수씨',
      entries: []
    },
    {
      rule_id: 'SPACING-048-NAME-APPELLATION',
      query: '김양수',
      entries: [
        { word: '김양수', source: 'standard-korean-dictionary', person_name: true }
      ]
    }
  ]
});
assert.equal(nameAppellation[0].status, 'SUPPORTS');

const nameWithoutContext = evaluateDictionaryDecisions({
  enabled: true,
  rule_evidence: [
    {
      rule_id: 'SPACING-048-NAME-APPELLATION',
      queries: ['김양수'],
      contexts: []
    }
  ],
  matches: [
    {
      rule_id: 'SPACING-048-NAME-APPELLATION',
      query: '김양수',
      entries: [
        { word: '김양수', source: 'standard-korean-dictionary', person_name: true }
      ]
    }
  ]
});
assert.equal(nameWithoutContext[0].status, 'INSUFFICIENT');


const properNoun = evaluateDictionaryDecisions({
  enabled: true,
  rule_evidence: [
    {
      rule_id: 'SPACING-049-PROPER-NOUN',
      queries: ['한국대학교의과대학', '한국대학교', '의과대학'],
      contexts: [
        { input: '한국대학교의과대학', expected: '한국대학교 의과대학', tokens: ['한국대학교', '의과대학'] }
      ]
    }
  ],
  matches: [
    {
      rule_id: 'SPACING-049-PROPER-NOUN',
      query: '한국대학교',
      entries: [
        { word: '한국대학교', source: 'standard-korean-dictionary', proper_noun: true }
      ]
    },
    {
      rule_id: 'SPACING-049-PROPER-NOUN',
      query: '의과대학',
      entries: []
    }
  ]
});
assert.equal(properNoun[0].status, 'SUPPORTS');

const properNounWithoutContext = evaluateDictionaryDecisions({
  enabled: true,
  rule_evidence: [
    {
      rule_id: 'SPACING-049-PROPER-NOUN',
      queries: ['한국대학교'],
      contexts: []
    }
  ],
  matches: [
    {
      rule_id: 'SPACING-049-PROPER-NOUN',
      query: '한국대학교',
      entries: [
        { word: '한국대학교', source: 'standard-korean-dictionary', proper_noun: true }
      ]
    }
  ]
});
assert.equal(properNounWithoutContext[0].status, 'INSUFFICIENT');
