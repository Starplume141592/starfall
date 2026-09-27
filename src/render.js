// 劫波 · 渲染层 —— 只负责画，不改任何状态
// 画法与单文件 Demo 完全一致（深色霓虹科幻），此处只做搬运与参数化。
import { WEAPONS, WORLD, ORB, ELITE, PALETTE } from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

/** 正多边形路径（几何体组合的基本笔刷） */
function poly(ctx, x, y, r, n, rot) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + i * Math.PI * 2 / n;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/* 视觉整体收缩系数：实体半径在 config 里收，发光/飘字在这里统一收，避免改几十处调用点 */
const GLOW_K = 0.68;
const TEXT_K = 0.78;

/* 发光贴图缓存：同色同尺寸只生成一次 */
const glowCache = {};
function getGlow(color, size) {
  const key = color + '|' + size;
  if (glowCache[key]) return glowCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const cx = c.getContext('2d');
  const g = cx.createRadialGradient(size, size, 0, size, size, size);
  /* 光心用"提亮后的本色"而不是纯白：光心写死白色的话，凡是画过光晕的东西
     峰值亮度都会顶到 ~240，调色板的威胁分带当场失效（实测：经验碎片、敌方弹幕、小兵全糊成一档）。
     纯白只留给玩家核心与敌方弹幕核心。 */
  g.addColorStop(0, color[0] === '#' ? mixHex(color, 'w', 0.35) : color);
  g.addColorStop(0.4, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = g;
  cx.beginPath(); cx.arc(size, size, size, 0, Math.PI * 2); cx.fill();
  glowCache[key] = c;
  return c;
}
function drawGlow(ctx, x, y, color, size, alpha) {
  const s = Math.max(4, Math.round(size * GLOW_K));
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.drawImage(getGlow(color, s), x - s, y - s);
  ctx.globalAlpha = 1;
}

/* ==================== 背景景深 ====================
   画面原本 98% 的像素是纯黑，看着"空"。这里烘焙三张无缝平铺贴图（星云 / 远星 / 近星），
   每帧只做几次 pattern 填充，按视差系数跟着镜头移动。
   亮度刻意压得很低：背景只提供纵深与环境信息，绝不能跟弹幕抢注意力。 */
const BG_LAYERS = [
  { p: 0.05, alpha: 0.2, size: 512, tile: null },   // 星云：几乎不动
  { p: 0.22, alpha: 0.5, size: 256, tile: null },   // 远星
  { p: 0.45, alpha: 0.9, size: 384, tile: null }    // 近星（更亮、更少）
];

function bakeTile(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  paint(c.getContext('2d'), size);
  return c;
}

/* 无缝平铺：把每个元素在 3×3 的偏移上各画一遍，跨边界的元素就不会被切断 */
function wrapDraw(c, size, fn) {
  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      c.save();
      c.translate(ox * size, oy * size);
      fn(c);
      c.restore();
    }
  }
}

function bakeBackground() {
  if (BG_LAYERS[0].tile) return;
  /* 星云：几团柔和的蓝紫/品红/青色渐变斑。刻意画得稀疏 —— 要留下大片接近纯黑的区域，
     否则整屏被雾一样的光填满，霓虹实体反而糊在背景里。 */
  const tints = ['rgba(70,130,220,0.55)', 'rgba(130,80,225,0.45)', 'rgba(210,70,140,0.28)', 'rgba(40,170,165,0.3)'];
  BG_LAYERS[0].tile = bakeTile(BG_LAYERS[0].size, (c, s) => {
    const blobs = [];
    for (let i = 0; i < 7; i++) {
      blobs.push({ x: Math.random() * s, y: Math.random() * s, r: 55 + Math.random() * 130, t: tints[i % tints.length] });
    }
    c.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      wrapDraw(c, s, cc => {
        const g = cc.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.t);
        g.addColorStop(0.55, b.t.replace(/[\d.]+\)$/, '0.12)'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        cc.fillStyle = g;
        cc.beginPath(); cc.arc(b.x, b.y, b.r, 0, Math.PI * 2); cc.fill();
      });
    }
  });
  /* 星点：远层密而暗，近层疏而亮 */
  const star = (count, maxR, alpha) => {
    const cols = ['#ffffff', '#d6e8ff', '#9fd0ff', '#ffd9a0'];
    const pts = [];
    for (let i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * 999, y: Math.random() * 999, r: 0.5 + Math.random() * maxR,
        c: cols[(Math.random() * cols.length) | 0], a: alpha * (0.3 + Math.random() * 0.7)
      });
    }
    return (c, s) => {
      for (const p of pts) {
        const x = (p.x / 999) * s, y = (p.y / 999) * s;
        wrapDraw(c, s, cc => {
          cc.globalAlpha = p.a; cc.fillStyle = p.c;
          cc.beginPath(); cc.arc(x, y, p.r, 0, Math.PI * 2); cc.fill();
        });
      }
    };
  };
  BG_LAYERS[1].tile = bakeTile(BG_LAYERS[1].size, star(120, 0.8, 0.55));
  BG_LAYERS[2].tile = bakeTile(BG_LAYERS[2].size, star(26, 1.5, 1));
}

function drawBackdrop(ctx, cx, cy, zoom, W, H) {
  bakeBackground();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const L of BG_LAYERS) {
    if (!L.pattern) L.pattern = ctx.createPattern(L.tile, 'repeat');
    const ox = -(((cx * L.p * zoom) % L.size) + L.size) % L.size;
    const oy = -(((cy * L.p * zoom) % L.size) + L.size) % L.size;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.globalAlpha = L.alpha;
    ctx.fillStyle = L.pattern;
    ctx.fillRect(0, 0, W + L.size, H + L.size);
    ctx.restore();
  }
  ctx.restore();
}

/* 画面特效开关：性能不够或不合口味时可以在控制台里逐个关掉（__game.fx.bloom = false） */
export const fx = { bloom: true, backdrop: true, vignette: true };

/* 暗角改由 CSS 兄弟层画（见 theme.css 的 #vignette）：走合成器，canvas 里一趟全屏填充的成本直接省掉。
   `__game.fx.vignette` 仍然能开关它。 */
let vigEl = null, vigOn = true;
function drawVignette(ctx, W, H) {
  if (!vigEl) vigEl = document.getElementById('vignette');
  if (!vigEl) return;
  if (vigOn !== fx.vignette) {
    vigOn = fx.vignette;
    vigEl.style.opacity = vigOn ? '' : '0';
  }
}

/* ==================== 辉光（bloom） ====================
   做法：把刚画完的画面降采样拷进小画布，用 filter 做「阈值 + 保留颜色 + 模糊」，再以 lighter 放大贴回。
   关键取舍：**没有离屏场景画布** —— 世界照旧直接画在主画布上，省掉一次全屏合成（实测那一次
   全屏 blit 要 3–5ms，等于整个 bloom 的预算）。代价只是小画布上多做一次纹理拷贝。
   参数来自 bench/bloom-bench.html 的实测（详见 docs/canvas2d-bloom-report.md）：
     · 降采样 1/4：1/2 到 1/16 的开销差不到 1ms，所以按画质选，1/4 最合适
     · 阈值 brightness(2) contrast(4) → 起效亮度 0.19、过渡带 0.125（过渡带太窄会出硬边）
     · 模糊半径只有 3px，但它是**图层像素**，等效全分辨率 12px
     · 叠加 alpha 0.5；0.85 会明显把暗部洗白（这条踩过）
     · 加一趟 multiply 把原图颜色乘回掩码 → 光晕是彩色的，不是一圈白光
   ctx.filter 在旧 Safari 上不存在：检测不到就整段跳过，画面只少一层辉光。 */
const GLOW_DOWN = 4;              // 降采样倍率
const GLOW_BLUR = 3;              // 模糊半径（图层像素 ≈ 全分辨率 12px）
const GLOW_ALPHA = 0.5;           // 常态叠加强度
const GLOW_PAD = 10;              // 图层四周留白：否则贴着屏幕边的光晕会被切平
const BRIGHT_FILTER = 'brightness(2) contrast(4)';
let glow = null, glowCtx = null, mask = null, maskCtx = null, filterOK = null;

function ensureBuffers(w, h) {
  if (!glow) {
    glow = document.createElement('canvas');
    glowCtx = glow.getContext('2d');
    mask = document.createElement('canvas');
    maskCtx = mask.getContext('2d');
    filterOK = typeof glowCtx.filter === 'string';
  }
  const gw = Math.max(1, Math.round(w / GLOW_DOWN)) + GLOW_PAD * 2;
  const gh = Math.max(1, Math.round(h / GLOW_DOWN)) + GLOW_PAD * 2;
  if (glow.width !== gw || glow.height !== gh) {
    glow.width = mask.width = gw;
    glow.height = mask.height = gh;
  }
  return { gw, gh };
}

/** 从主画布取一张缩略图：阈值 → 乘回原色 → 模糊 → 以 lighter 贴回 */
function compose(out, tr, gw, gh, w, h) {
  if (!filterOK || !fx.bloom) return;
  const dw = w / GLOW_DOWN, dh = h / GLOW_DOWN;     // 场景在图层里的尺寸（其余是留白）

  /* ① 亮部提取：低于阈值的压成 0，高于的推到 1 */
  maskCtx.setTransform(1, 0, 0, 1, 0, 0);
  maskCtx.filter = 'none';
  maskCtx.globalCompositeOperation = 'source-over';
  maskCtx.globalAlpha = 1;
  maskCtx.clearRect(0, 0, gw, gh);
  maskCtx.filter = BRIGHT_FILTER;
  maskCtx.drawImage(out.canvas, GLOW_PAD, GLOW_PAD, dw, dh);
  /* ② 掩码 × 原图：暗部仍是 0，亮部保留自己的颜色（少了这趟，所有光晕都是白的） */
  maskCtx.globalCompositeOperation = 'multiply';
  maskCtx.filter = 'saturate(1.5)';
  maskCtx.drawImage(out.canvas, GLOW_PAD, GLOW_PAD, dw, dh);
  maskCtx.filter = 'none';
  maskCtx.globalCompositeOperation = 'source-over';

  /* ③ 模糊 */
  glowCtx.setTransform(1, 0, 0, 1, 0, 0);
  glowCtx.filter = 'none';
  glowCtx.globalCompositeOperation = 'source-over';
  glowCtx.globalAlpha = 1;
  glowCtx.clearRect(0, 0, gw, gh);
  glowCtx.filter = `blur(${GLOW_BLUR}px)`;
  glowCtx.drawImage(mask, 0, 0);
  glowCtx.filter = 'none';

  /* ④ 加性叠回（留白映射到画布外，直接裁掉） */
  out.setTransform(1, 0, 0, 1, 0, 0);
  out.globalCompositeOperation = 'lighter';
  out.globalAlpha = GLOW_ALPHA;
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';               // 1/4 放大回全屏，不开会有方块感
  out.drawImage(glow, -GLOW_PAD * GLOW_DOWN, -GLOW_PAD * GLOW_DOWN, gw * GLOW_DOWN, gh * GLOW_DOWN);
  out.imageSmoothingQuality = 'low';                // 单位精灵用 low 就够，别拖慢
  out.globalAlpha = 1;
  out.globalCompositeOperation = 'source-over';
  out.setTransform(tr);
}

/* ==================== 单位贴图（烘焙一次，之后每帧只 blit） ====================
   原来每个单位每帧要走 4–8 次 path（填充 + 描边 + 内芯），6–20px 的大小下只能是一团色块。
   改成「型号 × 颜色 × 半径」首次出现时烘焙一张贴图：
     ① 纯黑剪影（放大 1.18 倍）→ 任何背景上都读得出轮廓
     ② 本体双色调 + 沿朝向的明暗渐变（前亮后暗：光照跟着朝向走，整体旋转不会破坏光向）
     ③ 白热核心 / 炮口 / 座舱 → 这是让 6px 单位「看得出是飞船」的关键，也是 bloom 的燃料
   烘焙一次、每帧一次 drawImage：画质上去了，绘制开销反而降下来。受击闪白用第二张全白贴图，不做路径重绘。 */
const unitCache = new Map();

/** hex 与黑/白混合：k=0 原色，k=1 全黑/全白 */
function mixHex(hex, to, k) {
  const n = parseInt(hex.slice(1), 16);
  const t = to === 'w' ? 255 : 0;
  const m = v => Math.round(v + (t - v) * k);
  return `rgb(${m((n >> 16) & 255)},${m((n >> 8) & 255)},${m(n & 255)})`;
}

/** 单位形状（本地坐标，朝向 +x）。fill/edge/core 三色由调用方给，所以剪影和本体共用一套形状 */
function paintUnit(g, type, r, fill, edge, core) {
  const A = Math.PI * 2;
  g.lineJoin = 'round';
  g.fillStyle = fill;
  g.strokeStyle = edge;
  g.lineWidth = 1.6;
  if (type === 'tank') {
    const b = r * 1.5;
    g.beginPath(); g.rect(-b / 2, -b / 2, b, b); g.fill(); g.stroke();
    g.fillStyle = core; g.fillRect(-b * 0.17, -b * 0.17, b * 0.34, b * 0.34);
  } else if (type === 'splitter') {
    g.beginPath(); g.arc(0, 0, r, 0, A); g.fill(); g.stroke();
    g.fillStyle = core;
    g.beginPath();
    g.arc(-r * 0.42, 0, r * 0.3, 0, A);
    g.arc(r * 0.42, 0, r * 0.3, 0, A);
    g.fill();
  } else if (type === 'triangle') {
    g.beginPath();
    g.moveTo(r * 1.35, 0); g.lineTo(-r * 0.9, -r * 0.95); g.lineTo(-r * 0.9, r * 0.95);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = core;
    g.beginPath();
    g.moveTo(r * 0.72, 0); g.lineTo(-r * 0.2, -r * 0.32); g.lineTo(-r * 0.2, r * 0.32);
    g.closePath(); g.fill();
  } else if (type === 'shooter') {
    poly(g, 0, 0, r, 6, 0); g.fill(); g.stroke();
    g.fillStyle = core; g.fillRect(r * 0.2, -r * 0.18, r * 1.05, r * 0.36);   // 炮口
  } else if (type === 'fast') {
    g.beginPath();
    g.moveTo(r * 1.6, 0); g.lineTo(-r * 0.5, -r * 0.78); g.lineTo(-r * 1.05, 0); g.lineTo(-r * 0.5, r * 0.78);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = core; g.beginPath(); g.arc(r * 0.45, 0, r * 0.3, 0, A); g.fill();
  } else {
    /* 巡逻机：外环 + 内箭（指向玩家）+ 座舱 */
    g.beginPath(); g.arc(0, 0, r, 0, A); g.stroke();
    g.beginPath();
    g.moveTo(r * 0.66, 0); g.lineTo(-r * 0.5, -r * 0.6); g.lineTo(-r * 0.5, r * 0.6);
    g.closePath(); g.fill();
    g.fillStyle = core; g.beginPath(); g.arc(r * 0.18, 0, r * 0.26, 0, A); g.fill();
  }
}

function unitSprite(type, color, r, white) {
  const key = type + '|' + (white ? '#fff' : color) + '|' + r;
  let c = unitCache.get(key);
  if (c) return c;
  const half = Math.ceil(r * 2.1 + 6);
  c = document.createElement('canvas');
  c.width = c.height = half * 2;
  const g = c.getContext('2d');
  g.translate(half, half);

  /* 底部柔光：很淡的一圈，主要靠 bloom 把白热核心晕开（这里给太多会整屏发灰） */
  g.save();
  g.globalCompositeOperation = 'lighter';
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
  gl.addColorStop(0, white ? 'rgba(255,255,255,0.35)' : color);
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = white ? 0.3 : 0.06;
  g.fillStyle = gl;
  g.beginPath(); g.arc(0, 0, r * 1.5, 0, Math.PI * 2); g.fill();
  g.restore();

  /* ① 剪影 */
  g.save();
  g.globalAlpha = 0.6;
  g.scale(1.18, 1.18);
  paintUnit(g, type, r, '#000', '#000', '#000');
  g.restore();

  /* ②③ 本体 + 前亮后暗的体积。机体刻意压暗 —— 剪影优先、亮的是轮廓和核心。
     核心用**本体的亮边色**而不是白色：小兵一旦有白核心，它的峰值亮度就跟玩家一样了，
     "玩家永远最亮"这条可读性规则会当场失效（实测：所有单位峰值 233–242，全糊成一档）。
     白色只留给玩家核心与敌方弹幕核心。危险单位（会开火的）亮边推得更亮，冷灰小兵压在暗带。 */
  const rimK = (type === 'shooter' || type === 'fast' || type === 'triangle') ? 0.5 : 0.3;
  const lit = white ? '#ffffff' : mixHex(color, 'w', rimK);
  const dim = white ? '#ffffff' : mixHex(color, 'b', 0.55);
  paintUnit(g, type, r, dim, lit, lit);
  g.globalCompositeOperation = 'source-atop';
  const grad = g.createLinearGradient(-r * 1.2, 0, r * 1.5, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(255,255,255,0.28)');
  g.fillStyle = grad;
  g.fillRect(-r * 2.2, -r * 2.2, r * 4.4, r * 4.4);
  g.globalCompositeOperation = 'source-over';

  unitCache.set(key, c);
  return c;
}

/** 画一个敌方单位：烘焙贴图 + 朝向（本地 +x 即朝向） */
function drawUnit(ctx, e, angle) {
  const sp = unitSprite(e.type, e.color, e.r, e.flash > 0);
  const h = sp.width / 2;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(angle);
  ctx.drawImage(sp, -h, -h);
  ctx.restore();
}

/* 闪电折线 */
function drawBolt(ctx, b, jitter) {
  ctx.beginPath();
  const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const segs = 6;
  ctx.moveTo(b.x1, b.y1);
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const off = (Math.random() - 0.5) * jitter * 6;
    ctx.lineTo(b.x1 + dx * t + nx * off, b.y1 + dy * t + ny * off);
  }
  ctx.lineTo(b.x2, b.y2);
  ctx.stroke();
}

/**
 * 画一帧。
 * @param {CanvasRenderingContext2D} ctx
 * @param {{W:number,H:number,G:object,player:object,shake:number,flashA:number,flashColor:string}} S
 */
export function render(ctx, S) {
  const { W, H, G, player } = S;
  const zoom = S.zoom || 1;
  const vw = W / zoom;                 // 视口在世界坐标里的尺寸（zoom<1 = 镜头拉高，看得更远）
  const vh = H / zoom;
  const cx = S.cam ? S.cam.x : 0;
  const cy = S.cam ? S.cam.y : 0;
  const tr = ctx.getTransform();       // 合成辉光时要临时切到设备像素，先存下来
  const { gw, gh } = ensureBuffers(ctx.canvas.width, ctx.canvas.height);

  /* 屏幕空间：底色 */
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
  bg.addColorStop(0, '#0a1018'); bg.addColorStop(1, '#05070b');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  /* 屏幕空间：星空 + 星云（视差层，在网格与实体之下） */
  if (fx.backdrop) drawBackdrop(ctx, cx, cy, zoom, W, H);

  ctx.save();
  /* 世界空间：相机跟随 + 镜头高度 + 震屏 */
  const shx = S.shake > 0 ? rand(-S.shake, S.shake) : 0;
  const shy = S.shake > 0 ? rand(-S.shake, S.shake) : 0;
  ctx.translate(-cx * zoom + shx, -cy * zoom + shy);
  ctx.scale(zoom, zoom);

  /* 视口剔除：屏幕外（含边距）的对象不提交绘制。
     炸弹/精英波会把屏幕外的敌人也打死并生成残片与粒子，不剔除就是白烧 fill-rate。 */
  const cull = (x, y, m) => x > cx - m && x < cx + vw + m && y > cy - m && y < cy + vh + m;

  /* 背景网格：画在世界坐标里，跟着镜头滚动（颜色取调色板的 B0 背景带） */
  ctx.strokeStyle = PALETTE.grid; ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
  ctx.beginPath();
  const gs = 64;
  const gx0 = Math.floor(cx / gs) * gs;
  const gy0 = Math.floor(cy / gs) * gs;
  for (let x = gx0; x <= cx + vw; x += gs) { ctx.moveTo(x, cy); ctx.lineTo(x, cy + vh); }
  for (let y = gy0; y <= cy + vh; y += gs) { ctx.moveTo(cx, y); ctx.lineTo(cx + vw, y); }
  ctx.stroke();
  ctx.globalAlpha = 1;

  /* 世界边界：让玩家知道地图有多大 */
  ctx.strokeStyle = PALETTE.near; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, WORLD.w, WORLD.h);
  ctx.globalAlpha = 1;

  ctx.globalCompositeOperation = 'lighter';

  /* 冲击波 */
  for (const r of G.rings) {
    if (!cull(r.x, r.y, r.max + 40)) continue;
    const p = r.age / r.life;
    const rad = 12 + (r.max - 12) * p;
    ctx.globalAlpha = (1 - p) * 0.9; ctx.strokeStyle = r.color;
    ctx.lineWidth = 6 * (1 - p) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = (1 - p) * 0.25; ctx.lineWidth = 20 * (1 - p) + 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  /* 数据残片：绿色菱形，和玩家的蓝、弹幕的蓝白彻底区分 */
  for (const o of G.orbs) {
    if (!cull(o.x, o.y, 40)) continue;
    const s = o.r + 3;
    drawGlow(ctx, o.x, o.y, ORB.color, 13, o.locked ? 0.95 : 0.72);
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = ORB.color;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = ORB.core;
    ctx.fillRect(-s / 4, -s / 4, s / 2, s / 2);
    ctx.restore();
  }

  /* 掉落物：纳米修复包 / 引力场发生器 / 战术弹 */
  for (const p of G.pickups) {
    if (!cull(p.x, p.y, 48)) continue;
    const pulse = 1 + Math.sin(G.t * 8 + p.x) * 0.15;
    if (p.kind === 'heart') {
      drawGlow(ctx, p.x, p.y, PALETTE.heart, 22 * pulse, 0.9);
      ctx.fillStyle = PALETTE.heart;
      ctx.beginPath();
      ctx.arc(p.x - 4, p.y - 3, 5, 0, Math.PI * 2);
      ctx.arc(p.x + 4, p.y - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x - 9, p.y - 2); ctx.lineTo(p.x + 9, p.y - 2);
      ctx.lineTo(p.x, p.y + 9); ctx.closePath(); ctx.fill();
    } else if (p.kind === 'magnet') {
      drawGlow(ctx, p.x, p.y, '#ff3b3b', 22 * pulse, 0.9);
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(p.x, p.y - 1, 8, Math.PI, 0); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 8, p.y - 1); ctx.lineTo(p.x - 8, p.y + 8);
      ctx.moveTo(p.x + 8, p.y - 1); ctx.lineTo(p.x + 8, p.y + 8);
      ctx.stroke();
    } else if (p.kind === 'chest') {
      /* 宝箱：金色六边形 */
      drawGlow(ctx, p.x, p.y, PALETTE.elite, 26 * pulse, 0.95);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(G.t * 0.8);
      ctx.fillStyle = PALETTE.elite;
      poly(ctx, 0, 0, p.r * 0.9, 6, 0); ctx.fill();
      ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = '#3a2a05';
      poly(ctx, 0, 0, p.r * 0.4, 6, 0); ctx.fill();
      ctx.restore();
    } else if (p.kind === 'bomb') {
      drawGlow(ctx, p.x, p.y, '#ffaa00', 22 * pulse, 0.9);
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(p.x, p.y + 2, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + 4, p.y - 6);
      ctx.quadraticCurveTo(p.x + 10, p.y - 13, p.x + 5, p.y - 16);
      ctx.stroke();
    }
  }

  /* 链式电弧 */
  for (const b of G.bolts) {
    if (!cull(b.x1, b.y1, 120) && !cull(b.x2, b.y2, 120)) continue;
    const a = clamp(b.life / 0.15, 0, 1);
    ctx.globalAlpha = a * 0.3; ctx.strokeStyle = b.color; ctx.lineWidth = 9; drawBolt(ctx, b, 6);
    ctx.globalAlpha = a * 0.7; ctx.lineWidth = 4; drawBolt(ctx, b, 3);
    ctx.globalAlpha = a; ctx.lineWidth = 1.6; ctx.strokeStyle = '#ffffff'; drawBolt(ctx, b, 2);
  }
  ctx.globalAlpha = 1;

  /* 粒子长矛 */
  for (const bm of G.beams) {
    if (!cull(bm.x, bm.y, 60) && !cull(bm.x + Math.cos(bm.angle) * bm.len, bm.y + Math.sin(bm.angle) * bm.len, 60)) continue;
    const a = clamp(bm.life / bm.maxLife, 0, 1);
    const ex = Math.cos(bm.angle), ey = Math.sin(bm.angle);
    const ex2 = bm.x + ex * bm.len, ey2 = bm.y + ey * bm.len;
    ctx.globalAlpha = a * 0.35; ctx.strokeStyle = bm.color; ctx.lineWidth = 26;
    ctx.beginPath(); ctx.moveTo(bm.x, bm.y); ctx.lineTo(ex2, ey2); ctx.stroke();
    ctx.globalAlpha = a * 0.7; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(bm.x, bm.y); ctx.lineTo(ex2, ey2); ctx.stroke();
    ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bm.x, bm.y); ctx.lineTo(ex2, ey2); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  /* 卫戍无人机 / 等离子刃环 */
  for (const w of player.weapons) {
    if (w.id !== 'orbit' && w.id !== 'saw') continue;
    const def = WEAPONS[w.id];
    const n = def.num(w.lv);
    for (let i = 0; i < n; i++) {
      const a = w.angle + i * Math.PI * 2 / n;
      const ox = player.x + Math.cos(a) * def.radius;
      const oy = player.y + Math.sin(a) * def.radius;
      drawGlow(ctx, ox, oy, def.color, w.id === 'saw' ? 24 : 22, 0.9);
      if (w.id === 'saw') {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(w.angle * 3);
        ctx.fillStyle = '#ffe0e0';
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const aa = k * Math.PI * 2 / 3;
          ctx.lineTo(Math.cos(aa) * 6, Math.sin(aa) * 6);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = '#fff7d6';
        ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  /* 弹体 */
  for (const b of G.bullets) {
    if (!cull(b.x, b.y, 80)) continue;
    if (b.type === 'boomerang') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.spin);
      drawGlow(ctx, 0, 0, b.color, 20, 0.9);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.r, -b.r * 0.35, b.r * 2, b.r * 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-b.r * 0.5, -b.r * 0.15, b.r, b.r * 0.3);
      ctx.restore();
      continue;
    }
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const tx = b.x - b.vx / speed * 18, ty = b.y - b.vy / speed * 18;
    ctx.globalAlpha = 0.7; ctx.strokeStyle = b.color; ctx.lineCap = 'round';
    ctx.lineWidth = b.r * 1.2;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.globalAlpha = 1;
    drawGlow(ctx, b.x, b.y, b.color, 16, 1);
    /* 弹头核心用"提亮后的本色"而不是纯白：白色核心会让我方弹幕亮度顶到 255，
       和敌方弹幕抢同一档 —— 冷色/暖色区分也就白做了 */
    ctx.fillStyle = mixHex(b.color, 'w', 0.55);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.75, 0, Math.PI * 2); ctx.fill();
  }

  /* 敌方弹丸：暖琥珀 + 拖尾。拖尾不是装饰 —— 弹幕游戏里玩家读的是"轨迹"，
     没有拖尾时 4px 的圆点在满屏特效里会突然出现在脸上。 */
  for (const b of G.enemyBullets) {
    if (!cull(b.x, b.y, 60)) continue;
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const tx = b.x - b.vx / sp * 16, ty = b.y - b.vy / sp * 16;
    ctx.globalAlpha = 0.55; ctx.strokeStyle = b.color; ctx.lineCap = 'round';
    ctx.lineWidth = b.r * 1.1;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.globalAlpha = 1;
    drawGlow(ctx, b.x, b.y, b.color, 18, 0.9);
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.enemyBulletCore;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }

  /* 粒子 */
  for (const p of G.parts) {
    if (!cull(p.x, p.y, 40)) continue;
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a * 0.5; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  /* 陨级单位蓄力预警线 */
  for (const e of G.enemies) {
    if (e.boss && e.state === 'charge_prep' && cull(e.x, e.y, 60)) {
      const a = e.chargeAngle;
      ctx.globalAlpha = 0.55 + Math.sin(G.t * 30) * 0.2;
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 8]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(a) * 900, e.y + Math.sin(a) * 900);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  /* 敌方单位 */
  for (const e of G.enemies) {
    if (!cull(e.x, e.y, 80)) continue;
    const hurt = e.flash > 0;
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#000';
    if (e.type === 'tank' || e.boss) {
      const s = e.r * 1.7;
      ctx.fillRect(e.x - s / 2 + 3, e.y - s / 2 + 3, s, s);
    } else {
      ctx.beginPath(); ctx.arc(e.x + 2, e.y + 3, e.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    const dx = player.x - e.x, dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const a2p = Math.atan2(dy, dx);

    /* ===== 单位 = 基本几何图形的组合 ===== */
    const dark = 'rgba(0,0,0,0.45)';
    const TAU = Math.PI * 2;

    if (e.boss) {
      let bcolor = e.color;
      if (e.state === 'charge_prep' || e.state === 'prep') {
        const blink = Math.floor(e.stateTime * 15) % 2;
        bcolor = blink ? '#ff3333' : '#ff8888';
      } else if (e.state === 'charging') {
        bcolor = '#ff2222';
      } else if (e.vulnMul > 1) {
        bcolor = '#8866aa';
      }
      if (hurt) bcolor = '#ffffff';
      const s = e.r * 1.7;

      /* 外圈：缓慢自转的方框 */
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(G.t * 0.6);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = bcolor; ctx.lineWidth = 2;
      ctx.strokeRect(-s * 0.82, -s * 0.82, s * 1.64, s * 1.64);
      ctx.globalAlpha = 1;
      ctx.restore();

      /* 主体方框 */
      ctx.fillStyle = bcolor;
      ctx.fillRect(e.x - s / 2, e.y - s / 2, s, s);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
      ctx.strokeRect(e.x - s / 2, e.y - s / 2, s, s);

      /* 中央菱形核心 */
      ctx.fillStyle = dark; poly(ctx, e.x, e.y, s * 0.38, 4, Math.PI / 4); ctx.fill();
      ctx.fillStyle = bcolor; poly(ctx, e.x, e.y, s * 0.2, 4, Math.PI / 4); ctx.fill();

      /* 四角铆钉 */
      ctx.fillStyle = dark;
      for (let k = 0; k < 4; k++) {
        const rx = e.x + (k % 2 ? 1 : -1) * s * 0.38;
        const ry = e.y + (k < 2 ? -1 : 1) * s * 0.38;
        ctx.fillRect(rx - 2, ry - 2, 4, 4);
      }

      /* 虚弱/瘫痪标记 */
      if (e.vulnMul > 1) {
        for (let k = 0; k < 3; k++) {
          const sa = G.t * 4 + k * Math.PI * 2 / 3;
          const sx = e.x + Math.cos(sa) * 22;
          const sy = e.y - e.r * 1.2 + Math.sin(sa) * 6;
          ctx.fillStyle = '#ffdd44';
          ctx.beginPath(); ctx.arc(sx, sy, 4, 0, TAU); ctx.fill();
        }
      }
    } else {
      drawUnit(ctx, e, a2p);      // 普通单位统一走烘焙贴图（型号在 paintUnit 里区分形状）
    }

    /* 精英标记：金色旋转虚线圈 + 外发光 */
    if (e.elite) {
      drawGlow(ctx, e.x, e.y, ELITE.color, 20, 0.35);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(G.t * 1.4);
      ctx.strokeStyle = ELITE.color;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.85;
      ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.arc(0, 0, e.r + 6, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    if (e.hp < e.maxHp) {
      const bw = e.r * 2.2;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 9, bw, 3);
      ctx.fillStyle = e.boss ? PALETTE.bossBody : PALETTE.orbCore;
      ctx.fillRect(e.x - bw / 2, e.y - e.r - 9, bw * (e.hp / e.maxHp), 3);
    }
  }

  /* 玩家：引擎尾焰 + 光晕 + 沿速度方向拉伸 */
  const pspd = Math.hypot(player.vx, player.vy);
  const spdRatio = Math.min(pspd / player.speed, 1);
  /* 无敌闪烁：原来是 `floor(invuln*20)%2` —— 每秒 20 次硬翻转，正落在光敏峰值频段 16–25Hz。
     改成 5Hz 的**呼吸式**透明度脉动：还是能看出"无敌中"，但不再是一秒闪二十下的频闪。 */
  const inv = player.invuln > 0
    ? 0.55 + 0.45 * (Math.sin(player.invuln * Math.PI * 2 * 5) * 0.5 + 0.5)   // 0.55 ~ 1.0
    : 1;

  if (spdRatio > 0.15) {
    ctx.globalCompositeOperation = 'lighter';
    const ta = Math.atan2(player.vy, player.vx);
    const tlen = spdRatio * 34;
    const tx = player.x - Math.cos(ta) * tlen;
    const ty = player.y - Math.sin(ta) * tlen;
    ctx.globalAlpha = spdRatio * 0.55;
    ctx.strokeStyle = PALETTE.playerTrail;
    ctx.lineCap = 'round';
    ctx.lineWidth = player.r * 1.5 * spdRatio + 4;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(player.x, player.y); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ctx, player.x, player.y, PALETTE.playerRing, 30, 0.8 * inv);
  ctx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  const stretch = 1 + spdRatio * 0.22;
  ctx.scale(stretch, 1 / stretch);
  ctx.rotate(-player.angle);
  ctx.globalAlpha = inv;
  ctx.fillStyle = PALETTE.playerHull;
  ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = PALETTE.playerRing;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, player.r + 4, 0, Math.PI * 2); ctx.stroke();
  /* 白热核心：把玩家钉在最高的亮度档，任何情况下都第一眼能找到 */
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath(); ctx.arc(0, 0, player.r * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  /* 飘字 */
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const t of G.texts) {
    if (!cull(t.x, t.y, 80)) continue;
    ctx.globalAlpha = clamp(t.life / t.max, 0, 1);
    ctx.font = `900 ${Math.round(t.size * TEXT_K)}px system-ui,sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  /* 屏幕空间：触屏摇杆 */
  if (player.touch.active) {
    const sx = player.touch.sx, sy = player.touch.sy;
    const dx = player.touch.dx * 40, dy = player.touch.dy * 40;
    ctx.globalAlpha = 0.2; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx, sy, 48, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.65; ctx.fillStyle = PALETTE.playerRing;
    ctx.beginPath(); ctx.arc(sx + dx, sy + dy, 20, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* 屏幕空间：小地图 */
  drawMinimap(ctx, S, cx, cy, vw, vh);

  /* 屏幕空间：辉光 + 暗角 */
  compose(ctx, tr, gw, gh, ctx.canvas.width, ctx.canvas.height);
  if (fx.vignette) drawVignette(ctx, W, H);

  /* 屏幕空间：全屏闪光（放在辉光之后，否则闪白会被二次放大） */
  if (S.flashA > 0.01) {
    ctx.fillStyle = `rgba(${S.flashColor},${S.flashA})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/* 小地图：世界轮廓 + 敌方单位 + 视野框 + 玩家 */
function drawMinimap(ctx, S, cx, cy, vw, vh) {
  const { W, H, G, player } = S;
  const pad = 16;
  const mmW = 148;
  const mmH = mmW * (WORLD.h / WORLD.w);
  const x0 = W - mmW - pad;
  const y0 = H - mmH - pad;
  const sx = mmW / WORLD.w;
  const sy = mmH / WORLD.h;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(6,10,16,0.72)';
  ctx.fillRect(x0, y0, mmW, mmH);
  ctx.strokeStyle = 'rgba(88,166,255,0.38)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, mmW - 1, mmH - 1);

  ctx.fillStyle = 'rgba(229,72,77,0.85)';
  for (const e of G.enemies) {
    if (e.boss) continue;
    ctx.fillRect(x0 + e.x * sx - 0.5, y0 + e.y * sy - 0.5, 1.5, 1.5);
  }
  ctx.fillStyle = PALETTE.bossBody;
  for (const e of G.enemies) {
    if (!e.boss) continue;
    ctx.fillRect(x0 + e.x * sx - 2, y0 + e.y * sy - 2, 4, 4);
  }

  /* 当前视野框 */
  ctx.strokeStyle = 'rgba(88,166,255,0.55)';
  ctx.strokeRect(x0 + cx * sx, y0 + cy * sy, vw * sx, vh * sy);

  /* 玩家 */
  ctx.fillStyle = PALETTE.playerHull;
  ctx.fillRect(x0 + player.x * sx - 1.5, y0 + player.y * sy - 1.5, 3, 3);
  ctx.restore();
}
