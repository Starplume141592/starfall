import assert from 'node:assert/strict';
import { realmName } from '../src/core/realm.ts';

assert.equal(realmName(1), '炼气一层');
assert.equal(realmName(2), '炼气二层');
assert.equal(realmName(9), '炼气九层');
assert.equal(realmName(10), '筑基初期');
assert.equal(realmName(12), '筑基初期');
assert.equal(realmName(13), '筑基中期');
assert.equal(realmName(19), '金丹初期');
assert.equal(realmName(0), '炼气一层');
assert.equal(realmName(-5), '炼气一层');
assert.equal(realmName(1.9), '炼气一层');
assert.equal(realmName(999), '渡劫期');
// 纯函数：多次调用结果稳定
assert.equal(realmName(20), realmName(20));

console.log('check-realm: ok');
