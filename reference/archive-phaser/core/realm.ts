/** 等级 → 修仙境界名。纯函数，无副作用。 */
export function realmName(level: number): string {
  const l = Math.max(1, Math.floor(level));
  if (l <= 9) return `炼气${cn(l)}层`;
  if (l <= 12) return '筑基初期';
  if (l <= 15) return '筑基中期';
  if (l <= 18) return '筑基后期';
  if (l <= 21) return '金丹初期';
  if (l <= 24) return '金丹中期';
  if (l <= 27) return '金丹后期';
  if (l <= 30) return '元婴初期';
  if (l <= 33) return '元婴中期';
  if (l <= 36) return '元婴后期';
  if (l <= 40) return '化神期';
  if (l <= 45) return '炼虚期';
  if (l <= 50) return '合体期';
  if (l <= 60) return '大乘期';
  return '渡劫期';
}

function cn(n: number): string {
  const d = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return d[n]!;
  return `十${n === 10 ? '' : d[n % 10]!}`;
}
