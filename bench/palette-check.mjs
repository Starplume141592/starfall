/**
 * 调色板校验 v4：分带 + 跨带可分辨性断言 + **基线回归门禁**
 *
 * 用法：
 *   node bench/palette-check.mjs                    # 与基线比对，只对「新增失败」报错
 *   node bench/palette-check.mjs --update-baseline  # 有意改色后重记基线
 *
 * ⚠️ 颜色一律从 `src/config.js: PALETTE` 派生。
 *    本脚本曾经**硬编码一份调色板副本**：敌弹换成红色 `#FF3B30` 之后它还在按琥珀
 *    `#FFB020` 算（脚本报 92 处，真实是 84 处）—— 自检守的是一个**不再出货的调色板**。
 *    现在改成从 PALETTE 取；取不到的键**直接抛错**，不会再静默用一个旧值。
 *    UI 色不在 PALETTE 里（它们在 `theme.css`），见下面的 `CSS` 段（带行号）。
 *
 * ⚠️ 这是「基线回归」门禁，不是「绝对通过」：见 `DECISIONS.md D-006`。
 *    「跨带灰阶差 ≥20」这条断言与游戏实际的「形状 + 白热核心 + 色相」可读性策略**不等价**，
 *    存量失败是已知且被接受的。门禁只挡**新增**失败 —— 否则它会永久变红，等于没有门禁。
 */
const cfg = await import('../src/config.js');
const PAL = cfg.PALETTE;

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
const worstPair = (a, b) => {
  let worst = 999, wt = '';
  for (const t of ['protan', 'deutan', 'tritan']) {
    const d = Math.abs(gray(cvd(a, t)) - gray(cvd(b, t)));
    if (d < worst) { worst = d; wt = t; }
  }
  return { worst, wt };
};

/* 带 = 威胁能级。跨带必须 Δgray>=20（含色盲模拟），同带靠形状区分。 */
const BANDNAME = ['B0 背景装饰', 'B1 最高值(白核)', 'B2 玩家/光环层', 'B3 危险信号层', 'B4 前景事件层', 'B5 背景音层', 'UI'];

/* 不在 PALETTE 里的颜色：它们归 theme.css 管（行号已注明，改那边时这里要跟着改）。
   注意 band 6（UI）与 band 0（背景）**不参与**跨带断言，只在明度阶梯里打印。 */
const CSS = {
  'ui.text': '#8fb0cf',     // theme.css:16   body 正文默认色
  'ui.accent': '#58a6ff',   // theme.css 多处  UI 主色（边框/选中/按钮），另见 图鉴 12.2
  'ui.warn': '#FFB020'      // theme.css:119,250
};

const L = (v, band, shape, note) => ({ v, band, shape, note });
/** 按 key 取色：先从 PALETTE，再从 CSS，都没有就抛错（防"键改名了却静默用旧值"） */
const mk = (key, band, shape, note) => {
  const v = key in PAL ? PAL[key] : (key in CSS ? CSS[key] : null);
  if (!v) throw new Error(`palette-check: 颜色键 "${key}" 既不在 PALETTE 也不在 CSS —— 是改名了还是删了？`);
  return L(v, band, shape, note);
};

const P = {
  // 背景 B0
  'bg.void': mk('void', 0), 'bg.deep': mk('deep', 0), 'bg.grid': mk('grid', 0),
  'bg.far': mk('far', 0), 'bg.mid': mk('mid', 0), 'bg.near': mk('near', 0),
  // B1/B2 玩家
  'player.core': mk('playerCore', 1, '圆+内层'),
  /* playerHull 归 B2 而不是 B1：B1 的定义是"只有'顶点'用"（config 注释），
     机体外壳不是顶点。旧版脚本把它放 B1，与 图鉴 12.3 的分带表不一致，已改正。 */
  'player.hull': mk('playerHull', 2),
  'player.ring': mk('playerRing', 2, '圆环（唯一）'),
  'player.trail': mk('playerTrail', 2),
  'ally.bullet': mk('allyBullet', 4, '细长条'),
  'ally.beam': mk('allyBeam', 2, '直线'),
  'ally.drone': mk('playerRing', 2, '小圆+环绕运动', '复用 playerRing'),
  // B3 危险信号（暖色系）
  'ebullet.core': mk('enemyBulletCore', 1, '圆'),
  'ebullet.body': mk('enemyBullet', 3, '圆'),
  'telegraph': mk('telegraph', 3, '虚线+大面'),
  'shooter.body': mk('shooterBody', 3, '六边形+炮管'),
  'shooter.rim': mk('shooterRim', 3),
  'fast.body': mk('fastBody', 4, '细长菱形'),
  'fast.rim': mk('fastRim', 3),
  // B5 背景音（冷灰/中性，靠形状区分）
  'chaff.body': mk('chaffBody', 5, '圆环+内三角'),
  'chaff.rim': mk('chaffRim', 5),
  'tank.body': mk('tankBody', 5, '大方块'),
  'tank.rim': mk('tankRim', 5),
  'splitter.body': mk('splitterBody', 5, '圆+中缝'),
  'splitter.rim': mk('splitterRim', 5),
  // 稀有
  'elite.crown': mk('elite', 2, '六角冠+旋转虚线圈', '精英'),
  'boss.body': mk('bossBody', 4, '大方框+外旋转框', 'Boss'),
  'boss.rim': mk('bossRim', 2),
  // 拾取
  'orb.body': mk('orbBody', 4, '菱形', '经验碎片'),
  'orb.core': mk('orbCore', 4),
  'pickup.heart': mk('heart', 4, '心形', '回血'),
  'pickup.chest': mk('elite', 2, '六边形', '宝箱，复用 elite'),
  // UI（band 6，不参与跨带断言）
  'ui.text': mk('ui.text', 6), 'ui.accent': mk('ui.accent', 6), 'ui.warn': mk('ui.warn', 6)
};

/* ---------- 跨带断言 ---------- */
/* 复用色（与 canonical 条目同色同带）：参与明度阶梯与同带形状清单，但**不进跨带断言** ——
   否则同一个颜色对会被重复计一次，把失败数虚高（旧版脚本因此报 97 处，真实是 84 处）。 */
const ALIAS = new Set(['ally.drone', 'pickup.chest']);
const allEnt = Object.entries(P).filter(([, o]) => o.band > 0 && o.band < 6);
const ent = allEnt.filter(([k]) => !ALIAS.has(k));
const cur = new Map();                       // 指纹 -> 明细
for (let i = 0; i < ent.length; i++) for (let j = i + 1; j < ent.length; j++) {
  const [ka, a] = ent[i], [kb, b] = ent[j];
  if (a.band === b.band) continue;
  const { worst, wt } = worstPair(a.v, b.v);
  if (worst < 20) cur.set([ka, kb].sort().join('|'), { ka, kb, worst, wt, ba: a.band, bb: b.band });
}

/* ---------- 基线回归门禁 ---------- */
const { readFileSync, writeFileSync } = await import('node:fs');
const { createHash } = await import('node:crypto');
const BASE_PATH = new URL('./palette-baseline.json', import.meta.url);
const paletteHash = createHash('sha1')
  .update(JSON.stringify(Object.entries(P).map(([k, o]) => k + o.v).sort()))
  .digest('hex').slice(0, 12);

if (process.argv.includes('--update-baseline')) {
  writeFileSync(BASE_PATH, JSON.stringify({
    note: '跨带灰阶差 ≥20 断言的已知失败集合（指纹 = 两个键排序后用 | 连接）。'
        + '有意改色后跑 node bench/palette-check.mjs --update-baseline 重记。',
    paletteHash,
    count: cur.size,
    fails: [...cur.keys()].sort()
  }, null, 2) + '\n');
  console.log(`✓ palette-check：基线已更新 → ${cur.size} 处（paletteHash ${paletteHash}）`);
  process.exit(0);
}

let base;
try {
  base = JSON.parse(readFileSync(BASE_PATH, 'utf8'));
} catch {
  console.log('✗ palette-check：找不到基线文件 bench/palette-baseline.json');
  console.log('  → 先跑一次 `node bench/palette-check.mjs --update-baseline` 把它记下来（不要让它自动创建，');
  console.log('    否则一次坏掉的运行会静默变成新基线）。');
  process.exit(1);
}

const baseSet = new Set(base.fails);
const added = [...cur.keys()].filter(k => !baseSet.has(k));
const fixed = base.fails.filter(k => !cur.has(k));

/* ---------- 首行摘要（只看这一行就够） ---------- */
if (added.length) {
  console.log(`✗ palette-check：${added.length} 处新增失败（基线 ${base.count} 处）`);
  for (const k of added) {
    const f = cur.get(k);
    console.log(`  - ${f.ka} (${BANDNAME[f.ba]}) vs ${f.kb} (${BANDNAME[f.bb]})  worstΔ ${f.worst} ${f.wt}`);
  }
} else {
  console.log(`✓ palette-check：无新增失败（${base.count} 处在基线内${fixed.length ? `，${fixed.length} 处已修复` : ''}）`);
}
if (base.paletteHash !== paletteHash) {
  console.log(`  ⚠️ 调色板指纹变了（基线 ${base.paletteHash} → 现在 ${paletteHash}）：`
    + '若失败集也随之变化且是你有意改的，跑 --update-baseline 重记。');
}
if (fixed.length) console.log(`  已修复（可以跑 --update-baseline 把它们从基线里去掉）：${fixed.join(', ')}`);

/* ---------- 明细 ---------- */
console.log('\n── 明细 ──');
const BG = P['bg.void'].v;
console.log('=== 明度阶梯 ===');
for (const [k, o] of Object.entries(P).sort((a, b) => gray(a[1].v) - gray(b[1].v)))
  console.log(o.v, 'gray', String(gray(o.v)).padStart(3), '| protan', String(gray(cvd(o.v, 'protan'))).padStart(3), '|', BANDNAME[o.band].padEnd(16), k.padEnd(14), CR(o.v, BG).toFixed(1) + ':1', CR(o.v, BG) < 3 && o.band > 0 ? '** <3:1 非文本最低要求 **' : '');

console.log('\n=== 同带内必须靠形状区分（列出）===');
for (let b = 1; b <= 5; b++) {
  const g = allEnt.filter(([, o]) => o.band === b);
  if (g.length < 2) continue;
  console.log(' ' + BANDNAME[b] + ':');
  for (const [k, o] of g) console.log('    ', k.padEnd(14), o.v, 'gray', String(gray(o.v)).padStart(3), o.shape ? o.shape + (o.note ? `（${o.note}）` : '') : '(同形，需靠动画/尺寸区分)');
}

console.log('\n=== 关键对抗对（玩家/弹幕/小兵/经验片）===');
const show = (label, a, b) => {
  const { worst, wt } = worstPair(P[a].v, P[b].v);
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

process.exit(added.length ? 1 : 0);
