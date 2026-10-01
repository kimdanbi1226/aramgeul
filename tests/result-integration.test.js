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
