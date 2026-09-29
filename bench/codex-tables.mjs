// 图鉴取数脚本：把 reference/图鉴.md 里所有会变的数字**重新算一遍**。
// 图鉴的每个数值都应当能由这个脚本复现 —— 改完平衡（config.js）后先跑它，再更新图鉴。
// 用法: node bench/codex-tables.mjs          （全部）
//       node bench/codex-tables.mjs weapons  （只看武器）
const cfg = await import('../src/config.js');
const only = process.argv[2] || 'all';
const want = k => only === 'all' || only === k;

const L = lv => 1 + (lv - 1) * (4 / 6);
const N = lv => Math.round(L(lv));
const r2 = n => Math.round(n * 100) / 100;
const r3 = n => Math.round(n * 1000) / 1000;
const line = t => console.log('\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));

if (want('weapons')) {
  line(`武器 1..7 级全表（config.js: WEAPONS，VERSION=${cfg.VERSION}）`);
  console.log('列：伤害 / 冷却 / 数量 / 弹丸 / 射程 / 弹体寿命 / 单轮爆发 / 理论 DPS');
  for (const id in cfg.WEAPONS) {
    const w = cfg.WEAPONS[id];
    console.log(`\n[${id}] ${w.name}  mode=${w.mode} maxLv=${w.maxLv} color=${w.color}`);
    for (let lv = 1; lv <= w.maxLv; lv++) {
      const num = w.num ? w.num(lv) : (w.pellets ? w.pellets(lv) : 1);
      const dmg = w.dmg(lv);
      const cd = w.cd ? w.cd(lv) : null;
      const range = cfg.weaponRange(id, lv);
      const life = w.bulletSpeed ? r3(cfg.bulletLife(w)) : 0;
      const burst = num * dmg;
      const dps = cd ? r2(burst / cd * L(1) * 0 + burst / cd) : 0;
      console.log(`  Lv${lv}  dmg=${r2(dmg)}  cd=${cd === null ? '-' : r2(cd)}  num=${num}  range=${range}  life=${life || '-'}  burst=${burst}  dps=${dps || '-'}  ${w.pierce ? 'pierce=' + w.pierce(lv) : ''}${w.selfDps ? ' selfDps=' + r2(w.selfDps(lv)) : ''}${w.onKillHeal ? ' onKillHeal=' + r2(w.onKillHeal(lv)) : ''}`);
    }
    console.log(`  desc(Lv7) = ${w.desc(7)}`);
  }
}

if (want('stats')) {
  line('属性强化卡 STATS（id / 名称 / 权重 / 上限 / 说明）');
  for (const s of cfg.STATS) console.log(`  ${s.id.padEnd(8)} ${s.name.padEnd(6)} w=${String(s.w).padEnd(4)} max=${s.maxLevel}  ${s.desc}`);
  const sum = cfg.STATS.reduce((a, s) => a + s.maxLevel, 0);
  console.log(`  → 属性池总量 = ${sum} 次选择`);
  line('超频模组 MODULES');
  for (const m of cfg.MODULES) console.log(`  ${m.id.padEnd(12)} ${m.name.padEnd(6)} max=${m.maxLevel}  ${m.desc}`);
}

if (want('enemy')) {
  line('敌人成长：ENEMY_SCALE / DMG / SPEED / 生成率 / 各类型血量');
  console.log('  w | SCALE | DMG | SPD | rate | normal | fast | tank | triangle | splitter | shooter | sniper');
  for (let w = 1; w <= 50; w += (w < 10 ? 1 : 5)) {
    const T = cfg.ENEMY_TYPES;
    console.log(`  ${String(w).padStart(2)} | ${r2(cfg.ENEMY_SCALE(w)).toString().padStart(6)} | ${r2(cfg.ENEMY_DMG_SCALE(w))} | ${r2(cfg.ENEMY_SPEED_SCALE(w))} | ${String(r2(cfg.SPAWN.rate(w))).padStart(4)} | ` +
      ['normal', 'fast', 'tank', 'triangle', 'splitter', 'shooter', 'sniper'].map(k => String(Math.round(T[k].hp(w))).padStart(7)).join(' | '));
  }
  console.log(`  接触伤害 enemyDamage(w) = (3.5 + w*0.55) * (1 + w*0.035)；w=10 → ${r2(cfg.enemyDamage(10))}，w=30 → ${r2(cfg.enemyDamage(30))}，w=45 → ${r2(cfg.enemyDamage(45))}`);
  console.log(`  分裂子体 SPLITTER_CHILD(w) hp = (8 + w*3) * SCALE`);
  line('陨级 Boss（BOSS_TYPES）');
  for (const k in cfg.BOSS_TYPES) {
    const b = cfg.BOSS_TYPES[k];
    console.log(`  ${k.padEnd(11)} ${b.name.padEnd(5)} spd=${b.spd} r=${b.r} exp=${b.exp}  hp(10)=${Math.round(b.hp(10))} hp(20)=${Math.round(b.hp(20))} hp(30)=${Math.round(b.hp(30))} hp(45)=${Math.round(b.hp(45))}  dmg(45)=${r2(b.dmg(45))}`);
  }
  console.log(`  出招选型：w%25==0 相位者 / w%20==0 壁垒者 / w%15==0 旋翼者 / w%10==0 裂空者 / 其余劫掠者`);
  console.log(`  阶段：${cfg.BOSS_PHASE.map(p => `hp<=${p.at} → 移速×${p.spd} 冷却×${p.cd}（${p.label}）`).join('；')}`);
  line('敌方攻击参数');
  console.log(`  LASER ${JSON.stringify(cfg.LASER)}`);
  console.log(`  ZONE  ${JSON.stringify(cfg.ZONE)}`);
  console.log(`  BLINK ${JSON.stringify(cfg.BLINK)}`);
  console.log(`  ENEMY_ABILITY ${JSON.stringify(cfg.ENEMY_ABILITY)}`);
  console.log(`  精英化 ELITE ${JSON.stringify({ chance: 'min(0.26, 0.015 + w*0.011)', hpMul: cfg.ELITE.hpMul, rMul: cfg.ELITE.rMul, expMul: cfg.ELITE.expMul, dmgMul: cfg.ELITE.dmgMul })}`);
}

if (want('econ')) {
  line('经济：XP / 商店 / 局外存档 / 永久强化');
  console.log('  expNeed(lv) = floor(11 + lv*4.2 + lv^2*0.52)');
  for (const lv of [1, 5, 10, 20, 30, 40, 50, 60, 70]) console.log(`    lv${String(lv).padStart(2)} → ${Math.round(cfg.expNeed(lv))}`);
  console.log(`\n  局内商店（ITEMS 商品池，价格随**小节**上涨：SHOP_PRICE=${JSON.stringify(cfg.SHOP_PRICE)}，一局 ${cfg.RUN.stages * cfg.RUN.beatsPerStage} 小节）`);
  const byTier = {};
  for (const it of cfg.ITEMS) (byTier[it.tier] = byTier[it.tier] || []).push(it);
  for (const t of Object.keys(byTier).sort()) {
    const list = byTier[t];
    const prices = list.map(i => i.base);
    console.log(`    ── T${t}：${list.length} 件 · 基准价 ${Math.min(...prices)}–${Math.max(...prices)}`);
    for (const it of list) console.log(`       ${it.name.padEnd(6)} ${String(it.base).padStart(3)}  ${it.desc || cfg.statsText(it.stats || {})}`);
  }
  console.log(`\n  信用点来源 CREDIT ${JSON.stringify(cfg.CREDIT)}（精英波与首领）+ 事件奖励 + **碎片一份两用**（每 ${(1 / cfg.ORB_CREDIT_PER_EXP).toFixed(0)} 点碎片经验 = 1 信用点）`);
  console.log(`  局外结算 = floor(存活秒/12 + 波次*2 + 击毁/120)`);
  line('永久强化 META_UPGRADES（价格 = cost(lv) 升到 lv+1）');
  for (const u of cfg.META_UPGRADES) {
    const costs = []; for (let lv = 0; lv < u.maxLv; lv++) costs.push(u.cost(lv));
    console.log(`  ${u.id.padEnd(6)} ${u.name.padEnd(6)} max=${u.maxLv} 价格 ${costs.join(' / ')}  总计 ${costs.reduce((a, b) => a + b, 0)}  Lv1 效果：${u.desc(0)}`);
  }
  const b = { hp: 0, dmgMul: 0, cdMul: 1, pick: 0, credits: 0 };
  for (const u of cfg.META_UPGRADES) u.apply(b, u.maxLv);
  console.log(`  → 满级合计：+${b.hp} 生命 / +${r2(b.dmgMul * 100)}% 伤害 / 冷却 ×${r3(b.cdMul)} / +${b.pick} 拾取 / +${b.credits} 开局信用点`);
  line('机体 SHIPS（相对 PLAYER 基准）');
  console.log(`  基准 PLAYER: hp=${cfg.PLAYER.hp} pickup=${cfg.PLAYER.pickupRange} dmgMul=${cfg.PLAYER.dmgMul} cdMul=${cfg.PLAYER.cdMul} crit=${cfg.PLAYER.crit}`);
  for (const s of cfg.SHIPS) console.log(`  ${s.id.padEnd(8)} ${s.name.padEnd(4)} hp=${s.hp || cfg.PLAYER.hp} 移速×${s.speedMul || 1} 冷却×${s.cdMul || cfg.PLAYER.cdMul} 暴击+${s.crit || 0} 拾取=${s.pick || cfg.PLAYER.pickupRange} 减伤=${s.dr || 0} 起始武器=${s.start}`);
}

if (want('limits')) {
  line('上限与常量');
  const kv = {
    VIEW: JSON.stringify(cfg.VIEW), WORLD: JSON.stringify(cfg.WORLD), VIEW_ZOOM: JSON.stringify(cfg.VIEW_ZOOM),
    MAX_ENEMY: cfg.MAX_ENEMY, MAX_ENEMY_BULLET: cfg.MAX_ENEMY_BULLET, MAX_ENEMY_BULLET_RESERVE: cfg.MAX_ENEMY_BULLET_RESERVE,
    ORB_MAX: cfg.ORB_MAX, ORB: JSON.stringify(cfg.ORB), PICKUP_MAGNET_RANGE: cfg.PICKUP_MAGNET_RANGE,
    WAVE_LEN: cfg.WAVE_LEN, SPAWN: JSON.stringify(cfg.SPAWN), VERSION: cfg.VERSION,
    FEEDBACK_MAIL: cfg.FEEDBACK_MAIL, SHOP_PRICE: JSON.stringify(cfg.SHOP_PRICE),
    ORB_CREDIT_PER_EXP: cfg.ORB_CREDIT_PER_EXP
  };
  for (const k in kv) console.log(`  ${k.padEnd(26)} ${kv[k]}`);
  const ranges = Object.keys(cfg.WEAPONS).map(id => cfg.weaponRange(id, 7));
  console.log(`  射程区间（Lv7）：${Math.min(...ranges)} .. ${Math.max(...ranges)}（MAX_WEAPON_RANGE 取 Lv5 口径）`);
}
