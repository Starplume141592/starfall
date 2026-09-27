export type Dir = { x: number; y: number }

/**
 * 键盘输入 → 单位方向向量。
 * 对角不加速（向量归一化）；无输入或左右/上下互抵时返回零向量，绝不产生 NaN。
 */
export function moveAxis(pressed: Record<'up' | 'down' | 'left' | 'right', boolean>): Dir {
  const x = (pressed.right ? 1 : 0) - (pressed.left ? 1 : 0)
  const y = (pressed.down ? 1 : 0) - (pressed.up ? 1 : 0)
  const len = Math.hypot(x, y)
  return len === 0 ? { x: 0, y: 0 } : { x: x / len, y: y / len }
}
