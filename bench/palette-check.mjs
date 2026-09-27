// 调色板 v3 校验：分带 + 跨带可分辨性断言
const hex2rgb = h => { const c = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); };
const rgb2hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const relLum = h => { const [r, g, b] = hex2rgb(h).map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const gray = h => Math.round(255 * Math.pow(relLum(h), 1 / 2.2));
const CR = (a, b) => { const l1 = relLum(a), l2 = relLum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const M1 = [[17.8824, 43.5161, 4.11935], [3.45565, 27.1554, 3.86714], [0.0299566, 0.184309, 1.46709]];
const M2 = [[0.080944, -0.130504, 0.116721], [-0.0102485, 0.0540194, -0.113615], [-0.000365294, -0.00412163, 0.693513]];
const mul = (M, v) => M.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const SIM = { protan: [[0, 2.02344, -2.52581], [0, 1, 0], [0, 0, 1]], deutan: [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]], tritan: [[1, 0, 0], [0, 1, 0], [-0.395913, 0.801109, 0]] };
const cvd = (hex, t) => rgb2hex(mul(M2, mul(SIM[t], mul(M1, hex2rgb(hex)))).map(v => Math.max(0, Math.min(255, v))));
const worstGray = h => Math.min(gray(h), gray(cvd(h, 'protan')), gray(cvd(h, 'deutan')), gray(cvd(h, 'tritan')));

// 带 = 威胁能级。跨带必须 Δgray>=20（含色盲模拟），同带靠形状区分。
const BANDNAME = ['B0 背景装饰', 'B1 最高值(白核)', 'B2 玩家/光环层', 'B3 危险信号层', 'B4 前景事件层', 'B5 背景音层', 'UI'];
const L = (v, band, shape, note) => ({ v, band, shape, note });
const P = {
  // 背景
  'bg.void': L('#04060A', 0), 'bg.deep': L('#08101C', 0), 'bg.grid': L('#0E1B2E', 0),
  'bg.far': L('#14283F', 0), 'bg.mid': L('#1C3550', 0), 'bg.near': L('#24425F', 0), 'bg.deco_max': L('#2C4C6B', 0),
  // B1/B2 玩家
  'player.core': L('#FFFFFF', 1, '圆+内层'),
  'player.hull': L('#EAF6FF', 1),
  'player.ring': L('#2BD9FF', 2, '圆环（唯一）'),
  'player.trail': L('#1E9FD0', 2),
  'ally.bullet': L('#2F9BC4', 4, '细长条'),
  'ally.beam': L('#8FE8FF', 2, '直线'),
  'ally.drone': L('#2BD9FF', 2, '小圆+环绕运动'),
  // B3 危险信号（暖琥珀）
  'ebullet.core': L('#FFE9B8', 1, '圆'),
  'ebullet.body': L('#FFB020', 3, '圆'),
  'telegraph': L('#D55E00', 3, '虚线+大面'),
  'shooter.body': L('#8A5200', 3, '六边形+炮管'),
  'shooter.rim': L('#FFB020', 3),
  'fast.body': L('#B8702F', 4, '细长菱形'),
  'fast.rim': L('#E89A45', 3),
  // B5 背景音（冷灰/中性，靠形状区分）
  'chaff.body': L('#5B6E8C', 5, '圆环+内三角'),
  'chaff.rim': L('#93A9C9', 5),
  'tank.body': L('#46505F', 5, '大方块'),
  'tank.rim': L('#A6B5C9', 5),
  'splitter.body': L('#5A4A75', 5, '圆+中缝'),
  'splitter.rim': L('#B0A48C', 5),
  // 稀有
  'elite.crown': L('#F0E442', 2, '六角冠+旋转虚线圈', '精英'),
  'boss.body': L('#CC79A7', 4, '大方框+外旋转框', 'Boss'),
  'boss.rim': L('#F2B8D4', 2),
  // 拾取
  'orb.body': L('#00B37E', 4, '菱形', '经验碎片'),
  'orb.core': L('#9CFFD9', 4),
  'pickup.heart': L('#EE6677', 4, '心形', '回血'),
  'pickup.chest': L('#F0E442', 2, '六边形', '宝箱'),
  // UI
  'ui.text': L('#D6E4F2', 6), 'ui.accent': L('#8FB0CF', 6), 'ui.warn': L('#FFB020', 6)
};
const BG = P['bg.void'].v;
console.log('=== 明度阶梯 ===');
for (const [k, o] of Object.entries(P).sort((a, b) => gray(a[1].v) - gray(b[1].v)))
  console.log(o.v, 'gray', String(gray(o.v)).padStart(3), '| protan', String(gray(cvd(o.v, 'protan'))).padStart(3), '|', BANDNAME[o.band].padEnd(16), k.padEnd(14), CR(o.v, BG).toFixed(1) + ':1', CR(o.v, BG) < 3 && o.band > 0 ? '** <3:1 非文本最低要求 **' : '');

console.log('\n=== 跨带断言：任何两个不同能级的东西，在全部色觉下灰阶差应 ≥20 ===');
const ent = Object.entries(P).filter(([, o]) => o.band > 0 && o.band < 6);
let fails = 0;
for (let i = 0; i < ent.length; i++) for (let j = i + 1; j < ent.length; j++) {
  const [ka, a] = ent[i], [kb, b] = ent[j];
  if (a.band === b.band) continue;
  let worst = 999, wt = '';
  for (const t of ['protan', 'deutan', 'tritan']) {
    const d = Math.abs(gray(cvd(a.v, t)) - gray(cvd(b.v, t)));
    if (d < worst) { worst = d; wt = t; }
  }
  if (worst < 20) { console.log('  FAIL', ka.padEnd(14), BANDNAME[a.band], 'vs', kb.padEnd(14), BANDNAME[b.band], 'worstΔ', worst, wt); fails++; }
}
console.log(fails === 0 ? '  全部通过 ✓' : '  共 ' + fails + ' 处未通过');

console.log('\n=== 同带内必须靠形状区分（列出）===');
for (let b = 1; b <= 5; b++) {
  const g = ent.filter(([, o]) => o.band === b);
  if (g.length < 2) continue;
  console.log(' ' + BANDNAME[b] + ':');
  for (const [k, o] of g) console.log('    ', k.padEnd(14), o.v, 'gray', String(gray(o.v)).padStart(3), o.shape || '(同形，需靠动画/尺寸区分)');
}

console.log('\n=== 关键对抗对（玩家/弹幕/小兵/经验片）===');
const show = (label, a, b) => {
  let worst = 999, wt = '';
  for (const t of ['protan', 'deutan', 'tritan']) { const d = Math.abs(gray(cvd(P[a].v, t)) - gray(cvd(P[b].v, t))); if (d < worst) { worst = d; wt = t; } }
  console.log(label.padEnd(30), P[a].v, 'gray', String(gray(P[a].v)).padStart(3), 'vs', P[b].v, 'gray', String(gray(P[b].v)).padStart(3), 'Δnormal', String(Math.abs(gray(P[a].v) - gray(P[b].v))).padStart(3), 'ΔCVD最差(' + wt + ')', String(worst).padStart(3), worst >= 20 ? 'OK 跨带可辨' : '同带→靠形状');
};
show('玩家 vs 敌方弹幕', 'player.ring', 'ebullet.body');
show('玩家 vs 敌方弹幕核心', 'player.ring', 'ebullet.core');
show('我方弹 vs 敌方弹', 'ally.bullet', 'ebullet.body');
show('敌方弹 vs 小兵', 'ebullet.body', 'chaff.rim');
show('敌方弹 vs 经验片', 'ebullet.body', 'orb.body');
show('经验片 vs 小兵', 'orb.body', 'chaff.body');
show('精英 vs 弹幕', 'elite.crown', 'ebullet.body');
show('Boss vs 小兵', 'boss.body', 'chaff.body');
show('玩家 vs 分裂机', 'player.ring', 'splitter.rim');
show('玩家 vs UI', 'player.ring', 'ui.text');
show('Boss vs 玩家', 'boss.body', 'player.ring');
