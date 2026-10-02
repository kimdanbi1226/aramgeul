import assert from 'node:assert/strict';
import { findRuleForExample, toRuleEvidence } from '../lib/rules/rules.v0.1.js';

const rule = findRuleForExample('할수있다', '할 수 있다');

assert.equal(rule?.rule_id, 'SPACING-042-DEPENDENT-NOUN');
assert.equal(rule?.source_name, '국립국어원');
assert.equal(rule?.source_reference, '한글 맞춤법 제42항');

const evidence = toRuleEvidence(rule);

assert.equal(evidence.rule_id, 'SPACING-042-DEPENDENT-NOUN');
assert.equal(evidence.title, '의존 명사 띄어쓰기');
assert.equal(evidence.source_name, '국립국어원');
assert.equal(evidence.source_url, 'https://www.korean.go.kr/');

assert.equal(findRuleForExample('없는문장', '없는 문장'), null);

console.log('rule evidence tests passed');
