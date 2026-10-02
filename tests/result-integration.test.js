import assert from 'node:assert/strict';
import { createBareunResult, integrateCheckResults } from '../lib/pipeline/integrate.js';

const input = '할수있다';

const same = integrateCheckResults(input, {
  ruleResult: {
    revised: '할 수 있다',
    edits: [{ rule_id: 'SPACING-042-DEPENDENT-NOUN' }],
    decision: 'CORRECTION',
    sources: [{ source: 'NIKL' }]
  },
  bareunResult: {
    revised: '할 수 있다',
    edits: [{ origin: '할수', revised: '할 수' }],
    decision: 'CORRECTION',
    sources: [{ source: 'Bareun' }]
  }
});
assert.equal(same.decision, 'CORRECTION');
assert.equal(same.revised, '할 수 있다');
assert.equal(same.sources.length, 2);

const ruleOnly = integrateCheckResults(input, {
  ruleResult: { revised: '할 수 있다', edits: [{ rule_id: 'R1' }], sources: [{ source: 'NIKL' }] },
  bareunResult: { revised: input, edits: [], sources: [{ source: 'Bareun' }] }
});
assert.equal(ruleOnly.decision, 'CORRECTION');
assert.equal(ruleOnly.revised, '할 수 있다');

const bareunOnly = integrateCheckResults(input, {
  ruleResult: { revised: input, edits: [], sources: [{ source: 'NIKL' }] },
  bareunResult: { revised: '할 수 있다', edits: [{ origin: '할수', revised: '할 수' }], sources: [{ source: 'Bareun' }] }
});
assert.equal(bareunOnly.decision, 'CORRECTION');
assert.equal(bareunOnly.revised, '할 수 있다');

const conflict = integrateCheckResults(input, {
  ruleResult: { revised: '할 수있다', edits: [{ rule_id: 'R1' }], sources: [{ source: 'NIKL' }] },
  bareunResult: { revised: '할수 있다', edits: [{ origin: '할수있다', revised: '할수 있다' }], sources: [{ source: 'Bareun' }] }
});
assert.equal(conflict.decision, 'AMBIGUOUS');
assert.equal(conflict.revised, input);
assert.equal(conflict.candidates.length, 2);

const valid = integrateCheckResults('문장입니다.', {
  ruleResult: { revised: '문장입니다.', edits: [], decision: 'VALID' },
  bareunResult: { revised: '문장입니다.', edits: [], decision: 'VALID' }
});
assert.equal(valid.decision, 'VALID');

const normalized = createBareunResult(
  {
    revised: '안 돼요.',
    revised_blocks: [
      { origin: { text: '안돼요.' }, revised: '안 돼요.', revisions: [{ help_id: '1' }] }
    ]
  },
  '안돼요.'
);
assert.equal(normalized.revised, '안 돼요.');
assert.equal(normalized.edits.length, 1);
assert.equal(normalized.sources[0].source, 'Bareun');

console.log('Result integration tests: PASS');


const blockedProperNoun = integrateCheckResults('한국대학교의과대학', {
  ruleResult: {
    revised: '한국대학교 의과대학',
    edits: [
      {
        rule_id: 'SPACING-049-PROPER-NOUN',
        start: 0,
        end: '한국대학교의과대학'.length,
        replacement: '한국대학교 의과대학'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  bareunResult: {
    revised: '한국대학교의과대학',
    edits: [],
    sources: [{ source: 'Bareun' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'SPACING-049-PROPER-NOUN',
      status: 'BOUNDARY_REQUIRED'
    }
  ]
});
assert.equal(blockedProperNoun.decision, 'VALID');
assert.equal(blockedProperNoun.revised, '한국대학교의과대학');
assert.deepEqual(blockedProperNoun.edits, []);

const supportedProperNoun = integrateCheckResults('한국대학교의과대학', {
  ruleResult: {
    revised: '한국대학교 의과대학',
    edits: [
      {
        rule_id: 'SPACING-049-PROPER-NOUN',
        start: 0,
        end: '한국대학교의과대학'.length,
        replacement: '한국대학교 의과대학'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'SPACING-049-PROPER-NOUN',
      status: 'SUPPORTS'
    }
  ]
});
assert.equal(supportedProperNoun.decision, 'CORRECTION');
assert.equal(supportedProperNoun.revised, '한국대학교 의과대학');

console.log('Dictionary boundary gating: PASS');


const blockedNameBoundary = integrateCheckResults('김양수씨', {
  ruleResult: {
    revised: '김양수 씨',
    edits: [
      {
        rule_id: 'SPACING-048-NAME-APPELLATION',
        start: 0,
        end: '김양수씨'.length,
        replacement: '김양수 씨'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'SPACING-048-NAME-APPELLATION',
      status: 'BOUNDARY_REQUIRED'
    }
  ]
});
assert.equal(blockedNameBoundary.decision, 'VALID');
assert.equal(blockedNameBoundary.revised, '김양수씨');

const insufficientDictionaryDoesNotOverrideRule = integrateCheckResults('김양수씨', {
  ruleResult: {
    revised: '김양수 씨',
    edits: [
      {
        rule_id: 'SPACING-048-NAME-APPELLATION',
        start: 0,
        end: '김양수씨'.length,
        replacement: '김양수 씨'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'SPACING-048-NAME-APPELLATION',
      status: 'INSUFFICIENT'
    }
  ]
});
assert.equal(insufficientDictionaryDoesNotOverrideRule.decision, 'CORRECTION');
assert.equal(insufficientDictionaryDoesNotOverrideRule.revised, '김양수 씨');

console.log('Dictionary insufficient-vs-boundary behavior: PASS');
