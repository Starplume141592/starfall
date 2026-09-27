// 武器等级改造自检：新 7 级曲线在关键时刻必须与旧 5 级曲线对齐
//   · L(7) 必须等于旧满级(5)的值 —— 满级战力不变
//   · 每一级的战力必须单调递增
//   · 旧版的整数（数量/弹丸数）在新版对齐点上必须完全一致
// 用法: node bench/weapons-check.mjs
const cfg = await import('../src/config.js');
const { WEAPONS } = cfg;
const m = cfg;

// 旧公式（5 级版本），仅用于比对
const OLD = {
  dart: { maxLv: 5, dmg: 22 + 5 * 12, num: 1 + 5, cd: Math.max(0.08, 0.30 - 4 * 0.05) },
  orbit: { maxLv: 5, dmg: 14 + 5 * 10, num: 2 + 5 * 2 },
  saw: { maxLv: 5, dmg: 30 + 5 * 18, num: 2 + Math.floor(5 * 1.5) },
  nova: { maxLv: 5, dmg: 26 + 5 * 18, radius: 110 + 5 * 26 },
  chain: { maxLv: 5, dmg: 16 + 5 * 12, num: 2 + Math.floor(5 * 1.2), cd: Math.max(0.2, 0.9 - 4 * 0.1) },
  laser: { maxLv: 5, dmg: 30 + 5 * 16, num: 2, cd: Math.max(0.3, 1.2 - 4 * 0.15) },   // 旧版 lv>=3 起双发，满级是 2
  boomerang: { maxLv: 5, dmg: 24 + 5 * 14, num: 1 + Math.floor(5 / 2), cd: Math.max(0.5, 1.8 - 4 * 0.22) },
  overload: { maxLv: 5, dmg: 70 + 5 * 40, num: 2 + 5, selfDps: 1.2 + 5 * 0.3, cd: Math.max(0.25, 0.85 - 4 * 0.1) },
  nanoswarm: { maxLv: 5, dmg: 9 + 5 * 4, num: 3 + 5 * 2, heal: 1 + 5 * 0.6, cd: Math.max(0.12, 0.45 - 4 * 0.07) },
  flak: { maxLv: 5, dmg: 34 + 5 * 20, pellets: 5 + 5, cd: Math.max(0.5, 1.5 - 4 * 0.2) },
  /* 天基炮是本次新增武器，没有"旧 5 级"参照物：只做单调性/上限检查（见下面的 opt 分支） */
  orbital: { maxLv: 5 }
};

const NEW_MAX = 7;
let fails = 0;
const row = (id, label, a, b, ok) => {
  if (!ok) fails++;
  console.log(`  ${ok ? '✓' : '✗'} ${id.padEnd(10)} ${label.padEnd(14)} 新7级=${String(a).padEnd(8)} 旧5级=${b}`);
};
/** 只在两边都有值时比对，避免旧表缺字段直接崩 */
const cmp = (id, label, nv, ov, tol) => {
  if (nv === undefined || ov === undefined) { console.log(`  - ${id.padEnd(10)} ${label.padEnd(14)} （旧表无此项，跳过）`); return; }
  row(id, label, nv, ov, Math.abs(nv - ov) < tol);
};
console.log('=== 对齐检查：新 7 级满级 vs 旧 5 级满级 ===');
for (const id of Object.keys(WEAPONS)) {
  const w = WEAPONS[id], o = OLD[id];
  console.log(`[${id}] maxLv ${o.maxLv} -> ${w.maxLv}`);
  if (w.maxLv !== NEW_MAX) { fails++; console.log('  ✗ maxLv 不是 7'); }
  if (id === 'orbital') {
    /* 新增武器：没有旧值可比，只检查"满级更强"这条底线 */
    row(id, 'dmg 单调', Math.round(w.dmg(7)), '>=' + Math.round(w.dmg(6)), w.dmg(7) > w.dmg(6));
    row(id, 'cd 递减', +w.cd(7).toFixed(2), '<=' + +w.cd(6).toFixed(2), w.cd(7) <= w.cd(6));
    row(id, 'range>0', m.weaponRange(id, 7), '>0', m.weaponRange(id, 7) > 0);
    continue;
  }
  if (w.dmg) cmp(id, 'dmg', Math.round(w.dmg(NEW_MAX)), o.dmg, 0.51);
  if (w.num) cmp(id, 'num', w.num(NEW_MAX), o.num, 0.001);
  if (w.pellets) cmp(id, 'pellets', w.pellets(NEW_MAX), o.pellets, 0.001);
  if (w.selfDps) cmp(id, 'selfDps', +w.selfDps(NEW_MAX).toFixed(2), o.selfDps === undefined ? undefined : +o.selfDps.toFixed(2), 0.051);
  if (w.onKillHeal) cmp(id, 'onKillHeal', +w.onKillHeal(NEW_MAX).toFixed(2), o.heal === undefined ? undefined : +o.heal.toFixed(2), 0.051);
  if (w.radius && typeof w.radius === 'function') cmp(id, 'radius', Math.round(w.radius(NEW_MAX)), o.radius, 0.51);
  if (w.cd) cmp(id, 'cd', +w.cd(NEW_MAX).toFixed(3), o.cd === undefined ? undefined : +o.cd.toFixed(3), 0.011);
  // 单调性
  if (w.dmg) for (let lv = 2; lv <= NEW_MAX; lv++) if (w.dmg(lv) < w.dmg(lv - 1)) { fails++; console.log(`  ✗ dmg 在 Lv${lv} 不单调`); }
}

console.log('\n=== 铺满时间预估（每把武器要抽的次数）===');
let total = 0;
const nWeapons = Object.keys(WEAPONS).length;
for (const id of Object.keys(WEAPONS)) total += WEAPONS[id].maxLv - 1;
console.log(`  ${nWeapons} 把武器全部练满需要 ${total} 次武器选择（旧版 ${10 * 4} 次 / 10 把）`);
const statPicks = cfg.STATS.reduce((a, s) => a + s.maxLevel, 0), modulePicks = cfg.MODULES.length;
console.log(`  池子总量：武器 ${total} + 属性 ${statPicks} + 模组 ${modulePicks} = ${total + statPicks + modulePicks} 次`);
console.log(`  一局约能拿到 62 次选择（改后实测终局等级）→ 想全练满是做不到的，必须挑`);

console.log('\n' + (fails === 0 ? '全部通过 ✓' : `共 ${fails} 处未通过`));
process.exit(fails === 0 ? 0 : 1);
