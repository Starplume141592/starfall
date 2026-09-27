import assert from 'node:assert/strict'
import { moveAxis } from '../src/core/input.ts'

const none = { up: false, down: false, left: false, right: false }

assert.deepEqual(moveAxis(none), { x: 0, y: 0 }, '无输入应为零向量')
assert.deepEqual(moveAxis({ ...none, right: true }), { x: 1, y: 0 }, '单键应为单位向量')
assert.deepEqual(moveAxis({ ...none, left: true, right: true }), { x: 0, y: 0 }, '互抵应为零向量，不得 NaN')

const diag = moveAxis({ ...none, right: true, up: true })
assert.ok(Math.abs(Math.hypot(diag.x, diag.y) - 1) < 1e-9, '对角必须归一化')
assert.ok(diag.x > 0 && diag.y < 0, '右上方向符号正确')

console.log('input ok')
