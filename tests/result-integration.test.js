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
assert.equal(blockedNameBoundary.decision, 'CORRECTION');
assert.equal(blockedNameBoundary.revised, '김양수 씨');

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

const registeredNameExample = integrateCheckResults('충무공이순신장군을 기렸다.', {
  ruleResult: {
    revised: '충무공 이순신 장군을 기렸다.',
    edits: [
      {
        rule_id: 'SPACING-048-NAME-APPELLATION',
        start: 0,
        end: '충무공이순신장군'.length,
        replacement: '충무공 이순신 장군'
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
assert.equal(registeredNameExample.decision, 'CORRECTION');
assert.equal(registeredNameExample.revised, '충무공 이순신 장군을 기렸다.');

const registeredDistinguishingExample = integrateCheckResults('새 책상으로 가름하였다.', {
  ruleResult: {
    revised: '새 책상으로 갈음하였다.',
    edits: [
      {
        rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
        start: 7,
        end: 9,
        replacement: '갈음'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      status: 'CONTEXT_REQUIRED'
    }
  ]
});
assert.equal(registeredDistinguishingExample.decision, 'CORRECTION');
assert.equal(registeredDistinguishingExample.revised, '새 책상으로 갈음하였다.');



const technicalSupported = integrateCheckResults('결산소득세', {
  ruleResult: {
    revised: '결산 소득세',
    edits: [
      {
        rule_id: 'SPACING-050-TECHNICAL-TERM',
        start: 0,
        end: '결산소득세'.length,
        replacement: '결산 소득세'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'SPACING-050-TECHNICAL-TERM',
      status: 'SUPPORTS'
    }
  ]
});
assert.equal(technicalSupported.decision, 'CORRECTION');
assert.equal(technicalSupported.revised, '결산 소득세');

const technicalInsufficient = integrateCheckResults('결산소득세', {
  ruleResult: {
    revised: '결산 소득세',
    edits: [
      {
        rule_id: 'SPACING-050-TECHNICAL-TERM',
        start: 0,
        end: '결산소득세'.length,
        replacement: '결산 소득세'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'SPACING-050-TECHNICAL-TERM',
      status: 'INSUFFICIENT'
    }
  ]
});
assert.equal(technicalInsufficient.decision, 'CORRECTION');
assert.equal(technicalInsufficient.revised, '결산 소득세');

console.log('Technical term dictionary behavior: PASS');


const blockedDistinguishingWord = integrateCheckResults('둘로 가름하였다.', {
  ruleResult: {
    revised: '둘로 갈음하였다.',
    edits: [
      {
        rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
        start: 3,
        end: 5,
        replacement: '갈음'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  bareunResult: {
    revised: '둘로 가름하였다.',
    edits: [],
    sources: [{ source: 'Bareun' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      status: 'CONTEXT_REQUIRED'
    }
  ]
});
assert.equal(blockedDistinguishingWord.decision, 'VALID');
assert.equal(blockedDistinguishingWord.revised, '둘로 가름하였다.');
assert.deepEqual(blockedDistinguishingWord.edits, []);

const distinguishingEvidenceOnlyKeepsRule = integrateCheckResults('둘로 가름하였다.', {
  ruleResult: {
    revised: '둘로 갈음하였다.',
    edits: [
      {
        rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
        start: 3,
        end: 5,
        replacement: '갈음'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      status: 'EVIDENCE_ONLY'
    }
  ]
});
assert.equal(distinguishingEvidenceOnlyKeepsRule.decision, 'CORRECTION');
assert.equal(distinguishingEvidenceOnlyKeepsRule.revised, '둘로 갈음하였다.');

const distinguishingInsufficientKeepsRule = integrateCheckResults('둘로 가름하였다.', {
  ruleResult: {
    revised: '둘로 갈음하였다.',
    edits: [
      {
        rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
        start: 3,
        end: 5,
        replacement: '갈음'
      }
    ],
    sources: [{ source: 'NIKL' }]
  },
  dictionaryDecisions: [
    {
      rule_id: 'ORTHO-057-DISTINGUISHING-WORDS',
      status: 'INSUFFICIENT'
    }
  ]
});
assert.equal(distinguishingInsufficientKeepsRule.decision, 'CORRECTION');
assert.equal(distinguishingInsufficientKeepsRule.revised, '둘로 갈음하였다.');

console.log('Distinguishing-word context gating: PASS');
