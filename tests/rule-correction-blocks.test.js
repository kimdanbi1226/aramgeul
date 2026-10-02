import assert from 'node:assert/strict';
import { buildRuleFallbackBlocks } from '../lib/pipeline/rule-blocks.js';

const rule = {
  rule_id: 'SPACING-042-DEPENDENT-NOUN',
  title: '의존 명사 띄어쓰기',
  description: '관형사형 뒤의 의존 명사는 앞말과 띄어 쓴다.',
  source_name: '국립국어원',
  source_reference: '한글 맞춤법 제42항'
};

const source = '나는 할수있고 너도 할수있다.';
const edits = [
  { start: 4, end: 4, replacement: ' ', rule },
  { start: 12, end: 12, replacement: ' ', rule }
];

const blocks = buildRuleFallbackBlocks(source, edits);

assert.equal(blocks.length, 2);
assert.equal(blocks[0].source, 'aramgeul-rule');
assert.equal(blocks[0].rule.rule_id, rule.rule_id);
assert.equal(blocks[0].origin.start, 0);
assert.equal(blocks[0].revised_start, 3);
assert.equal(blocks[0].revised_end, 5);
assert.ok(blocks[0].origin.text.includes('할수'));
assert.ok(blocks[0].revised.includes('할 수'));

assert.equal(blocks[1].revised_start, 12);
assert.equal(blocks[1].revised_end, 14);
assert.ok(blocks[1].origin.text.includes('할수'));
assert.ok(blocks[1].revised.includes('할 수'));

console.log('Rule correction block tests: PASS');
