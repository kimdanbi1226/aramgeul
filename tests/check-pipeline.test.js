import assert from 'node:assert/strict';
import { createKiwiAdapter } from '../lib/morphology/kiwi.js';
import { checkText } from '../lib/pipeline/check.js';

const fakeKiwi = {
  tokenize(text) {
    assert.equal(text, '생각해보자');
    return [
      { form: '생각', tag: 'NNG', start: 0, len: 2 },
      { form: '해', tag: 'VV', start: 2, len: 1 },
      { form: '보', tag: 'VX', start: 3, len: 1 },
      { form: '자', tag: 'EF', start: 4, len: 1 }
    ];
  }
};

const morphologyAdapter = createKiwiAdapter(fakeKiwi, {
  version: 'fixture',
  runtime: 'fixture'
});

const checked = await checkText('생각해보자', morphologyAdapter);

assert.equal(checked.result.revised, '생각해 보자');
assert.equal(checked.result.decision, 'CORRECTION');
assert.equal(checked.result.edits.length, 1);
assert.equal(checked.result.edits[0].rule_id, 'SPACING-047-AUXILIARY-VERB');

console.log('Check pipeline test: PASS');
