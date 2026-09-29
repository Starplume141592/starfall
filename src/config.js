// 劫波 · 配置表 —— 纯数据 + 纯函数，不 import 任何模块
// 所有数值严格取自单文件 Demo 的原始实现，拆分不改变任何行为。

/** 机体型号：1-9 → Mk-I…Mk-IX；10-18 → 精英型；19-27 → 指挥型；28-36 → 泰坦型；37+ → 母舰核心 */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
export function mkName(level) {
  if (level <= 9) return 'Mk-' + ROMAN[level - 1];
  if (level <= 18) return '精英型 Mk-' + ROMAN[level - 10];
  if (level <= 27) return '指挥型 Mk-' + ROMAN[level - 19];
  if (level <= 36) return '泰坦型 Mk-' + ROMAN[level - 28];
  return '母舰核心';
}

/**
 * 武器库：mode 决定行为分支（game.js 的 updateWeapons 按 mode 分派），数值全在这里
 *
 * **射程（range）是第一等属性**，单位是世界像素，一律"从机体算起的最大命中距离"：
 *   · shot / flak：`range` 是唯一事实来源，`bulletLife` 由 `range / bulletSpeed` 算出来 ——
 *     以前是反过来的（写死 life，射程要玩家自己乘），结果面板写不出来、改平衡也会算错
 *   · orbit：环绕半径 + 命中半径；saw / orbit 是贴身武器，别指望它们打远处
 *   · nova：最大冲击波半径；laser：光束长度；chain：锁定半径；boomerang：索敌半径
 *   射程上限被"弹体回收距离"兜着（`BULLET_CULL_MARGIN`），所以别再往 900+ 写 —— 写了也打不到。
 *   **射程是实测值，不是拍的**：扇形武器（flak/dart）在边缘会因为扩散打不中单点目标，
 *   所以这两个的数是从"还能稳定命中"的距离量出来的（脚本见 reference/架构.md 的验证记录）。
 *   改任何射程都要重跑那条验证：把单个目标摆在 range×0.9 与 ×1.15，必须"前者掉血、后者不掉血"。
 */
/**
 * 武器等级映射：**7 级铺满，但满级战力与旧 5 级完全一致**（L(7) = 5）。
 * 动机：旧版 5 级时，实测武器在 5 分钟就全满级，一局 13 分钟里后 8 分钟构筑已经定型、
 *       面板只剩属性卡（玩家反馈"个别选择鸡肋"）。改成 7 级后每一级都是小步提升，
 *       "铺满"被推到 8 分钟以后，而且一局**拿不满全部武器** —— 后期还得挑先练哪把。
 * 用法：所有与等级线性相关的公式把 `lv` 换成 `L(lv)`；整数型（数量/弹丸数）用 `N(lv)` 取整。
 * 自检：`node bench/weapons-check.mjs` 会逐把武器比对"新 7 级各档 vs 旧 5 级各档"。
 */
const L = lv => 1 + (lv - 1) * (4 / 6);
const N = lv => Math.round(L(lv));

export const WEAPONS = {
  dart: {
    mode: 'shot', name: '蜂群导弹', icon: '🚀', color: '#63b3ff', maxLv: 7,
    dmg: lv => 22 + L(lv) * 12,
    cd: lv => Math.max(0.08, 0.30 - (L(lv) - 1) * 0.05),
    num: lv => 1 + N(lv),
    bulletSpeed: 900, range: 620, bulletR: 3, spread: 0.12,
    pierce: lv => (lv >= 6 ? 2 : 0),
    home: 5.5,                        // 追踪转向速率（rad/s）：真·追踪，但转不紧急转弯
    desc: lv => `同时射出 ${1 + N(lv)} 枚**追踪**导弹，伤害 ${Math.round(22 + L(lv) * 12)}`
  },
  orbit: {
    mode: 'orbit', name: '卫戍无人机', icon: '🛰️', color: '#7FD8FF', maxLv: 7,
    dmg: lv => 14 + L(lv) * 10,
    num: lv => 2 + N(lv) * 2,
    radius: 85, spin: 3.0, hitR: 10, knock: 100,
    desc: lv => `机体周围环绕 ${2 + N(lv) * 2} 架无人机，单架伤害 ${Math.round(14 + L(lv) * 10)}`
  },
  saw: {
    mode: 'orbit', name: '等离子刃环', icon: '⚙️', color: '#B8F0FF', maxLv: 7,
    dmg: lv => 30 + L(lv) * 18,
    num: lv => 2 + Math.floor(L(lv) * 1.5),
    radius: 52, spin: 6.5, hitR: 14, knock: 130,
    desc: lv => `贴身旋转 ${2 + Math.floor(L(lv) * 1.5)} 片等离子刃，伤害 ${Math.round(30 + L(lv) * 18)}`
  },
  nova: {
    mode: 'nova', name: '电磁脉冲', icon: '💥', color: '#6F8CFF', maxLv: 7,
    dmg: lv => 26 + L(lv) * 18,
    cd: lv => Math.max(0.5, 1.8 - (L(lv) - 1) * 0.22),
    radius: lv => 110 + L(lv) * 26,
    desc: lv => `周期性向四周爆发电磁脉冲，伤害 ${Math.round(26 + L(lv) * 18)}`
  },
  chain: {
    mode: 'chain', name: '链式电弧', icon: '⚡', color: '#9ae6ff', maxLv: 7,
    dmg: lv => 16 + L(lv) * 12,
    cd: lv => Math.max(0.2, 0.9 - (L(lv) - 1) * 0.1),
    num: lv => 2 + Math.floor(L(lv) * 1.2),
    range: 500,
    desc: lv => `同时打击最近 ${2 + Math.floor(L(lv) * 1.2)} 个目标，伤害 ${Math.round(16 + L(lv) * 12)}`
  },
  laser: {
    mode: 'laser', name: '粒子长矛', icon: '🔺', color: '#7cf5a0', maxLv: 7,
    dmg: lv => 30 + L(lv) * 16,
    cd: lv => Math.max(0.3, 1.2 - (L(lv) - 1) * 0.15),
    num: lv => (lv >= 5 ? 2 : 1),
    len: 780, width: 6,
    desc: lv => `发射穿透粒子束${lv >= 5 ? '，双发' : ''}，伤害 ${Math.round(30 + L(lv) * 16)}`
  },
  boomerang: {
    mode: 'boomerang', name: '回旋切割器', icon: '🪃', color: '#4FD6C8', maxLv: 7,
    dmg: lv => 24 + L(lv) * 14,
    cd: lv => Math.max(0.5, 1.8 - (L(lv) - 1) * 0.22),
    num: lv => 1 + Math.floor(L(lv) / 2),
    bulletSpeed: 620, bulletR: 8, range: 460,
    desc: lv => `投射 ${1 + Math.floor(L(lv) / 2)} 把回旋切割器，往返穿透，伤害 ${Math.round(24 + L(lv) * 14)}`
  },

  /* ===== 带代价的装备：强，但要付账 ===== */
  overload: {
    mode: 'shot', name: '过载反应堆', icon: '☢️', color: '#a855f7', maxLv: 7,
    dmg: lv => 70 + L(lv) * 40,
    cd: lv => Math.max(0.25, 0.85 - (L(lv) - 1) * 0.1),
    num: lv => 2 + N(lv),
    bulletSpeed: 820, range: 640, bulletR: 5, spread: 0.05,
    pierce: () => 1,
    blast: 62,                        // 命中后的小范围爆炸半径（对周围敌人 45% 伤害）
    selfDps: lv => 1.2 + L(lv) * 0.3,
    tag: '代价',
    desc: lv => `高能弹伤害 ${Math.round(70 + L(lv) * 40)}、穿透并在命中点引爆（范围 45% 伤害），但每秒自损 ${(1.2 + L(lv) * 0.3).toFixed(1)} 生命（最多压到 25% 生命）`
  },
  nanoswarm: {
    mode: 'shot', name: '纳米虫群', icon: '🦠', color: '#22d3ee', maxLv: 7,
    dmg: lv => 9 + L(lv) * 4,
    cd: lv => Math.max(0.12, 0.45 - (L(lv) - 1) * 0.07),
    num: lv => 3 + N(lv) * 2,
    bulletSpeed: 950, range: 560, bulletR: 2, spread: 0.3,
    onKillHeal: lv => 1 + L(lv) * 0.6,
    tag: '代价',
    desc: lv => `${3 + N(lv) * 2} 只纳米虫，单只伤害仅 ${Math.round(9 + L(lv) * 4)}，命中附带减速（控场），每次击杀回复 ${(1 + L(lv) * 0.6).toFixed(1)} 生命（每秒最多回 5% 最大生命）`
  },
  flak: {
    mode: 'flak', name: '近防霰弹', icon: '🛡️', color: '#A8C8FF', maxLv: 7,
    dmg: lv => 34 + L(lv) * 20,
    cd: lv => Math.max(0.5, 1.5 - (L(lv) - 1) * 0.2),
    pellets: lv => 5 + N(lv),
    bulletSpeed: 780, range: 180, bulletR: 3, spread: 0.8, knock: 7,
    tag: '代价',
    desc: lv => `扇形喷射 ${5 + N(lv)} 弹丸，单发 ${Math.round(34 + L(lv) * 20)}，射程极短但击退极强`
  },
  /* 天基炮：唯一的"延迟打击"武器 —— 先在地面画落点，0.85 秒后从天上砸下来。
     它不是"更快更疼的直线弹"，而是一把需要预判（或配合控场）的重锤：
     打移动目标会空，打被减速/被挤成一团的敌群则一发清场。 */
  orbital: {
    mode: 'orbital', name: '天基炮', icon: '🛰️', color: '#FFD166', maxLv: 7,
    dmg: lv => 130 + L(lv) * 95,
    cd: lv => Math.max(3.0, 6.6 - (L(lv) - 1) * 0.85),
    strikes: lv => (lv >= 7 ? 2 : 1),
    radius: lv => 92 + L(lv) * 13,
    range: 720, telegraph: 0.85,
    desc: lv => `标记战场目标，0.85 秒后轨道打击落下：半径 ${Math.round(92 + L(lv) * 13)} 内 ${Math.round(130 + L(lv) * 95)} 伤害${lv >= 7 ? '（双重打击）' : ''}`
  }
};

/** 武器射程（世界像素）：从机体算起的最大命中距离。orbit 类的"半径+命中半径"也在这里统一算出来。
 *  UI 与自检都用这一个入口，保证"面板上写的"和"打得到的"是同一个数。 */
export const weaponRange = (id, lv = 5) => {
  const d = WEAPONS[id];
  if (!d) return 0;
  if (d.mode === 'orbit') return d.radius + d.hitR;
  if (d.mode === 'nova') return d.radius(lv);
  if (d.mode === 'laser') return d.len;
  return d.range || 0;
};

/** 弹体飞行时间：由射程推出来，不再单独写死（写死会出现"面板说 340、实际飞 234"这种账） */
export const bulletLife = def => def.range / def.bulletSpeed;

/**
 * 属性强化：w 是抽取权重，maxLevel 是上限（关键！没有上限玩家会无限堆属性）
 */
export const STATS = [
  { id: 'dmg', name: '火力', icon: '🔥', w: 2.0, maxLevel: 8, desc: '所有伤害 +20%', apply: p => { p.dmgMul += 0.20 } },
  { id: 'as', name: '射速', icon: '⏱️', w: 2.2, maxLevel: 6, desc: '武器冷却 -15%', apply: p => { p.cdMul *= 0.85 } },
  { id: 'spd', name: '机动', icon: '👟', w: 1.4, maxLevel: 5, desc: '移动速度 +12%', apply: p => { p.speed *= 1.12 } },
  { id: 'hp', name: '装甲', icon: '🛡️', w: 2.0, maxLevel: 8, desc: '最大生命 +30，并回复等量', apply: p => { p.maxHp += 30; p.hp += 30 } },
  { id: 'heal', name: '维修', icon: '🧰', w: 1.4, maxLevel: 4, desc: '立刻回复 50 点生命', apply: p => { p.hp = Math.min(p.maxHp, p.hp + 50) } },
  { id: 'pick', name: '引力', icon: '🧲', w: 1.0, maxLevel: 4, desc: '拾取范围 +50（范围越大，残片拉速越快）', apply: p => { p.pickupRange += 50 } },
  { id: 'armor', name: '护盾', icon: '🔰', w: 1.5, maxLevel: 5, desc: '受到伤害 -10%（最高 -60%）', apply: p => { p.dr = Math.min(0.60, p.dr + 0.10) } },
  { id: 'crit', name: '会心', icon: '🎯', w: 1.6, maxLevel: 5, desc: '暴击率 +10%（2 倍伤害）', apply: p => { p.crit += 0.10 } },
  /* 下面两条是为"生存成长途径太少"补的：
     原版最大生命只能靠"装甲"（固定 +30/级，后期严重贬值），回血只有纳米虫群一把武器。 */
  { id: 'hpPct', name: '强化基座', icon: '🔩', w: 1.8, maxLevel: 5, desc: '最大生命 +12%（按比例，后期不贬值），并回复等量', apply: p => { const add = Math.round(p.maxHp * 0.12); p.maxHp += add; p.hp = Math.min(p.maxHp, p.hp + add) } },
  { id: 'vamp', name: '噬能涂层', icon: '🩸', w: 1.6, maxLevel: 5, desc: '每次击杀回复 0.6 生命（所有吸血共用每秒 5% 最大生命的上限）', apply: p => { p.killHealFlat = (p.killHealFlat || 0) + 0.6 } }
];

/** 武器品级（0.6.0 阶段 B1）：武器对玩家**只显示品级 I–IV**，不再有 Lv1–7。
 *
 *  实现取巧但有意为之：**品级映射到原有等级曲线的 4 个采样点**（1 / 3 / 5 / 7），
 *  所以 11 把武器的数值表**一个字没改**（`weapons-check` 仍全绿），
 *  玩家侧却从"7 级线性成长"变成"**4 档品级 + 同名合成**"。
 *  逐档手调（每把武器 4 档独立调数值）留到数值校准那一轮 —— 那才是真正要动表的时候。
 *
 *  合成规则（Brotato 同构）：同名**同品级**再拿一把 → 合成成品级 +1，并且**占格不变**（净省一格）。 */
export const WEAPON_TIER = {
  name: ['', 'I', 'II', 'III', 'IV'],
  lv: [0, 1, 3, 5, 7],                  // tier → 内部等级（沿用既有曲线，不改数值）
  price: [0, 45, 115, 215, 350],        // 商店基准价（实际售价还会随小节上涨）
  dmgMult: [0, 1.0, 1.55, 2.25, 3.2]    // 仅用于 UI 展示"伤害倍率"，不参与计算
};
export const weaponLvOf = t => WEAPON_TIER.lv[Math.max(1, Math.min(4, t | 0))];
export const weaponTierName = t => WEAPON_TIER.name[Math.max(1, Math.min(4, t | 0))];

/**
 * 超频跃迁模组：每 9 级一次的稀有四选一，一次性（maxLevel 1），效果远超普通属性
 */
export const MODULES = [
  {
    id: 'matrix', name: '火力矩阵', icon: '📡', w: 1, maxLevel: 1,
    desc: '所有伤害 +60%',
    apply: p => { p.dmgMul += 0.6 }
  },
  {
    id: 'phase', name: '相位护盾', icon: '🔵', w: 1, maxLevel: 1,
    desc: '每 10 秒完全抵挡一次伤害',
    apply: p => { p.shield = true; p.shieldCd = 0 }
  },
  {
    id: 'slowfield', name: '时滞立场', icon: '🌀', w: 1, maxLevel: 1,
    desc: '260 范围内的敌方单位速度 -30%',
    apply: p => { p.slowField = 0.7 }
  },
  {
    id: 'nano', name: '纳米自修复', icon: '💚', w: 1, maxLevel: 1,
    desc: '每秒回复 1.0 点生命',
    apply: p => { p.regen += 1.0 }
  },
  {
    id: 'singularity', name: '引力奇点', icon: '🕳️', w: 1, maxLevel: 1,
    desc: '残片吸附速度 +60%，拾取范围 +120，并立刻吸引全场残片',
    lockAllOrbs: true,               // 由 game.js 执行（config 不碰游戏状态）
    apply: p => { p.pickupRange += 120; p.orbPullMul = (p.orbPullMul || 1) * 1.6 }
  },
  {
    id: 'overcore', name: '超载核心', icon: '⚡', w: 1, maxLevel: 1,
    desc: '伤害 +100%，但最大生命 -25%',
    apply: p => { p.dmgMul += 1.0; p.maxHp = Math.max(60, Math.round(p.maxHp * 0.75)); p.hp = Math.min(p.hp, p.maxHp); }
  }
];

/** 武器"吃哪一类属性"（Brotato 式 scaling 的简化版）。
 *  Brotato 里每把武器自己声明 `scaling_stats`；我们只有 11 把武器，按 mode 归类即可 ——
 *  这样"我该投哪项属性"变成一个真实的构筑问题，而不是所有人都堆同一个 dmgMul。
 *  melee 贴身（刃环/无人机/回旋）· ranged 弹道（导弹/霰弹/长矛）· elem 能量（脉冲/电弧/天基炮） */
export const WEAPON_CLASS = {
  orbit: 'melee', boomerang: 'melee',
  shot: 'ranged', flak: 'ranged', laser: 'ranged',
  nova: 'elem', chain: 'elem', orbital: 'elem'
};
export const weaponClass = def => WEAPON_CLASS[def.mode] || 'ranged';

/** 属性语义表（0.6.0 阶段 A2）：**商品与升级卡都是"属性组合"**。
 *  Brotato 的 241 件道具就是 20+ 项属性的增减组合 —— 有了这张表，加商品只是加数据行，
 *  不需要再加代码。`kind` 决定它在 HUD/描述里怎么显示，`apply` 之外的特例一律走 game.js。 */
export const STAT_KEYS = {
  dmgMul: { name: '伤害', pct: true },
  meleeDmg: { name: '近战伤害', pct: true },
  rangedDmg: { name: '远程伤害', pct: true },
  elemDmg: { name: '元素伤害', pct: true },
  atkSpd: { name: '攻击速度', pct: true },
  crit: { name: '暴击率', pct: true },
  critDmg: { name: '暴击伤害', pct: true },
  maxHp: { name: '最大生命', pct: false },
  pctMaxHp: { name: '最大生命', pct: true },      // 按比例加减（后期不贬值）
  hpNow: { name: '立即回复', pct: false },
  dr: { name: '减伤', pct: true },
  dodge: { name: '闪避', pct: true },
  regen: { name: '每秒回复', pct: false },
  killHealFlat: { name: '击杀回复', pct: false },
  speed: { name: '移动速度', pct: false },
  pickupRange: { name: '拾取范围', pct: false },
  rangeMul: { name: '武器射程', pct: true },
  harvest: { name: '收获', pct: false },
  luck: { name: '幸运', pct: false },
  credits: { name: '信用点', pct: false },
  creditsPerKill: { name: '每击杀信用点', pct: false },
  orbPullMul: { name: '残片吸附', pct: true }
};

/** 属性增减 → 一句话描述（商品描述自动生成，避免手写文案与数值走偏） */
export function statsText(stats) {
  return Object.keys(stats).map(k => {
    const def = STAT_KEYS[k] || { name: k, pct: false };
    const v = stats[k];
    const sign = v >= 0 ? '+' : '−';
    const num = def.pct ? Math.round(Math.abs(v) * 100) + '%' : Math.abs(v);
    return `${def.name} ${sign}${num}`;
  }).join(' · ');
}


/**
 * 敌方成长曲线（核心平衡旋钮）
 * 前段：线性 + 二次项，跟随玩家 DPS 曲线（实测 1 分钟 500 → 5 分钟 12k → 平台期 2 万）。
 * 后段：w>25 起额外递增 —— 玩家战力在 5–7 分钟见顶，靠这段递增在 10–14 分钟越过它形成终局，
 *       否则满配玩家会无限无伤刷下去（实测过的真实问题）。
 */
export const ENEMY_SCALE = w => (1 + w * 0.135 + w * w * 0.0014) * (1 + Math.max(0, w - 25) * 0.22);
/* 敌方伤害成长：试过调到 0.045 想补回"生成率下调"造成的压力缺口，实测反而把第 18 波前后
   变成硬墙（351 秒早死）—— 后期压力应该由机制（狙击机 / 封锁圈 / Boss 阶段 / 精英波规模）提供，
   而不是让每一次挨打都更疼。保持原值。 */
export const ENEMY_DMG_SCALE = w => 1 + w * 0.035;

/**
 * 敌方速度成长（第二个核心旋钮）。
 * 玩家 340px/s，而地图一变大，墙就夹不住人了：3072 地图上机器人能绕满 25 分钟不死（约 4/9 局）。
 * 所以敌人必须随波次逼近并最终超过玩家速度 —— 5 波后开始线性加速，封顶 2.4×：
 *   拦截机 178 → 285(25波) → 392(45波) → 427(封顶)，玩家 340 —— 40 波之后跑不掉了，只能打。
 * 前 5 波保持原速：开局手感与 Demo 一致。
 */
export const ENEMY_SPEED_SCALE = w => 1 + Math.min(1.4, Math.max(0, w - 5) * 0.03);

/**
 * 调色板：按「威胁能级」分带，同带靠形状区分，跨带用明度差区分。
 * 规则（用 bench/palette-check.mjs 可验证，含 protan/deutan/tritan 三种色盲模拟）：
 *   B0 背景装饰 灰阶 14–75   —— 只提供纵深，不许跟任何战斗信息抢注意力
 *   B1 最高白核 灰阶 230+    —— 只有"顶点"用：玩家核心、即将命中的敌弹核心
 *   B2 玩家层   灰阶 190–200 —— 玩家与玩家光环，永远最亮的那一档
 *   B3 危险信号 灰阶 128–190（暖色）—— 能杀你的东西：敌方弹幕、炮塔、预警。
 *      注意：敌方弹幕现在是**红** `#FF3B30`（玩家指定），不是琥珀。红在近黑底上对
 *      红绿色盲的可读性明显更差（实测对比度 琥珀 9.68 → 红 2.48），靠"白热核心"兜着可见性；
 *      想换回琥珀只改 PALETTE.enemyBullet / enemyBulletCore 两处。
 *   B4 前景事件 灰阶 128–156 —— 经验碎片、道具、Boss
 *   B5 背景音   灰阶 80–178（冷灰/中性）—— 小兵。故意压暗：它们靠数量和形状说话，不该抢眼球
 * 改颜色请跑 `node bench/palette-check.mjs`，跨带明度差 <20 的会被断言打出来。
 */
export const PALETTE = {
  void: '#04060A', deep: '#08101C', grid: '#0E1B2E', far: '#14283F', mid: '#1C3550', near: '#24425F',
  playerCore: '#FFFFFF', playerHull: '#EAF6FF', playerRing: '#2BD9FF', playerTrail: '#1E9FD0',
  allyBullet: '#2F9BC4', allyBeam: '#8FE8FF',
  enemyBulletCore: '#FFE6DC', enemyBullet: '#FF3B30', telegraph: '#D55E00',
  chaffBody: '#5B6E8C', chaffRim: '#93A9C9',
  fastBody: '#B8702F', fastRim: '#E89A45',
  tankBody: '#46505F', tankRim: '#A6B5C9',
  splitterBody: '#5A4A75', splitterRim: '#B0A48C',
  shooterBody: '#8A5200', shooterRim: '#FFB020',
  elite: '#F0E442', bossBody: '#CC79A7', bossRim: '#F2B8D4',
  orbBody: '#00B37E', orbCore: '#4FBF98', heart: '#EE6677'
};

/**
 * 敌方单位（速度见上面的 ENEMY_SPEED_SCALE）
 */
export const ENEMY_TYPES = {
  normal: { name: '巡逻机', hp: w => (14 + w * 7) * ENEMY_SCALE(w), spdMin: 92, spdMax: 118, r: 8, color: PALETTE.chaffBody, exp: 3 },
  fast: { name: '拦截机', hp: w => (12 + w * 5) * ENEMY_SCALE(w), spd: 178, r: 6, color: PALETTE.fastBody, exp: 4.5 },
  tank: { name: '重装机兵', hp: w => (55 + w * 22) * ENEMY_SCALE(w), spd: 72, r: 12, color: PALETTE.tankBody, exp: 9 },
  triangle: { name: '突袭机', hp: w => (18 + w * 8) * ENEMY_SCALE(w), spd: 112, r: 8, color: PALETTE.fastBody, exp: 4.5 },
  splitter: { name: '分裂机', hp: w => (36 + w * 16) * ENEMY_SCALE(w), spd: 84, r: 10, color: PALETTE.splitterBody, exp: 6 },
  shooter: { name: '炮塔机', hp: w => (20 + w * 8) * ENEMY_SCALE(w), spd: 84, r: 7, color: PALETTE.shooterBody, exp: 4.5 },
  /* 狙击机：不追人，保持距离蓄力预警激光 —— 威胁来自"你必须打断它或离开射线" */
  sniper: { name: '狙击机', hp: w => (26 + w * 10) * ENEMY_SCALE(w), spd: 62, r: 8, color: PALETTE.shooterBody, exp: 7.5 }
};

/**
 * 预警激光（#13）：先画一条会"充满"的预警线（1.0 秒），充满后瞬发贯穿伤害。
 * 可读性铁律：预警必须让玩家清楚看到"线在哪、还有多久"，所以是**线宽从细到粗 + 亮度渐强**，
 * 而不是一根忽明忽暗的光束；开火后留下的实光束只持续 0.18 秒（是"已发生"的反馈，不是威胁本身）。
 */
export const LASER = {
  minWave: 14,      // 从第 14 波开始混入狙击机
  charge: 1.0,      // 预警时长
  cd: 5.0,          // 两次瞄准之间的间隔
  width: 15,        // 判定半宽（玩家中心到射线的距离小于它就算命中）
  range: 1000,
  /* 伤害/出现率/并发都收过一轮：初版（2.4 倍、6% 出现率、无并发上限）实测把对局
     从 800-880 秒压到 544-640 秒，激光承伤占了几乎全部致死来源 —— 太强了。
     它是"逼你走位"的机制，不该是"清空血条"的机制。 */
  dmgMul: 1.3,
  maxAim: 3,        // 同时最多 3 台处于预瞄状态（保证玩家永远能一眼看完所有预警线）
  maxBeams: 6,      // 同时存在的实光束上限（纯视觉资源，防堆积）
  color: PALETTE.enemyBullet   // 与敌方弹幕同色：敌人造成的一切都是同一种红
};
export const enemyDamage = w => (3.5 + w * 0.55) * ENEMY_DMG_SCALE(w);

/** 分裂机死亡后裂出的子机 */
export const SPLITTER_CHILD = w => ({ hp: (8 + w * 3) * ENEMY_SCALE(w), r: 5, speed: 165 * ENEMY_SPEED_SCALE(w), color: PALETTE.splitterBody, exp: 1.5 });

/** 精英单位：随波次概率提升，血厚、体型大、经验多，外观带金色环（前 3 波不出，避免开局尖刺） */
export const ELITE = {
  chance: w => (w < 4 ? 0 : Math.min(0.26, 0.015 + w * 0.011)),
  hpMul: 3.2, rMul: 1.35, expMul: 4, dmgMul: 1.4, color: PALETTE.elite
};

/** 陨级装甲核心：四种型号，按波次选型（15 波旋翼者 / 20 波壁垒者优先） */
export const BOSS_TYPES = {
  charger: {
    name: '劫掠者', variant: 'charger',
    hp: w => (420 + w * 200) * ENEMY_SCALE(w), spd: 100, r: 20, color: PALETTE.bossBody, exp: 60,
    dmg: w => (14 + w * 1.2) * ENEMY_DMG_SCALE(w)
  },
  summoner: {
    name: '裂空者', variant: 'summoner',
    hp: w => (520 + w * 240) * ENEMY_SCALE(w), spd: 82, r: 22, color: PALETTE.bossBody, exp: 90,
    dmg: w => (12 + w * 1.0) * ENEMY_DMG_SCALE(w)
  },
  /* 旋翼者：旋转螺旋弹幕 —— 靠"持续横移"应对，而不是靠躲一波爆发 */
  spinner: {
    name: '旋翼者', variant: 'spinner',
    hp: w => (480 + w * 220) * ENEMY_SCALE(w), spd: 88, r: 21, color: PALETTE.bossBody, exp: 80,
    dmg: w => (13 + w * 1.1) * ENEMY_DMG_SCALE(w)
  },
  /* 壁垒者：区域封锁 —— 直接封掉走位空间，逼你提前规划路线（不靠血量施压） */
  juggernaut: {
    name: '壁垒者', variant: 'juggernaut',
    hp: w => (620 + w * 260) * ENEMY_SCALE(w), spd: 70, r: 24, color: PALETTE.bossBody, exp: 110,
    dmg: w => (16 + w * 1.3) * ENEMY_DMG_SCALE(w)
  },
  /* 相位者：瞬移贴身 + 环形弹幕。阶段越高"招式"越不同（离开时留封锁圈、双段瞬移）——
     它是"阶段专属新招"的样板：同一个 boss 在不同血量段要用不同打法应对。 */
  phantom: {
    name: '相位者', variant: 'phantom',
    hp: w => (440 + w * 210) * ENEMY_SCALE(w), spd: 96, r: 19, color: PALETTE.bossBody, exp: 85,
    dmg: w => (13 + w * 1.15) * ENEMY_DMG_SCALE(w)
  }
};

/** 相位者的瞬移参数 */
export const BLINK = { dist: 190, prep: 0.5, stun: 0.9, ring: 8, ringPhase2: 12 };

/**
 * Boss 阶段变化（#14）：血量过线就换招、加速、缩短冷却 —— 让同一场战斗有三个"读法"。
 * 数值只做温和上浮，真正的区别在"解锁了新招式"。
 */
export const BOSS_PHASE = [
  { at: 0.66, spd: 1.2, cd: 0.8, label: '装甲剥离' },
  { at: 0.33, spd: 1.35, cd: 0.65, label: '核心过载' }
];

/** 区域封锁（壁垒者 / 高波精英）：先画预警圈，1.2 秒后爆炸 */
export const ZONE = { telegraph: 1.2, r: 96, life: 0.35, dmgMul: 1.6, max: 8 };

/** 炮塔机弹丸 */
export const SHOOTER_BULLET = w => ({ spd: 200, r: 4, dmg: (5 + w * 0.5) * ENEMY_DMG_SCALE(w), life: 5, color: PALETTE.enemyBullet });

/** 版本号：出现在反馈报告与"意见收集"面板里 —— 报 bug 时能一眼对上是哪个版本 */
export const VERSION = '0.5.0';
/** 反馈去向：公开仓库的 Issues（页面已开启，预填标题与正文） */
export const REPO_URL = 'https://github.com/Starplume141592/starfall';
export const ISSUE_URL = REPO_URL + '/issues/new';
/** 反馈收件邮箱：游戏内"用邮件发送"会调起玩家的邮件应用并把主旨/正文（含诊断）都填好。
 *  纯静态站没有后端，这是唯一能"直接寄到指定邮箱"的办法（手机上会走 QQ 邮箱等邮件 App）。 */
export const FEEDBACK_MAIL = '909402449@qq.com';
/** 反馈分类（按钮上的选项，会写进报告标题，方便我分类） */
export const FEEDBACK_KINDS = [
  { id: 'bug', name: 'Bug / 报错', tag: 'BUG' },
  { id: 'balance', name: '难度失衡', tag: 'BALANCE' },
  { id: 'idea', name: '建议 / 新点子', tag: 'IDEA' },
  { id: 'feel', name: '手感 / 可读性', tag: 'FEEL' },
  { id: 'other', name: '其他', tag: 'OTHER' }
];

/**
 * 局外永久强化（#17 元进度）：用局外信用点购买，效果**刻意保守** ——
 * 合计满级约 +25 生命 / +7.5% 伤害 / -4% 冷却 / +24 拾取 / +45 开局信用点。
 * 设计原则：元进度只能"略微降低开局难度"，不能替代单局内的构筑决策，
 * 也不能让练满之后的局变成无脑局。`cost(lv)` 是"从 lv 升到 lv+1"的价格，越买越贵。
 */
export const META_UPGRADES = [
  { id: 'mhp', name: '强化骨架', icon: '🛡️', maxLv: 5, cost: lv => 60 + lv * 60, desc: lv => `最大生命 +${5 * (lv + 1)}`, apply: (b, lv) => { b.hp += 5 * lv; } },
  { id: 'mdmg', name: '火控校准', icon: '🔥', maxLv: 5, cost: lv => 80 + lv * 80, desc: lv => `伤害 +${(1.5 * (lv + 1)).toFixed(1)}%`, apply: (b, lv) => { b.dmgMul += 0.015 * lv; } },
  { id: 'mcd', name: '散热回路', icon: '⏱️', maxLv: 4, cost: lv => 90 + lv * 90, desc: lv => `武器冷却 -${(lv + 1)}%`, apply: (b, lv) => { b.cdMul *= Math.pow(0.99, lv); } },
  { id: 'mpick', name: '磁力线圈', icon: '🧲', maxLv: 3, cost: lv => 70 + lv * 70, desc: lv => `拾取范围 +${8 * (lv + 1)}`, apply: (b, lv) => { b.pick += 8 * lv; } },
  { id: 'mcred', name: '回收协议', icon: '💠', maxLv: 3, cost: lv => 100 + lv * 100, desc: lv => `开局信用点 +${15 * (lv + 1)}`, apply: (b, lv) => { b.credits += 15 * lv; } }
];

/**
 * 局内商店（#16）：信用点来自击毁精英/首领（不来自时间，避免"挂机也能买"）。
 * 价格随"本局买过几次"上涨，所以它是一局内的资源分配题，而不是无脑刷。
 * `once: true` 的项一局只能买一次（否则护盾叠满就没难度了）。
 */
/** 商品池（0.6.0 阶段 A2）：**商品是「属性组合」，不是手写行为** —— 这是"几十上百种"能成立的原因。
 *
 *  字段：`tier` 稀有度 1–4 · `base` 基准价（实际售价见 `shopPriceOf`）· `max` 每局上限（-1 无限）
 *        · `stats` 属性增减（键来自 `STAT_KEYS`）· `flag` 走 game.js 的特例 · `desc` 可选（缺省由 stats 自动生成）
 *
 *  品级解锁（按小节）：T1 第 1 小节起 · T2 第 2 起 · T3 第 4 起 · T4 第 7 起（权重见 game.js `drawTier`）。
 *  **负面强件**（Brotato 签名设计）：强效果配真代价 —— 代价必须落在"能不能做某件事"上（减伤/速度/生命），
 *  而不是"封底为 0 的软肋"（那种负面玩家会直接无视）。 */
export const ITEMS = [
  /* ---- T1：常见，便宜，小幅（构件） ---- */
  { id: 'mag', name: '弹匣扩容', icon: '📦', tier: 1, base: 30, stats: { atkSpd: 0.10 } },
  { id: 'plate', name: '附加装甲', icon: '🛡️', tier: 1, base: 35, stats: { maxHp: 30 } },
  { id: 'calib', name: '火力校准', icon: '🔥', tier: 1, base: 40, stats: { dmgMul: 0.08 } },
  { id: 'aim', name: '瞄准芯片', icon: '🎯', tier: 1, base: 40, stats: { crit: 0.06 } },
  { id: 'frag', name: '碎裂弹头', icon: '💥', tier: 1, base: 40, stats: { critDmg: 0.25 } },
  { id: 'hook', name: '拾荒钩爪', icon: '🪝', tier: 1, base: 30, stats: { pickupRange: 40 } },
  { id: 'thruster', name: '微调推进器', icon: '👟', tier: 1, base: 35, stats: { speed: 22 } },
  { id: 'scope', name: '战术目镜', icon: '🔭', tier: 1, base: 35, stats: { rangeMul: 0.12 } },
  { id: 'lucky', name: '幸运币', icon: '🍀', tier: 1, base: 35, stats: { luck: 2 } },
  { id: 'harvester', name: '收获机', icon: '🌾', tier: 1, base: 40, stats: { harvest: 3 } },
  { id: 'repair', name: '应急维修', icon: '🧰', tier: 1, base: 25, flag: 'heal40', desc: '立刻回复 40% 最大生命' },

  /* ---- T2：中等，开始有方向 ---- */
  { id: 'brutal', name: '凶暴核心', icon: '😤', tier: 2, base: 70, stats: { dmgMul: 0.18, dr: -0.05 } },
  { id: 'metab', name: '代谢加速', icon: '💚', tier: 2, base: 65, stats: { regen: 0.6, maxHp: -10 } },
  { id: 'magnet', name: '磁暴引线', icon: '🧲', tier: 2, base: 60, stats: { pickupRange: 60, orbPullMul: 0.6 } },
  { id: 'melee_amp', name: '近战增幅器', icon: '⚔️', tier: 2, base: 70, stats: { meleeDmg: 0.22 } },
  { id: 'ranged_amp', name: '远程增幅器', icon: '🏹', tier: 2, base: 70, stats: { rangedDmg: 0.22 } },
  { id: 'elem_amp', name: '元素增幅器', icon: '⚡', tier: 2, base: 70, stats: { elemDmg: 0.22 } },
  { id: 'vamp', name: '吸血协议', icon: '🩸', tier: 2, base: 80, stats: { killHealFlat: 0.8 } },
  { id: 'spring', name: '弹性装甲', icon: '🌀', tier: 2, base: 70, stats: { dodge: 0.08 } },
  { id: 'vendetta', name: '反击电容', icon: '🩹', tier: 2, base: 80, mech: 'vendetta', desc: '受伤后 4 秒内伤害 +30%（被打了反而更强）' },
  { id: 'wavegift', name: '波次补给', icon: '📯', tier: 2, base: 70, mech: 'wavegift', desc: '每波开始：回复 12 生命并 +8 信用点' },
  { id: 'rage', name: '背水一战', icon: '🫀', tier: 2, base: 75, mech: 'rage', desc: '生命低于 35% 时攻击速度 +25%' },
  { id: 'phase', name: '相位发生器', icon: '🔵', tier: 2, base: 90, flag: 'shield', desc: '获得相位护盾：每 10 秒完全抵挡一次伤害' },
  { id: 'caravan', name: '商队契约', icon: '💠', tier: 2, base: 50, flag: 'money', desc: '立刻获得 110 信用点' },

  /* ---- T3：稀有，强效果带真代价 + **机制件**（改玩法，不只是数值） ---- */
  { id: 'overcap', name: '过载电容', icon: '🔋', tier: 3, base: 130, stats: { dmgMul: 0.45, atkSpd: -0.15 } },
  { id: 'glass', name: '命悬一线', icon: '💀', tier: 3, base: 130, stats: { dmgMul: 0.60, pctMaxHp: -0.30 } },
  { id: 'forge', name: '装甲熔炉', icon: '🏭', tier: 3, base: 120, stats: { dr: 0.12, speed: -30 } },
  { id: 'greed', name: '贪婪核心', icon: '🤑', tier: 3, base: 140, stats: { creditsPerKill: 0.15 }, desc: '每击杀累积 0.15 信用点（一局约 +300）' },
  { id: 'chainkill', name: '连锁反应', icon: '💣', tier: 3, base: 130, mech: 'chainkill', desc: '击杀敌人时在小范围内引发爆炸（可叠加）' },
  { id: 'critnova', name: '暴击新星', icon: '✨', tier: 3, base: 120, mech: 'critnova', desc: '暴击时在目标处炸开，伤害为暴击的 30%' },
  { id: 'standfast', name: '锚定射击', icon: '⚓', tier: 3, base: 120, mech: 'standfast', desc: '静止 0.8 秒后伤害 +30%，一移动即重置' },
  { id: 'bargain', name: '商人牌', icon: '🏷️', tier: 3, base: 140, max: 2, mech: 'bargain', desc: '本局商店价格 −12%（可叠加 2 层）' },
  { id: 'singularity', name: '引力奇点', icon: '🕳️', tier: 3, base: 120, flag: 'lockOrbs', stats: { pickupRange: 120, orbPullMul: 0.6 } },
  { id: 'slowfield', name: '时滞立场', icon: '⏳', tier: 3, base: 130, flag: 'slowfield', desc: '260 范围内的敌方单位速度 −30%' },
  { id: 'sniper', name: '狙击套件', icon: '🎯', tier: 3, base: 120, stats: { rangeMul: 0.35, crit: 0.12, atkSpd: -0.10 } },

  /* ---- T4：传说（一局最多见几次） ---- */
  { id: 'overcore', name: '超载核心', icon: '☢️', tier: 4, base: 220, stats: { dmgMul: 0.90, pctMaxHp: -0.25 } },
  { id: 'nano', name: '纳米自修复', icon: '🧬', tier: 4, base: 200, stats: { regen: 1.4, maxHp: 40 } },
  { id: 'warmachine', name: '战争机器', icon: '🤖', tier: 4, base: 240, stats: { dmgMul: 0.35, atkSpd: 0.25, maxHp: 50, speed: -20 } },
  { id: 'inject', name: '数据注入', icon: '📡', tier: 4, base: 180, flag: 'levelup', desc: '立刻获得 1 级经验（会触发升级面板）' }
];


/** 信用点掉落：**只来自"事件"**（精英波 / 首领）+ 事件奖励 + 碎片（见 ORB_CREDIT_PER_EXP）——
 *  随机精英化的小怪不付钱：随机精英化最高占 26% 的生成量，按它发钱等于"按怪群规模发钱"
 *  （实测一整局 2428 点、够买 15 次，商店直接变清仓）。 */
export const CREDIT = { elite: 3, boss: 26 };

/** 碎片一份两用（0.6.0 阶段 A）：Brotato 的"材料"**同时给经验与钱**（见
 *  `reference/土豆兄弟拆解.md §3.1`）—— 这样不存在"攒钱 vs 升级"的内耗，取舍全部落到商店。
 *
 *  实测扫描（一局 18 次进店，每格 5 局；"空手率"= 进店时一件也买不起的占比）：
 *
 *  | 汇率 | 一局收入 | 购买中位 | 结余 | 每次进店可负担 | 空手率 |
 *  |---|---|---|---|---|---|
 *  | 1/220 | 1021 | 13 | 3.8%  | 1.54 | 46.7% |
 *  | 1/140 | 1191 | 16 | 2.2%  | 1.90 | 38.9% |
 *  | **1/90** | ~1700 | ~21 | ~2.5% | ~2.2 | ~23% |
 *  | 1/70  | 1877 | 23 | 2.0%  | 2.36 | 16.7% |
 *
 *  取 **1/90**：空手率 ≈ 23%（进店大多有事可做）、每次进店可负担 ≈ 2 件（要挑而不是全买）、
 *  一局约 21 件。比例越小钱越多，但"一件都买不起"的进店会变多 —— 那是商店最难受的形态。
 *  判据（跑 20 局）：购买次数中位数 ≥ 8（已远超）、每次进店可负担 ≈ 1.5–2.5、结余占收入 < 25%。
 *  调参钩子：`__game.setEcon({ orbPerExp, shopEveryWaves })` 可在一次会话里扫参数，不必重载。
 *  见 `reference/土豆兄弟对照与0.6.0重排.md` §4 阶段 A。 */
export const ORB_CREDIT_PER_EXP = 1 / 90;

/** 商店价格（0.6.0 阶段 A）：**不再按"本局买过几次"涨价**。
 *  旧模型 `base × (1 + 买过次数 × 0.60)` 每买一次全场 +60% —— 第二次购买价格就翻倍，
 *  于是"一局买 8 件以上"在数学上不可能：12 次进店里有 8 次是"什么都买不起"，那不是决策。
 *  现在改成**随小节上涨**，形状抄 Brotato 的 `floor((基础价 + 波数 + 基础价×0.1×波数))`：
 *  比例项让贵货涨得更多、**平价项让便宜货后期更不划算**（这是"后期必须挑"的结构性来源）。
 *  系数按"一局 9 个小节"标定：末小节便宜货约 ×3、贵货约 ×2.3。 */
export const SHOP_PRICE = { flat: 3, pct: 0.15 };
export function shopPriceOf(base, beat = 0) {
  const b = Math.max(0, beat);
  return Math.max(1, Math.round(base * (1 + SHOP_PRICE.pct * b) + SHOP_PRICE.flat * b));
}

/** Buff 波及半径等世界尺度常量（原样保留 Demo 数值） */
export const PICKUP_MAGNET_RANGE = 150;

/** 逻辑分辨率：镜头视口恒定这么大，窗口只负责等比缩放（黑边居中） */
export const VIEW = { w: 1280, h: 720 };

/** 世界（地图）尺寸：远大于视口，镜头跟随玩家，玩家可以在里面走位/风筝。
 *  2560 = 旧地图（2048）的 1.56 倍面积，340px/s 横穿一屏 7.5 秒。
 *  别再往上加：试过 3072（2.25 倍），墙夹不住人了，机器人约 4/9 局能绕满 25 分钟不死 ——
 *  这张地图的"终局"原来是靠边界把人逼到角落形成的，光靠敌人追击补不回来。改尺寸必须重跑单局时长。 */
export const WORLD = { w: 2560, h: 2560 };

/** 镜头高度（缩放）：滚轮或 -/= 调整，选择会存进 localStorage。zoom<1 = 镜头拉高看得更远
 *  min 由世界尺寸倒推：视口最多占掉地图的一大半，否则镜头几乎推不动、整张图一眼看完。
 *  0.7 → 视口 1829×1029，镜头还能横向推 731px、纵向推 1531px（刷怪圈也才有地方待）。 */
export const VIEW_ZOOM = { min: 0.7, max: 1.6, step: 0.1, default: 1 };

/** 精英：除了血厚，还会周期性放环形弹幕 —— 让精英成为「必须处理的事件」而不是肉盾 */
export const ELITE_BURST = { every: 4.2, count: 8, speedMul: 0.85 };
/** 击杀精英有概率掉宝箱，开箱等于白送一次升级（约 20%：既形成奖励循环，又不会造成升级通胀） */
export const ELITE_DROP_CHEST = 0.12;
/** 宝箱的吸附范围（比普通掉落物大得多，否则精英死在远处就白掉了） */
export const CHEST_MAGNET_RANGE = 620;

/** 曲线与常量 */
export const WAVE_LEN = 20;
/* 同屏敌人上限（可读性 #10 的核心旋钮）：实测 420 时会出现"视野里 410 只怪 + 266 发弹幕"的瞬间，
   占屏 6.1% 像素、400 个移动物体 —— 无论配色与外形怎么设计都读不清。
   260 是"still 有压迫感但每个单位都还能被眼睛跟踪"的量级。 */
export const MAX_ENEMY = 260;
/**
 * 敌方弹幕硬上限：扇形弹解锁后弹量会指数膨胀（实测第 14 波曾冲到 867 发）——
 * 既卡性能，也直接毁掉可读性（"元素混乱"）。精英/首领的环形弹幕保留额外额度，
 * 那是设计上的"正菜"，不该被小怪弹挤掉。
 */
export const MAX_ENEMY_BULLET = 260;
export const MAX_ENEMY_BULLET_RESERVE = 80;
/**
 * 友方弹体硬上限（**与敌方上限目的不同，别混用**）。
 * 敌方那个 260 是**可读性**旋钮（"元素混乱"），所以定在"每个单位还能被眼睛跟踪"的量级；
 * 这个 600 是**性能护栏**：唯一的目的是挡住弹量失控（6 格武器 + 更多武器之后，
 * 纳米虫群一类的 76 弹/秒 × 多把会在开阔地带堆积），**正常构筑不该碰到它**，
 * 所以刻意定得比"典型峰值"宽裕 —— 它不是平衡旋钮，调它不会让游戏更好玩。
 * ⚠️ 上限一旦真的咬住，表现是**静默少一发子弹** = 隐性 DPS 削减（玩家只会觉得"这枪有时候不打伤害"），
 * 所以 `fireAllyBullet()` 同时累计 `G.allyBulletPeak` / `G.allyBulletDropped`，
 * 用 `__game.snapshot()` 可查 —— 看到 `droppedLast > 0` 就说明这个值定低了（或构筑真的失控了）。
 */
export const MAX_ALLY_BULLET = 600;
/* ==================== 局内进程结构（0.6.0 阶段 0） ====================
   一局的骨架从"无限熬波次"变成「段 ×（战斗小节 + 事件）」。

   ⚠️ **`G.wave` 的语义与推进完全不变**（仍是 20 秒一波、单调递增）。
   `ENEMY_SCALE(w)` / `SPAWN.rate(w)` / `ENEMY_ABILITY`（12/18/20/28/30 波解锁）/
   Boss（每 5 波）/ 精英化（w<4）**全部是波次 w 的函数** —— 把波次总数砍掉一截，
   整条难度曲线会当场失效（`ENEMY_SCALE` 的指数段从 w>25 才开始）。
   所以「小节 / 段 / 事件」是**叠加在现有节拍上的分组**，不是替换波次系统。

   玩家感知的"一波" = `wavePerBeat` 个内部波次（3 × WAVE_LEN 20s = 60 秒）。

   ⚠️ 已知取舍：一局的总波数会从 44 左右降到 `stages × beatsPerStage × wavePerBeat`。
   难度重算是**阶段 4** 的事，阶段 0 只验证结构；调 `wavePerBeat`（或 WAVE_LEN）就能把波数补回来。
*/
export const RUN = {
  /* 3 → 4：实测 3 时一局只有 10.2 分钟、波数 28（历史 44），后期难度被压没了。
     4 波/小节 = 80 秒，一局 9 × 80s ≈ 12 分钟战斗 + 事件 ≈ 13.5 分钟，波数回到 36。 */
  wavePerBeat: 4,          // 一个小节 = 4 波 ≈ 80 秒（玩家感知的"一波"）
  beatsPerStage: 3,        // 一段 = 3 小节 + 1 个事件
  stages: 3,               // 一局 = 3 段
  /* 小铺节奏（阶段 A 新增）：每几波开一次小铺。
     实测（16 局，`__game.sim()`）：等于 wavePerBeat（每小节一次）时**一局只有 9 次进店**，
     而 Brotato 是 20 次 —— "决策密度"就是靠进店次数撑起来的，所以本节之内再补一次。
     2 → 一段 6 次（5 小铺 + 1 大铺），一局 18 次。设成 4 就退回旧节奏，便于两条都跑数据。 */
  shopEveryWaves: 2,
  /* 开局信用点（阶段 B1 必须补的一环）：武器搬到商店之后，**开局 0 信用点就买不起第一把武器**，
     DPS 起不来 → 碎片（经验/钱）收入跟着崩 → 死循环。实测（8 局）：不补开局资金时
     一局只活到第 10 波、全程 1 把武器。给 80 点 = 第一波后就能买一把 T1 武器（45）。 */
  startCredits: 80,
  /* 武器槽位（阶段 B1）：开局 3 格，靠升级卡最多扩到 6。
     为什么从 3 起而不是直接 6：槽位本身要是一条**可投资的选择**（A4 的"升级给槽位"），
     开局就 6 格则这条选择不存在。 */
  weaponSlots: 3,
  maxWeaponSlots: 6,
  /* 商店里武器占货架的比重（Brotato 是 35%）——武器进商店之后，
     "买武器还是买道具"必须是同一个货架上的取舍。 */
  weaponSlotChance: 0.35,
  smallShopItems: 3,       // 小铺：从现有 6 件里随机抽 3 件
  bigShopItems: 6,         // 大铺：现有 6 件全上（阶段 1 才做分类商品池）
  /* 事件奖励：**占位数值**。A7 的"奖励档位"是阶段 4 的事，
     阶段 0 只要证明"成功和失败拿到的东西确实不一样"。 */
  reward: { win: 90, lose: 25 }
};

/* 事件表：阶段 0 只做**三种零新系统**的事件 —— 全部复用现有敌人与 Boss。
   「护航」刻意不做：它需要"友军单位"这个全新类别（碰撞 / 受伤 / 渲染层序 / AI），
   而且"你的 AoE 会伤到运输舰"还要动 fireAllyBullet 的命中循环 —— 那是阶段 4。

   ⚠️ 时限是按**实测**调的，不是拍的：初版猎杀 40 秒而机器人 **5.2 秒**就打死了
   （8 倍余量 = 事件必然成功 = 等于没有事件）。现在三个事件都有真实的失败可能。 */
export const EVENTS = [
  {
    id: 'hunt', name: '猎杀', icon: '🎯', color: PALETTE.enemyBullet,
    brief: '陨级单位已锁定你的信号 —— 在时限内击毁它',
    time: 22,
    hpWaveAhead: 10,    // 目标血量按"当前波次 +10"算：打当前波的 Boss 太软（实测 5 秒死）
    tag: '时限内击杀'
  },
  {
    id: 'hold', name: '据点固守', icon: '🛡️', color: PALETTE.allyBeam,
    brief: '信标已投放 —— 进入圈内完成充能',
    time: 26,        // 需要在圈内累计的秒数
    grace: 1.5,      // 硬上限 = time × grace（实测 2.4 → 上限 62s 太宽松，从没失败过）
    radius: 200,
    offset: 340      // 信标投放在离玩家这个距离处（逼你移动过去，而不是原地站着）
  },
  {
    id: 'surge', name: '波潮', icon: '🌊', color: PALETTE.enemyBullet,
    brief: '残骸带密度骤增 —— 顶住这一波',
    time: 35,
    rateMul: 2.1,
    /* 唯一没有"失败条件"的事件：**唯一的失败就是死**。
       这是故意的 —— 一局里要有一种"没有借口、就是顶住"的事件，
       否则每个事件都在考同一件事（操作），没有节奏差。 */
    tag: '高压 · 没有失败条件'
  }
];
/**
 * 敌人「质变」表（第三批 #11）：按波次解锁**新行为**，而不是只加血加伤。
 * 为什么需要：SPAWN.rate 在第 17 波就封顶 20/秒、同屏上限 420，
 * 18 波之后唯一的压力来源只剩敌血成长 —— 结果是"要么撞死在 42 波、要么一路拖到 90 波"的双峰分布。
 * 这里给后期补上机制性的压力（扇形弹 / 二段冲刺 / 狂暴），而不是把敌人做成海绵。
 */
export const ENEMY_ABILITY = {
  shooterFan: 12,      // 炮塔机：单发 -> 3 发扇形
  shooterFan5: 28,     // 炮塔机：扇形扩到 5 发
  triangleDouble: 18,  // 突袭机：冲刺变两段（第一段结束后 0.3 秒接第二段）
  tankRage: 20,        // 重装机兵：血量 <35% 狂暴（移速 ×1.55、接触伤害 ×1.5）
  shooterFast: 30      // 炮塔机：射击间隔 1.8 -> 1.4 秒（扇形档 3.2 -> 2.4 秒）
};
export const SPAWN = {
  /**
   * 每秒生成数 = 基础曲线 × 开局渐入系数。
   * 案例共识：0–3 分钟温和（教学节奏），3–10 分钟线性加压，10 分钟后交给敌方血量成长制造终局。
   * 上限从 20/s 收到 13/s（可读性 #10）：20/s 会让同屏常年顶在上限上，
   * 屏幕上永远是"一堵墙"；13/s 让击杀节奏能跟上、画面有呼吸，压力交给敌血与机制。
   * 对应地敌人经验上调（见各类型的 exp），保证 XP 经济不因生成变慢而缩水。
   */
  /* 早期渐入也调快了一点：实测把上限从 20 收到 13 后，第 20 波前后出现过"等级跟不上、
     死在 6.8 分钟"的早死局 —— 少 35% 的怪等于少 35% 的经验收入，前中期要补回来。 */
  rate: w => Math.min(13, 2.4 + w * 0.9),
  /** 开局渐入：t=0 时 0.5 倍，t=55 秒到 1.0（0.5 + 55/110 = 1）—— 注释里的"110 秒"是分母，不是到达时间 */
  ramp: t => Math.min(1, 0.5 + t / 110),
  /** 每帧最多处理多少次生成（防止一帧内突发） */
  guard: 40,
  /** 精英波：这个波次开始时额外放一批精英 */
  eliteWaveEvery: 3,
  eliteWaveCount: 3
};
/* 机动性：目标速度靠拢得快，转向有角加速度；大角度掉头时转得更快 + 刹车更狠 */
export const PLAYER_SPEED = 340;
export const ACCEL_UP = 26;          // 速度大小：起步
export const ACCEL_DOWN = 16;        // 速度大小：松手滑行
export const ACCEL_BRAKE = 34;       // 反向输入时的减速（掉头不拖泥带水）
export const TURN_ACCEL = 10;        // 基础转向角加速度（弧度/秒）
export const TURN_BIG = 1.6;         // 要转的角度越大，额外倍率越高（180° 掉头 ≈ 2.6 倍）
export const TURN_RATE = 26;         // 机体朝向（纯视觉）跟随速度方向的速率
export const CAMERA = { lag: 12, lead: 0.08 };   // 镜头缓动速率 / 按速度前瞻的比例

export const PLAYER = { r: 8, hp: 150, pickupRange: 130, dmgMul: 1.3, cdMul: 0.9, crit: 0.05, invuln: 0.7 };

/**
 * 战机（#18）：开局三选一，只在**单局内**生效，不做解锁、不碰存档 ——
 * 目的是让"同一套卡池"在不同机体上有不同的取舍（厚血慢速 vs 纸皮高机动），
 * 从而不增加卡池的情况下提高重复可玩性。数值都是相对 PLAYER 基准的乘/加。
 * `start` 是该机体的招牌起始武器（实际只送这一把，没有赠送链式电弧）。
 */
export const SHIPS = [
  {
    id: 'falcon', name: '游隼', tag: '均衡', color: '#58a6ff',
    desc: '标准机体：无额外加成，机动与火力都在基准线上。适合第一次接触本作。',
    start: 'dart'
  },
  {
    id: 'bulwark', name: '壁垒', tag: '厚血', color: '#A8C8FF',
    desc: '重装机体：最大生命 230（+80）、受伤减免 12%，但移速 ×0.86、射速 ×0.95。招牌武器：近防霰弹。',
    start: 'flak',
    hp: 230, dr: 0.12, speedMul: 0.86, cdMul: 0.95, dmgMul: 1.15, pick: 120
  },
  {
    id: 'zephyr', name: '疾风', tag: '纸皮高机动', color: '#4FD6C8',
    desc: '轻装机体：移速 ×1.2、暴击 +8%、冷却 ×0.85、拾取范围 190，但最大生命只有 110。招牌武器：等离子刃环。',
    start: 'saw',
    hp: 110, speedMul: 1.2, cdMul: 0.85, crit: 0.08, pick: 190
  }
];

/** 数据残片：绿色菱形，与玩家的蓝、导弹/电弧的蓝白彻底区分 */
export const ORB = { r: 3, color: PALETTE.orbBody, core: PALETTE.orbCore };
export const ORB_AUTO_PICKUP = false; // 正式规则：只有进入拾取范围（pickupRange）的残片才会吸附
export const ORB_PULL = 4200;         // 吸附加速度（锁定后恒定生效，绝不脱钩）
export const ORB_PULL_CLOSE = 1.6;    // 越近额外加成的倍率
export const ORB_DRAG = 0.90;         // 每帧阻尼（同 Demo 口径）
export const ORB_ABSORB_PAD = 14;     // 吸收判定：player.r + 这个值
export const ORB_MAX = 220;           // 场上残片上限，超出清掉最远的（防性能劣化）

/** 掉落物 / 残片吸收 */
export const PICKUP = { r: 8 };

/**
 * 每级所需经验。
 * 形状要求（两个方向同时满足）：
 *   ① 前期要陡 —— 旧曲线 `4 + lv*3.2 + lv²*0.55` 太便宜：第一分钟杀 173 只 = 346 经验，
 *      而 1→10 级只要 318，于是**第一分钟连升 10 级**（每 6 秒弹一次三选一）。
 *   ② 中后段要够松 —— 武器改成 7 级后，练满 10 把要 60 次选择；一局拿不到 60 次，
 *      中前期战力就会被摊薄（实测 12 局里 3 局早死）。所以 40/60 级的门槛回到旧值附近。
 *   取 `11 + lv*4.2 + lv²*0.52`：lv1=15（旧 7）、lv5=45、lv10=105、lv40=1011（旧 1012）、
 *   lv60=2135（旧 2176）—— 开局照样慢，中后期拿到的选择数与旧版一致。
 */
export function expNeed(lv) {
  return Math.floor(11 + lv * 4.2 + lv * lv * 0.52);
}
