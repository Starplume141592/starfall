// 劫波 · 游戏逻辑与主循环（原生 ES module，无打包器、无依赖、无资源文件）
// 所有数值来自 config.js；绘制全部交给 render.js。行为与单文件 Demo 完全一致。
import {
  WEAPONS, STATS, MODULES, weaponRange, bulletLife, ENEMY_TYPES, enemyDamage, SPLITTER_CHILD, BOSS_TYPES, ELITE, SHOOTER_BULLET,
  ENEMY_SPEED_SCALE,
  WAVE_LEN, MAX_ENEMY, SPAWN, PLAYER_SPEED, ACCEL_UP, ACCEL_DOWN, PLAYER, VIEW, WORLD, VIEW_ZOOM,
  ELITE_BURST, ELITE_DROP_CHEST, CHEST_MAGNET_RANGE, PALETTE,
  TURN_RATE, TURN_ACCEL, TURN_BIG, ACCEL_BRAKE, CAMERA,
  ORB, ORB_AUTO_PICKUP, ORB_PULL, ORB_PULL_CLOSE, ORB_DRAG, ORB_ABSORB_PAD, ORB_MAX,
  PICKUP, PICKUP_MAGNET_RANGE,
  expNeed, mkName
} from './config.js';

/** 每升多少级触发一次「超频跃迁」四选一 */
const JUMP_EVERY = 9;
/** 粒子/飘字上限：否则一颗战术弹（同帧命中数百敌人）会在单帧造出上千对象 */
const MAX_PART = 700;
const MAX_TEXT = 70;
import { render, fx } from './render.js';
import { iconFor } from './icons.js';
import { createAudio } from './audio.js';

const audio = createAudio();
const BEST_KEY = 'starfall.best.v1';
function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); } catch { return null; }
}
function saveBest(r) {
  try { localStorage.setItem(BEST_KEY, JSON.stringify(r)); } catch { /* 隐私模式忽略 */ }
}

/* ==================== 画布：固定逻辑分辨率 + 等比缩放居中 ==================== */
const stage = document.getElementById('stage');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const W = VIEW.w, H = VIEW.h;   // 游戏逻辑只用这套坐标，窗口怎么变都不影响世界尺寸
let DPR = 1;

/* ==================== 小工具 ==================== */
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
const dist2 = (a, b) => { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; };
const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

/* ==================== 镜头高度（缩放） ====================
   zoom < 1 = 镜头拉高（看得更远、东西更小）；> 1 = 推近。
   视口在世界里的尺寸 = W/zoom × H/zoom，相机、刷怪圈、剔除范围全都跟着它走。 */
const ZOOM_KEY = 'starfall.zoom.v1';
let zoomTarget = clamp(Number(localStorage.getItem(ZOOM_KEY)) || VIEW_ZOOM.default, VIEW_ZOOM.min, VIEW_ZOOM.max);
let zoom = zoomTarget;                       // 实际用于渲染的值，平滑逼近 zoomTarget
const viewW = () => W / zoom;
const viewH = () => H / zoom;

function setZoom(z) {
  zoomTarget = clamp(z, VIEW_ZOOM.min, VIEW_ZOOM.max);
  try { localStorage.setItem(ZOOM_KEY, String(zoomTarget)); } catch { /* 隐私模式忽略 */ }
}
function nudgeZoom(dir) { setZoom(zoomTarget + dir * VIEW_ZOOM.step); }

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  const cssW = Math.round(W * scale);
  const cssH = Math.round(H * scale);
  stage.style.width = cssW + 'px';
  stage.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * DPR);
  canvas.height = Math.round(cssH * DPR);
  ctx.setTransform(DPR * scale, 0, 0, DPR * scale, 0, 0);
}
window.addEventListener('resize', resize);
resize();

/** 屏幕坐标 → 逻辑坐标（画布被等比缩放，触摸点必须换算） */
function toLocal(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left) / r.width * W, y: (clientY - r.top) / r.height * H };
}

/* ==================== 状态 ==================== */
let player, G, pendingLevels = 0, shake = 0, uid = 0;
let hitStop = 0, flashA = 0, flashColor = '255,90,90';
const keys = {};

/* ==================== 闪光票据制 ====================
   全屏闪光是"亮度突变 + 大面积"，WCAG 2.3.1 的规范线是每秒不超过 3 次。
   以前各处直接 `flashA = Math.max(flashA, x)`，密集击杀时一秒能闪七八次。
   现在发票据：冷却期内的请求**直接丢弃**（不排队，也不打折补发 —— 半强度连续闪照样是闪）。 */
const FLASH_TICKET = 1 / 3;         // 每 340ms 一张
let flashCd = 0;
function flash(amount, color) {
  if (flashCd > 0) return;
  flashCd = FLASH_TICKET;
  flashA = Math.max(flashA, amount);
  if (color) flashColor = color;
}

const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
const elHp = document.getElementById('hpFill');
const elXp = document.getElementById('xpFill');
const elHpNum = document.getElementById('hpHp');
const elXpVal = document.getElementById('xpVal');
const elLv = document.getElementById('sLv');
const elWave = document.getElementById('sWave');
const elTime = document.getElementById('clockTime');     // 顶部正中：运行计时
const elKill = document.getElementById('sKill');
const elNext = document.getElementById('clockNext');      // 顶部正中：下一波倒计时
const elZoom = document.getElementById('sZoom');
const loadoutEl = document.getElementById('loadout');
let loadoutKey = '';
const elCombo = document.getElementById('combo');
const pauseEl = document.getElementById('pause');
const pauseTitleEl = document.getElementById('pauseTitle');
const muteStateEl = document.getElementById('muteState');

/** 当前装备终端里的三张卡（支持 1/2/3 快捷选择） */
let currentOptions = null;
/** 手动暂停（ESC / 失焦自动暂停） */
let pausedManual = false;
let pauseReason = '';                   // '' = 玩家手动，'blur' = 失焦自动暂停

function togglePause(force, reason) {
  if (G && G.over) return;
  pausedManual = force === undefined ? !pausedManual : !!force;
  pauseReason = pausedManual ? (reason || '') : '';
  pauseEl.classList.toggle('hidden', !pausedManual);
  if (pausedManual && pauseTitleEl) {
    pauseTitleEl.textContent = pauseReason === 'blur' ? '窗口失焦 · 已暂停' : '已暂停';
  }
}
/* 点一下就继续：失焦回来时不用去猜该按哪个键 */
pauseEl.addEventListener('click', () => { audio.unlock(); togglePause(false); });
function syncMuteLabel() {
  if (muteStateEl) muteStateEl.textContent = audio.muted ? '关' : '开';
}
function toggleMute() {
  const m = audio.toggleMute();
  syncMuteLabel();
  return m;
}

function reset() {
  player = {
    x: WORLD.w / 2, y: WORLD.h / 2, r: PLAYER.r,
    vx: 0, vy: 0,               // 当前速度（惯性）
    angle: 0,                   // 朝向
    footTimer: 0,               // 尾焰粒子计时
    speed: PLAYER_SPEED,
    hp: PLAYER.hp, maxHp: PLAYER.hp, dr: 0, crit: PLAYER.crit,
    level: 1, exp: 0, expNext: expNeed(1),
    pickupRange: PLAYER.pickupRange, dmgMul: PLAYER.dmgMul, cdMul: PLAYER.cdMul,
    invuln: 0, kills: 0,
    regen: 0, shield: false, shieldCd: 0, slowField: 1, orbPullMul: 1,   // 超频跃迁模组带来的能力
    killHealAcc: 0, killHealAt: 0,                        // 击杀回血的每秒上限
    statLevels: {}, mods: {}, jumpPending: false,
    weapons: [{ id: 'dart', lv: 1, t: 0.15, angle: 0 }],
    touch: { active: false, sx: 0, sy: 0, dx: 0, dy: 0, id: null }
  };
  G = {
    t: 0, wave: 1, waveTimer: 0, spawnAcc: 0, bossSpawned: false, eliteWaveSpawned: false, eventWarned: false,
    dmgAcc: 0, dmgSamples: [], lastDmgAt: 0, dmgTaken: {},     // 调试用：每秒伤害/承伤统计
    cam: { x: 0, y: 0 },          // 镜头左上角（世界坐标）
    enemies: [], bullets: [], beams: [], enemyBullets: [], pickups: [],
    orbs: [], texts: [], parts: [], bolts: [], rings: [],
    paused: false, over: false, combo: 0, comboTimer: 0, comboBest: 0
  };
  pendingLevels = 0; shake = 0; hitStop = 0; flashA = 0;
  currentOptions = null;
  loadoutKey = '!';
  pausedManual = false;
  pauseEl.classList.add('hidden');
  syncMuteLabel();
  overlay.classList.remove('show');
  updateCamera();
}

/** 镜头跟随：缓动 + 按速度前瞻（夹在世界内）。dt 省略时直接吸附（用于重置）
 *  视口尺寸 = 画布 / 缩放，所以拉高镜头（zoom<1）时能看到更大范围、相机夹取范围也随之变化。 */
function updateCamera(dt) {
  const lead = dt === undefined ? 0 : CAMERA.lead;
  const vw = viewW(), vh = viewH();
  const maxX = Math.max(0, WORLD.w - vw);
  const maxY = Math.max(0, WORLD.h - vh);
  const tx = clamp(player.x + player.vx * lead - vw / 2, 0, maxX);
  const ty = clamp(player.y + player.vy * lead - vh / 2, 0, maxY);
  if (dt === undefined) {
    G.cam.x = tx; G.cam.y = ty;
    return;
  }
  const f = 1 - Math.exp(-CAMERA.lag * dt);
  G.cam.x += (tx - G.cam.x) * f;
  G.cam.y += (ty - G.cam.y) * f;
}
/** 弹体回收边距（视口外多少像素才回收）。≥ 最长射程 − 视口半高，见 update() 里的注释 */
const BULLET_CULL_MARGIN = 420;
/** 面板上"射程"进度条的分母：取全武器最大射程，让长短一目了然 */
const MAX_WEAPON_RANGE = Math.max(...Object.keys(WEAPONS).map(id => weaponRange(id, 5)));

function restart() { reset(); }

/* ==================== 输入 ==================== */
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  /* 长按产生的自动重复事件直接忽略：否则按住 1 会把后续每一级面板都静默选掉 */
  if (e.repeat) return;
  audio.unlock();                       // 浏览器要求首次用户操作后才能出声
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') { if (!currentOptions) togglePause(); return; }   // 终端开着时不抢 ESC
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') { nudgeZoom(-1); return; }   // 镜头拉高（看得更远）
  if (e.code === 'Equal' || e.code === 'NumpadAdd') { nudgeZoom(1); return; }         // 镜头推近
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (e.code === 'KeyR' && G && G.over) restart();
  // 装备终端开着时，1/2/3 直接选卡
  if (currentOptions) {
    const idx = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].indexOf(e.code);
    if (idx >= 0) {
      const opt = currentOptions[idx % 3];
      if (opt) chooseOption(opt);
    }
  }
});

/* 失焦/切后台：清空按键 + 自动暂停。
   浏览器失焦时不派发 keyup（否则回来会发现自己一直在滑行），而且后台 rAF 被限到 ~1fps，
   玩家会看到"画面不动、按键没反应"——那看起来就像游戏卡死。直接暂停并写明原因。 */
function releaseInput() {
  for (const k in keys) keys[k] = false;
  if (player && player.touch) {
    player.touch.active = false;
    player.touch.dx = 0; player.touch.dy = 0;
  }
}
function onLoseFocus() {
  releaseInput();
  if (G && !G.over && !currentOptions && !pausedManual) togglePause(true, 'blur');
}
window.addEventListener('blur', onLoseFocus);
/* 焦点回来后自动继续：失焦暂停只是为了不让角色在后台瞎跑，不该要玩家再点一次 */
window.addEventListener('focus', () => {
  if (pausedManual && pauseReason === 'blur') togglePause(false);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) onLoseFocus();
  else if (pausedManual && pauseReason === 'blur') togglePause(false);
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault(); if (!player) return;
  audio.unlock();
  const t = e.changedTouches && e.changedTouches[0]; if (!t) return;
  const p = toLocal(t.clientX, t.clientY);
  player.touch.active = true; player.touch.id = t.identifier;
  player.touch.sx = p.x; player.touch.sy = p.y;
  player.touch.dx = 0; player.touch.dy = 0;
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault(); if (!player || !player.touch.active) return;
  let t = null;
  if (e.changedTouches) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === player.touch.id) { t = e.changedTouches[i]; break; }
    }
  }
  if (!t) return;
  const p = toLocal(t.clientX, t.clientY);
  const dx = p.x - player.touch.sx, dy = p.y - player.touch.sy;
  const len = Math.hypot(dx, dy);
  if (len > 12) { player.touch.dx = dx / len; player.touch.dy = dy / len; }
  else { player.touch.dx = 0; player.touch.dy = 0; }
}, { passive: false });
function endTouch(e) {
  e.preventDefault(); if (!player) return;
  player.touch.active = false; player.touch.dx = 0; player.touch.dy = 0; player.touch.id = null;
}
canvas.addEventListener('touchend', endTouch, { passive: false });
canvas.addEventListener('touchcancel', endTouch, { passive: false });

/* 滚轮调整镜头高度：往下滚 = 拉高看得更远，往上滚 = 推近 */
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  nudgeZoom(e.deltaY > 0 ? -1 : 1);
}, { passive: false });

/* ==================== 生成敌方单位 ==================== */
function buildEnemy(type, x, y, w) {
  const def = ENEMY_TYPES[type] || ENEMY_TYPES.normal;
  const hp = def.hp(w);
  const spd = (def.spd !== undefined ? def.spd : rand(def.spdMin, def.spdMax)) * ENEMY_SPEED_SCALE(w);
  const e = {
    id: ++uid, x, y, r: def.r, hp, maxHp: hp, speed: spd, dmg: enemyDamage(w),
    color: def.color, exp: def.exp, type, kx: 0, ky: 0, orbCd: 0, flash: 0, dead: false, boss: false
  };
  if (type === 'triangle') { e.dashCd = rand(0.8, 2.0); e.dashTimer = 0; e.isDashing = false; e.dashVx = 0; e.dashVy = 0; }
  if (type === 'shooter') { e.shootCd = rand(0.5, 1.5); }
  return e;
}

/** 精英化：血厚、体型大、经验多、伤害高 */
function makeElite(e, w) {
  e.elite = true;
  e.hp = e.maxHp = Math.round(e.hp * ELITE.hpMul);
  e.r = Math.round(e.r * ELITE.rMul);
  e.exp = Math.round(e.exp * ELITE.expMul);
  e.dmg *= ELITE.dmgMul;
  return e;
}

function spawnEnemy(forceElite) {
  if (G.enemies.length >= MAX_ENEMY) return null;
  const w = G.wave;
  // 从镜头外一圈刷出（不是从地图边缘），玩家身后也会来
  const m = 50 / Math.min(1, zoom);   // 拉高镜头时按屏幕距离换算，保证刷怪点始终在画面外约 50px
  const L = G.cam.x - m, R = G.cam.x + viewW() + m, T = G.cam.y - m, B = G.cam.y + viewH() + m;
  const side = Math.floor(Math.random() * 4);
  let x, y;
  /* 注意：垂直方向那条边**不能 clamp 进世界**，否则相机贴边时（cam=0 或 max）刷怪点会被
     拉回视口内部，怪会在画面里凭空出现，甚至直接生成在玩家接触距离内。沿边方向才 clamp。 */
  if (side === 0) { x = clamp(rand(L, R), 20, WORLD.w - 20); y = T; }
  else if (side === 1) { x = R; y = clamp(rand(T, B), 20, WORLD.h - 20); }
  else if (side === 2) { x = clamp(rand(L, R), 20, WORLD.w - 20); y = B; }
  else { x = L; y = clamp(rand(T, B), 20, WORLD.h - 20); }

  let type = 'normal';
  if (w >= 2) {
    const roll = Math.random();
    if (roll < 0.10) type = 'triangle';
    else if (w >= 4 && roll < 0.16) type = 'splitter';
    else if (w >= 5 && roll < 0.23) type = 'shooter';
    else if (roll < 0.42) type = 'fast';
    else if (w >= 5 && roll < 0.55) type = 'tank';
  }
  const e = buildEnemy(type, x, y, w);
  if (forceElite || Math.random() < ELITE.chance(w)) makeElite(e, w);
  G.enemies.push(e);
  return e;
}

/* ==================== 劫级装甲核心（Boss） ==================== */
function spawnBoss() {
  const w = G.wave;
  const m = 70 / Math.min(1, zoom);
  const L = G.cam.x - m, R = G.cam.x + viewW() + m, T = G.cam.y - m, B = G.cam.y + viewH() + m;
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = clamp(G.cam.x + viewW() / 2, 60, WORLD.w - 60); y = T; }
  else if (side === 1) { x = R; y = clamp(G.cam.y + viewH() / 2, 60, WORLD.h - 60); }
  else if (side === 2) { x = clamp(G.cam.x + viewW() / 2, 60, WORLD.w - 60); y = B; }
  else { x = L; y = clamp(G.cam.y + viewH() / 2, 60, WORLD.h - 60); }
  const def = (w % 10 === 0) ? BOSS_TYPES.summoner : BOSS_TYPES.charger;
  const hp = def.hp(w);
  const boss = {
    id: ++uid, x, y, r: def.r, hp, maxHp: hp, speed: def.spd * ENEMY_SPEED_SCALE(w), dmg: def.dmg(w),
    color: def.color, exp: def.exp, type: 'boss', variant: def.variant, bossName: def.name,
    kx: 0, ky: 0, orbCd: 0, flash: 0, dead: false, boss: true,
    // 劫掠者：追击 → 充能 → 突进 → 瘫痪；裂空者：追击 → 蓄能 → 弹幕 → 召唤 → 虚弱
    state: 'chase', stateTime: def.variant === 'summoner' ? 2.4 : 3.0,
    chargeAngle: 0, chargeVx: 0, chargeVy: 0,
    vulnMul: 1
  };
  G.enemies.push(boss);
  audio.bossWarn();
  addText(x, y - 60, `警告：${def.name} 接近`, def.color, 24);
  flash(.4, '240,101,149');
  shake = Math.max(shake, 12);
}

/* ==================== 特效 ==================== */
function addText(x, y, txt, color, size) {
  if (G.texts.length >= MAX_TEXT) return;
  G.texts.push({ x, y, txt: String(txt), color: color || '#ffe066', size: size || 15, life: 0.7, max: 0.7 });
}
/** 爆炸/击杀火花。
 *  高光色**不能用暖黄**：暖琥珀是调色板里"危险"的语义色（敌方弹幕、预警），
 *  而火花一秒能刷几百颗 —— 满屏暖黄碎屑会让玩家把爆炸当成弹幕。
 *  所以高光取冷白蓝，火花主体取来源单位的本色（小兵本来就是冷灰）。 */
function burst(x, y, color, count, power) {
  const room = MAX_PART - G.parts.length;
  if (room <= 0) return;
  const n = Math.min(count, room);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = rand(power * 0.3, power);
    G.parts.push({
      x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: rand(0.25, 0.65), max: 0.65, r: rand(1.5, 3.5),
      color: Math.random() < 0.3 ? PALETTE.allyBeam : color
    });
  }
}

function tryDropPickup(x, y, e) {
  let chance = 0.03;
  if (e.type === 'tank') chance = 0.10;
  if (e.type === 'shooter') chance = 0.12;
  if (e.elite && Math.random() < ELITE_DROP_CHEST) {       // 精英有概率掉宝箱
    G.pickups.push({ x, y, kind: 'chest', vx: rand(-40, 40), vy: rand(-40, 40), r: PICKUP.r, life: 30 });
    return;
  }
  if (e.boss) chance = 1;
  if (Math.random() > chance) return;
  const r = Math.random();
  let kind;
  if (e.boss) { kind = ['heart', 'magnet', 'bomb'][Math.floor(Math.random() * 3)]; }
  else if (r < 0.55) kind = 'heart';
  else if (r < 0.82) kind = 'magnet';
  else kind = 'bomb';
  G.pickups.push({ x, y, kind, vx: rand(-60, 60), vy: rand(-60, 60), r: PICKUP.r, life: 15 });
}

function hurtEnemy(e, dmg, kx, ky) {
  if (e.dead) return;
  const crit = Math.random() < player.crit;
  const mul = e.vulnMul || 1;
  const real = (crit ? dmg * 2 : dmg) * mul;
  e.hp -= real;
  e.kx += kx || 0; e.ky += ky || 0;
  e.flash = 0.09;
  G.dmgAcc += real;                 // DPS 统计
  audio.hit();

  // 瘫痪期间飘字变黄加粗
  if (mul > 1) {
    addText(e.x + rand(-6, 6), e.y - e.r - 4, Math.round(real), '#ffcc00', 22);
  } else {
    addText(e.x + rand(-6, 6), e.y - e.r - 4, Math.round(real), crit ? '#ff6b6b' : '#ffe066', crit ? 20 : 15);
  }

  if (e.hp <= 0) {
    e.dead = true;
    player.kills++;
    audio.kill();

    /* 击杀回复（纳米虫群）—— 每秒最多回 5% 最大生命，否则后期每秒几十杀会变成无敌 */
    let healOnKill = 0;
    for (const w of player.weapons) {
      const d = WEAPONS[w.id];
      if (d.onKillHeal) healOnKill += d.onKillHeal(w.lv);
    }
    if (healOnKill > 0) {
      if (G.t - player.killHealAt > 1) { player.killHealAt = G.t; player.killHealAcc = 0; }
      const cap = player.maxHp * 0.05;
      const allow = Math.max(0, cap - player.killHealAcc);
      const real = Math.min(healOnKill, allow);
      if (real > 0) {
        player.killHealAcc += real;
        player.hp = Math.min(player.maxHp, player.hp + real);
        addText(player.x + rand(-10, 10), player.y - 30, '+' + real.toFixed(1), '#22d3ee', 14);
      }
    }
    G.combo++; G.comboTimer = 1.6;
    if (G.combo > G.comboBest) G.comboBest = G.combo;

    if (e.boss) hitStop = Math.max(hitStop, 0.12);
    else if (crit) hitStop = Math.max(hitStop, 0.025);

    shake = Math.max(shake, e.boss ? 20 : 2);   // 击杀：原来是 3~5（随连击增长），密集清屏时会一直抖

    if (e.boss) {
      flash(.5, '240,101,149');
      hitStop = Math.max(hitStop, 0.2);
    } else if (G.combo > 0 && G.combo % 10 === 0) {
      flash(.12, '255,90,90');
    }

    burst(e.x, e.y, e.color, e.boss ? 50 : 12, e.boss ? 600 : 280);
    /* 击杀冲击波：只给"值得看一眼"的单位（重装/分裂/精英/Boss）。
       小兵一秒死十几个，人人来一圈的话整屏都是白圈 —— 那叫噪点，不叫打击感。 */
    if (e.boss || e.elite) {
      G.rings.push({ x: e.x, y: e.y, r: e.r * 0.8, max: e.r * (e.boss ? 7 : 4), age: 0, life: 0.5, color: e.elite ? PALETTE.elite : PALETTE.bossRim });
      shake = Math.max(shake, e.boss ? 14 : 5);
    } else if (e.r >= 10) {
      G.rings.push({ x: e.x, y: e.y, r: e.r * 0.7, max: e.r * 3, age: 0, life: 0.32, color: PALETTE.chaffRim });
      shake = Math.max(shake, 2);
    }

    if (e.type === 'splitter' && G.enemies.length < MAX_ENEMY - 2) {
      const child = SPLITTER_CHILD(G.wave);
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        const c = buildEnemy('fast', e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18, G.wave);
        c.hp = c.maxHp = child.hp;
        c.r = child.r;
        c.color = child.color;
        c.speed = child.speed;
        c.exp = child.exp;
        G.enemies.push(c);
      }
    }

    tryDropPickup(e.x, e.y, e);

    const total = e.exp;
    const n = Math.min(Math.ceil(total * 1.5), 8);
    const per = total / n;
    for (let i = 0; i < n; i++) {
      G.orbs.push({
        x: e.x + rand(-12, 12), y: e.y + rand(-12, 12),
        vx: rand(-140, 140), vy: rand(-140, 140), r: ORB.r, val: per, locked: false
      });
    }
  }
}

function damagePlayer(dmg, src) {
  if (player.invuln > 0 || G.over) return;
  /* 相位护盾模组：每 8 秒完全抵挡一次 */
  if (player.shield && player.shieldCd <= 0) {
    player.shieldCd = 10;
    player.invuln = PLAYER.invuln;
    shake = Math.max(shake, 8);
    audio.shield();
    addText(player.x, player.y - 32, '相位抵挡', '#60a5fa', 18);
    burst(player.x, player.y, '#60a5fa', 14, 280);
    return;
  }
  /* 开局伤害宽限：0 秒时 45%，120 秒后拉满（防止开局被围住 5 秒直接暴毙） */
  const grace = Math.min(1, 0.45 + G.t / 120);
  const real = Math.max(1, dmg * grace * (1 - player.dr));
  player.hp -= real;
  if (src) G.dmgTaken[src] = (G.dmgTaken[src] || 0) + real;    // 调试：伤害来源统计
  player.invuln = PLAYER.invuln;
  audio.hurt();
  shake = Math.max(shake, 4);            // 受击震动：原来 12，玩家反馈"伤害反馈过强"
  flash(.3, '255,60,60');
  addText(player.x, player.y - 26, '-' + Math.round(real), '#ff7b72', 18);
  burst(player.x, player.y, '#ff7b72', 10, 240);
  if (player.hp <= 0) { player.hp = 0; gameOver(); }
}

function applyPickup(p) {
  if (p.kind === 'heart') {
    player.hp = Math.min(player.maxHp, player.hp + 35);
    addText(player.x, player.y - 34, '+35 装甲', '#ff5577', 18);
    burst(player.x, player.y, '#ff5577', 8, 200);
  } else if (p.kind === 'magnet') {
    for (const o of G.orbs) {
      const dx = player.x - o.x, dy = player.y - o.y;
      o.locked = true;                 // 全图锁定，不会再脱钩
      o.vx += dx * 3.5; o.vy += dy * 3.5;
    }
    addText(player.x, player.y - 34, '引力场！', '#ff3b3b', 20);
    burst(player.x, player.y, '#ff3b3b', 14, 260);
  } else if (p.kind === 'chest') {
    player.exp += 0;                       // 宝箱 = 白送一次升级
    pendingLevels++;
    addText(player.x, player.y - 36, '宝箱！获得升级', '#ffd166', 20);
    burst(player.x, player.y, '#ffd166', 18, 300);
    audio.jump();
    if (!G.paused) showUpgrade();
  } else if (p.kind === 'bomb') {
    /* 快照一份再遍历：hurtEnemy 击杀分裂机时会往 G.enemies push 子机 */
    for (const e of G.enemies.slice()) { if (!e.dead) hurtEnemy(e, 300, 0, 0); }
    flashA = 0.55; flashColor = '255,200,80';       // 玩家主动放的战术弹：不走票据，这是玩家自己的动作
    shake = Math.max(shake, 22);
    addText(player.x, player.y - 34, '战术弹！', '#ffaa00', 22);
  }
}

/* ==================== 装备终端（升级三选一 / 超频跃迁四选一） ==================== */
function gainExp(n) {
  player.exp += n;
  while (player.exp >= player.expNext) {
    player.exp -= player.expNext;
    player.level++;
    player.expNext = expNeed(player.level);
    pendingLevels++;
    if (player.level % JUMP_EVERY === 0) player.jumpPending = true;   // 该次升级改用跃迁面板
  }
  if (pendingLevels > 0 && !G.paused) showUpgrade();
}

/** 按权重不放回抽取 n 个 */
function pickWeighted(pool, n) {
  const out = [], p = pool.slice();
  while (out.length < n && p.length) {
    const total = p.reduce((sum, o) => sum + o.w, 0);
    let r = Math.random() * total, idx = 0;
    for (let i = 0; i < p.length; i++) { r -= p[i].w; if (r <= 0) { idx = i; break; } }
    out.push(p.splice(idx, 1)[0]);
  }
  return out;
}

/** 池子抽干后的保底（可重复），保证升级永远有东西可选 */
function buildFallbackOptions() {
  return [
    { kind: 'fallback', name: '应急维修', icon: '🧰', iid: 'repair', w: 1, tag: '补给', desc: '立刻回复 40 点生命', apply: () => { player.hp = Math.min(player.maxHp, player.hp + 40); } },
    { kind: 'fallback', name: '残片回收', icon: '💠', iid: 'salvage', w: 1, tag: '补给', desc: '立刻获得 25 点经验', apply: () => { gainExp(25); } }
  ];
}

/** 普通装备池：武器（强化 / 新增）+ 属性（各自有上限） */
function buildOptions() {
  const pool = [];
  for (const id in WEAPONS) {
    const def = WEAPONS[id];
    const owned = player.weapons.find(w => w.id === id);
    if (owned) {
      if (owned.lv < def.maxLv) {
        const lv = owned.lv + 1;
        pool.push({
          kind: 'weaponUp', name: def.name, icon: def.icon, iid: id, icolor: def.color,
          w: 2.2, tag: def.tag || `强化 Lv.${owned.lv} → Lv.${lv}`,
          range: weaponRange(id, lv), rangeMax: MAX_WEAPON_RANGE,
          desc: def.desc(lv), apply: () => { owned.lv = lv; }
        });
      }
    } else {
      pool.push({
        kind: 'newWeapon', name: def.name, icon: def.icon, iid: id, icolor: def.color,
        w: 3.5, tag: def.tag ? `${def.tag} · 新装备` : '★ 新装备',
        range: weaponRange(id, 1), rangeMax: MAX_WEAPON_RANGE,
        desc: def.desc(1), apply: () => { player.weapons.push({ id, lv: 1, t: 0, angle: 0 }); }
      });
    }
  }
  for (const s of STATS) {
    const lv = player.statLevels[s.id] || 0;
    if (lv >= s.maxLevel) continue;                       // 关键：属性有上限，杜绝无限堆叠
    pool.push({
      kind: 'stat', name: s.name, icon: s.icon, iid: s.id, w: s.w, tag: `属性强化 ${lv}/${s.maxLevel}`, desc: s.desc,
      apply: () => { s.apply(player); player.statLevels[s.id] = lv + 1; }
    });
  }
  const out = pickWeighted(pool, 3);
  /* 保底（Pity）：武器不足 3 把时强制出现一把新武器 —— 否则开局连抽不到武器会直接崩盘，
     导致单局时长呈两极分布（要么 3 分钟死、要么 15 分钟活）。 */
  if (player.weapons.length < 3 && !out.some(o => o.kind === 'newWeapon')) {
    const cands = pool.filter(o => o.kind === 'newWeapon');
    if (cands.length) out[Math.floor(Math.random() * out.length)] = cands[Math.floor(Math.random() * cands.length)];
  }
  return out;
}

/** 超频跃迁池：一次性模组，四选一 */
function buildModuleOptions() {
  const pool = MODULES.filter(m => !player.mods[m.id]).map(m => ({
    kind: 'module', name: m.name, icon: m.icon, iid: m.id, w: 1, tag: '超频跃迁', desc: m.desc,
    apply: () => {
      m.apply(player);
      player.mods[m.id] = true;
      if (m.lockAllOrbs) for (const o of G.orbs) o.locked = true;
    }
  }));
  if (!pool.length) return pickWeighted(buildFallbackOptions(), 3);
  return pickWeighted(pool, 4);
}

function showUpgrade() {
  G.paused = true;
  const jump = player.jumpPending;
  player.jumpPending = false;
  const opts = jump ? buildModuleOptions() : buildOptions();
  if (!opts.length) {                       // 理论上不会发生（有保底），保险起见直接恢复
    overlay.classList.remove('show');
    G.paused = false;
    return;
  }
  currentOptions = opts;
  if (jump) audio.jump(); else audio.levelUp();
  const title = jump ? `超频跃迁 // ${mkName(player.level)}` : `装备终端 // ${mkName(player.level)}`;
  const sub = jump ? '超频跃迁 · 一次性模组，四选一' : '选择一项改装 · 按 1 / 2 / 3 或点击';
  let html = `<h2 class="${jump ? 'jump' : ''}">${title}</h2><p class="sub">${sub}</p><div id="cards">`;
  opts.forEach((o, i) => {
    const rg = o.range ? `<div class="rg"><i style="width:${Math.round(Math.min(1, o.range / o.rangeMax) * 100)}%;background:${o.icolor}"></i><b>射程 ${o.range}</b></div>` : '';
    html += `<div class="card${jump ? ' jump' : ''}" data-i="${i}" data-key="${i + 1}">
      <div class="ic">${iconFor(o.iid, o.icolor, o.icon)}</div>
      <div class="nm">${o.name}</div>
      <div class="lv">${o.tag || ''}</div>
      ${rg}
      <div class="ds">${o.desc}</div>
    </div>`;
  });
  html += '</div>';
  panel.innerHTML = html;
  overlay.classList.add('show');
  panel.querySelectorAll('.card').forEach(el => {
    el.onclick = () => chooseOption(opts[+el.dataset.i]);
  });
}

function chooseOption(o) {
  if (!currentOptions) return;
  currentOptions = null;
  o.apply(); pendingLevels--;
  if (pendingLevels > 0) showUpgrade();
  else { overlay.classList.remove('show'); G.paused = false; }
}

function gameOver() {
  G.over = true; G.paused = true;
  flashA = 0.5; flashColor = '255,60,60';           // 结算：一局只有一次，不走票据
  audio.over();

  /* 最高纪录（localStorage） */
  const cur = { t: Math.round(G.t), kills: player.kills, level: player.level, wave: G.wave };
  const best = loadBest();
  const isNew = !best || cur.t > best.t || (cur.t === best.t && cur.kills > best.kills);
  if (isNew) saveBest(cur);
  const show = isNew ? cur : best;

  const build = player.weapons
    .map(w => `${WEAPONS[w.id].name} Lv${w.lv}`)
    .join(' · ');
  const mods = MODULES.filter(m => player.mods[m.id]).map(m => m.name).join(' · ');

  panel.innerHTML = `<div id="big">信号中断</div>
    <p class="sub">存活 ${fmtTime(G.t)} · 第 ${G.wave} 波 · 击毁 ${player.kills} · 型号 ${mkName(player.level)} · 最高连击 ${G.comboBest}</p>
    <p class="sub best">${isNew ? '★ 新纪录' : '历史最佳'} · 存活 ${fmtTime(show.t)} · 击毁 ${show.kills} · 第 ${show.wave} 波</p>
    <p class="sub build">本局构筑：${build || '无'}</p>
    ${mods ? `<p class="sub build">超频模组：${mods}</p>` : ''}
    <button class="btn" id="again">重新接入</button>`;
  overlay.classList.add('show');
  document.getElementById('again').onclick = restart;
}

/* ==================== 武器 ==================== */
function nearestEnemies(n, maxDist) {
  const md = maxDist || 1e9;
  const arr = [];
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d2 = dist2(e, player);
    if (d2 < md * md) arr.push({ e, d2 });
  }
  arr.sort((a, b) => a.d2 - b.d2);
  return arr.slice(0, n).map(o => o.e);
}

function updateWeapons(dt) {
  for (const w of player.weapons) {
    const def = WEAPONS[w.id];
    const dmg = def.dmg(w.lv) * player.dmgMul;

    /* 追踪弹族（蜂群导弹 / 过载反应堆 / 纳米虫群）：同时多发，锁定最近的敌人 */
    if (def.mode === 'shot') {
      w.t -= dt;
      if (w.t <= 0) {
        const numShots = def.num(w.lv);
        const tgts = nearestEnemies(numShots, def.range);   // 按射程索敌：够不着的目标不开火，别浪费这一发
        if (tgts.length) {
          w.t = def.cd(w.lv) * player.cdMul;
          audio.shoot();
          for (let i = 0; i < numShots; i++) {
            const t = tgts[i % tgts.length];
            const a = Math.atan2(t.y - player.y, t.x - player.x) + rand(-def.spread, def.spread);
            G.bullets.push({
              type: 'dart', x: player.x, y: player.y,
              vx: Math.cos(a) * def.bulletSpeed, vy: Math.sin(a) * def.bulletSpeed,
              r: def.bulletR, dmg, pierce: def.pierce ? def.pierce(w.lv) : 0, hit: new Set(),
              life: bulletLife(def), color: def.color, weapon: w.id
            });
          }
        } else w.t = 0.08;
      }
    }

    /* 近防霰弹：扇形短程爆发 + 强击退 */
    else if (def.mode === 'flak') {
      w.t -= dt;
      if (w.t <= 0) {
        const tgts = nearestEnemies(1, def.range);
        if (tgts.length) {
          w.t = def.cd(w.lv) * player.cdMul;
          audio.shoot();
          const t = tgts[0];
          const baseA = Math.atan2(t.y - player.y, t.x - player.x);
          const pellets = def.pellets(w.lv);
          for (let i = 0; i < pellets; i++) {
            const off = (i / Math.max(1, pellets - 1) - 0.5) * def.spread + rand(-0.05, 0.05);
            const a = baseA + off;
            G.bullets.push({
              type: 'dart', x: player.x, y: player.y,
              vx: Math.cos(a) * def.bulletSpeed, vy: Math.sin(a) * def.bulletSpeed,
              r: def.bulletR, dmg, pierce: 0, hit: new Set(),
              life: bulletLife(def), color: def.color, weapon: w.id, knock: def.knock
            });
          }
          shake = Math.max(shake, 4);
        } else w.t = 0.08;
      }
    }

    /* 贴身环绕（卫戍无人机 / 等离子刃环） */
    else if (def.mode === 'orbit') {
      w.angle += def.spin * dt;
      const n = def.num(w.lv);
      const hitR = def.hitR;
      const kb = def.knock;
      for (let i = 0; i < n; i++) {
        const a = w.angle + i * Math.PI * 2 / n;
        const ox = player.x + Math.cos(a) * def.radius;
        const oy = player.y + Math.sin(a) * def.radius;
        forEachNear(ox, oy, hitR + 20, (e) => {
          if (e.dead || e.orbCd > 0) return;
          const dx = e.x - ox, dy = e.y - oy;
          if (dx * dx + dy * dy < (e.r + hitR) ** 2) {
            const d = Math.hypot(dx, dy) || 1;
            hurtEnemy(e, dmg, dx / d * kb, dy / d * kb);
            e.orbCd = w.id === 'saw' ? 0.22 : 0.3;
          }
        });
      }
    }

    /* 电磁脉冲：环形爆发 */
    else if (def.mode === 'nova') {
      w.t -= dt;
      if (w.t <= 0) {
        w.t = def.cd(w.lv) * player.cdMul;
        const R = def.radius(w.lv);
        G.rings.push({ x: player.x, y: player.y, r: 12, max: R, age: 0, life: 0.42, color: def.color });
        forEachNear(player.x, player.y, R + 24, (e) => {
          if (e.dead) return;
          const dx = e.x - player.x, dy = e.y - player.y;
          if (dx * dx + dy * dy < (R + e.r) ** 2) {
            const d = Math.hypot(dx, dy) || 1;
            hurtEnemy(e, dmg, dx / d * 180, dy / d * 180);
          }
        });
      }
    }

    /* 链式电弧：跳跃打击 */
    else if (def.mode === 'chain') {
      w.t -= dt;
      if (w.t <= 0) {
        const tgts = nearestEnemies(def.num(w.lv), def.range);
        if (tgts.length) {
          w.t = def.cd(w.lv) * player.cdMul;
          for (const t of tgts) {
            G.bolts.push({ x1: player.x, y1: player.y, x2: t.x, y2: t.y, life: 0.15, color: def.color });
            hurtEnemy(t, dmg, 0, 0);
          }
        } else w.t = 0.08;
      }
    }

    /* 粒子长矛：穿透直线 */
    else if (def.mode === 'laser') {
      w.t -= dt;
      if (w.t <= 0) {
        const tgts = nearestEnemies(def.num(w.lv), def.len);   // 光束有多长就锁多远
        if (tgts.length) {
          w.t = def.cd(w.lv) * player.cdMul;
          for (const t of tgts) {
            const a = Math.atan2(t.y - player.y, t.x - player.x);
            G.beams.push({ x: player.x, y: player.y, angle: a, len: def.len, life: 0.22, maxLife: 0.22, color: def.color });
            const ex = Math.cos(a), ey = Math.sin(a);
            forEachNearBox(player.x, player.y, player.x + ex * def.len, player.y + ey * def.len, (e) => {
              const dx = e.x - player.x, dy = e.y - player.y;
              const proj = dx * ex + dy * ey;
              if (proj < 0 || proj > def.len) return;
              const perp = Math.abs(dx * ey - dy * ex);
              if (perp < e.r + def.width) hurtEnemy(e, dmg, ex * 140, ey * 140);
            });
          }
        } else w.t = 0.08;
      }
    }

    /* 回旋切割器：去回穿透 */
    else if (def.mode === 'boomerang') {
      w.t -= dt;
      if (w.t <= 0) {
        const tgts = nearestEnemies(def.num(w.lv), def.range);   // 回旋镖：索敌半径 = 射程
        if (tgts.length) {
          w.t = def.cd(w.lv) * player.cdMul;
          for (const t of tgts) {
            G.bullets.push({
              type: 'boomerang',
              x: player.x, y: player.y,
              startX: player.x, startY: player.y,
              targetX: t.x, targetY: t.y,
              phase: 'out', speed: def.bulletSpeed, r: def.bulletR, dmg,
              hit: new Set(), spin: 0, color: def.color, weapon: w.id
            });
          }
        } else w.t = 0.08;
      }
    }
  }
}

/** 交换删除：O(1) 且不搬移元素（顺序无关的容器都用它） */
function swapRemove(arr, i) {
  arr[i] = arr[arr.length - 1];
  arr.pop();
}

/* ==================== 空间网格：碰撞检测加速 ====================
   敌人一多，子弹×敌人 的 O(n·m) 全量扫描会把帧率打穿。
   每帧重建一次网格，子弹只查附近 3×3 格。 */
const GRID_CELL = 80;
const GRID_OFF = 2048;                       // 允许敌人在世界外（相机贴边时刷怪点会在世界外）
const gridCells = new Map();
const cellKey = (cx, cy) => (cx + GRID_OFF) * 4096 + (cy + GRID_OFF);   // 整数 key，比字符串快且不产生垃圾

function rebuildGrid() {
  gridCells.clear();
  for (const e of G.enemies) {
    if (e.dead) continue;
    const key = cellKey(Math.floor(e.x / GRID_CELL), Math.floor(e.y / GRID_CELL));
    let cell = gridCells.get(key);
    if (!cell) { cell = []; gridCells.set(key, cell); }
    cell.push(e);
  }
}

/** 遍历 (x,y) 半径 r 内的敌人 */
function forEachNear(x, y, r, fn) {
  const x0 = Math.floor((x - r) / GRID_CELL), x1 = Math.floor((x + r) / GRID_CELL);
  const y0 = Math.floor((y - r) / GRID_CELL), y1 = Math.floor((y + r) / GRID_CELL);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const cell = gridCells.get(cellKey(cx, cy));
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) {
        const e = cell[i];
        if (!e.dead) fn(e);
      }
    }
  }
}

/** 遍历矩形区域内的敌人（每格只访问一次，不会重复命中同一个敌人） */
function forEachNearBox(x0, y0, x1, y1, fn) {
  const cx0 = Math.floor(Math.min(x0, x1) / GRID_CELL), cx1 = Math.floor(Math.max(x0, x1) / GRID_CELL);
  const cy0 = Math.floor(Math.min(y0, y1) / GRID_CELL), cy1 = Math.floor(Math.max(y0, y1) / GRID_CELL);
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      const cell = gridCells.get(cellKey(cx, cy));
      if (!cell) continue;
      for (let i = 0; i < cell.length; i++) {
        const e = cell[i];
        if (!e.dead) fn(e);
      }
    }
  }
}

/* ==================== 每帧更新 ==================== */
/** 把「每帧阻尼」换算成与帧率无关的形式（Demo 的系数都是 60fps 口径） */
const frameDrag = (base, dt) => Math.pow(base, dt * 60);

function update(dt) {
  G.t += dt;
  if (flashCd > 0) flashCd -= dt;                      // 闪光票据冷却
  zoom += (zoomTarget - zoom) * Math.min(1, 9 * dt);   // 镜头高度平滑过渡，避免跳变
  /* DPS 采样（每秒一格，保留 60 格） */
  if (G.t - G.lastDmgAt >= 1) {
    G.dmgSamples.push(Math.round(G.dmgAcc));
    if (G.dmgSamples.length > 60) G.dmgSamples.shift();
    G.dmgAcc = 0;
    G.lastDmgAt = G.t;
  }
  const drag = {
    orb: frameDrag(ORB_DRAG, dt),
    pickup: frameDrag(0.92, dt),
    knock: frameDrag(0.86, dt),
    part: frameDrag(0.94, dt),
  };
  /* 弹体只在「视口外一段距离」才回收 —— 世界远大于视口，不能再用视口尺寸当边界。
     边距必须 ≥ 最长射程 − 视口半高，否则上下方向飞不到面板上写的射程（射程是圆形、视口是矩形）。
     最长射程 780（粒子长矛），视口半高 360 → 420 起步；改任何武器射程都要回来核这一行。 */
  const cullL = G.cam.x - BULLET_CULL_MARGIN, cullR = G.cam.x + viewW() + BULLET_CULL_MARGIN;
  const cullT = G.cam.y - BULLET_CULL_MARGIN, cullB = G.cam.y + viewH() + BULLET_CULL_MARGIN;
  rebuildGrid();

  /* 移动：速度大小平滑靠拢 + 方向按角加速度转过去（拐弯是弧线） */
  let mx = 0, my = 0;
  if (keys.KeyA || keys.ArrowLeft) mx--;
  if (keys.KeyD || keys.ArrowRight) mx++;
  if (keys.KeyW || keys.ArrowUp) my--;
  if (keys.KeyS || keys.ArrowDown) my++;
  if (player.touch.active && (player.touch.dx || player.touch.dy)) {
    mx = player.touch.dx; my = player.touch.dy;
  }
  const m = Math.hypot(mx, my);
  const curSpeed = Math.hypot(player.vx, player.vy);
  if (m > 0) { mx /= m; my /= m; }

  // 反向输入（想往速度反方向走）= 刹车，减得更快
  const reversing = m > 0 && curSpeed > 1 && (player.vx * mx + player.vy * my) < 0;
  const targetSpeed = m > 0 ? player.speed : 0;
  const k = m > 0 ? (reversing ? ACCEL_BRAKE : ACCEL_UP) : ACCEL_DOWN;
  const nextSpeed = curSpeed + (targetSpeed - curSpeed) * Math.min(1, k * dt);

  if (m > 0) {
    const want = Math.atan2(my, mx);
    // 速度接近 0 时没有方向可言，直接取输入方向；否则按最大角速度转
    let cur = curSpeed > 1 ? Math.atan2(player.vy, player.vx) : want;
    let da = want - cur;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    // 转向速率：① 低速更灵 ② 要转的角度越大转得越快
    // —— 掉头时接近瞬间拉回（弧很小），微调方向时依然平滑
    const agility = 1 + (1 - Math.min(1, curSpeed / player.speed)) * 0.9;
    const bigTurn = 1 + TURN_BIG * (Math.abs(da) / Math.PI);
    const maxTurn = TURN_ACCEL * agility * bigTurn * dt;
    cur += clamp(da, -maxTurn, maxTurn);
    player.vx = Math.cos(cur) * nextSpeed;
    player.vy = Math.sin(cur) * nextSpeed;
  } else if (curSpeed > 0.001) {
    // 松手：沿当前方向滑行减速（不打折方向）
    const s = nextSpeed / curSpeed;
    player.vx *= s;
    player.vy *= s;
  } else {
    player.vx = 0;
    player.vy = 0;
  }

  const nextX = player.x + player.vx * dt;
  const nextY = player.y + player.vy * dt;
  if (nextX < player.r) { player.x = player.r; player.vx = 0; }
  else if (nextX > WORLD.w - player.r) { player.x = WORLD.w - player.r; player.vx = 0; }
  else player.x = nextX;
  if (nextY < player.r) { player.y = player.r; player.vy = 0; }
  else if (nextY > WORLD.h - player.r) { player.y = WORLD.h - player.r; player.vy = 0; }
  else player.y = nextY;

  updateCamera(dt);   // 镜头缓动跟随（夹在世界内）

  /* 朝向平滑 */
  const spd = Math.hypot(player.vx, player.vy);
  if (spd > 25) {
    const targetAngle = Math.atan2(player.vy, player.vx);
    let da = targetAngle - player.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    player.angle += da * Math.min(1, TURN_RATE * dt);
  }

  /* 尾焰粒子 */
  player.footTimer -= dt;
  if (spd > 100 && player.footTimer <= 0) {
    player.footTimer = 0.055;
    const back = Math.atan2(-player.vy, -player.vx);
    G.parts.push({
      x: player.x + Math.cos(back) * 8 + rand(-4, 4),
      y: player.y + Math.sin(back) * 8 + rand(-4, 4),
      vx: -player.vx * 0.12 + rand(-30, 30),
      vy: -player.vy * 0.12 + rand(-30, 30),
      life: 0.35, max: 0.35, r: rand(1.5, 3),
      color: Math.random() < 0.5 ? '#58a6ff' : '#9fd5ff',
      foot: true
    });
  }

  if (player.invuln > 0) player.invuln -= dt;
  if (player.shieldCd > 0) player.shieldCd -= dt;

  /* 模组：纳米自修复 */
  if (player.regen > 0) player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);

  /* 代价装备：过载反应堆持续自损。
     自损**最多把生命压到最大值的 25%**：既保留"血线常年偏低"的真实代价，
     又不会让玩家在无声无息中被自己耗死（实测过：压到 1 血后任何一发弹幕都秒杀，等于自杀）。 */
  let selfDps = 0;
  for (const w of player.weapons) {
    const d = WEAPONS[w.id];
    if (d.selfDps) selfDps += d.selfDps(w.lv);
  }
  if (selfDps > 0) {
    const floorHp = Math.max(1, player.maxHp * 0.25);
    if (player.hp > floorHp) {
      player.hp = Math.max(floorHp, player.hp - selfDps * dt);
      G.dmgTaken.self = (G.dmgTaken.self || 0) + selfDps * dt;
      player.overloadWarn = (player.overloadWarn || 0) - dt;
      if (player.overloadWarn <= 0) {
        player.overloadWarn = 2.0;
        addText(player.x, player.y - 30, '过载自损中…', '#a855f7', 14);
      }
    }
  }

  if (G.comboTimer > 0) {
    G.comboTimer -= dt;
    if (G.comboTimer <= 0) G.combo = 0;
  }

  updateWeapons(dt);

  /* 波次 */
  G.waveTimer += dt;
  const cx = G.cam.x + viewW() / 2, cy = G.cam.y + viewH() / 2;

  /* 事件预告：下一波是陨级/精英时，提前 3 秒警告（可预期的压力 = 掌控感） */
  if (!G.eventWarned && WAVE_LEN - G.waveTimer <= 3) {
    const nextWave = G.wave + 1;
    if (nextWave % 5 === 0) {
      G.eventWarned = true;
      addText(cx, cy - 150, '⚠ 陨级单位 3 秒后抵达', '#f06595', 22);
      audio.bossWarn();
      flash(.18, '240,101,149');
    } else if (nextWave % SPAWN.eliteWaveEvery === 0) {
      G.eventWarned = true;
      addText(cx, cy - 150, '⚠ 精英波 3 秒后抵达', '#ffd166', 20);
      audio.levelUp();
    }
  }

  if (G.waveTimer >= WAVE_LEN) {
    G.waveTimer -= WAVE_LEN;
    G.wave++;
    G.bossSpawned = false;
    G.eliteWaveSpawned = false;
    G.eventWarned = false;
    addText(cx, cy - 100, `第 ${G.wave} 波`, '#58a6ff', 26);
    if (G.wave % SPAWN.eliteWaveEvery === 0) addText(cx, cy - 62, '精英波', '#ffd166', 20);
  }
  if (G.wave % 5 === 0 && !G.bossSpawned) {
    G.bossSpawned = true;
    spawnBoss();
  } else if (G.wave % SPAWN.eliteWaveEvery === 0 && !G.eliteWaveSpawned) {
    G.eliteWaveSpawned = true;
    for (let i = 0; i < SPAWN.eliteWaveCount; i++) spawnEnemy(true);
  }
  const rate = SPAWN.rate(G.wave) * SPAWN.ramp(G.t);
  G.spawnAcc += dt * rate;
  let guard = 0;
  while (G.spawnAcc >= 1 && guard++ < SPAWN.guard) {
    G.spawnAcc -= 1;
    spawnEnemy();
  }
  if (G.spawnAcc > 4) G.spawnAcc = 4;     // 防止长时间暂停后一次性喷一堆

  /* 弹体 */
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];

    if (b.type === 'boomerang') {
      b.spin += dt * 22;
      if (b.phase === 'out') {
        const dx = b.targetX - b.x, dy = b.targetY - b.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 16) b.phase = 'back';
        else { b.x += dx / d * b.speed * dt; b.y += dy / d * b.speed * dt; }
      } else {
        const dx = player.x - b.x, dy = player.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 22) { G.bullets.splice(i, 1); continue; }
        b.x += dx / d * b.speed * dt; b.y += dy / d * b.speed * dt;
      }
      forEachNear(b.x, b.y, b.r + 24, (e) => {
        if (e.dead || b.hit.has(e.id)) return;
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx * dx + dy * dy < (e.r + b.r) ** 2) {
          b.hit.add(e.id);
          hurtEnemy(e, b.dmg, 0, 0);
          burst(b.x, b.y, b.color, 4, 180);
        }
      });
      continue;
    }

    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < cullL || b.x > cullR || b.y < cullT || b.y > cullB) {
      G.bullets.splice(i, 1); continue;
    }
    let removed = false;
    forEachNear(b.x, b.y, b.r + 24, (e) => {
      if (removed || e.dead || b.hit.has(e.id)) return;
      const dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy < (e.r + b.r) ** 2) {
        b.hit.add(e.id);
        hurtEnemy(e, b.dmg, b.vx * (b.knock || 0.05), b.vy * (b.knock || 0.05));
        burst(b.x, b.y, b.color, 5, 200);
        if (b.pierce-- <= 0) { G.bullets.splice(i, 1); removed = true; }
      }
    });
    if (removed) continue;
  }

  /* 敌方单位 */
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead) { G.enemies.splice(i, 1); continue; }
    if (e.orbCd > 0) e.orbCd -= dt;
    if (e.flash > 0) e.flash -= dt;

    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    /* 模组：时滞立场 —— 近处的敌人减速 */
    const spd = (player.slowField < 1 && d < 260) ? e.speed * player.slowField : e.speed;

    /* 精英的威胁升级：周期性环形弹幕（普通怪只会撞人，精英会逼你走位） */
    if (e.elite && !e.boss) {
      e.burstCd = (e.burstCd === undefined ? rand(1.5, ELITE_BURST.every) : e.burstCd) - dt;
      if (e.burstCd <= 0 && d < 620) {
        e.burstCd = ELITE_BURST.every;
        const bdef = SHOOTER_BULLET(G.wave);
        for (let k = 0; k < ELITE_BURST.count; k++) {
          const a = k * Math.PI * 2 / ELITE_BURST.count + G.t;
          G.enemyBullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * bdef.spd * ELITE_BURST.speedMul,
            vy: Math.sin(a) * bdef.spd * ELITE_BURST.speedMul,
            r: bdef.r, dmg: e.dmg * 0.4, life: 4.5, color: '#ffd166'
          });
        }
      }
    }

    /* 陨级单位状态机 */
    if (e.boss && e.variant === 'summoner') {
      /* 裂空者：追击 → 蓄能 → 环形弹幕 → 召唤无人机 → 虚弱 */
      e.stateTime -= dt;

      if (e.state === 'chase') {
        e.x += dx / d * spd * dt;
        e.y += dy / d * spd * dt;
        if (e.stateTime <= 0) { e.state = 'prep'; e.stateTime = 0.9; addText(e.x, e.y - 56, '蓄能...', '#c084fc', 18); }
      } else if (e.state === 'prep') {
        e.x += dx / d * spd * 0.2 * dt;
        e.y += dy / d * spd * 0.2 * dt;
        if (e.stateTime <= 0) {
          const n = 16;
          const bdef = SHOOTER_BULLET(G.wave);
          for (let k = 0; k < n; k++) {
            const a = k * Math.PI * 2 / n + G.t;
            G.enemyBullets.push({
              x: e.x, y: e.y,
              vx: Math.cos(a) * bdef.spd * 1.1, vy: Math.sin(a) * bdef.spd * 1.1,
              r: bdef.r + 1, dmg: e.dmg * 0.6, life: 6, color: '#c084fc'
            });
          }
          shake = Math.max(shake, 12);
          flash(.18, '192,132,252');
          e.state = 'summon'; e.stateTime = 0.7;
        }
      } else if (e.state === 'summon') {
        if (e.stateTime <= 0) {
          for (let k = 0; k < 4; k++) {
            const a = k * Math.PI / 2;
            const child = buildEnemy('fast', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, G.wave);
            G.enemies.push(child);
          }
          burst(e.x, e.y, '#c084fc', 20, 320);
          e.state = 'stunned'; e.stateTime = 1.2; e.vulnMul = 2.2;   // 召唤后短暂虚弱
        }
      } else if (e.state === 'stunned') {
        if (e.stateTime <= 0) { e.state = 'chase'; e.stateTime = 3.2; e.vulnMul = 1; }
      }
    }
    else if (e.boss) {
      e.stateTime -= dt;

      if (e.state === 'chase') {
        e.x += dx / d * spd * dt;
        e.y += dy / d * spd * dt;
        if (e.stateTime <= 0) {
          e.state = 'charge_prep';
          e.stateTime = 0.9;
          e.chargeAngle = Math.atan2(dy, dx);
          addText(e.x, e.y - 60, '充能...', '#ff5555', 18);
        }
      }
      else if (e.state === 'charge_prep') {
        e.x += dx / d * spd * 0.15 * dt;
        e.y += dy / d * spd * 0.15 * dt;
        if (e.stateTime <= 0) {
          e.state = 'charging';
          e.stateTime = 1.3;
          e.chargeVx = Math.cos(e.chargeAngle) * 950;
          e.chargeVy = Math.sin(e.chargeAngle) * 950;
          shake = Math.max(shake, 8);
        }
      }
      else if (e.state === 'charging') {
        e.x += e.chargeVx * dt;
        e.y += e.chargeVy * dt;
        if (Math.random() < 0.8) {
          G.parts.push({
            x: e.x + rand(-10, 10), y: e.y + rand(-10, 10),
            vx: rand(-40, 40), vy: rand(-40, 40),
            life: 0.4, max: 0.4, r: rand(3, 6),
            color: '#ff3333'
          });
        }
        // 撞到世界边界，或冲尽（过载）都会瘫痪 —— 大世界里不会因为离边界远就永远不瘫痪
        const hitWall = e.x < e.r || e.x > WORLD.w - e.r || e.y < e.r || e.y > WORLD.h - e.r;
        if (hitWall || e.stateTime <= 0) {
          e.x = clamp(e.x, e.r, WORLD.w - e.r);
          e.y = clamp(e.y, e.r, WORLD.h - e.r);
          e.state = 'stunned';
          e.stateTime = 3.0;
          e.vulnMul = 3;
          shake = Math.max(shake, 22);
          flash(.35);
          flashColor = '255,200,80';
          hitStop = Math.max(hitStop, 0.08);
          addText(e.x, e.y - 70, hitWall ? '瘫痪！受伤 ×3' : '过载！受伤 ×3', '#ffcc00', 22);
          burst(e.x, e.y, '#ffaa00', 36, 500);
        }
      }
      else if (e.state === 'stunned') {
        if (e.stateTime <= 0) {
          e.state = 'chase';
          e.stateTime = 3.0;
          e.vulnMul = 1;
          addText(e.x, e.y - 60, '重启', '#f06595', 16);
        }
      }
    }
    /* 突袭机：短距冲刺 */
    else if (e.type === 'triangle') {
      if (e.isDashing) {
        e.dashTimer -= dt;
        e.x += e.dashVx * dt; e.y += e.dashVy * dt;
        if (e.dashTimer <= 0) e.isDashing = false;
      } else {
        e.dashCd -= dt;
        if (e.dashCd <= 0 && d < 400) {
          e.isDashing = true;
          e.dashTimer = 0.35;
          e.dashCd = rand(1.4, 2.4);
          e.dashVx = dx / d * 480;
          e.dashVy = dy / d * 480;
        } else {
          e.x += dx / d * spd * dt;
          e.y += dy / d * spd * dt;
        }
      }
    }
    /* 炮塔机：保持距离并射击 */
    else if (e.type === 'shooter') {
      if (d < 220) {
        e.x -= dx / d * spd * 0.7 * dt;
        e.y -= dy / d * spd * 0.7 * dt;
      } else if (d > 360) {
        e.x += dx / d * spd * dt;
        e.y += dy / d * spd * dt;
      }
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 520) {
        const b = SHOOTER_BULLET(G.wave);
        e.shootCd = 1.8;
        G.enemyBullets.push({
          x: e.x, y: e.y,
          vx: dx / d * b.spd, vy: dy / d * b.spd,
          r: b.r, dmg: b.dmg, life: b.life, color: b.color
        });
      }
    }
    /* 其余：直线追踪 */
    else {
      e.x += dx / d * spd * dt;
      e.y += dy / d * spd * dt;
    }

    e.x += e.kx * dt; e.y += e.ky * dt;
    e.kx *= drag.knock; e.ky *= drag.knock;

    if (d < e.r + player.r) damagePlayer(e.dmg, e.boss ? 'bossContact' : 'contact');
  }

  /* 敌方弹丸 */
  for (let i = G.enemyBullets.length - 1; i >= 0; i--) {
    const b = G.enemyBullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < cullL || b.x > cullR || b.y < cullT || b.y > cullB) {
      G.enemyBullets.splice(i, 1); continue;
    }
    const dx = player.x - b.x, dy = player.y - b.y;
    if (dx * dx + dy * dy < (player.r + b.r) ** 2) {
      damagePlayer(b.dmg, b.color === '#ffd166' ? 'eliteBullet' : 'bullet');
      burst(b.x, b.y, b.color, 6, 180);
      G.enemyBullets.splice(i, 1);
    }
  }

  /* 掉落物（130 内被吸引） */
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i];
    p.life -= dt;
    if (p.life <= 0) { G.pickups.splice(i, 1); continue; }
    const dx = player.x - p.x, dy = player.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const magnet = p.kind === 'chest' ? CHEST_MAGNET_RANGE : PICKUP_MAGNET_RANGE;
    if (d < magnet) {
      p.vx += dx / d * 700 * dt;
      p.vy += dy / d * 700 * dt;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= drag.pickup; p.vy *= drag.pickup;
    if (d < player.r + p.r) { applyPickup(p); G.pickups.splice(i, 1); }
  }

  /* 数据残片：进入拾取范围就锁定，之后一路吸附绝不脱钩（测试期可开全图自动拾取） */
  for (let i = G.orbs.length - 1; i >= 0; i--) {
    const o = G.orbs[i];
    const dx = player.x - o.x, dy = player.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    if (!o.locked && (ORB_AUTO_PICKUP || d < player.pickupRange)) o.locked = true;
    if (o.locked) {
      const near = 1 + ORB_PULL_CLOSE * (1 - Math.min(1, d / player.pickupRange));   // 越近吸得越猛
      const pull = ORB_PULL * near * (player.orbPullMul || 1);
      o.vx += dx / d * pull * dt;
      o.vy += dy / d * pull * dt;
    }
    o.x += o.vx * dt; o.y += o.vy * dt;
    o.vx *= drag.orb; o.vy *= drag.orb;
    if (d < player.r + ORB_ABSORB_PAD) { G.orbs.splice(i, 1); gainExp(o.val); audio.pickup(); }
  }

  /* 残片上限：击杀太快时残片会堆到几百个，既费性能又捡不完 —— 超限就清掉最远的 */
  if (G.orbs.length > ORB_MAX) {
    G.orbs.sort((a, b) => dist2(b, player) - dist2(a, player));
    G.orbs.length = ORB_MAX;
  }

  /* 生命周期回收（用交换删除：O(1) 且不搬移元素，原来的 splice 在几百个对象同时过期时是 O(n²)） */
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i]; t.y -= 40 * dt; t.life -= dt;
    if (t.life <= 0) swapRemove(G.texts, i);
  }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= drag.part; p.vy *= drag.part;
    p.life -= dt;
    if (p.life <= 0) swapRemove(G.parts, i);
  }
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    G.bolts[i].life -= dt;
    if (G.bolts[i].life <= 0) swapRemove(G.bolts, i);
  }
  for (let i = G.rings.length - 1; i >= 0; i--) {
    const r = G.rings[i]; r.age += dt;
    if (r.age >= r.life) swapRemove(G.rings, i);
  }
  for (let i = G.beams.length - 1; i >= 0; i--) {
    G.beams[i].life -= dt;
    if (G.beams[i].life <= 0) swapRemove(G.beams, i);
  }

  if (shake > 0) { shake *= frameDrag(0.86, dt); if (shake < 0.4) shake = 0; }
}

/* ==================== HUD ==================== */
/* 只在值真的变了才写 DOM（原来每帧 8 处写入会强制样式重算，也让血条过渡不断被打断） */
const hudCache = {};
function setText(el, key, v) { if (hudCache[key] === v) return; hudCache[key] = v; el.textContent = v; }
function setWidth(el, key, v) { if (hudCache[key] === v) return; hudCache[key] = v; el.style.width = v; }
function setFlag(el, key, v) { if (hudCache[key] === v) return; hudCache[key] = v; el.classList.toggle('warn', v); }

function updateHUD() {
  const hpPct = clamp(player.hp / player.maxHp * 100, 0, 100);
  const xpPct = clamp(player.exp / player.expNext * 100, 0, 100);
  setWidth(elHp, 'hpW', hpPct.toFixed(1) + '%');
  setWidth(elXp, 'xpW', xpPct.toFixed(1) + '%');
  setText(elHpNum, 'hpN', Math.ceil(player.hp) + '/' + player.maxHp);
  setText(elXpVal, 'xpN', Math.floor(xpPct) + '%');
  setText(elLv, 'lv', mkName(player.level));
  setText(elWave, 'wave', G.wave);
  setText(elTime, 'time', fmtTime(G.t));
  setText(elKill, 'kill', player.kills);

  /* 波次预告：让压力可预期（"随机的困难让玩家焦虑，可预期的困难让玩家投入"） */
  const left = Math.max(1, Math.ceil(WAVE_LEN - G.waveTimer));
  const nextWave = G.wave + 1;
  const nextIsBoss = nextWave % 5 === 0;
  const nextIsElite = !nextIsBoss && nextWave % SPAWN.eliteWaveEvery === 0;
  setText(elNext, 'next', `下一波 ${nextIsBoss ? '陨级 · ' : nextIsElite ? '精英 · ' : ''}${left}s`);
  setFlag(elNext, 'nextWarn', nextIsBoss || nextIsElite);
  setText(elZoom, 'zoom', zoomTarget.toFixed(1) + '×');

  /* 构筑一览：内容变了才重写 DOM */
  const key = player.weapons.map(w => w.id + w.lv).join(',') + '|' + Object.keys(player.mods).join(',');
  if (key !== loadoutKey) {
    loadoutKey = key;
    loadoutEl.innerHTML =
      player.weapons.map(w => `<span title="${WEAPONS[w.id].name} · 射程 ${weaponRange(w.id, w.lv)}">${iconFor(w.id, WEAPONS[w.id].color, WEAPONS[w.id].icon)}<i>${w.lv}</i></span>`).join('') +
      MODULES.filter(m => player.mods[m.id]).map(m => `<span class="mod" title="${m.name}">${iconFor(m.id, null, m.icon)}</span>`).join('');
  }
  if (G.combo >= 3) {
    elCombo.textContent = '×' + G.combo;
    elCombo.classList.add('show');
  } else elCombo.classList.remove('show');
}

/* ==================== 主循环 ==================== */
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000; last = now;
  dt = Math.min(dt, 0.05);
  if (hitStop > 0) { hitStop -= dt; dt *= 0.2; }
  if (!G.over && !G.paused && !pausedManual) update(dt);
  render(ctx, { W, H, G, player, cam: G.cam, zoom, shake, flashA, flashColor });
  updateHUD();
  if (flashA > 0) flashA *= Math.pow(0.85, dt * 60);   // 与帧率无关的衰减
  if (flashA < 0.01) flashA = 0;
}

/* ==================== 调试 / 平衡工具（不影响正常游玩） ==================== */
let botOn = false;

/** 当前局面摘要 */
function snapshot() {
  const s = G.dmgSamples;
  const last10 = s.slice(-10);
  return {
    t: +G.t.toFixed(1),
    wave: G.wave,
    level: player.level,
    mk: mkName(player.level),
    kills: player.kills,
    hp: Math.round(player.hp),
    maxHp: player.maxHp,
    dps: s.length ? s[s.length - 1] : 0,
    dps10: last10.length ? Math.round(last10.reduce((a, b) => a + b, 0) / last10.length) : 0,
    enemies: G.enemies.length,
    orbs: G.orbs.length,
    weapons: player.weapons.map(w => w.id + w.lv).join(' '),
    over: G.over
  };
}

/** 自动走位机器人：12 方向势场，选「前方敌人最少 + 不撞墙」的方向（合格的风筝走位） */
function botStep() {
  const DIRS = 12;
  const PROBE = 260;
  let bestScore = -Infinity, bx = 0, by = 1;
  for (let i = 0; i < DIRS; i++) {
    const a = i * Math.PI * 2 / DIRS;
    const dx = Math.cos(a), dy = Math.sin(a);
    let score = Math.random() * 0.05;                 // 加一点抖动，避免两方向等分时抖动卡死
    forEachNear(player.x + dx * PROBE * 0.5, player.y + dy * PROBE * 0.5, PROBE * 0.8, (e) => {
      const rx = e.x - player.x, ry = e.y - player.y;
      const dot = rx * dx + ry * dy;
      if (dot <= 0) return;                            // 只看前方
      const dist = Math.hypot(rx, ry) || 1;
      score -= (1 - Math.min(1, dist / 420)) * (e.boss ? 4 : (e.elite ? 2 : 1));
    });
    const nx = player.x + dx * PROBE, ny = player.y + dy * PROBE;
    if (nx < 140 || nx > WORLD.w - 140 || ny < 140 || ny > WORLD.h - 140) score -= 4;
    if (score > bestScore) { bestScore = score; bx = dx; by = dy; }
  }
  keys.KeyA = bx < -0.35; keys.KeyD = bx > 0.35;
  keys.KeyW = by < -0.35; keys.KeyS = by > 0.35;
}

/** 模拟用「像人一样选」的策略：优先新武器 → 升最弱的武器 → 属性 → 模组 */
function smartPick(opts) {
  const score = (o) => {
    switch (o.kind) {
      case 'module': return 120;
      case 'newWeapon': return player.weapons.length < 5 ? 110 : 40;
      case 'weaponUp': return 90;
      case 'stat': return 60;
      default: return 5;
    }
  };
  let best = opts[0], bestScore = -1;
  for (const o of opts) {
    const s = score(o) + Math.random() * 20;
    if (s > bestScore) { bestScore = s; best = o; }
  }
  return best;
}

/**
 * 不渲染地推进模拟（平衡测试用）。
 * 会自动把装备终端选掉，避免卡在暂停。
 * @param {number} seconds 模拟多少游戏秒
 * @param {{bot?:boolean, pick?:'random'|'first'|'smart', step?:number}} opts
 */
function sim(seconds, opts) {
  const o = Object.assign({ bot: botOn, pick: 'smart', step: 1 / 60 }, opts || {});
  const steps = Math.min(Math.round(seconds / o.step), 60 * 60 * 60);
  for (let i = 0; i < steps; i++) {
    if (G.over) break;
    if (G.paused) {
      if (!currentOptions) break;
      const pick = o.pick === 'first' ? 0 : Math.floor(Math.random() * currentOptions.length);
      const chosen = o.pick === 'smart' ? smartPick(currentOptions) : currentOptions[pick];
      chooseOption(chosen);
      continue;
    }
    if (o.bot) botStep();
    update(o.step);
  }
  return snapshot();
}

reset();
requestAnimationFrame(loop);

/* 调试钩子：浏览器控制台里可直接查看/微调状态，不影响游戏运行
   例：__game.player.speed = 420   __game.sim(60)   __game.bot(true) */
window.__game = {
  get player() { return player; },
  get G() { return G; },
  get view() { return { w: W, h: H, world: WORLD }; },
  /** 玩家在屏幕（视口）里的逻辑坐标：正常跟随时应接近视口中心 */
  get playerScreen() { return { x: Math.round(player.x - G.cam.x), y: Math.round(player.y - G.cam.y) }; },
  restart,
  sim,
  snapshot,
  audio,
  togglePause,
  toggleMute,
  /** 调试用：装备终端是否正开着 */
  get panelOpen() { return !!currentOptions; },
  /** 调试用：立刻结束本局（验证结算面板与纪录） */
  killSelf() { damagePlayer(1e9); },
  get pausedManual() { return pausedManual; },
  /** 镜头高度：zoom<1 拉高（看得更远），>1 推近。setZoom 会写 localStorage */
  get zoom() { return zoom; },
  get zoomTarget() { return zoomTarget; },
  get viewSize() { return { w: viewW(), h: viewH() }; },
  setZoom,
  nudgeZoom,
  bot(on) { botOn = !!on; return botOn; },
  get botOn() { return botOn; },
  /** 画面特效开关（bloom / backdrop / vignette），控制台里可实时改 */
  fx,
};
