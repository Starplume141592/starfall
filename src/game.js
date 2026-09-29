// 劫波 · 游戏逻辑与主循环（原生 ES module，无打包器、无依赖、无资源文件）
// 所有数值来自 config.js；绘制全部交给 render.js。行为与单文件 Demo 完全一致。
import {
  WEAPONS, STATS, MODULES, weaponRange, bulletLife, ENEMY_TYPES, enemyDamage, SPLITTER_CHILD, BOSS_TYPES, BOSS_PHASE, BLINK, ZONE, LASER, ELITE, SHOOTER_BULLET, SHIPS,
  ENEMY_SPEED_SCALE,
  WAVE_LEN, MAX_ENEMY, MAX_ENEMY_BULLET, MAX_ENEMY_BULLET_RESERVE, MAX_ALLY_BULLET, RUN, EVENTS, SPAWN, ENEMY_ABILITY, PLAYER_SPEED, ACCEL_UP, ACCEL_DOWN, PLAYER, VIEW, WORLD, VIEW_ZOOM,
  ELITE_BURST, ELITE_DROP_CHEST, CHEST_MAGNET_RANGE, PALETTE,
  TURN_RATE, TURN_ACCEL, TURN_BIG, ACCEL_BRAKE, CAMERA,
  ORB, ORB_AUTO_PICKUP, ORB_PULL, ORB_PULL_CLOSE, ORB_DRAG, ORB_ABSORB_PAD, ORB_MAX,
  PICKUP, PICKUP_MAGNET_RANGE, META_UPGRADES, ITEMS, STAT_KEYS, statsText, weaponClass, CREDIT, shopPriceOf,
  ORB_CREDIT_PER_EXP, weaponLvOf, weaponTierName, WEAPON_TIER,
  VERSION, REPO_URL, ISSUE_URL, FEEDBACK_KINDS, FEEDBACK_MAIL,
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

/* ==================== 局外存档（元进度） ====================
   设计原则：**元进度只能"略微降低开局难度"，不能替代单局决策**。
   所以永久强化的总量被压得很小（合计约 +25 生命、+7.5% 伤害、-4% 冷却），
   而且越买越贵 —— 它的作用是"给反复游玩的玩家一点确定性的回报和短期目标"，
   不是"练满之后本作就变成无脑游戏"。 */
const META_KEY = 'starfall.meta.v1';
const META_DEFAULT = { v: 1, credits: 0, runs: 0, kills: 0, bestTime: 0, bestWave: 0, playTime: 0, up: {} };

function loadMeta() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || 'null');
    if (!m || typeof m !== 'object') return { ...META_DEFAULT, up: {} };
    return { ...META_DEFAULT, ...m, up: m.up || {} };
  } catch { return { ...META_DEFAULT, up: {} }; }
}
function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* 隐私模式忽略 */ }
}
let meta = loadMeta();

/** 一局结束时的信用点结算：生存时间是主体，波次与击毁是次级来源 */
function metaReward(run) {
  return Math.round(run.t / 12 + run.wave * 2 + run.kills / 120);
}

/** 永久强化的实际加成（reset 时应用）：等级 -> 数值 */
function metaBonus() {
  const b = { hp: 0, dmgMul: 0, cdMul: 1, pick: 0, credits: 0 };
  for (const u of META_UPGRADES) {
    const lv = meta.up[u.id] || 0;
    if (lv > 0) u.apply(b, lv);
  }
  return b;
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
  const next = clamp(z, VIEW_ZOOM.min, VIEW_ZOOM.max);
  const changed = Math.abs(next - zoomTarget) > 0.005;
  zoomTarget = next;
  try { localStorage.setItem(ZOOM_KEY, String(zoomTarget)); } catch { /* 隐私模式忽略 */ }
  /* 手机上"视角"读数常年占着左上角（玩家反馈过面板太大，我把它藏了），
     所以改用一条 1 秒的浮层提示：只有真的在缩放时才出现。 */
  if (changed && booted) showZoomToast();
}
function nudgeZoom(dir) { setZoom(zoomTarget + dir * VIEW_ZOOM.step); }

/* 缩放浮层提示：显示 1 秒后淡出。手机捏合 / 桌面滚轮 / −= 键都会触发 */
let zoomToastTimer = 0;
function showZoomToast() {
  const el = document.getElementById('zoomToast');
  if (!el) return;
  el.textContent = `视角 ${zoomTarget.toFixed(1)}×`;
  el.classList.add('show');
  clearTimeout(zoomToastTimer);
  zoomToastTimer = setTimeout(() => el.classList.remove('show'), 1000);
}

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
  /* 首次 resize 发生在模块初始化阶段，那时 player/G 还在 TDZ（let 声明未执行）——
     所以只在"启动完成"之后才做朝向同步。 */
  if (booted) syncOrientation();
}

/* ==================== 手机适配 ==================== */
/** 触摸设备判定：优先看指针类型（最准），UA 兜底（部分安卓浏览器不报 coarse） */
const IS_TOUCH = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const rotateEl = document.getElementById('rotate');
let rotatePaused = false;
let booted = false;

/** 竖屏遮挡：手机竖屏时 16:9 舞台只剩一条窄横带，没法玩 —— 直接提示转屏并暂停 */
function syncOrientation() {
  const portrait = window.innerHeight > window.innerWidth;
  const blocked = IS_TOUCH && portrait && window.innerWidth < 900;
  document.body.classList.toggle('mobile', IS_TOUCH);
  document.body.classList.toggle('portrait', blocked);
  if (fsBtn) fsBtn.classList.toggle('hidden', !IS_TOUCH);   // 全屏按钮只给触摸设备
  if (!rotateEl) return;
  if (blocked) {
    if (!rotateEl.classList.contains('show')) rotateEl.classList.add('show');
    /* 只有"正在游玩"才由旋转接管暂停；本来就在菜单/暂停里就别抢状态 */
    if (!G.over && !G.paused) { G.paused = true; rotatePaused = true; }
  } else if (rotateEl.classList.contains('show')) {
    rotateEl.classList.remove('show');
    if (rotatePaused) { rotatePaused = false; G.paused = !!pausedManual; }
  }
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
const elCredit = document.getElementById('sCredit');
const elShopBtn = document.getElementById('shopBtn');
const elShopCredits = document.getElementById('shopCredits');
const elNext = document.getElementById('clockNext');      // 顶部正中：下一波倒计时
const elEvent = document.getElementById('clockEvent');    // 顶部正中：事件目标进度（无事件时隐藏）
const elZoom = document.getElementById('sZoom');
const loadoutEl = document.getElementById('loadout');
let loadoutKey = '';
const elCombo = document.getElementById('combo');
const pauseEl = document.getElementById('pause');
const pauseTitleEl = document.getElementById('pauseTitle');
const muteStateEl = document.getElementById('muteState');
/* 意见收集的两个常驻入口：暂停面板里的按钮 + 战场右下角的常驻小按钮 */
document.getElementById('fbPause').onclick = () => showFeedback();
document.getElementById('fbCorner').onclick = () => {
  if (G && G.over) return;              // 结算时用面板里的那个入口（这个按钮会被遮罩挡住）
  if (panelMode === 'ship') return;     // 开局菜单里也有自己的入口
  showFeedback();
};
/* 触摸专用按钮：手机没有键盘，B（补给）与 ESC（暂停）都按不到 ——
   少了这两个按钮，手机端根本打不开商店、也暂停不了，那就谈不上"能玩"。 */
document.getElementById('shopBtn').onclick = () => {
  if (G && G.over) return;
  if (panelMode === 'shop') closeShop();
  else if (!currentOptions) { shopOpen = true; showShop('big'); }
};
document.getElementById('pauseBtn').onclick = () => {
  if (G && G.over) return;
  if (panelMode === 'shop') { closeShop(); return; }
  if (panelMode === 'feedback') { closePanel(); return; }
  if (!currentOptions) togglePause();
};
/* 画质手动选择（暂停面板里）：手机端帧率不够时框架会自动降级，
   但玩家想主动选低画质换帧率（或反过来）时必须有入口 —— 自动降级只该兜底，不该替玩家决定。 */
document.querySelectorAll('#pause .chip.q').forEach(el => {
  el.onclick = () => {
    setQuality(el.dataset.q, true);
    syncQualityChips();
  };
});
function syncQualityChips() {
  document.querySelectorAll('#pause .chip.q').forEach(el => {
    el.classList.toggle('on', el.dataset.q === qualityLevel);
  });
}

/* 全屏按钮：只在触摸设备显示。手机浏览器地址栏会吃掉约 15% 的可视高度，
   而且横屏时容易误触返回 —— 全屏对"能看清弹幕"是实打实的帮助。 */
const fsBtn = document.getElementById('fsBtn');
fsBtn.onclick = () => {
  const el = document.documentElement;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) req.call(el).catch(() => { });
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document).catch(() => { });
  }
};

/** 当前装备终端里的三张卡（支持 1/2/3 快捷选择） */
let currentOptions = null;
/** 手动暂停（ESC / 失焦自动暂停） */
let pausedManual = false;
let pauseReason = '';                   // '' = 玩家手动，'blur' = 失焦自动暂停

/**
 * 同步两套"暂停"：
 *   pausedManual —— 玩家自己按的暂停（ESC / 手机暂停按钮 / 失焦自动暂停）
 *   G.paused     —— 有面板挡在前面（升级终端 / 商店 / 意见收集 / 开局菜单）
 * 两套都必须一致，否则会出现"暂停解除了但 G.paused 永远是 true"：
 * 主循环 `!G.paused` 直接把 update 卡死（表现为按键和摇杆全部失灵），
 * 而且 `gainExp` 里 `!G.paused` 的判断会让升级面板再也不弹（升级被静默吞掉）。
 */
function syncPauseState() {
  G.paused = pausedManual || !!currentOptions || !!panelMode;
}

function togglePause(force, reason) {
  if (G && G.over) return;
  pausedManual = force === undefined ? !pausedManual : !!force;
  pauseReason = pausedManual ? (reason || '') : '';
  pauseEl.classList.toggle('hidden', !pausedManual);
  if (pausedManual && pauseTitleEl) {
    pauseTitleEl.textContent = pauseReason === 'blur' ? '窗口失焦 · 已暂停' : '已暂停';
  }
  syncPauseState();
}
/* 点一下就继续：失焦回来时不用去猜该按哪个键 */
/* 暂停面板：点空白处 = 继续；点面板里的按钮 = 只执行按钮自己的事。
   （不加这个判断的话，点「画质」或「意见收集」会顺带把游戏恢复了。） */
pauseEl.addEventListener('click', e => {
  audio.unlock();
  if (e.target.closest('button')) return;
  togglePause(false);
});
function syncMuteLabel() {
  if (muteStateEl) muteStateEl.textContent = audio.muted ? '关' : '开';
}
function toggleMute() {
  const m = audio.toggleMute();
  syncMuteLabel();
  return m;
}

function reset() {
  /* 战机（#18）：机体差异只在单局内生效，基准是 PLAYER，机体给的是乘/加修正 */
  const ship = SHIPS.find(s => s.id === shipId) || SHIPS[0];
  /* 局外永久强化（#17）：叠在机体修正之上，量很小 */
  const mb = metaBonus();
  player = {
    x: WORLD.w / 2, y: WORLD.h / 2, r: PLAYER.r,
    vx: 0, vy: 0,               // 当前速度（惯性）
    angle: 0,                   // 朝向
    footTimer: 0,               // 尾焰粒子计时
    speed: PLAYER_SPEED * (ship.speedMul || 1),
    hp: (ship.hp || PLAYER.hp) + mb.hp, maxHp: (ship.hp || PLAYER.hp) + mb.hp,
    dr: ship.dr || 0, crit: PLAYER.crit + (ship.crit || 0),
    /* 属性矩阵（阶段 A2）：商品与升级卡都是往这些字段上加减。
       critDmg 默认 2.0（暴击倍率）、rangeMul 默认 1（射程倍率）—— 其余都是 0 起步的加项。 */
    critDmg: PLAYER.critDmg || 2.0, dodge: 0, atkSpd: 0, rangeMul: 1,
    meleeDmg: 0, rangedDmg: 0, elemDmg: 0, harvest: 0, luck: 0, creditsPerKill: 0,
    /* 机制层（阶段 A3）：mechs 是 id→层数；后三个是机制用的计时器/状态 */
    mechs: {}, vendettaT: 0, standT: 0,
    level: 1, exp: 0, expNext: expNeed(1),
    pickupRange: (ship.pick || PLAYER.pickupRange) + mb.pick,
    dmgMul: (ship.dmgMul || PLAYER.dmgMul) + mb.dmgMul,
    cdMul: (ship.cdMul || PLAYER.cdMul) * mb.cdMul,
    invuln: 0, kills: 0,
    credits: mb.credits + (RUN.startCredits || 0), shopBought: {},      // 局内商店：信用点 + 本局购买记录（涨价用）
    regen: 0, shield: false, shieldCd: 0, slowField: 1, orbPullMul: 1,   // 超频跃迁模组带来的能力
    killHealAcc: 0, killHealAt: 0,                        // 击杀回血的每秒上限
    statLevels: {}, mods: {}, jumpPending: false,
    ship: ship.id, shipName: ship.name,
    weapons: [{ id: ship.start, tier: 1, lv: 1, t: 0.15, angle: 0 }],
    touch: { active: false, sx: 0, sy: 0, dx: 0, dy: 0, id: null }
  };
  G = {
    t: 0, wave: 1, waveTimer: 0, spawnAcc: 0, bossSpawned: false, eliteWaveSpawned: false, eventWarned: false,
    dmgAcc: 0, dmgSamples: [], lastDmgAt: 0, dmgTaken: {},     // 调试用：每秒伤害/承伤统计
    cam: { x: 0, y: 0 },          // 镜头左上角（世界坐标）
    enemies: [], bullets: [], beams: [], enemyBullets: [], pickups: [],
    orbs: [], texts: [], parts: [], bolts: [], rings: [], zones: [],
    paused: false, over: false, combo: 0, comboTimer: 0, comboBest: 0,
    /* 友方弹体上限的可观测项：峰值 + 被上限丢掉的发数（见 MAX_ALLY_BULLET 注释）。
       上限静默咬住 = 隐性 DPS 削减，所以必须能被看见 —— 这两个数只在这里和 fireAllyBullet 里动。 */
    allyBulletPeak: 0, allyBulletDropped: 0,
    /* 经济观测项（0.6.0 阶段 A）："钱从哪来、够不够花"必须可读数 —— 判据
       （≥40% 的进店存在真实取舍、一局购买次数中位数 ≥8）就是靠这些数跑出来的，不靠体感。
       squeezed = 进店时"买得起至少 1 件、但买不起全部"的次数：**那才叫决策**。 */
    creditsEarned: 0, creditsBySource: {}, creditAcc: 0, killCreditAcc: 0,
    /* 机制层观测项：mechBlasts = 机制爆炸触发次数（判据：带了机制的商品必须在 sim 里真的触发过） */
    mechDepth: 0, mechBlasts: 0,
    /* 武器来源记账（阶段 B1）：回答"武器到底从哪来" —— 商店 / 事件 / 掉落 / 解锁 / 彩蛋 */
    weaponBySource: {},
    orbsCollected: 0, expFromOrbs: 0,
    shopVisits: 0, shopVisitsSqueezed: 0, shopVisitsBroke: 0, shopAffordTotal: 0,
    shopBuys: 0, shopSpent: 0, shopRerolls: 0, shopLocks: 0,
    shopVisitCounted: false,
    /* 局内进程结构（0.6.0 阶段 0）：phase 是唯一权威的"现在处于哪一段"。
       wave 的推进只在 phase==='beat' 与 'event' 期间发生（面板开着时游戏本来就暂停）。 */
    phase: 'beat', stage: 1,
    beatsLeft: RUN.beatsPerStage, beatWavesLeft: RUN.wavePerBeat, shopWavesLeft: RUN.shopEveryWaves,
    eventRun: null, eventLog: []
  };
  pendingLevels = 0; shake = 0; hitStop = 0; flashA = 0;
  currentOptions = null;
  panelMode = null;                 // 重开一局作废所有面板状态（不然守卫会拦住后续入口）
  shopOpen = false; pendingShop = null; shopStock = [];
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
  if (e.code === 'Escape') {
    if (panelMode === 'shop') { closeShop(); return; }
    if (panelMode === 'feedback') { closePanel(); return; }
    if (panelMode === 'ship' || panelMode === 'meta') return;   // 开局菜单：ESC 没有"关闭"的语义
    if (!currentOptions) togglePause();
    return;
  }
  if (e.code === 'KeyB') {                       // 局内商店（#16）
    /* 升级面板待选择时不开商店：否则会把那一级的选择面板盖掉（pendingLevels 还在，
       但玩家会以为"我的升级没了"）。 */
    if (G.over || panel._shipPick || currentOptions) return;
    if (shopOpen) closeShop(); else { shopOpen = true; showShop('big'); }
    return;
  }
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') { nudgeZoom(-1); return; }   // 镜头拉高（看得更远）
  if (e.code === 'Equal' || e.code === 'NumpadAdd') { nudgeZoom(1); return; }         // 镜头推近
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (e.code === 'KeyR' && G && G.over) { showShipSelect(); return; }
  // 机体选择面板开着时，1/2/3 直接选机体
  if (panel._shipPick) {
    const si = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].indexOf(e.code);
    if (si >= 0 && SHIPS[si]) { panel._shipPick(SHIPS[si].id); return; }
  }
  /* 面板卡快捷键：普通升级是三选一，但**超频跃迁是四选一** ——
     旧实现写死 `currentOptions[idx % 3]`，导致第 4 张模组卡键盘永远选不到（图鉴核对时发现）。
     现在 1/2/3/4 直接对应卡位，越界就当没按。 */
  if (currentOptions) {
    const keyRow = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'];
    const idx = keyRow.indexOf(e.code);
    if (idx >= 0) {
      const opt = currentOptions[idx % 4];   // 三选一时第 4 个不存在 -> 视为没按
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
    player.touch.len = 0; player.touch.mag = 0;
    player.touch.mode = null;
  }
  /* 失焦时手指不会派发 touchend：捏合状态与手指表必须一起清，否则回来时缩放会乱跳 */
  activeTouches.clear();
  pinchStart = null;
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

/* 触摸摇杆参数（逻辑单位）：12 以内是死区，76 以上算满杆。
   手机上的"推杆幅度"映射成速度 —— 键盘是数字量（走/不走），触摸是模拟量（慢慢挪/全速冲），
   这对躲避弹幕很关键：贴边微调时全速冲会直接撞上去。 */
const TOUCH_DEAD = 12, TOUCH_FULL = 76;
/** 当前按在画布上的手指（identifier -> 逻辑坐标）。两指捏合要用它算指距 */
const activeTouches = new Map();
/** 捏合起始状态：{ dist, zoom } */
let pinchStart = null;

function touchDist() {
  const it = [...activeTouches.values()];
  if (it.length < 2) return 0;
  return Math.hypot(it[0].x - it[1].x, it[0].y - it[1].y) || 1;
}
/** 两指捏合 = 缩放镜头（手机没有滚轮，也没有 -/= 键 —— 不提供这个手势的话，手机上根本调不了视角）。
 *  与摇杆的关系：第二根手指落下时**放弃摇杆**（角色停住），避免"想缩放结果人物跑飞"。 */
function beginPinch() {
  pinchStart = { dist: touchDist(), zoom: zoomTarget };
  player.touch.active = false; player.touch.id = null;
  player.touch.dx = 0; player.touch.dy = 0; player.touch.len = 0; player.touch.mag = 0;
  player.touch.mode = 'pinch';
}
function updatePinch() {
  if (!pinchStart) return;
  const d = touchDist();
  if (d <= 0) return;
  const next = clamp(pinchStart.zoom * (d / pinchStart.dist), VIEW_ZOOM.min, VIEW_ZOOM.max);
  if (Math.abs(next - zoomTarget) > 0.005) setZoom(next);
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault(); if (!player) return;
  audio.unlock();
  if (e.changedTouches) for (const t of e.changedTouches) activeTouches.set(t.identifier, toLocal(t.clientX, t.clientY));
  /* 第二根手指落下 = 捏合缩放。此时必须放弃摇杆，否则缩放的同时角色会朝两指中间跑 */
  if (activeTouches.size >= 2) { beginPinch(); return; }
  /* 单指：多指防护 —— 摇杆已经激活时不重复接管（手掌边缘碰到屏幕不该让角色转向） */
  if (player.touch.active) return;
  const t = e.changedTouches && e.changedTouches[0]; if (!t) return;
  const p = toLocal(t.clientX, t.clientY);
  player.touch.active = true; player.touch.id = t.identifier; player.touch.mode = 'stick';
  player.touch.sx = p.x; player.touch.sy = p.y;
  player.touch.dx = 0; player.touch.dy = 0;
  player.touch.len = 0; player.touch.mag = 0;
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  e.preventDefault(); if (!player) return;
  if (e.changedTouches) for (const t of e.changedTouches) {
    if (activeTouches.has(t.identifier)) activeTouches.set(t.identifier, toLocal(t.clientX, t.clientY));
  }
  if (player.touch.mode === 'pinch') {
    if (activeTouches.size >= 2) updatePinch();
    else { pinchStart = null; player.touch.mode = null; }   // 松开一根手指就结束捏合，不回到摇杆
    return;
  }
  if (!player.touch.active) return;
  const p = activeTouches.get(player.touch.id);
  if (!p) return;
  const dx = p.x - player.touch.sx, dy = p.y - player.touch.sy;
  const len = Math.hypot(dx, dy);
  if (len > TOUCH_DEAD) {
    player.touch.dx = dx / len; player.touch.dy = dy / len;
    /* 摇杆的可视长度按满杆封顶，避免手指拉太远时指示器跑出屏幕 */
    player.touch.len = Math.min(len, TOUCH_FULL);
    player.touch.mag = clamp((len - TOUCH_DEAD) / (TOUCH_FULL - TOUCH_DEAD), 0, 1);
  } else { player.touch.dx = 0; player.touch.dy = 0; player.touch.len = 0; player.touch.mag = 0; }
}, { passive: false });
function endTouch(e) {
  e.preventDefault(); if (!player) return;
  if (e.changedTouches) for (const t of e.changedTouches) activeTouches.delete(t.identifier);
  /* 捏合松开：结束时要求全部手指抬起才复位，避免三指乱按时状态错乱 */
  if (player.touch.mode === 'pinch') {
    if (activeTouches.size < 2) { pinchStart = null; player.touch.mode = null; }
    if (activeTouches.size === 0) player.touch.mode = null;
    return;
  }
  player.touch.active = false; player.touch.dx = 0; player.touch.dy = 0;
  player.touch.id = null; player.touch.len = 0; player.touch.mag = 0;
}
canvas.addEventListener('touchend', endTouch, { passive: false });
canvas.addEventListener('touchcancel', endTouch, { passive: false });
/* 安卓长按会弹上下文菜单 / 选中文字，战斗中很致命（手指停住不动就触发） */
canvas.addEventListener('contextmenu', e => e.preventDefault());

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
  if (type === 'sniper') {
    /* 错开首次瞄准时间：否则同批狙击机会在同一帧集体开火（既不可读也不公平） */
    e.state = 'idle'; e.stateTime = rand(1.2, LASER.cd); e.cdMul = 1; e.charge = 0; e.aimAngle = 0;
  }
  return e;
}

/** 敌方弹幕的**唯一构造入口**。
 *  以前三处（炮塔机 / 精英环弹 / Boss 弹幕）各自 push、各自写颜色，其中两处是硬编码，
 *  结果"把敌方弹幕改成红色"只改到一处 —— 玩家当场发现黄弹和紫弹还在飞。
 *  颜色从此只在这里定义：换色改 PALETTE.enemyBullet 一处，全部生效。 */
function fireBullet(x, y, angle, spd, r, dmg, life, src) {
  /* 弹幕硬上限：见 config 里的 MAX_ENEMY_BULLET 注释（扇形弹会把弹量推爆） */
  const reserve = (src === 'eliteBullet' || src === 'bossBullet') ? MAX_ENEMY_BULLET_RESERVE : 0;
  if (G.enemyBullets.length >= MAX_ENEMY_BULLET + reserve) return;
  G.enemyBullets.push({
    x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
    r, dmg, life, color: PALETTE.enemyBullet, src: src || 'bullet'
  });
}

/** 友方弹体的**唯一构造入口**（与敌方 `fireBullet` 对称）。
 *  追踪弹族 / 近防霰弹 / 回旋切割器 三处曾经各自 `G.bullets.push` —— 和敌方弹幕当年是同一个坑：
 *  要加上限就得记得改三处，漏一处等于没加。上限从此只在这里判一次。
 *  返回 false 表示这一发被上限丢掉（调用方无需处理，但 `dropped` 会计数）。 */
function fireAllyBullet(b) {
  if (G.bullets.length >= MAX_ALLY_BULLET) { G.allyBulletDropped++; return false; }
  G.bullets.push(b);
  /* 长度只在 push 时增长，所以这里取到的就是峰值 —— 不必每帧扫一遍容器 */
  if (G.bullets.length > G.allyBulletPeak) G.allyBulletPeak = G.bullets.length;
  return true;
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
    /* 狙击机：14 波起混入（预警激光的载体，出现率低但威胁高 —— 逼你打断瞄准或换位） */
    else if (w >= LASER.minWave && roll < 0.26) type = 'sniper';
    else if (roll < 0.42) type = 'fast';
    else if (w >= 5 && roll < 0.55) type = 'tank';
  }
  const e = buildEnemy(type, x, y, w);
  if (forceElite || Math.random() < ELITE.chance(w)) makeElite(e, w);
  if (forceElite) e.paysCredit = true;      // 精英"波"（事件）付信用点；随机精英化的小怪不付
  G.enemies.push(e);
  /* 编队冲锋（#12）：一定概率以"小队"形式出现（同一侧、间隔很近），
     单只怪是骚扰、一小队才是压力 —— 也让 AoE 武器有发挥场景。
     受同屏上限约束，且精英波不叠加（避免一帧内爆量）。 */
  if (!forceElite && w >= 6 && G.enemies.length < MAX_ENEMY - 4 && Math.random() < 0.16) {
    const n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n && G.enemies.length < MAX_ENEMY; k++) {
      const a = Math.random() * Math.PI * 2;
      const sep = rand(34, 64);
      const m = buildEnemy(type, clamp(x + Math.cos(a) * sep, 20, WORLD.w - 20), clamp(y + Math.sin(a) * sep, 20, WORLD.h - 20), w);
      G.enemies.push(m);
    }
  }
  return e;
}

/* ==================== 劫级装甲核心（Boss） ==================== */
function spawnBoss(hpWaveAhead) {
  const w = G.wave;
  /* 事件目标（猎杀）可以按"当前波次 + N"取血量：打当前波的 Boss 太软
     —— 实测 5.2 秒就死，事件形同虚设。只抬血量，不抬伤害（考的是"打得动吗"，不是"扛得住吗"） */
  const hw = w + (hpWaveAhead || 0);
  const m = 70 / Math.min(1, zoom);
  const L = G.cam.x - m, R = G.cam.x + viewW() + m, T = G.cam.y - m, B = G.cam.y + viewH() + m;
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) { x = clamp(G.cam.x + viewW() / 2, 60, WORLD.w - 60); y = T; }
  else if (side === 1) { x = R; y = clamp(G.cam.y + viewH() / 2, 60, WORLD.h - 60); }
  else if (side === 2) { x = clamp(G.cam.x + viewW() / 2, 60, WORLD.w - 60); y = B; }
  else { x = L; y = clamp(G.cam.y + viewH() / 2, 60, WORLD.h - 60); }
  const def = (w % 25 === 0) ? BOSS_TYPES.phantom
    : (w % 20 === 0) ? BOSS_TYPES.juggernaut
      : (w % 15 === 0) ? BOSS_TYPES.spinner
        : (w % 10 === 0) ? BOSS_TYPES.summoner : BOSS_TYPES.charger;
  const hp = def.hp(hw);
  const boss = {
    id: ++uid, x, y, r: def.r, hp, maxHp: hp, speed: def.spd * ENEMY_SPEED_SCALE(w), dmg: def.dmg(w),
    color: def.color, exp: def.exp, type: 'boss', variant: def.variant, bossName: def.name,
    kx: 0, ky: 0, orbCd: 0, flash: 0, dead: false, boss: true,
    // 劫掠者：追击 → 充能 → 突进 → 瘫痪；裂空者：追击 → 蓄能 → 弹幕 → 召唤 → 虚弱
    // 旋翼者：追击 → 蓄能 → 螺旋弹幕 → 虚弱；壁垒者：追击 → 封锁 → 突进 → 瘫痪
    state: 'chase', stateTime: def.variant === 'summoner' ? 2.4 : 3.0,
    chargeAngle: 0, chargeVx: 0, chargeVy: 0,
    vulnMul: 1, phase: 0, spiralA: 0, cdMul: 1
  };
  G.enemies.push(boss);
  audio.bossWarn();
  addText(x, y - 60, `警告：${def.name} 接近`, def.color, 24);
  flash(.4, '240,101,149');
  shake = Math.max(shake, 12);
}

/** 区域封锁：在目标附近落 n 个预警圈（错开半径，避免完全重叠成一个点） */
function spawnZones(cx, cy, n, dmg) {
  for (let i = 0; i < n; i++) {
    if (G.zones.length >= ZONE.max) return;
    const a = rand(0, Math.PI * 2);
    const dist = i === 0 ? 0 : rand(60, 180);       // 第一个直接压在玩家脚下，其余错开逼走位
    G.zones.push({
      x: clamp(cx + Math.cos(a) * dist, 20, WORLD.w - 20),
      y: clamp(cy + Math.sin(a) * dist, 20, WORLD.h - 20),
      r: ZONE.r, t: ZONE.telegraph, telegraph: ZONE.telegraph, dmg, fired: false, life: 0
    });
  }
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
  const real = (crit ? dmg * (player.critDmg || 2) : dmg) * mul;
  e.hp -= real;
  e.kx += kx || 0; e.ky += ky || 0;
  e.flash = 0.09;
  G.dmgAcc += real;                 // DPS 统计
  if (crit) fireMechs('onCrit', e, real);    // 机制：暴击触发（暴击新星等）
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
    fireMechs('onKill', e);          // 机制：击杀触发（连锁反应等）；mechBlast 内部有深度护栏防递归

    /* 局内信用点（#16 商店的唯一来源）：**只来自事件** —— 精英波与首领。
       随机精英化的小怪（最高占 26% 生成量）不付钱：按它付等于按怪群规模发钱，
       实测一整局会到 2428 点（够买 15 次），商店就变成清仓而不是取舍。
       精英波的怪带上 paysCredit 标记，钱因此是"可预期的事件奖励"。 */
    if (e.boss) { gainCredits(CREDIT.boss, 'boss'); addText(e.x, e.y - 34, `+${CREDIT.boss} 信用点`, '#FFD166', 18); }
    else if (e.paysCredit) { gainCredits(CREDIT.elite, 'elite'); addText(e.x, e.y - 30, `+${CREDIT.elite} 信用点`, '#FFD166', 14); }

    /* 「每击杀信用点」（贪婪核心）：小数累加、取整发放 —— 一局几千次击杀，
        按 1 点/杀直接给会把一局收入翻倍；0.15/杀 ≈ 一局 +300，才是"值得买但不到崩盘"。 */
    if (player.creditsPerKill) {
      G.killCreditAcc += player.creditsPerKill;
      const c = Math.floor(G.killCreditAcc);
      if (c > 0) { G.killCreditAcc -= c; gainCredits(c, 'kill'); }
    }

    /* 击杀回复（纳米虫群 + 噬能涂层）—— 每秒最多回 5% 最大生命，
       否则后期每秒几十杀会变成无敌。所有吸血途径都必须汇进这一条限速里。 */
    let healOnKill = player.killHealFlat || 0;
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
    /* 一只怪 1 颗残片（原版最多 8 颗）：自动拾取时代"碎片雨"只是好看，
       关掉全图拾取后它会让战场几秒内堆到上限、而玩家物理上不可能走完 —— 等于把经验稀释掉。
       精英/首领仍多爆几颗做手感（数量少，不影响可捡性）。 */
    const n = (e.boss || e.elite) ? 4 : 1;
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
  /* 相位护盾模组：每 10 秒完全抵挡一次（与卡面文案一致） */
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
  /* 闪避（属性矩阵）：判定在减伤之前，命中不了就完全不掉血。
     给上限 0.60 —— 闪避是"免伤概率"，堆到 100% 等于无敌（Brotato 也用封顶处理）。 */
  if (player.dodge > 0 && Math.random() < Math.min(0.60, player.dodge)) {
    player.invuln = PLAYER.invuln * 0.5;
    addText(player.x, player.y - 26, '闪避', '#a8e6cf', 16);
    return;
  }
  const real = Math.max(1, dmg * grace * (1 - player.dr));
  player.hp -= real;
  fireMechs('onDamaged', real);      // 机制：受伤触发（反击电容等）
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
    addText(player.x, player.y - 36, '宝箱！获得升级', PALETTE.elite, 20);
    burst(player.x, player.y, PALETTE.elite, 18, 300);
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

/** **武器发放的唯一入口**（A11 的架构约束）—— 与 `fireBullet` / `fireAllyBullet` / `gainCredits`
 *  同样的理由：武器来源以后会有很多（商店 / 事件奖励 / 掉落 / 条件解锁 / 彩蛋），
 *  散落成多处 `player.weapons.push(...)` 就必然出现"改一处只生效一处"。
 *
 *  合成规则（A2）：同名**同品级**再拿一把 → 合成成品级 +1，占格不变。
 *  `source` 目前只用于记账（`G.weaponBySource`），以便回答"武器到底从哪来"。
 *
 *  @returns 'combine' 合成 / 'new' 新增 / 'full' 槽位满 / null 失败 */
function grantWeapon(id, tier, source) {
  const def = WEAPONS[id];
  if (!def) return null;
  const t = Math.max(1, Math.min(4, tier || 1));
  G.weaponBySource[source] = (G.weaponBySource[source] || 0) + 1;
  const same = player.weapons.find(w => w.id === id && w.tier === t && w.tier < 4);
  if (same) {
    same.tier++;
    same.lv = weaponLvOf(same.tier);
    addText(player.x, player.y - 54, `${def.name} → ${weaponTierName(same.tier)} 品级`, PALETTE.elite, 20);
    audio.levelUp();
    return 'combine';
  }
  const slots = RUN.weaponSlots + (player.slotUp || 0);
  if (player.weapons.length >= slots) {
    addText(player.x, player.y - 54, '武器槽已满', PALETTE.enemyBullet, 18);
    audio.hurt();
    return 'full';
  }
  player.weapons.push({ id, tier: t, lv: weaponLvOf(t), t: 0, angle: 0 });
  addText(player.x, player.y - 54, `${def.name} ${weaponTierName(t)}`, PALETTE.allyBeam, 18);
  return 'new';
}

/** 池子抽干后的保底（可重复），保证升级永远有东西可选 */
function buildFallbackOptions() {
  return [
    { kind: 'fallback', name: '应急维修', icon: '🧰', iid: 'repair', w: 1, tag: '补给', desc: '立刻回复 40 点生命', apply: () => { player.hp = Math.min(player.maxHp, player.hp + 40); } },
    { kind: 'fallback', name: '残片回收', icon: '💠', iid: 'salvage', w: 1, tag: '补给', desc: '立刻获得 25 点经验', apply: () => { gainExp(25); } }
  ];
}

/** 升级池（阶段 B2 重排，落实 A4）：**不再给武器、也不给武器强化**。
 *
 *  为什么：武器已经从"升级抽卡"搬到**商店**（A11 的单一入口 `grantWeapon`），
 *  成长只靠**同名同品级合成**（A2）。升级池里若还留着武器卡，同一件事就有两个入口 ——
 *  那正是旧版"权重全压在武器上（2.2× / 3.5×）、生存卡永远抽不到"的成因。
 *
 *  现在升级给三种东西（A4 的分工）：
 *  **属性**（量，各自有上限）· **武器槽位**（结构：3 → 6）· **飞船机制**（变数，后续阶段） */
function buildOptions() {
  const pool = [];
  /* 武器槽位：一条**结构性**选择（不是数值）—— 槽位决定你能同时押几把武器，
     进而决定同名合成与"吃哪类属性"的空间。权重刻意低于属性卡：它是"为未来投资"，不该每级都来。 */
  const slots = RUN.weaponSlots + (player.slotUp || 0);
  if (slots < RUN.maxWeaponSlots) {
    pool.push({
      kind: 'slot', name: '武器槽位', icon: '🗂️', iid: 'slot', w: 1.3,
      tag: `槽位 ${slots} / ${RUN.maxWeaponSlots}`,
      desc: `武器槽位 +1（上限 ${RUN.maxWeaponSlots}）· 槽位越多，能同时押的武器越多`,
      apply: () => { player.slotUp = (player.slotUp || 0) + 1; }
    });
  }
  return pickWeighted(pool, 3);
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
  panel._shipPick = null;      // 升级面板可能紧接着机体面板出现（点击机体后立刻升级），必须清掉旧的抢键回调
  const jump = player.jumpPending;
  player.jumpPending = false;
  const opts = jump ? buildModuleOptions() : buildOptions();
  if (!opts.length) {                       // 池子抽干（全武器满级且属性全满）：不空转面板
    overlay.classList.remove('show');
    /* 退回这次升级，避免"升了级却一个都没选到"。若同时到账了多级，递归消化（每轮递减，必然收敛）。
       ⚠️ 递减到 0 之后**必须**把排队的商店放出来 —— 否则 phase 停在商店态却没人开店，
       updateRun 会一直空转（实测：一局卡在 25 分钟不动）。 */
    pendingLevels = Math.max(0, pendingLevels - 1);
    if (pendingLevels > 0) showUpgrade();
    else if (!flushPendingPanel()) syncPauseState();
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
  o.apply();
  /* 防御：`pendingLevels` 一旦被减成负数，之后每次升级的 `pendingLevels++` 只会把它推回 0，
     而 `showUpgrade()` 的条件是 `> 0` —— 那些等级就会**静默地不给面板**。
     正常流程走不到这里（每张面板都有一次对应计数），但这类"计数错位"是会悄悄吃掉玩家选择的，
     所以宁可在源头夹住。 */
  pendingLevels = Math.max(0, pendingLevels - 1);
  if (pendingLevels > 0) showUpgrade();
  else {
    overlay.classList.remove('show'); currentOptions = null;
    /* 升级弹完了才轮到排队的商店（见 openShop 的"升级面板优先"） */
    if (!flushPendingPanel()) syncPauseState();
  }
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

  /* 局外存档结算（#17）：信用点 + 累计战绩 */
  const reward = metaReward(cur);
  meta.credits += reward;
  meta.runs++;
  meta.kills += cur.kills;
  meta.playTime += cur.t;
  meta.bestTime = Math.max(meta.bestTime, cur.t);
  meta.bestWave = Math.max(meta.bestWave, cur.wave);
  saveMeta();

  const build = player.weapons
    .map(w => `${WEAPONS[w.id].name} ${weaponTierName(w.tier)}`)
    .join(' · ');
  const mods = MODULES.filter(m => player.mods[m.id]).map(m => m.name).join(' · ');

  panel.innerHTML = `<div id="big">信号中断</div>
    <p class="sub">${player.shipName} · 存活 ${fmtTime(G.t)} · 第 ${G.wave} 波 · 击毁 ${player.kills} · 型号 ${mkName(player.level)} · 最高连击 ${G.comboBest}</p>
    <p class="sub best">${isNew ? '★ 新纪录' : '历史最佳'} · 存活 ${fmtTime(show.t)} · 击毁 ${show.kills} · 第 ${show.wave} 波</p>
    <p class="sub credit">本局结算 +${reward} 局外信用点（共 ${meta.credits}）· 局内剩余信用点 ${Math.round(player.credits)}</p>
    <p class="sub build">本局构筑：${build || '无'}</p>
    ${mods ? `<p class="sub build">超频模组：${mods}</p>` : ''}
    <button class="btn" id="again">重新接入</button>
    <button class="btn alt" id="toMeta">研发终端</button>
    <button class="btn alt" id="fbOver">意见收集</button>`;
  overlay.classList.add('show');
  document.getElementById('again').onclick = showShipSelect;
  document.getElementById('toMeta').onclick = () => showMeta();
  document.getElementById('fbOver').onclick = () => showFeedback();
}

/* ==================== 战机选择（#18） ==================== */
const SHIP_KEY = 'starfall.ship.v1';
let shipId = (() => {
  try {
    const v = localStorage.getItem(SHIP_KEY);
    return SHIPS.some(s => s.id === v) ? v : SHIPS[0].id;
  } catch (e) { return SHIPS[0].id; }
})();

/** 开局/重开前的机体三选一：纯单局差异，不做解锁、不碰存档（只记住上次选择）
 *  silent：首次加载时浏览器还没拿到用户手势，此时出声只会刷一串 AudioContext 警告 */
function showShipSelect(silent) {
  G.paused = true;
  currentOptions = null;
  if (!silent) audio.levelUp();
  const cards = SHIPS.map(s => `
    <div class="card ship${s.id === shipId ? ' on' : ''}" data-ship="${s.id}">
      <div class="nm" style="color:${s.color}">${s.name}<span class="lv">${s.tag}</span></div>
      <div class="ds">${s.desc}</div>
    </div>`).join('');
  panel.innerHTML = `<h2>选择机体 // 接入前</h2>
    <p class="sub">机体差异只在单局内生效 · 点击或按 1 / 2 / 3</p>
    <div id="cards" class="ships">${cards}</div>
    <button class="btn" id="metaOpen">研发终端 · 局外信用点 ${meta.credits}</button>
    <button class="btn alt" id="fbShip">意见收集</button>`;
  overlay.classList.add('show');
  const pick = (id) => {
    shipId = id;
    try { localStorage.setItem(SHIP_KEY, id); } catch (e) { /* 隐私模式下忽略 */ }
    panel._shipPick = null;          // 必须清掉：否则对局中按 1/2/3 会当成"选机体"直接重开
    panelMode = null;                // 同理：不清会让"意见收集"角落按钮的守卫一直拦着自己
    overlay.classList.remove('show');
    restart();
  };
  panel.querySelectorAll('.card').forEach(el => { el.onclick = () => pick(el.dataset.ship); });
  panel._shipPick = pick;
  panelMode = 'ship';
  document.getElementById('metaOpen').onclick = () => showMeta();
  document.getElementById('fbShip').onclick = () => showFeedback();
}

/* ==================== 局内商店（#16） ==================== */
/** 价格随**小节**上涨（阶段 A 改，旧模型是"每买一次全场 +60%"）——
 *  小节序号 = 已打完的波数 ÷ 每小节波数，用波数推、不依赖 phase 的具体取值，
 *  这样"这一波买"和"下一波买"的差价是确定的，玩家可以算。 */
function shopPrice(item) {
  const beat = Math.floor(Math.max(0, G.wave - 1) / RUN.wavePerBeat);
  /* 机制：商人牌 —— 每层 −12% 商店价格（价格是构筑的一部分，不只是"省钱"） */
  const disc = 1 - 0.12 * ((player.mechs && player.mechs.bargain) || 0);
  return Math.max(1, Math.round(shopPriceOf(item.base, beat) * disc));
}

/** 经济调参的运行时可调值（调试钩子 `__game.setEcon`）。
 *  阶段 A 的判据要跑十几二十局才看得出来，而每改一次配置文件都得重载页面 —— 太慢。
 *  默认值仍然来自 config（ORB_CREDIT_PER_EXP），这里只是允许在一次会话里扫参数。 */
const ECON = { orbPerExp: ORB_CREDIT_PER_EXP, shopEveryWaves: RUN.shopEveryWaves };

/** 信用点的唯一入口（与 fireBullet / fireAllyBullet 同样的理由：曾经散落多处、后来收敛）。
 *  它同时记账：`creditsBySource` 是阶段 A 判据的原始数据 —— "钱从哪来、够不够花"必须可读数，
 *  否则调价格只能靠猜。 */
function gainCredits(n, source) {
  if (!n) return 0;
  player.credits += n;
  G.creditsEarned += n;
  G.creditsBySource[source] = (G.creditsBySource[source] || 0) + n;
  return n;
}

/* ==================== 属性矩阵 + 商品池（阶段 A2） ==================== */
/** 通用属性应用器：**商品与升级卡都走这里** —— 加商品只需要在 config 的 ITEMS 里加一行数据，
 *  不必再写一段代码。特例（回复 / 护盾 / 升级 / 吸残片 / 立刻给钱）靠 `flag` 分流，见 buyItem。 */
/* ==================== 机制层（阶段 A3）：商品能带来"新玩法"，不只是属性 ====================
   为什么要有这一层：属性组合能把商品做**多**，但只有机制能让商品做**有意思**。
   做法：**机制 = 数据 + 钩子** —— 商品带 `mech` 字段，买下时把 handler 注册进 `player.mechs`，
   游戏只在**少数几个固定事件点**调用它们（击杀 / 暴击 / 受伤 / 波开始 / 商店价格 / 每帧被动）。
   加一个新机制 = 一个 handler + 一行商品数据，不需要在十几个地方插代码。
   （本轮之前刚吃过反面的教训：武器冷却逻辑散落 7 处、射程索敌 5 处 —— 那种地方加机制必错。）

   注意：机制**不写进 `stats`**（那不是属性），所以 HUD 的数值面板不会被它们污染。 */
const MECH_REGISTRY = {
  /* 击杀时小范围爆炸。防递归靠 G.mechDepth：爆炸也会击杀，击杀又触发爆炸。 */
  chainkill: {
    name: '连锁反应',
    onKill(e, n) { mechBlast(e.x, e.y, 70, (10 + G.wave * 2.2) * n); }
  },
  /* 暴击时在目标处炸开 —— 把"堆暴击"从纯数值变成一种清屏手段 */
  critnova: {
    name: '暴击新星',
    onCrit(e, dmg, n) { mechBlast(e.x, e.y, 60, dmg * 0.30 * n); }
  },
  /* 受伤后 4 秒内伤害 +30%（被打了反而更强） */
  vendetta: {
    name: '反击电容',
    onDamaged(n) { player.vendettaT = 4 * n; }
  },
  /* 每波开始：回一点血 + 给一点信用点（把"熬过去"变成一种正反馈） */
  wavegift: {
    name: '波次补给',
    onWaveStart(n) {
      player.hp = Math.min(player.maxHp, player.hp + 12 * n);
      gainCredits(8 * n, 'mech');
    }
  },
  /* 商店折扣（价格是构筑的一部分，不只是"打折省钱"） */
  bargain: { name: '商人牌' },
  /* 背水一战：生命低于 35% 时攻击速度 +25%（百分比越大越危险越强） */
  rage: { name: '背水一战' },
  /* 锚定射击：静止 0.8 秒后伤害 +30%，一移动就重置（把"风筝"与"站桩"变成真取舍） */
  standfast: { name: '锚定射击' }
};

/** 机制的 AoE 伤害（唯一入口，带深度护栏） */
function mechBlast(x, y, radius, dmg) {
  if (G.mechDepth >= 2 || dmg <= 0) return;
  G.mechDepth++;
  G.mechBlasts++;
  forEachNear(x, y, radius, (e) => { if (!e.dead) hurtEnemy(e, dmg, 0, 0); });
  G.mechDepth--;
}

/** 触发机制钩子。`player.mechs` 是 id → 层数（可叠加，层数进倍率）。 */
function fireMechs(hook, ...args) {
  const mechs = player.mechs;
  if (!mechs) return;
  for (const id in mechs) {
    const def = MECH_REGISTRY[id];
    if (def && def[hook]) def[hook](...args, mechs[id]);
  }
}

/** 机制生效时的**可见反馈**：机制是隐形的力量，不给反馈玩家就感觉不到它 */
function mechPing(x, y, color, text) {
  if (text) addText(x, y, text, color, 15);
  burst(x, y, color, 6, 180);
}

function applyStats(p, stats) {
  for (const k in stats) {
    const v = stats[k];
    switch (k) {
      case 'pctMaxHp': {                     // 按比例加减（后期不贬值）
        const d = Math.round(p.maxHp * v);
        p.maxHp = Math.max(40, p.maxHp + d);
        p.hp = Math.min(p.maxHp, p.hp + Math.max(0, d));
        break;
      }
      case 'hpNow': p.hp = Math.min(p.maxHp, p.hp + v); break;
      case 'maxHp':
        p.maxHp = Math.max(40, p.maxHp + v);
        p.hp = Math.min(p.maxHp, p.hp + Math.max(0, v));
        break;
      case 'dr': p.dr = Math.max(0, Math.min(0.60, p.dr + v)); break;         // 减伤封顶 60%
      case 'crit': p.crit = Math.max(0, Math.min(1, p.crit + v)); break;
      case 'dodge': p.dodge = Math.max(0, p.dodge + v); break;
      case 'rangeMul': p.rangeMul = Math.max(0.3, p.rangeMul + v); break;
      case 'speed': p.speed = Math.max(120, p.speed + v); break;
      default: p[k] = (p[k] || 0) + v;
    }
  }
}

/** 品级抽取（阶段 A2）：按**小节**逐级解锁，越往后越容易出高品级；幸运提高高档权重。
 *  形状参考 Brotato（T2 从第 2 波、T3 从第 4、T4 从第 8，带每波增量与上限），缩放到我们 9 个小节。 */
function drawTier(beat) {
  const luck = 1 + (player.luck || 0) * 0.03;                  // 幸运：每点 +3% 高档权重
  const w4 = beat >= 6 ? Math.min(0.08, (beat - 5) * 0.012) * luck : 0;
  const w3 = beat >= 3 ? Math.min(0.28, (beat - 2) * 0.045) * luck : 0;
  const w2 = beat >= 1 ? Math.min(0.60, beat * 0.11) * luck : 0;
  const r = Math.random();
  if (r < w4) return 4;
  if (r < w4 + w3) return 3;
  if (r < w4 + w3 + w2) return 2;
  return 1;
}

/** 抽一件武器（品级与道具用同一套解锁曲线，且同样"同店不重复"）。
 *  武器也吃 `weaponClass`：卡片上标出【近战/远程/元素】，玩家才知道它吃哪项属性。 */
function drawWeapon(beat, used) {
  const tier = drawTier(beat);
  const cands = Object.keys(WEAPONS).filter(id => !used.has('w:' + id));
  if (!cands.length) return null;
  const id = cands[Math.floor(Math.random() * cands.length)];
  used.add('w:' + id);
  const def = WEAPONS[id];
  const clsName = { melee: '近战', ranged: '远程', elem: '元素' }[weaponClass(def)] || '远程';
  return {
    weapon: id, tier, name: def.name, icon: def.icon, icolor: def.color,
    base: WEAPON_TIER.price[tier],
    desc: `【${clsName}】${def.desc(weaponLvOf(tier))}`
  };
}

/** 货架抽取：n 件、**同店不重复**、尊重每局上限 `max`。
 *  抽到的品级若已抽空（该档全被 limit 挡住）就**向下降一级**兜底 —— 保证货架永远是满的。
 *
 *  武器占货架 `RUN.weaponSlotChance` 的比重（Brotato 是 35%）：**武器与道具必须在同一个货架上抢钱**，
 *  否则"买武器还是买道具"不是取舍，而是两条互不相干的线。 */
function drawStock(n) {
  const beat = Math.floor(Math.max(0, G.wave - 1) / RUN.wavePerBeat);
  const stock = [];
  const used = new Set();
  for (let i = 0; i < n; i++) {
    if (Math.random() < RUN.weaponSlotChance) {
      const w = drawWeapon(beat, used);
      if (w) { stock.push(w); continue; }
    }
    let cands = [];
    for (let t = drawTier(beat); t >= 1 && !cands.length; t--) {
      cands = ITEMS.filter(it => it.tier === t
        && !used.has(it.id)
        && (it.max === undefined || it.max < 0 || (player.shopBought[it.id] || 0) < it.max)
        && !(it.flag === 'shield' && player.shield));
    }
    if (!cands.length) continue;
    const pick = cands[Math.floor(Math.random() * cands.length)];
    used.add(pick.id);
    stock.push(pick);
  }
  return stock;
}

/** 能不能买：**一处判定** —— 面板高亮 / 进店记账 / sim 机器人三处共用。
 *  上限 `max`、"已拥有即不再出现"（护盾）、以及**武器槽位**都只在这里判定。 */
function canBuy(it) {
  if (player.credits < shopPrice(it)) return false;
  if (it.weapon) {
    const same = player.weapons.find(w => w.id === it.weapon && w.tier === it.tier && w.tier < 4);
    const slots = RUN.weaponSlots + (player.slotUp || 0);
    return !!same || player.weapons.length < slots;      // 能合成 或 还有空槽
  }
  if (it.max !== undefined && it.max >= 0 && (player.shopBought[it.id] || 0) >= it.max) return false;
  if (it.flag === 'shield' && player.shield) return false;
  return true;
}

function buyItem(item) {
  const price = shopPrice(item);
  if (!canBuy(item)) { audio.hurt(); return false; }
  player.credits -= price;
  player.shopBought[item.id] = (player.shopBought[item.id] || 0) + 1;
  player.shopCount = (player.shopCount || 0) + 1;
  G.shopBuys++; G.shopSpent += price;

  /* 武器（阶段 B1）：**只走 grantWeapon 单入口**（A11）——武器来源以后会有很多种，
     散落成多处 push 必然"改一处只生效一处"。 */
  if (item.weapon) {
    audio.pickup();
    grantWeapon(item.weapon, item.tier, 'shop');
    return true;
  }

  if (item.stats) applyStats(player, item.stats);
  /* 机制层：注册 handler（可叠加，层数进倍率）。机制不写进 stats，所以数值面板不会被污染。 */
  if (item.mech) {
    player.mechs[item.mech] = (player.mechs[item.mech] || 0) + 1;
    const m = MECH_REGISTRY[item.mech];
    if (m) mechPing(player.x, player.y - 56, PALETTE.elite, `机制 · ${m.name}`);
  }
  switch (item.flag) {
    case 'heal40': player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.4); break;
    case 'shield': player.shield = true; player.shieldCd = 0; break;
    case 'money': gainCredits(110, 'shop'); break;
    case 'slowfield': player.slowField = 0.7; break;
    case 'lockOrbs': for (const o of G.orbs) o.locked = true; break;
    case 'levelup': {
      /* 不能在这里直接开升级面板（那会叠在商店之上、且商店仍是"打开"状态）。
         正确做法：先关店恢复游戏，再给经验让它自然触发升级面板。 */
      shopOpen = false;
      panelMode = null;
      overlay.classList.remove('show');
      syncPauseState();
      gainExp(Math.round(player.expNext));
      return true;
    }
  }
  audio.pickup();
  addText(player.x, player.y - 40, item.name, PALETTE.allyBeam, 16);
  return true;
}

/** 商店面板是否开着（B 键开关，暂停游戏） */
let shopOpen = false;

/** 当前打开的是哪个非升级面板（ESC 需要据此决定"关面板"还是"暂停"） */
let panelMode = null;

/** 本帧货架（小铺是随机子集、大铺是全量）。进店时定，重绘时沿用同一份。 */
let shopStock = [];

/** 结算面板该在什么时候弹：商店/事件结束之后才轮得到。 */
let pendingShop = null;

/** 进程里安排一次进店。**升级面板优先** —— 如果此刻有升级待选，
    先让升级弹完再开店，否则商店会盖住它（历史上"数据注入"就踩过这个坑）。 */
function openShop(kind) {
  G.phase = kind === 'big' ? 'bigShop' : 'smallShop';
  if (pendingLevels > 0 || currentOptions) { pendingShop = kind; return; }
  showShop(kind);
}

/** 升级面板关掉之后调用：把排队中的商店放出来 */
function flushPendingPanel() {
  if (pendingShop) {
    const kind = pendingShop;
    pendingShop = null;
    showShop(kind);
    return true;
  }
  return false;
}

/** 商店面板：小铺每小节之间自动弹、大铺每个事件之后自动弹；B 键也随时能手动开（走大铺货架）。
 *  信用点只来自精英/首领 + 事件奖励。 */
function showShop(kind) {
  const isBig = kind === 'big';
  G.paused = true;
  currentOptions = null;
  panel._shipPick = null;
  panelMode = 'shop';
  shopOpen = true;
  pauseEl.classList.add('hidden');     // 同上：别让暂停层压住遮罩
  /* 货架：小铺从现有 6 件里随机抽 RUN.smallShopItems 件（"这次进店有什么"本身是信息），
     大铺全上。分类商品池是阶段 1 的事 —— 阶段 0 先证明"两种规格的节奏"成立。 */
  const n = isBig ? RUN.bigShopItems : RUN.smallShopItems;
  shopStock = drawStock(n);
  /* 进店记一次账（每买一件都会重绘面板，所以用标志位保证"一次进店只记一次"）。
     squeezed = 买得起至少 1 件、但买不起全部 —— 那才叫决策；broke = 一件也买不起。
     判据（重排稿 §4 阶段 A）：squeezed 占比 ≥40%、broke 占比要低。 */
  if (!G.shopVisitCounted) {
    G.shopVisitCounted = true;
    const afford = shopStock.filter(it => canBuy(it)).length;
    G.shopVisits++;
    G.shopAffordTotal += afford;
    if (afford === 0) G.shopVisitsBroke++;
    else if (afford < shopStock.length) G.shopVisitsSqueezed++;
  }
  const rows = shopStock.map(it => {
    const price = shopPrice(it);
    /* 上限（`max`）与护盾这类"已拥有就不再出现"的特例：买满即显示"已满" */
    const bought = player.shopBought[it.id] || 0;
    const full = (it.max !== undefined && it.max >= 0 && bought >= it.max) || (it.flag === 'shield' && player.shield);
    const afford = player.credits >= price && !full;
    const left = (it.max !== undefined && it.max >= 0) ? ` · 上限 ${it.max}` : '';
    return `<div class="card shop${afford ? '' : ' off'}" data-item="${it.id}">
      <div class="ic">${iconFor(it.id, '#FFD166', it.icon)}</div>
      <div class="nm">${it.name}<span class="tier t${it.tier}">T${it.tier}</span></div>
      <div class="lv">${full ? '已满' : price + ' 信用点'}${left}</div>
      <div class="ds">${it.desc || statsText(it.stats || {})}</div>
    </div>`;
  }).join('');
  const title = isBig ? '补给终端 · 整备' : '补给终端 · 前哨';
  const priceNote = `价格随小节上涨（现在第 ${Math.floor(Math.max(0, G.wave - 1) / RUN.wavePerBeat) + 1} 小节）`;
  const sub = isBig
    ? `事件结算后的整备机会 · ${priceNote}`
    : `小节之间的前哨 · 只有 ${RUN.smallShopItems} 件现货 · ${priceNote}`;
  panel.innerHTML = `<h2>${title} // 信用点 ${Math.round(player.credits)}</h2>
    <p class="sub">${sub} · 按 B 或 ESC 关闭</p>
    <div id="cards">${rows}</div>
    <button class="btn alt" id="shopClose">返回战场</button>`;
  overlay.classList.add('show');
  panel.querySelectorAll('.card').forEach(el => {
    el.onclick = () => {
      const it = shopStock.find(x => x.id === el.dataset.item);
      if (it) buyItem(it);
      /* 只有商店还开着才重绘。'数据注入' 会主动关店去弹升级面板 ——
         无条件重绘会把它刚弹出的面板覆盖掉（实测：升级了但面板是商店，玩家以为升级丢了）。 */
      if (shopOpen) showShop(kind);
    };
  });
  /* 必须有关闭按钮：面板开着时遮罩会挡住右下角按钮，而手机上没有 ESC / B ——
     只靠键盘退出的话，手机会卡在商店里出不来。 */
  const sc = document.getElementById('shopClose');
  if (sc) sc.onclick = closeShop;
}

function closeShop() {
  overlay.classList.remove('show');
  shopOpen = false;
  panelMode = null;
  currentOptions = null;
  G.shopVisitCounted = false;      // 下一次进店重新记账
  /* 关店 = 推进进程。这是"商店是进程的一部分"的落点：
     小铺 → 继续本段；大铺 → 进下一段；大铺且已是最后一段 → 结算（通关）。 */
  if (G.phase === 'bigShop') {
    if (G.stage >= RUN.stages) { syncPauseState(); gameOver(); return; }
    G.stage++;
    G.beatsLeft = RUN.beatsPerStage;
    G.beatWavesLeft = RUN.wavePerBeat;
    G.shopWavesLeft = ECON.shopEveryWaves;
    G.phase = 'beat';
  } else if (G.phase === 'smallShop') {
    G.phase = 'beat';
  }
  syncPauseState();
  if (pausedManual) pauseEl.classList.remove('hidden');
}

/* ==================== 意见收集（无需后端） ====================
   设计取舍：这个项目是纯静态站、没有服务器，所以"提交"不能靠接口。能用的只有三条路：
   ① 打开预填好的 GitHub Issue（公开仓库，点一下就带标题正文）；
   ② 一键复制完整报告到剪贴板（贴到群里/论坛/邮件都行）；
   ③ 本地也留一份（最多 10 条）—— 万一玩家两条路都没走通，内容也不会凭空消失。
   报告会自动附带诊断信息（版本/机型/波次/构筑/浏览器），省得玩家描述半天环境。 */
const FEEDBACK_KEY = 'starfall.feedback.v1';
let feedbackKind = 'bug';
let feedbackText = '';

function loadFeedbackLog() {
  try { return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]'); } catch { return []; }
}
function pushFeedbackLog(entry) {
  try {
    const log = loadFeedbackLog();
    log.unshift(entry);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(log.slice(0, 10)));
  } catch { /* 隐私模式忽略 */ }
}

/** 自动附加的诊断信息：玩家不用描述环境，我拿到就能复现 */
function collectDiagnostics() {
  const p = player, g = G;
  const up = Object.entries(meta.up || {}).map(([k, v]) => k + v).join(' ') || '无';
  const build = p.weapons.map(w => `${WEAPONS[w.id].name} ${weaponTierName(w.tier)}`).join(' · ') || '无';
  const mods = MODULES.filter(m => p.mods[m.id]).map(m => m.name).join(' · ') || '无';
  return [
    `版本 ${VERSION}`,
    `机体 ${p.shipName || '?'} · 存活 ${fmtTime(g.t)} · 第 ${g.wave} 波 · 等级 ${p.level}(${mkName(p.level)}) · 击毁 ${p.kills}`,
    `生命 ${Math.round(p.hp)}/${Math.round(p.maxHp)} · 减伤 ${(p.dr * 100).toFixed(0)}% · 伤害 ×${p.dmgMul.toFixed(2)} · 冷却 ×${p.cdMul.toFixed(2)}`,
    `构筑：${build}`,
    `模组：${mods}`,
    `局内信用点 ${Math.round(p.credits)} · 局外强化 ${up}`,
    `视口 ${Math.round(viewW())}×${Math.round(viewH())} @${zoomTarget.toFixed(1)}× · 窗口 ${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`
  ].join('\n');
}

function feedbackBody() {
  const kind = FEEDBACK_KINDS.find(k => k.id === feedbackKind) || FEEDBACK_KINDS[0];
  const text = (feedbackText || '').trim() || '（没有填写描述）';
  return `【${kind.tag}】\n\n${text}\n\n---\n以下为自动附加的诊断信息，请勿删除：\n${collectDiagnostics()}\nUA: ${navigator.userAgent}`;
}

/** 拼出 mailto: 链接（抽成独立函数：便于自检、也避免"点了没反应"时无从复查） */
function feedbackMailUrl() {
  const kind = FEEDBACK_KINDS.find(k => k.id === feedbackKind) || FEEDBACK_KINDS[0];
  const desc = (feedbackText || '').trim().slice(0, 40).replace(/\s+/g, ' ');
  const subject = `[星陨][${kind.tag}] ${desc || '玩家反馈'}`;
  const body = feedbackBody();
  return `mailto:${FEEDBACK_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.slice(0, 1800))}`;
}

/** 邮件提交（默认路径）：调起玩家的邮件应用，收件人/主旨/正文全部预填好。
 *  用 location.href 而不是 window.open —— mailto 会被弹窗拦截器当广告拦掉。
 *  mailto 正文各家客户端容忍度不同（约 2000 字符），所以截断到 1800 并提示用"复制报告"发全文。 */
function submitFeedbackMail() {
  pushFeedbackLog({ t: Date.now(), kind: feedbackKind, text: feedbackText, diag: collectDiagnostics() });
  location.href = feedbackMailUrl();
  showFeedbackSent(`已调起邮件应用 · 收件人 ${FEEDBACK_MAIL} · 主旨与正文（含诊断）都填好了，直接发送即可`);
}

function submitFeedback() {
  const kind = FEEDBACK_KINDS.find(k => k.id === feedbackKind) || FEEDBACK_KINDS[0];
  const body = feedbackBody();
  const title = `[${kind.tag}] ` + ((feedbackText || '').trim().slice(0, 40).replace(/\s+/g, ' ') || '玩家反馈');
  pushFeedbackLog({ t: Date.now(), kind: feedbackKind, text: feedbackText, diag: collectDiagnostics() });
  const url = `${ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body.slice(0, 6000))}`;
  window.open(url, '_blank', 'noopener');
  showFeedbackSent('已在新标签页打开 GitHub 提交页 · 点「Submit new issue」即可发出');
}

function copyFeedback() {
  const body = feedbackBody();
  pushFeedbackLog({ t: Date.now(), kind: feedbackKind, text: feedbackText, diag: collectDiagnostics() });
  const done = (ok) => showFeedbackSent(ok
    ? '报告已复制到剪贴板 · 贴到群里 / 论坛 / 邮件都行'
    : '复制被浏览器拦下了 · 请手动全选下面文本框里的内容复制');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(body).then(() => done(true), () => done(false));
  } else done(false);
}

/** 提交后的确认（复用面板：给玩家看到"发出去了什么"） */
function showFeedbackSent(msg) {
  panel.innerHTML = `<h2>意见已就绪</h2>
    <p class="sub">${msg}</p>
    <p class="sub">报告内容预览（已含诊断信息）：</p>
    <textarea id="fbPreview" readonly rows="10">${feedbackBody().replace(/</g, '&lt;')}</textarea>
    <button class="btn" id="fbAgain">再写一条</button>
    <button class="btn alt" id="fbClose">返回</button>`;
  overlay.classList.add('show');
  const pv = document.getElementById('fbPreview');
  if (pv) pv.onclick = () => pv.select();
  document.getElementById('fbAgain').onclick = () => { feedbackText = ''; showFeedback(); };
  document.getElementById('fbClose').onclick = closePanel;
}

/** 反馈面板：三个入口共用（暂停面板 / 结算面板 / 战场角落按钮） */
function showFeedback(prefill) {
  G.paused = true;
  currentOptions = null;
  panel._shipPick = null;
  panelMode = 'feedback';
  /* 暂停面板的 z-index(320) 高于遮罩(300)：从暂停里打开任何面板时都必须先收起它，
     否则它会压在新面板上面、把按钮全挡住（实测：意见面板的"返回"点不动）。 */
  pauseEl.classList.add('hidden');
  if (prefill !== undefined) feedbackText = prefill;
  const chips = FEEDBACK_KINDS.map(k =>
    `<button class="chip${k.id === feedbackKind ? ' on' : ''}" data-kind="${k.id}">${k.name}</button>`).join('');
  panel.innerHTML = `<h2>意见收集 // v${VERSION}</h2>
    <p class="sub">选一个分类、写几句就行 —— 报告会自动附带诊断信息（机型 / 波次 / 构筑 / 浏览器），你不用手打环境</p>
    <div class="chips">${chips}</div>
    <textarea id="fbText" rows="4" maxlength="600" placeholder="例如：第 20 波之后弹幕太密看不清 / 天基炮经常打空 / 想要 XX 武器……">${feedbackText.replace(/</g, '&lt;')}</textarea>
    <p class="sub fbdiag">随附诊断：${collectDiagnostics().split('\n')[1] || ''}</p>
    <button class="btn" id="fbMail">用邮件发送 → ${FEEDBACK_MAIL}</button>
    <button class="btn alt" id="fbCopy">复制报告</button>
    <button class="btn alt" id="fbGit">提交到 GitHub</button>
    <button class="btn alt" id="fbCancel">返回</button>
    <p class="sub fblog">邮件按钮会调起本机邮件应用（手机上是 QQ 邮箱等 App），主旨与正文都已填好，点发送即可。<br>若这台设备没配邮件应用：用「复制报告」，手动寄到 ${FEEDBACK_MAIL} 也一样。本地也留了最近 ${loadFeedbackLog().length} 条。</p>`;
  overlay.classList.add('show');
  panel.querySelectorAll('.chip').forEach(el => {
    el.onclick = () => { feedbackKind = el.dataset.kind; if (fbSaveText()) showFeedback(); };
  });
  document.getElementById('fbMail').onclick = () => { if (fbSaveText()) submitFeedbackMail(); };
  document.getElementById('fbCopy').onclick = () => { if (fbSaveText()) copyFeedback(); };
  document.getElementById('fbGit').onclick = () => { if (fbSaveText()) submitFeedback(); };
  document.getElementById('fbCancel').onclick = closePanel;
}

/** 面板重绘/关闭前把文本框里的内容收进状态（否则切分类会把玩家写的东西弄丢） */
function fbSaveText() {
  const el = document.getElementById('fbText');
  if (el) feedbackText = el.value;
  return true;
}

/** 通用关闭：回到暂停或继续游戏 */
function closePanel() {
  overlay.classList.remove('show');
  panelMode = null;
  currentOptions = null;
  syncPauseState();
  if (pausedManual) pauseEl.classList.remove('hidden');
}

/* ==================== 局外研发终端（#17） ==================== */
function showMeta() {
  G.paused = true;
  panel._shipPick = null;
  panelMode = 'meta';
  pauseEl.classList.add('hidden');
  const up = META_UPGRADES.map(u => {
    const lv = meta.up[u.id] || 0;
    const maxed = lv >= u.maxLv;
    const price = u.cost(lv);
    const afford = !maxed && meta.credits >= price;
    return `<div class="card meta${maxed ? ' on' : (afford ? '' : ' off')}" data-up="${u.id}">
      <div class="ic">${iconFor(u.id, '#7FD8FF', u.icon)}</div>
      <div class="nm">${u.name}</div>
      <div class="lv">${maxed ? '已满级' : `Lv ${lv}/${u.maxLv} · ${price} 信用点`}</div>
      <div class="ds">${u.desc(lv)}</div>
    </div>`;
  }).join('');
  panel.innerHTML = `<h2>研发终端 // 局外信用点 ${meta.credits}</h2>
    <p class="sub">累计 ${meta.runs} 局 · 击毁 ${meta.kills} · 最长存活 ${fmtTime(meta.bestTime)} · 最远第 ${meta.bestWave} 波 · 总时长 ${fmtTime(meta.playTime)}</p>
    <div id="cards">${up}</div>
    <button class="btn" id="metaBack">返回机体选择</button>`;
  overlay.classList.add('show');
  panel.querySelectorAll('.card').forEach(el => {
    el.onclick = () => {
      const u = META_UPGRADES.find(x => x.id === el.dataset.up);
      const lv = u ? (meta.up[u.id] || 0) : 0;
      if (u && lv < u.maxLv && meta.credits >= u.cost(lv)) {
        meta.credits -= u.cost(lv);
        meta.up[u.id] = lv + 1;
        saveMeta();
        audio.levelUp();
      }
      showMeta();
    };
  });
  document.getElementById('metaBack').onclick = () => showShipSelect(true);
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

/** 武器伤害的唯一入口（属性矩阵落地在**这里**，不在 7 处开火分支里）。
 *  Brotato 式的"武器吃不同属性"：通用伤害（dmgMul）+ 该武器类别的专属伤害
 *  （melee/ranged/elem，由 mode 归类）。所以"投哪项属性"取决于你拿了哪类武器。 */
function weaponDamage(def, lv) {
  const cls = weaponClass(def);
  const classBonus = cls === 'melee' ? (player.meleeDmg || 0)
    : cls === 'elem' ? (player.elemDmg || 0) : (player.rangedDmg || 0);
  /* 机制加成（不写进 stats，所以不污染数值面板）：
     锚定射击 = 静止 0.8 秒后 +30%/层；反击电容 = 受伤后 4 秒内 +30%/层 */
  const standBonus = player.standT >= 0.8 ? 0.30 * (player.mechs.standfast || 0) : 0;
  const vendBonus = player.vendettaT > 0 ? 0.30 * (player.mechs.vendetta || 0) : 0;
  return def.dmg(lv) * (player.dmgMul + classBonus) * (1 + standBonus + vendBonus);
}

/** 武器冷却的唯一入口（原来 `def.cd(lv) * player.cdMul` 散落在 7 处 —— 攻击速度必须只在这里生效） */
function weaponCooldown(def, lv) {
  /* 机制：背水一战 —— 生命低于 35% 时攻速 +25%/层 */
  const rageSpd = (player.hp / player.maxHp < 0.35) ? 0.25 * (player.mechs.rage || 0) : 0;
  return def.cd(lv) * player.cdMul / (1 + (player.atkSpd || 0) + rageSpd);
}

/** 武器射程（含射程加成）—— 索敌与弹体寿命都用它，避免两处口径不一致 */
function effectiveRange(def) {
  return def.range * (player.rangeMul || 1);
}

function updateWeapons(dt) {
  for (const w of player.weapons) {
    const def = WEAPONS[w.id];
    const dmg = weaponDamage(def, w.lv);

    /* 追踪弹族（蜂群导弹 / 过载反应堆 / 纳米虫群）：同时多发，锁定最近的敌人 */
    if (def.mode === 'shot') {
      w.t -= dt;
      if (w.t <= 0) {
        const numShots = def.num(w.lv);
        const tgts = nearestEnemies(numShots, effectiveRange(def));   // 按射程索敌：够不着的目标不开火，别浪费这一发
        if (tgts.length) {
          w.t = weaponCooldown(def, w.lv);
          audio.shoot();
          for (let i = 0; i < numShots; i++) {
            const t = tgts[i % tgts.length];
            const a = Math.atan2(t.y - player.y, t.x - player.x) + rand(-def.spread, def.spread);
            fireAllyBullet({
              type: 'dart', x: player.x, y: player.y,
              vx: Math.cos(a) * def.bulletSpeed, vy: Math.sin(a) * def.bulletSpeed,
              r: def.bulletR, dmg, pierce: def.pierce ? def.pierce(w.lv) : 0, hit: new Set(),
              home: def.home || 0, blast: def.blast || 0,
              life: bulletLife(Object.assign({}, def, { range: effectiveRange(def) })), color: def.color, weapon: w.id
            });
          }
        } else w.t = 0.08;
      }
    }

    /* 天基炮：标记落点 → 延迟重击（唯一的延迟打击武器，需要用预判或控场来兑现） */
    else if (def.mode === 'orbital') {
      w.t -= dt;
      if (w.t <= 0) {
        const tgts = nearestEnemies(def.strikes(w.lv), effectiveRange(def));
        if (tgts.length) {
          w.t = weaponCooldown(def, w.lv);
          audio.warn();
          for (const t of tgts) {
            /* 落点按"目标正朝玩家移动"的已知行为做前置于 0.85 秒：既让这一发真的能打中，
               也保留甩开的可能（突袭机会冲刺、狙击机不贴身 -> 都会空）。 */
            const dxp = player.x - t.x, dyp = player.y - t.y;
            const dd = Math.hypot(dxp, dyp) || 1;
            const lead = (t.speed || 0) * def.telegraph;
            /* 场上预警圈上限对己方打击同样生效（旧实现只在天基炮这里漏了检查，
               壁垒者正在放圈时能超过 ZONE.max） */
            if (G.zones.length >= ZONE.max) break;
            G.zones.push({
              x: clamp(t.x + dxp / dd * lead, 20, WORLD.w - 20),
              y: clamp(t.y + dyp / dd * lead, 20, WORLD.h - 20),
              r: def.radius(w.lv), t: def.telegraph, telegraph: def.telegraph, dmg,
              fired: false, life: 0, ally: true, color: def.color, knock: 300
            });
          }
        } else w.t = 0.1;
      }
    }

    /* 近防霰弹：扇形短程爆发 + 强击退 */
    else if (def.mode === 'flak') {
      w.t -= dt;
      if (w.t <= 0) {
        const tgts = nearestEnemies(1, effectiveRange(def));
        if (tgts.length) {
          w.t = weaponCooldown(def, w.lv);
          audio.shoot();
          const t = tgts[0];
          const baseA = Math.atan2(t.y - player.y, t.x - player.x);
          const pellets = def.pellets(w.lv);
          for (let i = 0; i < pellets; i++) {
            const off = (i / Math.max(1, pellets - 1) - 0.5) * def.spread + rand(-0.05, 0.05);
            const a = baseA + off;
            fireAllyBullet({
              type: 'dart', x: player.x, y: player.y,
              vx: Math.cos(a) * def.bulletSpeed, vy: Math.sin(a) * def.bulletSpeed,
              r: def.bulletR, dmg, pierce: 0, hit: new Set(),
              life: bulletLife(Object.assign({}, def, { range: effectiveRange(def) })), color: def.color, weapon: w.id, knock: def.knock
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
        w.t = weaponCooldown(def, w.lv);
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
        const tgts = nearestEnemies(def.num(w.lv), effectiveRange(def));
        if (tgts.length) {
          w.t = weaponCooldown(def, w.lv);
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
          w.t = weaponCooldown(def, w.lv);
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
        const tgts = nearestEnemies(def.num(w.lv), effectiveRange(def));   // 回旋镖：索敌半径 = 射程
        if (tgts.length) {
          w.t = weaponCooldown(def, w.lv);
          for (const t of tgts) {
            fireAllyBullet({
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

/* ==================== 局内进程：段 / 小节 / 事件（0.6.0 阶段 0） ====================
   结构：一局 = RUN.stages 段；一段 = RUN.beatsPerStage 个战斗小节 + 1 个事件；
        每个战斗小节 = RUN.wavePerBeat 个内部波次（3 × 20s = 60 秒）。
   ⚠️ wave 的推进逻辑与语义**完全没动**（见 config: RUN 的注释）——
      这段代码只是把原来的裸波次循环包了一层"小节计数"，并在小节末切换到商店/事件。 */

/** 战斗小节：原 update() 里的波次块，逐字搬过来，末尾加小节推进 */
function updateRun(dt) {
  const cx = G.cam.x + viewW() / 2, cy = G.cam.y + viewH() / 2;

  if (G.phase === 'event') { updateEvent(dt, cx, cy); return; }
  /* 商店态：进程停住。**自愈**：如果该开店却没开（面板被别的流程顶掉了 / 升级面板排到了后面），
     在这里补开一次 —— 否则 phase 永远停在商店态，一局直接卡死（实测过：25 分钟原地空转）。 */
  if (G.phase === 'smallShop' || G.phase === 'bigShop') {
    if (!shopOpen) showShop(G.phase === 'bigShop' ? 'big' : 'small');
    return;
  }

  G.waveTimer += dt;

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
      addText(cx, cy - 150, '⚠ 精英波 3 秒后抵达', PALETTE.elite, 20);
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
    fireMechs('onWaveStart');        // 机制：波开始触发（波次补给等）
    if (G.wave % SPAWN.eliteWaveEvery === 0) addText(cx, cy - 62, '精英波', PALETTE.elite, 20);

    /* ---- 商店调度（阶段 A 重排）----
       小节推进：走满 wavePerBeat 个波就是一个小节 —— 小节末尾要么开事件、要么开小铺。
       小节**之内**再按 RUN.shopEveryWaves 补一次小铺：实测每小节只开一次时一局只有 9 次进店
       （Brotato 是 20 次），而"决策密度"正是靠进店次数撑起来的。
       shopEveryWaves = wavePerBeat 时行为与旧版**完全一致**（可选两种节奏跑数据对比）。 */
    G.shopWavesLeft--;
    if (--G.beatWavesLeft <= 0) {
      G.beatWavesLeft = RUN.wavePerBeat;
      G.beatsLeft--;
      G.shopWavesLeft = ECON.shopEveryWaves;    // 本节最后一次由事件 / 大铺接走
      if (G.beatsLeft <= 0) { startEvent(cx, cy); return; }
      openShop('small');
      return;
    }
    if (G.shopWavesLeft <= 0) { G.shopWavesLeft = ECON.shopEveryWaves; openShop('small'); return; }
  }
  if (G.wave % 5 === 0 && !G.bossSpawned) {
    G.bossSpawned = true;
    spawnBoss();
  } else if (G.wave % SPAWN.eliteWaveEvery === 0 && !G.eliteWaveSpawned) {
    G.eliteWaveSpawned = true;
    /* 质变：精英波规模随波次增长（每 12 波 +1 只）——
       后期真正咬人的是精英的环形弹幕（走保留额度），而不是小怪弹量 */
    const n = SPAWN.eliteWaveCount + Math.floor(Math.max(0, G.wave - 12) / 12);
    for (let i = 0; i < n; i++) spawnEnemy(true);
  }
  spawnAtRate(dt, 1);
}

/** 按当前波次的速率刷怪（事件会传倍率）。原来内联在波次块里，现在两处共用。 */
function spawnAtRate(dt, mul) {
  const rate = SPAWN.rate(G.wave) * SPAWN.ramp(G.t) * mul;
  G.spawnAcc += dt * rate;
  let guard = 0;
  while (G.spawnAcc >= 1 && guard++ < SPAWN.guard) {
    G.spawnAcc -= 1;
    spawnEnemy();
  }
  if (G.spawnAcc > 4) G.spawnAcc = 4;     // 防止长时间暂停后一次性喷一堆
}

/** 事件开场：**复用现有敌人与 Boss**，不新增任何敌人类别（阶段 0 的硬约束） */
function startEvent(cx, cy, forceId) {
  const def = (forceId && EVENTS.find(e => e.id === forceId)) || EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const run = { def, t: 0, charge: 0, targetId: 0, zone: null };
  G.eventRun = run;
  G.phase = 'event';
  G.eventWarned = false;
  G.spawnAcc = 0;                          // 事件从干净的一拍开始，别把上一小节的余量喷出来

  addText(cx, cy - 168, `◆ 事件 · ${def.name}`, '#8FB0CF', 26);
  addText(cx, cy - 130, def.brief, '#8FB0CF', 16);
  audio.bossWarn();
  flash(.2, '143,176,207');

  if (def.id === 'hunt') {
    spawnBoss(def.hpWaveAhead || 0);
    const b = G.enemies[G.enemies.length - 1];
    if (b && b.boss) { run.targetId = b.id; b.evMark = true; }
  } else if (def.id === 'hold') {
    /* 信标投放在离玩家一段距离处：逼你移动过去 —— 否则"站在原地等一下"不是决策。
       位置必须夹进世界内，否则会出现"圈在地图外、永远充不满"的死局。 */
    const a = Math.random() * Math.PI * 2;
    run.zone = {
      x: clamp(player.x + Math.cos(a) * def.offset, 120, WORLD.w - 120),
      y: clamp(player.y + Math.sin(a) * def.offset, 120, WORLD.h - 120),
      r: def.radius
    };
    addText(run.zone.x, run.zone.y - def.radius - 30, '▼ 信标', PALETTE.allyBeam, 20);
  }
}

/** 事件进行中：照常刷怪（否则事件里没有压力），并按事件类型判定成败 */
function updateEvent(dt, cx, cy) {
  const run = G.eventRun;
  if (!run) { G.phase = 'beat'; return; }        // 防御：状态丢了就退回战斗，别把一局卡死
  const def = run.def;
  run.t += dt;
  spawnAtRate(dt, def.rateMul || 1);

  if (def.id === 'hunt') {
    const tgt = G.enemies.find(e => e.id === run.targetId && !e.dead);
    if (!tgt) { endEvent(true, cx, cy); return; }              // 目标没了 = 打死了
    if (run.t >= def.time) {                                    // 超时 = 目标脱离
      const i = G.enemies.indexOf(tgt);
      if (i >= 0) swapRemove(G.enemies, i);
      addText(tgt.x, tgt.y - 40, '目标脱离', PALETTE.enemyBullet, 20);
      endEvent(false, cx, cy);
    }
    return;
  }

  if (def.id === 'hold') {
    const z = run.zone;
    if (Math.hypot(player.x - z.x, player.y - z.y) <= z.r) run.charge += dt;
    if (run.charge >= def.time) { endEvent(true, cx, cy); return; }
    if (run.t >= def.time * def.grace) { endEvent(false, cx, cy); return; }
    return;
  }

  /* surge：只要还活着就是成功（压力本身就是内容） */
  if (run.t >= def.time) endEvent(true, cx, cy);
}

function endEvent(success, cx, cy) {
  const run = G.eventRun;
  G.eventRun = null;
  const def = run ? run.def : { name: '事件' };
  /* 奖励：占位数值 —— A7 的"奖励档位"是阶段 4 的事，
     阶段 0 只要证明成功和失败拿到的东西**确实不一样**。 */
  const gain = success ? RUN.reward.win : RUN.reward.lose;
  gainCredits(gain, 'event');
  /* used = 事件实际花了多久（调"事件难度"就看它：猎杀看几秒打死、据点看充能花了多少，
     全部贴着时限完成 = 事件太软，A7 的奖励档位就没有牙齿） */
  G.eventLog.push({ id: def.id, name: def.name, success, t: Math.round(G.t), used: run ? +run.t.toFixed(1) : 0, gain });

  addText(cx, cy - 168, success ? `◆ ${def.name} · 成功` : `✕ ${def.name} · 失败`,
    success ? PALETTE.elite : PALETTE.enemyBullet, 26);
  addText(cx, cy - 130, `奖励 +${gain} 信用点`, '#FFD166', 18);
  if (success) audio.levelUp(); else audio.hurt();

  openShop('big');
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
  /* 触摸是模拟摇杆：推杆幅度决定速度（下限 0.35 避免"轻碰不动"的粘滞感） */
  let speedScale = 1;
  if (player.touch.active && (player.touch.dx || player.touch.dy)) {
    mx = player.touch.dx; my = player.touch.dy;
    speedScale = clamp(player.touch.mag || 0, 0.35, 1);
  }
  const m = Math.hypot(mx, my);
  const curSpeed = Math.hypot(player.vx, player.vy);
  if (m > 0) { mx /= m; my /= m; }

  // 反向输入（想往速度反方向走）= 刹车，减得更快
  const reversing = m > 0 && curSpeed > 1 && (player.vx * mx + player.vy * my) < 0;
  const targetSpeed = m > 0 ? player.speed * speedScale : 0;
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

  /* 机制层的被动计时（阶段 A3）：
     锚定射击 = 速度接近 0 才算"站住"，一动就重置；反击电容 = 受伤后的增益窗口。 */
  const pSpd = Math.hypot(player.vx, player.vy);
  if (pSpd < 30) player.standT += dt; else player.standT = 0;
  if (player.vendettaT > 0) player.vendettaT = Math.max(0, player.vendettaT - dt);

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

  /* 局内进程：战斗小节 / 事件（把原来的裸波次逻辑收进 updateRun） */
  updateRun(dt);

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
    /* 武器行为分支 #15-①：蜂群导弹 —— 真·追踪（以前卡面写着"追踪导弹"，
       实际和过载反应堆走的是同一条直线弹逻辑，是名不副实）。限制转向速率，不会变成必中。 */
    if (b.weapon === 'dart' && b.home) {
      let best = null, bestD = 1e9;
      forEachNear(b.x, b.y, 300, (e) => {
        if (e.dead) return;
        const dx = e.x - b.x, dy = e.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) { bestD = d2; best = e; }
      });
      if (best) {
        const want = Math.atan2(best.y - b.y, best.x - b.x);
        const cur = Math.atan2(b.vy, b.vx);
        let diff = want - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = clamp(diff, -b.home * dt, b.home * dt);
        const a = cur + turn;
        const spd = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(a) * spd; b.vy = Math.sin(a) * spd;
      }
    }
    let removed = false;
    forEachNear(b.x, b.y, b.r + 24, (e) => {
      if (removed || e.dead || b.hit.has(e.id)) return;
      const dx = e.x - b.x, dy = e.y - b.y;
      if (dx * dx + dy * dy < (e.r + b.r) ** 2) {
        b.hit.add(e.id);
        hurtEnemy(e, b.dmg, b.vx * (b.knock || 0.05), b.vy * (b.knock || 0.05));
        /* 武器行为分支 #15-②：过载反应堆 —— 命中即小范围爆炸（它是"带代价"的装备，
           代价是自损，收益就该是范围伤害，而不是单纯的"数字大一点的直线弹"） */
        if (b.weapon === 'overload' && b.blast) {
          forEachNear(e.x, e.y, b.blast, (o) => {
            if (o.dead || o === e) return;
            const ox = o.x - e.x, oy = o.y - e.y;
            if (ox * ox + oy * oy < b.blast * b.blast) hurtEnemy(o, b.dmg * 0.45, ox * 0.04, oy * 0.04);
          });
          burst(e.x, e.y, b.color, 10, 260);
        }
        /* 武器行为分支 #15-③：纳米虫群 —— 命中附带短暂减速（"虫群啃食"），
           让低伤害高射速的它在控场上也有用处，而不是只有击杀回血 */
        if (b.weapon === 'nanoswarm') { e.slowT = Math.max(e.slowT || 0, 1.1); e.slowMul = 0.55; }
        burst(b.x, b.y, b.color, 5, 200);
        if (b.pierce-- <= 0) { G.bullets.splice(i, 1); removed = true; }
      }
    });
    if (removed) continue;
  }

  /* 敌方单位 */
  /* 狙击机并发预瞄数：每帧统计一次（O(n)）。
     绝不能在每只怪内部再扫一遍 G.enemies —— 那会变成 O(n²)，撞碎"不做全表扫描"的性能契约。 */
  let aimingSnipers = 0;
  for (const en of G.enemies) if (en.type === 'sniper' && en.state === 'aim') aimingSnipers++;
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead) { G.enemies.splice(i, 1); continue; }
    if (e.orbCd > 0) e.orbCd -= dt;
    if (e.flash > 0) e.flash -= dt;

    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    /* 模组：时滞立场 —— 近处的敌人减速 */
    let spd = (player.slowField < 1 && d < 260) ? e.speed * player.slowField : e.speed;
    /* 质变：重装机兵血量低于 35% 后狂暴（第 20 波起）—— 让你不能"打残就走" */
    if (G.wave >= ENEMY_ABILITY.tankRage && e.type === 'tank' && !e.elite && !e.boss) {
      if (!e.raged && e.hp < e.maxHp * 0.35) {
        e.raged = true;
        e.dmg *= 1.5;
        addText(e.x, e.y - 46, '狂暴', '#ff7043', 15);
      }
      if (e.raged) spd *= 1.55;
    }
    /* 武器行为分支 #15-③：纳米虫群的减速（唯一能给敌人上负面状态的武器） */
    if (e.slowT > 0) { e.slowT -= dt; spd *= (e.slowMul || 0.55); }

    /* 精英的威胁升级：周期性环形弹幕（普通怪只会撞人，精英会逼你走位） */
    if (e.elite && !e.boss) {
      e.burstCd = (e.burstCd === undefined ? rand(1.5, ELITE_BURST.every) : e.burstCd) - dt;
      if (e.burstCd <= 0 && d < 620) {
        e.burstCd = ELITE_BURST.every;
        const bdef = SHOOTER_BULLET(G.wave);
        for (let k = 0; k < ELITE_BURST.count; k++) {
          const a = k * Math.PI * 2 / ELITE_BURST.count + G.t;
          fireBullet(e.x, e.y, a, bdef.spd * ELITE_BURST.speedMul, bdef.r, e.dmg * 0.4, 4.5, 'eliteBullet');
        }
      }
    }

    /* Boss 阶段变化（#14）：过线换招 —— 同一个 boss 有三个阶段，越打越凶 */
    if (e.boss && e.phase < BOSS_PHASE.length && e.hp / e.maxHp <= BOSS_PHASE[e.phase].at) {
      const ph = BOSS_PHASE[e.phase];
      e.phase++;
      e.speed *= ph.spd;
      e.cdMul = ph.cd;
      addText(e.x, e.y - 70, ph.label, '#ff9f1c', 22);
      flash(.3, '255,159,28');
      shake = Math.max(shake, 14);
      hitStop = Math.max(hitStop, 0.06);
      /* 变身同时放一圈弹幕：阶段转换本身要有威胁，而不是白送一段硬直 */
      const pb = SHOOTER_BULLET(G.wave);
      const pn = 12;
      for (let k = 0; k < pn; k++) {
        fireBullet(e.x, e.y, k * Math.PI * 2 / pn + G.t, pb.spd * 1.15, pb.r + 1, e.dmg * 0.5, 6, 'bossBullet');
      }
    }

    /* 相位者：追击 → 相位锁定 → 瞬移贴身 + 环形弹幕 → 虚弱。
       阶段专属新招：阶段 2 起"离开时留下封锁圈"，阶段 3 起改为双段瞬移（连甩两次）。 */
    if (e.boss && e.variant === 'phantom') {
      e.stateTime -= dt;
      const fireRing = (n) => {
        const pb = SHOOTER_BULLET(G.wave);
        for (let k = 0; k < n; k++) {
          fireBullet(e.x, e.y, k * Math.PI * 2 / n + G.t, pb.spd * 1.2, pb.r + 1, e.dmg * 0.55, 6, 'bossBullet');
        }
      };
      if (e.state === 'chase') {
        e.x += dx / d * spd * dt;
        e.y += dy / d * spd * dt;
        if (e.stateTime <= 0) { e.state = 'blink_prep'; e.stateTime = BLINK.prep; addText(e.x, e.y - 56, '相位锁定...', '#c084fc', 18); }
      } else if (e.state === 'blink_prep') {
        if (e.stateTime <= 0) {
          const oldX = e.x, oldY = e.y;
          const a = rand(0, Math.PI * 2);
          e.x = clamp(player.x + Math.cos(a) * BLINK.dist, 40, WORLD.w - 40);
          e.y = clamp(player.y + Math.sin(a) * BLINK.dist, 40, WORLD.h - 40);
          burst(oldX, oldY, '#c084fc', 22, 320);
          burst(e.x, e.y, '#c084fc', 22, 320);
          /* 阶段 2 起：离开的位置留下封锁圈（新招式，不是数值上浮） */
          if (e.phase >= 1 && G.zones.length < ZONE.max) spawnZones(oldX, oldY, 1, e.dmg * ZONE.dmgMul);
          fireRing(e.phase >= 1 ? BLINK.ringPhase2 : BLINK.ring);
          shake = Math.max(shake, 10);
          /* 阶段 3 起：双段瞬移 */
          if (e.phase >= 2) { e.state = 'blink_prep'; e.stateTime = 0.35; }
          else { e.state = 'stunned'; e.stateTime = BLINK.stun; e.vulnMul = 2.2; }
        }
      } else if (e.state === 'stunned') {
        if (e.stateTime <= 0) { e.state = 'chase'; e.stateTime = 2.4 * e.cdMul; e.vulnMul = 1; }
      }
    }
    /* 旋翼者：追击 → 蓄能 → 螺旋弹幕（持续 3 秒，边转边射）→ 虚弱 */
    if (e.boss && e.variant === 'spinner') {
      e.stateTime -= dt;
      if (e.state === 'chase') {
        e.x += dx / d * spd * dt;
        e.y += dy / d * spd * dt;
        if (e.stateTime <= 0) { e.state = 'prep'; e.stateTime = 0.8; addText(e.x, e.y - 56, '旋翼启动...', PALETTE.bossRim, 18); }
      } else if (e.state === 'prep') {
        e.x += dx / d * spd * 0.25 * dt;
        e.y += dy / d * spd * 0.25 * dt;
        if (e.stateTime <= 0) { e.state = 'spiral'; e.stateTime = 3.0; e.spiralA = Math.atan2(dy, dx); }
      } else if (e.state === 'spiral') {
        /* 三臂螺旋：每 0.1 秒推一轮，方向持续旋转 —— 应对方式是"绕圈跑"，不是站桩躲 */
        e.spiralA += dt * 2.2;
        e.spiralShot = (e.spiralShot || 0) - dt;
        if (e.spiralShot <= 0) {
          e.spiralShot = 0.1;
          const bdef = SHOOTER_BULLET(G.wave);
          for (let k = 0; k < 3; k++) {
            fireBullet(e.x, e.y, e.spiralA + k * Math.PI * 2 / 3, bdef.spd * 1.25, bdef.r, e.dmg * 0.35, 5, 'bossBullet');
          }
        }
        if (e.stateTime <= 0) { e.state = 'stunned'; e.stateTime = 1.0; e.vulnMul = 2.0; }
      } else if (e.state === 'stunned') {
        if (e.stateTime <= 0) { e.state = 'chase'; e.stateTime = 2.6 * e.cdMul; e.vulnMul = 1; }
      }
    }
    /* 壁垒者：追击 → 区域封锁（在玩家周围落 3 个预警圈）→ 突进 → 瘫痪 */
    else if (e.boss && e.variant === 'juggernaut') {
      e.stateTime -= dt;
      if (e.state === 'chase') {
        e.x += dx / d * spd * dt;
        e.y += dy / d * spd * dt;
        if (e.stateTime <= 0) { e.state = 'slam'; e.stateTime = 0.9; addText(e.x, e.y - 60, '封锁部署...', '#f06595', 18); }
      } else if (e.state === 'slam') {
        e.x += dx / d * spd * 0.2 * dt;
        e.y += dy / d * spd * 0.2 * dt;
        if (e.stateTime <= 0) {
          spawnZones(player.x, player.y, 3, e.dmg * ZONE.dmgMul);
          e.state = 'charge_prep'; e.stateTime = 0.7;
          e.chargeAngle = Math.atan2(dy, dx);
        }
      } else if (e.state === 'charge_prep') {
        e.x += dx / d * spd * 0.15 * dt;
        e.y += dy / d * spd * 0.15 * dt;
        if (e.stateTime <= 0) {
          e.state = 'charging'; e.stateTime = 1.1;
          e.chargeVx = Math.cos(e.chargeAngle) * 820;
          e.chargeVy = Math.sin(e.chargeAngle) * 820;
          shake = Math.max(shake, 10);
        }
      } else if (e.state === 'charging') {
        e.x += e.chargeVx * dt; e.y += e.chargeVy * dt;
        if (e.stateTime <= 0) { e.state = 'stunned'; e.stateTime = 1.3; e.vulnMul = 2.4; }
      } else if (e.state === 'stunned') {
        if (e.stateTime <= 0) { e.state = 'chase'; e.stateTime = 3.0 * e.cdMul; e.vulnMul = 1; }
      }
    }
    /* 陨级单位状态机 */
    else if (e.boss && e.variant === 'summoner') {
      /* 裂空者：追击 → 蓄能 → 环形弹幕 → 召唤无人机 → 虚弱 */
      e.stateTime -= dt;

      if (e.state === 'chase') {
        e.x += dx / d * spd * dt;
        e.y += dy / d * spd * dt;
        if (e.stateTime <= 0) { e.state = 'prep'; e.stateTime = 0.9; addText(e.x, e.y - 56, '蓄能...', PALETTE.bossRim, 18); }
      } else if (e.state === 'prep') {
        e.x += dx / d * spd * 0.2 * dt;
        e.y += dy / d * spd * 0.2 * dt;
        if (e.stateTime <= 0) {
          const n = 16;
          const bdef = SHOOTER_BULLET(G.wave);
          for (let k = 0; k < n; k++) {
            const a = k * Math.PI * 2 / n + G.t;
            fireBullet(e.x, e.y, a, bdef.spd * 1.1, bdef.r + 1, e.dmg * 0.6, 6, 'bossBullet');
          }
          shake = Math.max(shake, 12);
          flash(.18, '192,132,252');
          e.state = 'summon'; e.stateTime = 0.7;
        }
      } else if (e.state === 'summon') {
        if (e.stateTime <= 0) {
          /* 阶段专属新招：阶段 2 起召唤数量翻倍，阶段 3 起召唤物直接是精英 */
          const cnt = e.phase >= 1 ? 8 : 4;
          for (let k = 0; k < cnt; k++) {
            const a = k * Math.PI * 2 / cnt;
            const child = buildEnemy('fast', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, G.wave);
            if (e.phase >= 2) makeElite(child, G.wave);
            G.enemies.push(child);
          }
          burst(e.x, e.y, PALETTE.bossRim, 20, 320);
          e.state = 'stunned'; e.stateTime = 1.2; e.vulnMul = 2.2;   // 召唤后短暂虚弱
        }
      } else if (e.state === 'stunned') {
        /* 乘 cdMul：否则阶段变化里的"冷却缩短"对裂空者完全不生效（图鉴核对时发现） */
        if (e.stateTime <= 0) { e.state = 'chase'; e.stateTime = 3.2 * e.cdMul; e.vulnMul = 1; }
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
          /* 阶段专属新招：阶段 2 起，撞停的同时向四周甩一圈弹幕（惩罚"贴脸看戏"） */
          if (e.phase >= 1) {
            const pb = SHOOTER_BULLET(G.wave);
            const n = e.phase >= 2 ? 14 : 9;
            for (let k = 0; k < n; k++) {
              fireBullet(e.x, e.y, k * Math.PI * 2 / n + G.t, pb.spd * 1.1, pb.r, e.dmg * 0.5, 5.5, 'bossBullet');
            }
          }
        }
      }
      else if (e.state === 'stunned') {
        if (e.stateTime <= 0) {
          e.state = 'chase';
          e.stateTime = 3.0 * e.cdMul;   // 同上：阶段缩短冷却必须真的生效
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
        if (e.dashTimer <= 0) {
          e.isDashing = false;
          /* 质变：第 18 波起冲刺变两段（第一段结束 0.3 秒后接第二段，且第二段更快） */
          if (G.wave >= ENEMY_ABILITY.triangleDouble && !e.dashChained) {
            e.dashChained = true;
            e.dashCd = 0.3;
            e.dashSpd = 620;
          }
        }
      } else {
        e.dashCd -= dt;
        if (e.dashCd <= 0 && d < 400) {
          e.isDashing = true;
          e.dashTimer = 0.35;
          e.dashCd = rand(1.4, 2.4);
          const ds = e.dashSpd || 480;      // 二段冲刺更快（质变），普通冲刺维持 480
          e.dashSpd = 480;
          e.dashVx = dx / d * ds;
          e.dashVy = dy / d * ds;
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
        /* 扇形弹走"弹数换射速"：团更密（更好读、更难穿），但每秒弹量不涨 */
        const fan = G.wave >= ENEMY_ABILITY.shooterFan;
        const fast = G.wave >= ENEMY_ABILITY.shooterFast;
        e.shootCd = fan ? (fast ? 2.4 : 3.2) : (fast ? 1.4 : 1.8);
        const base = Math.atan2(dy, dx);
        if (fan) {
          const n = G.wave >= ENEMY_ABILITY.shooterFan5 ? 5 : 3;
          const step = 0.11;
          for (let k = 0; k < n; k++) {
            fireBullet(e.x, e.y, base + (k - (n - 1) / 2) * step, b.spd, b.r, b.dmg, b.life);
          }
        } else {
          fireBullet(e.x, e.y, base, b.spd, b.r, b.dmg, b.life);
        }
      }
    }
    /* 狙击机：保持距离 → 预警激光（先亮线再开火） */
    else if (e.type === 'sniper') {
      const keep = 420;
      if (d < keep - 60) { e.x -= dx / d * spd * dt; e.y -= dy / d * spd * dt; }
      else if (d > keep + 80) { e.x += dx / d * spd * dt; e.y += dy / d * spd * dt; }
      if (e.state === 'aim') {
        e.stateTime -= dt;
        /* 预警期间缓慢锁定：射线角度追着玩家转，但转得比玩家跑得慢 —— 所以能靠横移甩开 */
        const want = Math.atan2(dy, dx);
        let diff = want - e.aimAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        e.aimAngle += clamp(diff, -2.2 * dt, 2.2 * dt);
        e.charge = 1 - Math.max(0, e.stateTime) / LASER.charge;
        if (e.stateTime <= 0) {
          /* 开火：射线起点是敌人、方向是锁定后的角度（不是开火瞬间的玩家位置，否则等于必然命中） */
          const ex = Math.cos(e.aimAngle), ey = Math.sin(e.aimAngle);
          if (G.beams.length < LASER.maxBeams) {
            G.beams.push({ x: e.x, y: e.y, angle: e.aimAngle, len: LASER.range, life: 0.18, maxLife: 0.18, color: LASER.color, thin: true });
          }
          /* 命中判定：玩家中心到射线的垂距 < 判定半宽，且投影在射程内 */
          const rx = player.x - e.x, ry = player.y - e.y;
          const proj = rx * ex + ry * ey;
          const perp = Math.abs(rx * -ey + ry * ex);
          if (proj > 0 && proj < LASER.range && perp < LASER.width + player.r) {
            damagePlayer(e.dmg * LASER.dmgMul, 'laser');
            flash(.2, '255,59,48');
          }
          burst(e.x, e.y, LASER.color, 8, 200);
          e.state = 'idle'; e.stateTime = LASER.cd * e.cdMul;
        }
      } else {
        e.stateTime -= dt;
        /* 并发上限：同时预瞄的狙击机不超过 LASER.maxAim 台 —— 公平性来自"玩家能看完所有预警" */
        if (e.stateTime <= 0 && d < LASER.range * 0.9 && aimingSnipers < LASER.maxAim) {
          e.state = 'aim'; e.stateTime = LASER.charge; e.charge = 0;
          e.aimAngle = Math.atan2(dy, dx);
          audio.warn();          // 听觉预警：和视觉预警同时给（可读性 > 惊喜）
        }
      }
    }
    /* 其余：直线追踪 + 包夹（#12）—— 每只怪一个固定的侧向偏置，
       远距离时向两翼展开，避免所有怪挤在同一条直线上（那样看起来是一坨、也不构成包围） */
    else {
      if (e.flank === undefined) e.flank = rand(-1, 1);
      /* 受击撤退（#12）：残血后撤 1.2 秒再回来（一生一次）—— 让"打残"不是纯粹的好事，
         也给穿透/连锁武器留出"追着打"的空间 */
      if (e.fleeT === undefined && e.hp < e.maxHp * 0.25 && e.type !== 'tank') {
        e.fleeT = 1.2;
        if (Math.random() < 0.25) addText(e.x, e.y - 34, '撤退', '#9aa5b1', 13);
      }
      if (e.fleeT > 0) {
        e.fleeT -= dt;
        e.x -= dx / d * spd * 1.25 * dt;
        e.y -= dy / d * spd * 1.25 * dt;
      } else {
        const lat = d > 190 ? 0.55 * e.flank : 0;
        e.x += (dx / d * spd - dy / d * spd * lat) * dt;
        e.y += (dy / d * spd + dx / d * spd * lat) * dt;
      }
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
      damagePlayer(b.dmg, b.src || 'bullet');
      burst(b.x, b.y, b.color, 6, 180);
      G.enemyBullets.splice(i, 1);
    }
  }

  /* 区域封锁：先画预警圈（telegraph），到点爆炸；圈内玩家吃伤害 + 击退 */
  for (let i = G.zones.length - 1; i >= 0; i--) {
    const z = G.zones[i];
    if (!z.fired) {
      z.t -= dt;
      if (z.t <= 0) {
        z.fired = true; z.life = ZONE.life;
        if (z.ally) {
          /* 天基炮：己方打击 —— 只伤敌人，并给一发强击退（砸下去得有"重锤"的物理感） */
          forEachNear(z.x, z.y, z.r + 24, (e) => {
            if (e.dead) return;
            const ex = e.x - z.x, ey = e.y - z.y;
            const ed = Math.hypot(ex, ey) || 1;
            if (ed < z.r + e.r) hurtEnemy(e, z.dmg, ex / ed * z.knock, ey / ed * z.knock);
          });
          burst(z.x, z.y, z.color, 34, 520);
          shake = Math.max(shake, 12);
          flash(.14, '255,209,102');
          G.rings.push({ x: z.x, y: z.y, r: z.r * 0.4, max: z.r * 1.6, age: 0, life: 0.38, color: z.color });
        } else {
          const dx = player.x - z.x, dy = player.y - z.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < z.r + player.r) {
            damagePlayer(z.dmg, 'zone');
            player.vx += dx / d * 260; player.vy += dy / d * 260;    // 炸飞，给一个"被推走"的反馈
          }
          burst(z.x, z.y, '#f06595', 26, 380);
          shake = Math.max(shake, 9);
          flash(.16, '240,101,149');
        }
      }
    } else {
      z.life -= dt;
      if (z.life <= 0) G.zones.splice(i, 1);
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
    /* 碎片**一份两用**（阶段 A）：同时给经验与信用点 —— 见 config: ORB_CREDIT_PER_EXP。
       信用点按小数累加、取整发放，避免"每颗碎片都向上取整"把收入放大成失控。 */
    if (d < player.r + ORB_ABSORB_PAD) {
      G.orbs.splice(i, 1);
      gainExp(o.val);
      G.orbsCollected++; G.expFromOrbs += o.val;
      G.creditAcc += o.val * ECON.orbPerExp;
      const credit = Math.floor(G.creditAcc);
      if (credit > 0) { G.creditAcc -= credit; gainCredits(credit, 'orb'); }
      audio.pickup();
    }
  }

  /* 残片上限：超出时把最远的那批「价值并入」最后一颗，而不是删掉 ——
     删掉等于静默销毁经验（表现就是"等级涨得莫名慢"，玩家查不出原因）。 */
  if (G.orbs.length > ORB_MAX) {
    G.orbs.sort((a, b) => dist2(b, player) - dist2(a, player));
    const keep = G.orbs[ORB_MAX - 1];
    for (let i = ORB_MAX; i < G.orbs.length; i++) keep.val += G.orbs[i].val;
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
  setText(elCredit, 'credit', Math.round(player.credits));
  /* 触摸版补给按钮：数字实时更新 + 买得起时高亮（否则玩家不知道什么时候该去开商店） */
  if (elShopCredits) {
    setText(elShopCredits, 'shopcr', Math.round(player.credits));
    const ready = player.credits >= 25;
    if (elShopBtn._ready !== ready) { elShopBtn._ready = ready; elShopBtn.classList.toggle('ready', ready); }
  }

  /* 波次预告：让压力可预期（"随机的困难让玩家焦虑，可预期的困难让玩家投入"）。
     事件期间波次计时是冻结的（updateRun 直接转 updateEvent）—— 那时候还显示倒计时会骗人，
     改成显示事件名，把"还剩多久"交给下面那行事件进度。 */
  const inEvent = G.phase === 'event' && !!G.eventRun;
  let evWarn = false;
  if (inEvent) {
    const run = G.eventRun, def = run.def;
    setText(elNext, 'next', `事件 · ${def.name}`);
    if (def.id === 'hold') {
      const z = run.zone;
      const inZone = z && Math.hypot(player.x - z.x, player.y - z.y) <= z.r;
      setText(elEvent, 'ev', `充能 ${run.charge.toFixed(0)}/${def.time}s` + (inZone ? '' : ' · 回到信标'));
      evWarn = !inZone || (def.time - run.charge) <= 6;
    } else {
      const left = Math.max(1, Math.ceil(def.time - run.t));
      setText(elEvent, 'ev', `剩余 ${left}s`);
      evWarn = left <= 10;
    }
  } else {
    const left = Math.max(1, Math.ceil(WAVE_LEN - G.waveTimer));
    const nextWave = G.wave + 1;
    const nextIsBoss = nextWave % 5 === 0;
    const nextIsElite = !nextIsBoss && nextWave % SPAWN.eliteWaveEvery === 0;
    setText(elNext, 'next', `下一波 ${nextIsBoss ? '陨级 · ' : nextIsElite ? '精英 · ' : ''}${left}s`);
    evWarn = nextIsBoss || nextIsElite;
    setText(elEvent, 'ev', '');
  }
  setFlag(elNext, 'nextWarn', evWarn);
  setFlag(elEvent, 'evWarn', evWarn);
  /* 事件行无内容时收起来，避免顶部正中多出一条空行（playfield first：中上区域不养赘肉） */
  if (elEvent._evOn !== inEvent) { elEvent._evOn = inEvent; elEvent.classList.toggle('hidden', !inEvent); }
  setText(elZoom, 'zoom', zoomTarget.toFixed(1) + '×');

  /* 构筑一览：内容变了才重写 DOM */
  const key = player.weapons.map(w => w.id + w.tier).join(',') + '|' + Object.keys(player.mods).join(',');
  if (key !== loadoutKey) {
    loadoutKey = key;
    loadoutEl.innerHTML =
      player.weapons.map(w => `<span title="${WEAPONS[w.id].name} · 射程 ${weaponRange(w.id, w.lv)}">${iconFor(w.id, WEAPONS[w.id].color, WEAPONS[w.id].icon)}<i>${weaponTierName(w.tier)}</i></span>`).join('') +
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
  autoQuality(dt);
}

/* ==================== 画质自动降级 ====================
   手机 GPU 跑满屏 bloom 是常态瓶颈（桌面测 p50 9ms，中端手机可能是 3 倍）。
   策略：连续 2 秒平均帧时间超过 24ms（约 42fps）就逐级降：bloom → backdrop → vignette。
   只降不升（不来回抖），并且玩家在暂停面板里手动选过画质就不再自动干预 —— 
   自动降级是为了"能玩"，不是为了替玩家做审美决定。 */
const FX_KEY = 'starfall.fx.v1';
let fxUserSet = false;
let fqAcc = 0, fqN = 0;
const QUALITY = { high: { bloom: true, backdrop: true, vignette: true }, mid: { bloom: false, backdrop: true, vignette: true }, low: { bloom: false, backdrop: false, vignette: false } };

function applyQuality(level) {
  const q = QUALITY[level] || QUALITY.high;
  Object.assign(fx, q);
}

function loadQuality() {
  try {
    const v = localStorage.getItem(FX_KEY);
    if (v && QUALITY[v]) { applyQuality(v); fxUserSet = true; return v; }
  } catch { /* 隐私模式忽略 */ }
  return 'high';
}
function setQuality(level, byUser) {
  if (!QUALITY[level]) return;
  applyQuality(level);
  if (byUser) {
    fxUserSet = true;
    try { localStorage.setItem(FX_KEY, level); } catch { /* 隐私模式忽略 */ }
  }
  qualityLevel = level;
  if (typeof syncQualityChips === 'function') syncQualityChips();
}
let qualityLevel = 'high';

function autoQuality(dt) {
  if (fxUserSet || G.over) return;
  fqAcc += dt; fqN++;
  if (fqAcc < 2) return;
  const avg = fqAcc / Math.max(1, fqN);
  fqAcc = 0; fqN = 0;
  if (avg > 0.024) {
    if (qualityLevel === 'high') { setQuality('mid', false); addText(player.x, player.y - 60, '帧率不足 · 已关闭辉光', '#ffb020', 16); }
    else if (qualityLevel === 'mid') { setQuality('low', false); addText(player.x, player.y - 60, '帧率不足 · 已切到最低画质', '#ffb020', 16); }
  }
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
    /* 友方弹体：当前 / 本局峰值 / 被上限丢掉的总发数（上限是 MAX_ALLY_BULLET=600）。
       dropped 一旦不为 0，说明护栏咬住了真实构筑 —— 要么调高上限，要么查构筑为什么失控。 */
    allyBullets: G.bullets.length,
    allyBulletPeak: G.allyBulletPeak,
    allyBulletDropped: G.allyBulletDropped,
    weapons: player.weapons.map(w => w.id + weaponTierName(w.tier)).join(' '),
    over: G.over,
    /* 局内进程（0.6.0 阶段 0）：sim 验证"事件有没有真的发生、有没有成功/失败"靠这几个字段 */
    phase: G.phase,
    stage: G.stage,
    beatsLeft: G.beatsLeft,
    event: G.eventRun ? G.eventRun.def.id : null,
    events: G.eventLog.map(e => `${e.name}:${e.success ? 'S' : 'F'}@${e.t}`).join(' '),
    eventWin: G.eventLog.filter(e => e.success).length,
    eventLose: G.eventLog.filter(e => !e.success).length,
    /* 经济（0.6.0 阶段 A）：一局的钱从哪来、够不够花。判据就是这几个数 ——
       squeezed/shopVisits ≥ 40%、shopBuys 中位数 ≥ 8（跑 20 局看分布，不看单局）。 */
    credits: Math.round(player.credits),
    creditsEarned: Math.round(G.creditsEarned),
    creditMix: ['orb', 'elite', 'boss', 'event'].map(k => `${k}${Math.round(G.creditsBySource[k] || 0)}`).join('/'),
    orbsCollected: G.orbsCollected,
    expFromOrbs: Math.round(G.expFromOrbs),
    shopVisits: G.shopVisits,
    shopTight: G.shopVisitsSqueezed,
    shopBroke: G.shopVisitsBroke,
    shopAvgAfford: G.shopVisits ? +(G.shopAffordTotal / G.shopVisits).toFixed(1) : 0,
    shopBuys: G.shopBuys,
    shopSpent: G.shopSpent,
    /* 机制层（阶段 A3）：带机制的商品必须在 sim 里**真的触发过** —— 否则它等于没做 */
    mechs: Object.keys(player.mechs || {}).join(',') || '-',
    weaponSrc: Object.keys(G.weaponBySource).map(k => `${k}${G.weaponBySource[k]}`).join('/') || '-',
    mechBlasts: G.mechBlasts
  };
}

/** 自动走位机器人：12 方向势场，选「前方敌人最少 + 顺路捡碎片 + 不撞墙」的方向（合格的风筝走位） */
function botStep() {
  const DIRS = 12;
  const PROBE = 260;
  /* 顺路捡碎片：真人不会放着经验不捡，但也不会为了捡碎片往敌群里钻 ——
     所以这项加分单独算、且封顶（封顶值 < 单个 boss 的威胁权重），危险方向仍然优先躲。 */
  const ORB_SIGHT = 700, ORB_BONUS_CAP = 2.2;
  const orbScore = new Array(DIRS).fill(0);
  for (const o of G.orbs) {
    const rx = o.x - player.x, ry = o.y - player.y;
    const dist = Math.hypot(rx, ry);
    if (dist > ORB_SIGHT) continue;
    const idx = ((Math.round(Math.atan2(ry, rx) / (Math.PI * 2 / DIRS)) % DIRS) + DIRS) % DIRS;
    orbScore[idx] += (1 - dist / ORB_SIGHT) * 1.6;
  }
  let bestScore = -Infinity, bx = 0, by = 1;
  /* 事件目标：机器人必须知道"这一小节/事件要干什么"，否则 sim 一行都测不出来
     （它的势场只有"躲敌人 + 捡残片"，看不懂"去圈里"）。
     反过来说：如果得教机器人才玩得动，说明事件确实是真决策，不是装饰。 */
  let goal = null;
  if (G.phase === 'event' && G.eventRun) {
    const run = G.eventRun;
    if (run.def.id === 'hold' && run.zone) {
      const d = Math.hypot(run.zone.x - player.x, run.zone.y - player.y);
      if (d > run.zone.r * 0.55) goal = { x: run.zone.x, y: run.zone.y, w: 3.4 };
    }
    /* hunt 不需要"追"：武器射程 620 且 Boss 会主动贴上来 —— 追上去等于送死。
       机器人只要活着，火力自然会把目标清掉。surge 同理（顶住就是全部策略）。 */
  }
  for (let i = 0; i < DIRS; i++) {
    const a = i * Math.PI * 2 / DIRS;
    const dx = Math.cos(a), dy = Math.sin(a);
    let score = Math.random() * 0.05;                 // 加一点抖动，避免两方向等分时抖动卡死
    score += Math.min(ORB_BONUS_CAP, orbScore[i]);
    if (goal) {
      const gx = goal.x - player.x, gy = goal.y - player.y;
      const gd = Math.hypot(gx, gy) || 1;
      score += goal.w * ((gx / gd) * dx + (gy / gd) * dy);   // 越朝目标方向加分越多
    }
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

/** 生存向属性卡：机器人判断"该补防御了吗"时用（与 config 的 STATS id 对应） */
const DEF_STATS = new Set(['hp', 'hpPct', 'armor', 'heal', 'vamp']);

/** 模拟用「像人一样选」的策略：优先新武器 → 升最弱的武器 → 属性 → 模组 */
function smartPick(opts) {
  const score = (o) => {
    switch (o.kind) {
      case 'module': return 120;
      case 'slot': {
        // 槽位：武器还少的时候价值高（合成与吃属性的空间都在槽位上）
        return player.weapons.length >= RUN.weaponSlots + (player.slotUp || 0) ? 85 : 45;
      }
      case 'stat': {
        /* 像人一样地买生存：血量/减伤明显落后时优先买防御卡。
           原策略永远不买（属性恒 60 分 < 武器 90 分），于是测出一堆
           "24 级还是 150 血 / 0 减伤"的假早死 —— 那是机器人不会玩，不是游戏问题。 */
        const lag = player.maxHp < 260 || player.dr < 0.2;
        if (lag && player.level > 12 && DEF_STATS.has(o.iid)) return 95;
        return 60;
      }
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
 * 会自动把装备终端选掉、把补给终端关掉，避免卡在暂停。
 * @param {number} seconds 模拟多少游戏秒
 * @param {{bot?:boolean, pick?:'random'|'first'|'smart', step?:number, shop?:boolean}} opts
 */
function sim(seconds, opts) {
  const o = Object.assign({ bot: botOn, pick: 'smart', step: 1 / 60 }, opts || {});
  const steps = Math.min(Math.round(seconds / o.step), 60 * 60 * 60);
  for (let i = 0; i < steps; i++) {
    if (G.over) break;
    /* 补给终端（0.6.0 阶段 0 新增）：不处理的话下面 `G.paused && !currentOptions` 会直接 break，
       模拟会在第一次进店时就停住 —— 而商店现在一局要进 12 次。 */
    if (panelMode === 'shop') {
      /* 像人一样买：**买得起就继续买**，直到买不动或本店没得买为止。
          旧版只买一件就关店 —— 于是"一局购买次数"被机器人限制在"进店次数"上，
          测不出经济到底松不松（阶段 A 的判据全靠这个数）。上限 8 件防死循环。 */
      if (o.shop !== false) {
        for (let k = 0; k < 8; k++) {
          if (panelMode !== 'shop') break;              // '数据注入' 会自己关店去弹升级面板
          const it = shopStock.find(x => canBuy(x));
          if (!it) break;
          if (!buyItem(it)) break;
        }
      }
      if (panelMode === 'shop') closeShop();   // '数据注入' 会自己关店去弹升级面板，别重复关
      continue;
    }
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
loadQuality();
booted = true;
syncOrientation();
/* 首次进入（或刷新后）先选机体：直接把玩家丢进战场会让新玩家不知道自己在开什么 */
showShipSelect(true);

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
  /** 调试用：直接给经验（可指定目标等级），用于快速验证升级卡池构成 */
  grantExp(n = 1) { gainExp(Math.max(1, Math.round(n * expNeed(player.level)))); return player.level; },
  /** 调试用：当前这一次升级面板里的候选卡（名称 + 类型），用于验证卡池构成与保底 */
  get options() { return currentOptions ? currentOptions.map(o => o.name + ':' + o.kind) : null; },
  get pausedManual() { return pausedManual; },
  /** 镜头高度：zoom<1 拉高（看得更远），>1 推近。setZoom 会写 localStorage */
  get zoom() { return zoom; },
  get zoomTarget() { return zoomTarget; },
  get viewSize() { return { w: viewW(), h: viewH() }; },
  setZoom,
  nudgeZoom,
  bot(on) { botOn = !!on; return botOn; },
  get botOn() { return botOn; },
  /** 经济调参（阶段 A）：`__game.setEcon({ orbPerExp: 1/90, shopEveryWaves: 2 })` 后可重跑 sim 扫参数 */
  setEcon(o) {
    if (o) {
      if (typeof o.orbPerExp === 'number') ECON.orbPerExp = o.orbPerExp;
      if (typeof o.shopEveryWaves === 'number') ECON.shopEveryWaves = o.shopEveryWaves;
    }
    return { ...ECON };
  },
  get econ() { return { ...ECON }; },
  /** 调试用：松开所有输入。**换代机器人之前必须调** —— botStep 是直接写 keys 的，
      关掉机器人不会把上一帧写进去的方向键清掉，玩家会自己一直走（实测：截图时角色飘出 800px）。 */
  releaseInput,
  /** 局外存档（#17）：查看/调整元进度（改完调 saveMeta 才会落盘） */
  get meta() { return meta; },
  saveMeta,
  metaReward,
  /** 局内商店（#16）：B 键等价入口（与按键同样遵守"升级面板待选时不覆盖"） */
  openShop() { if (G.over || currentOptions) return false; shopOpen = true; showShop('big'); return true; },
  closeShop,
  /** 调试用：立刻开始一个事件（`__game.startEvent('hold')`），用于验证事件 HUD / 圈绘制 */
  startEvent(id) {
    if (G.over || G.eventRun) return false;
    startEvent(G.cam.x + viewW() / 2, G.cam.y + viewH() / 2, id);
    return true;
  },
  /** 调试用：局内进程结构（段 / 小节 / 事件）—— sim 验证靠它 */
  get run() {
    return {
      phase: G.phase, stage: G.stage, beatsLeft: G.beatsLeft, beatWavesLeft: G.beatWavesLeft,
      event: G.eventRun ? {
        id: G.eventRun.def.id, name: G.eventRun.def.name,
        t: +G.eventRun.t.toFixed(1), charge: +G.eventRun.charge.toFixed(1),
        targetId: G.eventRun.targetId, zone: G.eventRun.zone
      } : null,
      log: G.eventLog
    };
  },
  get ship() { return shipId; },
  setShip(id) { if (!SHIPS.some(s => s.id === id)) return shipId; shipId = id; try { localStorage.setItem(SHIP_KEY, id); } catch (e) { } restart(); return shipId; },
  showShipSelect,
  /** 画面特效开关（bloom / backdrop / vignette），控制台里可实时改 */
  fx,
  /** 画质档位（high/mid/low）：手机端会自动降级，玩家手动选过就不再自动干预 */
  get quality() { return qualityLevel; },
  setQuality(lv) { setQuality(lv, true); return qualityLevel; },
  get isTouch() { return IS_TOUCH; },
  /** 反馈：查看当前会生成的邮件链接（自检用，不会触发发送） */
  get feedbackMail() { return feedbackMailUrl(); },
};
