import assert from 'node:assert/strict';
import { searchLocalExpressions } from '../lib/expression/search.js';

const exact = searchLocalExpressions('늘이다');
assert.ok(exact.length > 0);
assert.equal(exact[0].type, 'rule');
assert.ok(exact.some(item => item.input.includes('늘이다') || item.expected?.includes('늘이다')));

const related = searchLocalExpressions('부치다');
assert.ok(related.length > 0);
assert.ok(related.every(item => item.source_name));

const empty = searchLocalExpressions('존재하지않는표현');
assert.deepEqual(empty, []);

console.log('expression search tests passed');
