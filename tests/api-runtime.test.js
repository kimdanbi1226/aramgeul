import assert from 'node:assert/strict';
import handler from '../api/check.js';

const input = '나는 이것을 할수있다고 생각해보았다.';

const result = await new Promise((resolve, reject) => {
  const req = {
    method: 'POST',
    body: { text: input }
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      resolve({ statusCode: this.statusCode, payload });
      return this;
    }
  };

  Promise.resolve(handler(req, res)).catch(reject);
});

assert.equal(result.statusCode, 200);
assert.equal(result.payload.revised, '나는 이것을 할 수 있다고 생각해 보았다.');

console.log(JSON.stringify({
  revised: result.payload.revised,
  decision: result.payload.decision,
  edits: result.payload.edits,
  rule_edits: result.payload.rule_edits,
  revised_blocks: result.payload.revised_blocks
}, null, 2));

const blocks = result.payload.revised_blocks || [];
assert.equal(blocks.length, 2, 'API 응답에는 두 개의 교정 블록이 있어야 합니다.');
assert.ok(
  blocks.some(block => block.revised === '할 수 있다고'),
  '의존 명사 교정 블록이 있어야 합니다.'
);
assert.ok(
  blocks.some(block => block.revised === '생각해 보았다'),
  '보조 용언 교정 블록이 있어야 합니다.'
);

console.log('API production path test: PASS');
