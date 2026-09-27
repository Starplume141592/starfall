# Canvas 2D 辉光(Bloom)/后处理落地报告

> 目标场景:1280×720 逻辑分辨率、自研 Canvas 2D 渲染器、无 WebGL / 无第三方库 / 无打包器 / 零外部资源文件。
> 风格:深色科幻霓虹(子弹/爆炸/引擎尾焰发光),背景接近纯黑。每帧 300–600 个单位,p50 帧时间 8–10ms,预算 16.7ms。
> 兼容:Chrome / Edge / Firefox 必须;Safari 优雅降级。

---

## 0. TL;DR —— 推荐参数(直接抄)

| 项 | 推荐值 | 说明 |
|---|---|---|
| 降采样倍率 | **1/4**(320×180) | 性能与 1/8、1/16 几乎一样(见 §1、§4),所以按画质选,1/4 最优 |
| 亮部提取 | `brightness(2) contrast(4)` | 等效阈值 ≈ 0.19 亮度,过渡带 ≈ 0.125 |
| 模糊半径(1/4 图层内) | **2–3px** | 图层像素;等价全分辨率 8–12px |
| 叠加模式 | `globalCompositeOperation='lighter'` | 加性 |
| 叠加 alpha | **0.45**(常态)/ 0.9(爆炸瞬间) | 0.85 会明显洗白暗部,见 §6 |
| 每帧额外 draw call 数 | **3 趟**(提取 / 模糊 / 叠加) | Canvas 2D 的开销按"趟"算,不按像素算 |
| 预计每帧成本 | **≈1–3ms**(本机实测,见 §4) | 你的机器请自行复测 |

替代方案(如果需要更省):把亮部提取和降采样合成同一趟;把 bloom 层做成 **1/4 → 再 1/2 两级**(两级模糊 = 更宽更柔和的光晕,多一趟 draw call)。

---

## 1. 离屏 canvas + `ctx.filter='blur(Npx)'` + `lighter` 的最小实现

### 结论
可行,而且非常短:**3 趟 draw call**(亮部提取+降采样 → 模糊 → 加性叠回)。降采样到 1/2 画质最好最贵、1/8 最糊但**并不明显更快**;在 Canvas 2D 里 bloom 的成本由"图层数量 / draw call 趟数"主导,而不是由像素数主导,所以 **选 1/4**:画质足够、光晕半径够大、成本与 1/8 相当。

### 代码(完整可用)

```js
// ============ 初始化(只跑一次) ============
const W = 1280, H = 720;

const DIV     = 4;                  // 降采样倍率:推荐 4(1/4)
const bw      = (W / DIV) | 0;      // 320
const bh      = (H / DIV) | 0;      // 180

const BRIGHT_B = 2.0;               // 亮度乘子 → 决定阈值
const BRIGHT_C = 4.0;               // 对比度 → 决定阈值陡峭度
const BLUR_R   = 2;                 // 图层像素半径(1/4 下 2px ≈ 全分辨率 8px)
const BLOOM_A  = 0.45;              // 常态叠加强度

function mkLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const brightC = mkLayer(bw, bh), brightX = brightC.getContext('2d');
const blurC   = mkLayer(bw, bh), blurX   = blurC.getContext('2d');

// 特性探测:见 §3
const FILTER_OK = (() => {
  try {
    const x = document.createElement('canvas').getContext('2d');
    if (!x) return false;
    x.filter = 'blur(1px)';
    return x.filter === 'blur(1px)';
  } catch (e) { return false; }
})();

// ============ 每帧收尾(在画完 300–600 个单位之后调用) ============
function compose(ctx) {
  if (!FILTER_OK) return;           // Safari 等:走降级路径(见 §3)

  // --- 趟 1:亮部提取 + 降采样(一趟同时完成两件事) ---
  brightX.setTransform(1, 0, 0, 1, 0, 0);
  brightX.globalCompositeOperation = 'source-over';
  brightX.globalAlpha = 1;
  brightX.filter = 'none';
  brightX.clearRect(0, 0, bw, bh);
  brightX.filter = `brightness(${BRIGHT_B}) contrast(${BRIGHT_C})`;
  brightX.drawImage(ctx.canvas, 0, 0, W, H, 0, 0, bw, bh);
  brightX.filter = 'none';

  // --- 趟 2:在 1/4 图层上模糊(半径是图层像素) ---
  blurX.setTransform(1, 0, 0, 1, 0, 0);
  blurX.globalCompositeOperation = 'source-over';
  blurX.globalAlpha = 1;
  blurX.filter = 'none';
  blurX.clearRect(0, 0, bw, bh);
  blurX.filter = `blur(${BLUR_R}px)`;
  blurX.drawImage(brightC, 0, 0, bw, bh);
  blurX.filter = 'none';

  // --- 趟 3:加性叠回主画布 ---
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';   // 放大 1/4→全屏时更平滑
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = BLOOM_A;
  ctx.drawImage(blurC, 0, 0, bw, bh, 0, 0, W, H);
  ctx.restore();
}
```

### 关键参数语义

- **`blur(Npx)` 的 N 是高斯标准差的近似**(MDN:`blur()` 定义 "the value of the standard deviation to the Gaussian function";W3C 规范里 `blur()` 等价于 `feGaussianBlur` 的 `stdDeviation`)。所以**半径永远在"你绘制的那趟操作的目标坐标系"里解释**——在 1/4 图层上 `blur(2px)` 等价于全分辨率的 `blur(8px)`,不是 `blur(2px)`。降采样倍率变了,半径必须同比缩放。
- `imageSmoothingQuality='high'` 只在**放大** 1/4 图层回全屏时起作用,是消除"方块感/锯齿光晕"最便宜的一招。
- `ctx.save()/restore()` 会一起保存 `filter`、`globalCompositeOperation`、`globalAlpha`、`imageSmoothingQuality`,所以不要手动逐个还原(手写还原很容易漏掉 `filter='none'`,下一帧的第一个单位就会被误加滤镜)。

### 降采样档位取舍

| 档位 | 图层尺寸 | 光晕观感 | 本机实测(单帧全 bloom,ms) |
|---|---|---|---|
| 1/2 | 640×360 | 最锐、细节最多、容易显得"脏"/局部光斑 | 6.27 |
| **1/4** | **320×180** | **柔、便宜、光晕尺度合适(推荐)** | **3.10** |
| 1/8 | 160×90 | 明显糊,小光点会糊成团,子弹拖尾丢失 | 3.53 |
| 1/16 | 80×45 | 只剩大块光雾,只适合做"环境泛光" | 3.07 |

**注意这张表最重要的一行不是画质,而是数字几乎不变**:1/2 → 1/16 只差 ~1ms,而且 **1/8 比 1/4 还慢一点点(在噪声范围内)**。原因是成本 = 每趟 draw call 的固定开销(图层分配、滤镜建立、上下文切换),像素填充只占很小一部分。所以:**不要在降采样倍率上抠性能,用画质来选。** 见 §4 的详细数据。

### 坑

1. **边缘光晕被切断**。模糊层是一个独立的 320×180 位图,blur 采样到画布外时会被 clamp/裁掉,于是"贴着屏幕边缘的爆炸"光晕在边上被削平。修法:给 bloom 图层四周各留 `pad = ceil(3*BLUR_R)` 的空白,把场景画进去时整体偏移 `(pad,pad)`,叠回时再偏移 `(-pad*DIV, -pad*DIV)`。
2. **`ctx.filter` 字符串每帧拼接**。`brightness(${b}) contrast(${c})` 这种模板串每帧生成新字符串,浏览器要重新解析滤镜列表。**预先把字符串常量存好**(常态一套、闪光一套),切换只换变量。
3. **不要在绘制单位的过程中留着 `filter`**。300–600 个单位每帧,如果 `filter` 被漏设成非 `none`,每个单位的绘制都会单独建一个滤镜图层,帧时间会直接爆炸。
4. 加的 alpha 超过 1 无效:`globalAlpha` 合法范围是 `[0,1]`,想要"更亮的爆炸"不能用 `globalAlpha=1.5`(见 §7)。

---

## 2. Canvas 2D 里的"亮部提取"(bright pass / threshold)

### 结论
**可行,而且够用**。`contrast()` 是围绕 0.5 的线性放大,`brightness()` 是线性乘子,两者串联就得到一个"硬阈值":低于阈值的像素被压到 0(被 clamp),高于阈值的被推到 1(被 clamp)。推荐 **`brightness(2) contrast(4)`**。最大失败情形是**颜色丢失**——超过饱和点的亮部全部变成纯白,霓虹的彩色光晕会变成白光晕;用一趟 `multiply` 可以把颜色找回来。

### 数学(为什么 filter 链能当阈值用)

`brightness(b)` 是线性乘子(`v1 = v0 * b`);`contrast(c)` 在规范里等价于 `feComponentTransfer type="linear"`(`feFuncR/G/B`),即 `v2 = (v1 - 0.5) * c + 0.5`。串联后:

```
out = clamp( ((in * b) - 0.5) * c + 0.5 , 0, 1 )
```

- **起效阈值**:`out` 从 0 开始上升的输入值 `in_t = (0.5 - 0.5/c) / b`
- **饱和点**:`out` 到达 1 的输入值 `in_s = (0.5 + 0.5/c) / b`
- **过渡带宽**:`in_s - in_t = 1/(b*c)` —— 这个宽度就是"阈值有多硬",也直接决定了 halo 边缘会不会出现锯齿/硬边。

常用组合(输入按 sRGB 0–1 换算,乘 255 就是 8bit 值):

| 参数 | 阈值 `in_t` | 饱和点 `in_s` | 过渡带 | 用途 |
|---|---|---|---|---|
| `brightness(2) contrast(4)` | 0.188 (=48) | 0.313 (=80) | 0.125 | **推荐**:大部分中间调不发光,只有亮部发光 |
| `brightness(1.6) contrast(2.2)` | 0.148 (=38) | 0.443 (=113) | 0.295 | 柔和,保留更多颜色,但暗部会轻微泛光 |
| `brightness(4) contrast(8)` | 0.109 (=28) | 0.141 (=36) | 0.031 | 极硬,只有白热核心发光;过渡带太窄 → 边缘会出硬边/闪烁 |
| `brightness(2) contrast(2)` | 0.125 (=32) | 0.375 (=96) | 0.25 | 宽容模式,适合"整个画面都是霓虹"的场景 |

> 说明:`contrast` 与 `brightness` 的 feComponentTransfer 等价式(`slope=amount` / `intercept=-(0.5*amount)+0.5`)本次**没有逐字取到规范原文**(W3C Filter Effects 章节 13.1.7/13.1.8 有"markup equivalent"小节,但抓取被截断),上述公式是按 `feComponentTransfer` 的线性传递函数定义推导的。可以用 §2 末尾的自检代码在自己的浏览器里 30 秒验证一遍再采信。

### 保留颜色的亮部提取(强烈建议)

问题:`contrast(4)` 会把所有 `in > 0.31` 的像素**推到纯白**,于是你得到的是白光晕,霓虹的青色/洋红全丢了。修法是**把阈值结果当掩码用**,和原图相乘:

```js
// 趟 1:阈值 → 白掩码(和上面一样)
brightX.filter = 'brightness(2) contrast(4)';
brightX.drawImage(ctx.canvas, 0, 0, W, H, 0, 0, bw, bh);

// 趟 1.5:掩码 × 原图 = 彩色亮部(颜色回来了)
brightX.globalCompositeOperation = 'multiply';
brightX.filter = 'saturate(1.6)';          // 顺手把霓虹色再推浓一点(可省)
brightX.drawImage(ctx.canvas, 0, 0, W, H, 0, 0, bw, bh);
brightX.globalCompositeOperation = 'source-over';
brightX.filter = 'none';
// 之后照常 blur → lighter 叠回
```

原理:阈值结果是"亮部=白、暗部=黑",把它当掩码和原图相乘,**暗部乘 0 仍然为 0(不贡献泛光),亮部保留自己的颜色**;模糊发生在相乘之后,所以扩展开的光晕是**被染色的**。这是 Canvas 2D 里最接近"真 bloom"的做法。

`multiply` 的语义(MDN):"The pixels of the top layer are multiplied with the corresponding pixels of the bottom layer." 规范里 `multiply` 是 separable blend mode `B(Cb,Cs) = Cb × Cs`,配合 alpha 合成:源不透明(=1)处结果就是 `Cb × Cs`,源为黑处把底色压成黑 —— 正是掩码行为。

### 失败情形(逐条)

1. **颜色丢失 / 白化**(上面已给修法)。`in > 0.31` 之后全部 clamp 到 1。
2. **alpha 不受影响**。`brightness`/`contrast` 只作用于 RGB 通道(`feFuncR/G/B`),不做 `feFuncA`。所以透明区域会保留 `alpha=1, rgb=0`。叠到不透明的主画布上无害(加 0),但如果你把这个图层当遮罩/再 `source-over` 合成,就会出现黑边。**主画布每帧先用不透明黑 `fillRect` 铺底**可以完全规避。
3. **8bit 无 HDR,阈值只能落在 1.0 以下**。LearnOpenGL 明确指出:HDR 让"什么算亮"变得可控;没有 HDR 时阈值必须 <1,区域很容易就被判为亮,泛光容易过强。你的场景是深底霓虹,这个问题不严重,但**不要把阈值压到 0.1 以下**。
4. **背景不够黑时会变成阈值噪声**。背景若是 `#202020`(0.125),配 `brightness(4)` 正好落在阈值附近 → 暗部出现颗粒状闪烁。保持背景 ≤ `#101010`,或把 `b` 降下来。
5. **clamp 是逐 primitive 发生的**(SVG 1.1 §15.7.1:每个 filter primitive 的结果都会被 clamp 到合法范围)。这是好事(负值直接归零,没有负向振铃),但也意味着**你无法用负值做"减暗"**。
6. 成本不低:`brightness+contrast` 这一趟实测约 1.83ms(1/4 图层),和 `blur` 差不多,**不是免费的**。所以别指望"省掉一趟提取"能省多少——真正省的是"别额外多开图层"。

### 30 秒自检代码(验证阈值公式)

```js
// 在控制台跑:打印 0..255 输入经过 filter 后的输出,验证阈值和饱和点
const src = document.createElement('canvas'); src.width = 256; src.height = 4;
const sx = src.getContext('2d');
for (let i = 0; i < 256; i++) { sx.fillStyle = `rgb(${i},${i},${i})`; sx.fillRect(i, 0, 1, 4); }

const dst = document.createElement('canvas'); dst.width = 256; dst.height = 4;
const dx = dst.getContext('2d');
dx.filter = 'brightness(2) contrast(4)';
dx.drawImage(src, 0, 0);
const d = dx.getImageData(0, 0, 256, 1).data;
for (const i of [24, 40, 48, 56, 64, 80, 96, 128, 200, 255]) {
  console.log(i, '->', d[i * 4]);       // 期望:48 之前=0,80 之后=255
}
```

---

## 3. `ctx.filter` 的真实浏览器支持 & 特性探测 / 降级

### 结论
**Chrome 52+ / Edge(Chromium) / Firefox 49+ 均可用;Safari 从 18 起可用,但位于 `Canvas Filters` 这个 preference 开关之后(默认不开)**。也就是说:**Safari 和所有 iOS 浏览器都应当按"不支持"来对待**,必须写好降级。做特性探测不要用 UA 判断,直接读属性。

### 支持矩阵(MDN Browser Compat Data,权威源)

| 浏览器 | `CanvasRenderingContext2D.filter` |
|---|---|
| Chrome | **52** |
| Edge(Chromium) | mirror(随 Chrome) |
| Firefox | **49** |
| Safari | **18**,带 `flags: { type: "preference", name: "Canvas Filters", value_to_set: "true" }` → **需要手动打开的实验特性** |
| Safari iOS | mirror(同 Safari,且 iOS 全部浏览器都是 WebKit) |

旁证:WebKit Bugzilla **198416 "Support CanvasRenderingContext2D.filter"** —— 2019 年提交,2024-04-25 以 commit `278000@main` 落地(PR #3793)并 RESOLVED FIXED;过程中专门有一个 bug 246697 "Add an experimental feature control for CanvasRenderingContext2D.filter API" 用来加实验开关。MDN 该页状态是 **"Limited availability / not Baseline"**。同一 bug 里还有一条对你有用的信息:WebKit 工程师自己吐槽 **Safari 的 SVG filter 性能"especially poor"**(bug 191197),所以"用 SVG filter 兜底 bloom"在 Safari 上并不会更快。

### 特性探测(正确写法)

```js
const FILTER_OK = (() => {
  try {
    const x = document.createElement('canvas').getContext('2d');
    if (!x) return false;
    x.filter = 'blur(1px)';
    return x.filter === 'blur(1px)';   // 不支持时:Safari 里该属性是 undefined,赋值静默失败
  } catch (e) {
    return false;
  }
})();
```

要点:
- **赋值不抛异常**。在不支持的环境里 `ctx.filter = 'blur(1px)'` 可能是静默 no-op,所以必须**读回来比较**,不能只看有没有抛错。
- 不要用 `'filter' in ctx` 判断:Patial/future 实现可能暴露属性但行为不同。回读比较最稳。
- 探测用的 canvas 用完就丢,别污染主上下文。

### 降级写法(三档,按性价比排)

**档 1(推荐):直接关掉 bloom,把发光烘焙进精灵图。**
子弹/爆炸/尾焰的"发光感"由美术本身承担:每个发光体画成径向渐变精灵(`createRadialGradient` 白→透明,`globalCompositeOperation='lighter'`),外圈本来就是软的。零渲染管线成本,跨浏览器 100% 一致。**这是真正稳妥的选择**,而且对深底霓虹风格其实最贴合。

**档 2(想要真 bloom):用 CSS `filter: url(#svgbloom)` 挂在 `<canvas>` 元素上。**
SVG 滤镜内联在页面里(零外部文件),由 CSS 作用于 canvas 元素,绕过 `ctx.filter`:

```html
<svg width="0" height="0" style="position:absolute">
  <filter id="svgbloom" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="4" result="b"/>
    <feComponentTransfer in="b" result="bb">
      <feFuncR type="linear" slope="1.15"/>
      <feFuncG type="linear" slope="1.15"/>
      <feFuncB type="linear" slope="1.15"/>
    </feComponentTransfer>
    <feMerge>
      <feMergeNode in="SourceGraphic"/>
      <feMergeNode in="bb"/>
    </feMerge>
  </filter>
</svg>
```
```js
if (!FILTER_OK) canvas.style.filter = 'url(#svgbloom)';
```
代价:滤镜全画面走合成器,WebKit 自己承认 SVG filter 性能差;**只建议低配设备上关掉**,或者只在"低分辨率 + 静态感"的场景用。

**档 3(无 filter 的纯 JS 模糊,最兼容):mipmap 式反复降采样。**
没有 `blur` 时,用双线性采样的反复减半 + 放大来近似模糊(每次减半约等于一次 box blur):

```js
// 无 ctx.filter 环境的"穷人模糊":降 4 次再升回 1/4,共 8 趟 draw call
function blurNoFilter(srcCanvas, tmpList, outCtx, ow, oh) {
  outCtx.clearRect(0, 0, ow, oh);
  outCtx.drawImage(srcCanvas, 0, 0, ow, oh);
  let w = ow, h = oh, cur = outCtx.canvas;
  for (let i = 0; i < tmpList.length; i++) {
    const t = tmpList[i], nx = t.getContext('2d');
    const nw = Math.max(2, w >> 1), nh = Math.max(2, h >> 1);
    nx.clearRect(0, 0, t.width, t.height);
    nx.imageSmoothingEnabled = true;
    nx.imageSmoothingQuality = 'high';
    nx.drawImage(cur, 0, 0, nw, nh);
    w = nw; h = nh; cur = t;
  }
  // 再逐级放大回来
  for (let i = tmpList.length - 2; i >= 0; i--) { /* drawImage 上一级缩放到下一级尺寸 */ }
  outCtx.drawImage(cur, 0, 0, w, h, 0, 0, ow, oh);
}
```
质量比高斯差(会有块状),但**没有 filter 也能拿到柔和光斑**,且 API 全兼容(靠 `imageSmoothingEnabled`)。

### 坑
- **不要按 Safari 版本号判断**。BCD 里 Safari 18 是"带 flag",不同 macOS/Safari 组合、iOS 上的第三方浏览器行为都可能不同。只认属性回读。
- iOS 上所有浏览器(Chrome/Firefox/Edge for iOS)都是 WebKit 内核 → 全部走降级分支。
- 降级分支要在**初始化时决定一次**并缓存布尔值,不要每帧探测(每次探测都要建 canvas + 上下文)。

---

## 4. `ctx.filter` 每帧性能:实测数据与已知坑

### 结论
**没有找到可信的第三方公开 benchmark**(`ctx.filter` 的耗时很少有人系统测过,caniuse 只有兼容性表);下面是我在**本机实测**的数据。核心结论有两条:

1. **开销按"趟数"算,不按像素算**:1/4 → 1/16 的降采样只差 ~0.4ms;`blur` 半径 4px → 32px 几乎没有差别。所以**不要为了性能牺牲分辨率或光晕半径,要为了性能减少图层/趟数**。
2. **全 bloom(1/4)≈ 3.1ms/帧**,其中亮部提取 ~1.8ms、加性合成 ~1.0ms。你自己的帧预算是 16.7ms、当前 p50 8–10ms,所以 bloom 大约吃掉 **13–19% 的帧预算**——可接受,但不能再加 3 个全屏后处理。

### 实测环境与方法
- 浏览器:Edge/Chromium **127.0.0.1**(`Edg/127.0.0.0`),ANGLE(D3D11);GPU:NVIDIA RTX 4060 Laptop;DPR 1.104;Windows。
- Canvas 1280×720,合成场景 = 深底 + 450 个加性发光精灵。
- 每个配置取 **30 组 × 3 趟** 的中位数;每组后用 `getImageData(0,0,1,1)` 强制 GPU 同步(注意:不同步的话离屏 canvas 的绘制会被延迟,测出来全是 0 —— 我第一版就踩了这个坑)。
- **绝对值只应当作上界**:本机连"一次全屏 blit"都要 4.0ms,这在 RTX 4060 上不合常理,说明这台机器的 Canvas2D 路径有固定开销(窗口遮挡/合成器状态/DPR 缩放)。**相对关系和"与像素数无关"的结论是可靠的,绝对毫秒数请在你自己的机器上复测。**

### 数据(中位数 ms/趟)

| 配置 | 中位 | MAD | p90 |
|---|---|---|---|
| **基线** 清屏 + 全屏 blit(无滤镜) | 4.03 | 0.80 | 8.13 |
| **基线** 帧 = 清屏 + blit(无任何后处理) | 5.70 | 1.40 | 9.60 |
| `blur(4px)` 全分辨率 1:1 | 7.17 | 2.20 | 11.47 |
| `blur(8px)` 全分辨率 | 7.23 | 2.13 | 10.30 |
| `blur(16px)` 全分辨率 | 6.57 | 0.83 | 7.60 |
| `blur(32px)` 全分辨率 | 8.17 | 1.27 | 9.43 |
| 降采样+`blur(4px)` → 1/2 (640×360) | 2.63 | 0.43 | 3.50 |
| 降采样+`blur(2px)` → **1/4 (320×180)** | **2.00** | 0.17 | 2.40 |
| 降采样+`blur(1px)` → 1/8 (160×90) | 1.73 | 0.17 | 2.03 |
| 降采样+`blur(0.5px)` → 1/16 (80×45) | 1.43 | 0.27 | 1.73 |
| 纯降采样 → 1/4(**无滤镜**) | 1.47 | 0.27 | 2.07 |
| 纯降采样 → 1/2(**无滤镜**) | 1.90 | 0.37 | 2.50 |
| 亮部提取 `brightness(2) contrast(4)` → 1/4 | 1.83 | 0.23 | 2.70 |
| 亮部提取 `brightness(2) contrast(4)` → 1/2 | 2.30 | 0.27 | 3.20 |
| 亮部提取 `brightness(1.6) contrast(2.2)` → 1/4 | 1.93 | 0.33 | 2.50 |
| 加性合成 1/4 层 → 全屏(`lighter`, a=.85) | 0.97 | 0.03 | 1.00 |
| 加性合成 1/2 层 → 全屏 | 1.00 | 0.03 | 1.10 |
| 加性合成 1/8 层 → 全屏 | 1.10 | 0.13 | 1.43 |
| 加性合成 1/16 层 → 全屏 | 0.97 | 0.03 | 1.20 |
| **完整 bloom 1/2**(提取 r4 + 合成) | 6.27 | 1.03 | 8.33 |
| **完整 bloom 1/4**(提取 r2 + 合成) | **3.10** | 0.33 | 4.07 |
| **完整 bloom 1/8**(提取 r1 + 合成) | 3.53 | 0.80 | 5.30 |
| 完整 bloom 1/16 | 3.07 | 0.43 | 3.87 |
| 完整 bloom 1/4 双模糊(r1.4 跑两遍) | 3.97 | 0.37 | 6.53 |
| 帧(场景 + blit,无后处理) | 2.17 | 0.30 | 2.93 |
| 帧(场景 + 1/4 bloom) | 4.40 | 0.90 | 5.77 |
| 帧(场景 + 1/8 bloom) | 3.43 | 0.33 | 4.37 |
| 全屏 copy 到离屏 | ~0(<0.03) | — | 0.03 |
| 色差(1 次 copy + 2 趟偏移 `lighter`) | 9.00 | 1.37 | 12.53 |
| 暗角(1 趟 multiply 精灵) | 2.63 | 0.60 | 3.80 |
| 色调洗(1 趟 multiply fillRect) | 1.90 | 0.30 | 2.80 |
| 扫描线(1 趟 pattern fillRect) | 3.27 | 0.43 | 4.47 |
| 颗粒(1 趟 pattern fillRect, overlay) | 3.10 | 0.40 | 4.30 |
| 4 趟缩放射线模糊(zoom blur) | 10.97 | 1.30 | 13.83 |

读表要点:
- **1/4 与 1/8、1/16 的完整 bloom 差在噪声里(3.10 / 3.53 / 3.07)**。→ 按画质选 1/4。
- **`blur` 半径基本免费**(4/8/16/32px = 7.17 / 7.23 / 6.57 / 8.17,全在噪声内)。→ 想要更大的光晕直接把半径调大,不用降分辨率。
- **一个全屏合成趟 ≈ 1–3ms**,与源图层多大几乎无关(1/4 和 1/16 合成都是 0.97ms)。这是本机的固定开销,也是所有后处理的地板价。
- 双模糊(两趟)只贵 ~0.9ms,但光晕明显更柔——**性价比很高**。

### 已知的坑

1. **`getImageData` / `toDataURL` 会强制 GPU→CPU 读回并打断管线**。MDN 明确:`getImageData()` 频繁调用时,`willReadFrequently` 会"force the use of a software (instead of hardware accelerated) 2D canvas"。**推论(标注为推断)**:任何形式的每帧读回(包括为了调试取 1 像素)都会把滤镜/合成从硬件路径拖下来。→ **发布版本里绝不要每帧 `getImageData`**;要读就在计时/调试开关下读。
2. **`willReadFrequently: true` 千万别用在主画布上**。它会把整个 2D 上下文降级为软件渲染,bloom 和 600 个单位的绘制都会变慢。只在"一次性生成噪声/掩码纹理"的临时 canvas 上用。
3. **离屏 canvas 的绘制是延迟提交的**。不做同步的话,你可能测到 0ms 而实际把成本堆到后面某一帧(我第一版基准就是这样,离屏模糊全测成 0)。真要做性能断言,用 `getImageData(0,0,1,1)` 在一个稳定的点强制同步,并且**把同步的成本一起算进去**。
4. **`desynchronized: true` 与滤镜叠加不推荐**(推断):它是"把绘制周期与事件循环解耦"的延迟提示,和逐帧多图层合成叠加时的行为没有可靠资料。默认不开。
5. **滤镜字符串每帧拼接会重新解析**。把 `'brightness(2) contrast(4)'` 和 `'blur(2px)'` 提前存成常量字符串(或缓存 2–3 套预设),别用模板串现场拼。
6. **Firefox / Safari 的具体毫秒数我没有可靠来源**。本次只测了 Chromium(D3D11/ANGLE)。**未找到可靠来源,以下是基于原理的推断**:Firefox 的 Canvas2D 滤镜历史上走的是 Gecko 自己的实现,Safari 的滤镜刚落地不久且挂在实验开关后,两者都应假定"比 Chromium 慢或不可用",所以 §3 的探测 + 降级必须做,而且**降级路径要能在不支持时完全不建那些离屏图层**(否则白白付出内存和清理成本)。
7. **边缘处的图层裁切**会在屏幕边界产生"光晕被切平"的假象——它不是性能问题,是质量问题(见 §1 坑 1)。

### 复现方式
`F:\inkfall\bench\bloom-bench.html` 是我写的基准页(**自包含、零外部资源,双击用 file:// 打开即可**;Playwright 会话禁止 file:// 才需要本地服务器)。打开后在控制台跑:

```js
window.__runBench({ iters: 30, inner: 3 })   // 结果在 window.__BENCH.results
```
`F:\inkfall\bench\serve.mjs` 是当时用的静态服务器(仅在需要 http:// 时用,现在**已停止**)。

---

## 5. 其他"性价比高"的屏幕空间后处理

### 结论
按性价比排序:**① CSS 叠加层(暗角/扫描线/颗粒,画布内零成本)> ② 一趟 multiply 合成(暗角/色调)> ③ 一趟 pattern fillRect(扫描线/颗粒)> ④ 两趟以上偏移合成(色差)> ⑤ 多趟缩放(径向模糊)。屏幕抖动是**变换**,不是后处理,成本为零,应该最先加。**

关键前提:**每个全屏趟在本机约 1–3ms**;而把效果做在 canvas 外面的兄弟 `<div>` 上,Canvas 2D 的开销是 **0**——因为它在合成器上跑,不进你的绘制命令流。

### 5.1 暗角 Vignette — ★★★★★
**两种做法,优先第一种。**

(a) **CSS 叠加层(画布开销 = 0)**,零资源、零 draw call:
```html
<div id="vignette"></div>
```
```css
#vignette{
  position:absolute; inset:0; pointer-events:none;
  background: radial-gradient(ellipse at 50% 50%,
              rgba(0,0,0,0) 35%, rgba(0,0,0,.45) 78%, rgba(0,0,0,.75) 100%);
}
```

(b) 必须画进画布时(比如要做截图/离线合成):预生成一次精灵,每帧一趟 multiply。
```js
// 初始化:预生成暗角精灵
const vig = document.createElement('canvas'); vig.width = W; vig.height = H;
const vx = vig.getContext('2d');
const g = vx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*0.80);
g.addColorStop(0, 'rgba(255,255,255,1)');   // 中间不改亮度
g.addColorStop(1, 'rgba(0,0,0,1)');         // 边缘压黑
vx.fillStyle = g; vx.fillRect(0, 0, W, H);

// 每帧(放在 bloom 之后)
ctx.globalCompositeOperation = 'multiply';
ctx.globalAlpha = 0.75;
ctx.drawImage(vig, 0, 0);
ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
```
参数:`globalAlpha` 0.6–0.85;内侧半径 `0.32–0.40 × H`、外侧 `0.75–0.85 × H`。实测一趟 multiply drawImage ≈ 2.6ms(含该配置自带的一次场景 blit,所以纯增量 ≈ 一次全屏趟)。
坑:`multiply` 会把暗角区域的**加性 bloom 也一起压暗**,这正是想要的效果(暗角内的霓虹更聚焦);但如果 bloom 强度很高,边缘光晕会被暗角吃掉,需要相应减小暗角 alpha。

### 5.2 色差 Chromatic Aberration — ★★☆☆☆
**做法**:把画面复制一份,然后用 `multiply` + 纯红/纯绿/纯蓝提取单通道,再偏移叠加。最省的两趟版本:

```js
const caTmp = document.createElement('canvas'); caTmp.width = W; caTmp.height = H;
const caX = caTmp.getContext('2d');

function chromaticAberration(ctx, px) {           // px = 1..3 像素偏移
  caX.setTransform(1,0,0,1,0,0);
  caX.globalCompositeOperation = 'source-over';
  caX.globalAlpha = 1; caX.filter = 'none';
  caX.clearRect(0, 0, W, H);
  caX.drawImage(ctx.canvas, 0, 0);

  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'none';
  ctx.globalAlpha = 0.10;                          // 关键:非常低,否则画面发虚
  ctx.drawImage(caTmp,  px, 0, W, H, 0, 0, W, H);
  ctx.drawImage(caTmp, -px, 0, W, H, 0, 0, W, H);
  ctx.restore();
}
```
参数:`px = 1–2`(1280 宽下,>3 会明显"散架");`globalAlpha = 0.08–0.14`;偏移方向最好**只在径向**(离屏幕中心越远偏移越大)才能像真实镜头,但那样需要逐像素缩放,成本翻几倍——不建议。**实测 9.0ms** —— 这是本表里最贵的一项之一(1 次全屏 copy + 2 趟全屏 `lighter`),**性价比低**。
建议:**只在受击/爆炸的 1–2 帧里开**,或者干脆用 CSS 的 `filter` 挂在 canvas 元素上做一点点色散(不占画布时间)。

### 5.3 噪点 / 胶片颗粒 Grain — ★★★☆☆
**做法**:初始化时用 `createImageData` 生成 4–8 张 256×256 噪声瓦片(纯 JS,零资源),每帧随机挑一张用 `createPattern` 铺满。随机换瓦片能让颗粒"动"起来。

```js
// 初始化
const noiseTiles = [];
for (let k = 0; k < 6; k++) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const id = x.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 110 + Math.random() * 90;            // 中灰附近,靠 overlay 决定明暗
    id.data[i] = id.data[i+1] = id.data[i+2] = v;
    id.data[i+3] = 255;
  }
  x.putImageData(id, 0, 0);
  noiseTiles.push(c);
}
const noisePat = ctx.createPattern(noiseTiles[0], 'repeat');

// 每帧
function grain(ctx, frame) {
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.05 + (frame % 2) * 0.01;      // 极低,0.04–0.08
  ctx.fillStyle = noisePat;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
```
参数:alpha **0.04–0.08**(超过 0.12 就像电视雪花);`overlay` 让中灰基本不动画面,只加对比噪点;用 `'source-over'` 会整体蒙灰,别用。
**实测 3.1ms/趟**(pattern fillRect),比 `drawImage` 精灵贵一点。
省法:瓦片只需要 4 张、每 2–3 帧换一次,减少 pattern 重建。

### 5.4 扫描线 Scanlines — ★★★☆☆
```js
// 初始化:4×4 图案
const sl = document.createElement('canvas'); sl.width = 4; sl.height = 4;
const sx2 = sl.getContext('2d');
sx2.fillStyle = 'rgba(0,0,0,0.40)'; sx2.fillRect(0, 0, 4, 2);   // 隔行压暗
const slPat = ctx.createPattern(sl, 'repeat');

// 每帧
ctx.globalAlpha = 0.5;
ctx.fillStyle = slPat;
ctx.fillRect(0, 0, W, H);
ctx.globalAlpha = 1;
ctx.fillStyle = '#000';       // 复位 fillStyle,避免污染后续单位绘制
```
参数:`globalAlpha 0.35–0.6`,即整体压暗 7–12%;**周期一定要整除逻辑高度**(720 用 2/4 像素周期,避免出现"滚动的摩尔纹")。
**实测 3.3ms/趟**。
更省的做法:同样的图案做成 CSS `repeating-linear-gradient` 的兄弟 div,画布开销 0。
坑:扫描线 + 颗粒 + 暗角三个叠起来 = ~9ms,直接吃掉一半预算。**三选一或二,别全上。**

### 5.5 色调分离 / 分级 Grade / LUT — ★★★★☆
Canvas 2D 没有 LUT,但**两趟 multiply/screen 的"双色调分级"能拿到 80% 的效果**:

```js
// 阴影染青、亮部染橙(经典青橙调)
function grade(ctx) {
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.filter = 'none';

  ctx.globalCompositeOperation = 'multiply';       // 压阴影进青蓝
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#30507a';
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';        // 提亮部进暖橙
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ff9a3c';
  ctx.fillRect(0, 0, W, H);

  ctx.restore();
}
```
参数:`multiply` 蓝青 alpha 0.12–0.22;`lighter` 暖橙 alpha 0.04–0.09。**实测每趟 fillRect ≈ 1.9ms**(含场景 blit)。
**最省的替代:直接把 CSS `filter` 挂在 canvas 元素上**,画布开销 0:
```css
#c { filter: saturate(1.12) contrast(1.05) brightness(0.98) hue-rotate(-4deg); }
```
这几乎是免费的(在合成器上跑),而且可以在"切场景/受击"时用 CSS transition 平滑过渡。

### 5.6 径向模糊 Radial / Zoom Blur — ★☆☆☆☆
**实测 11.0ms(4 趟缩放 `lighter`)**,是最贵的一项。除了一次性的死亡/冲刺特效,别用。
最省的近似:2 趟 —— 一趟 1.00(原样)、一趟 1.04(放大)以 `lighter` 叠加;或者只在 1/4 图层上做再放大回去(成本直接降到 1/4 的趟数)。

```js
function zoomBlur(ctx, n, amount) {         // n 越小越省;2–3 就够
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'none';
  for (let i = 1; i <= n; i++) {
    const s = 1 + (amount * i) / n;        // amount ≈ 0.03–0.06
    const dw = W * s, dh = H * s;
    ctx.globalAlpha = 0.35 / n;
    ctx.drawImage(ctx.canvas, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  ctx.restore();
}
```
**坑**:`ctx.drawImage(ctx.canvas, ...)` 自己画自己,规范上允许(浏览器内部会 snapshot),但**同时读写同一个 canvas 在实现之间行为不完全一致**,而且会强制一次快照。稳妥做法是先 `drawImage` 到离屏副本,再从副本放大叠回(就是上表测的 4 趟版本)。

### 5.7 屏幕抖动 Screen Shake — ★★★★★(不是后处理,但最该先加)
**纯变换,零成本**。用"trauma"模型:伤害事件只加 `trauma`,`trauma` 自己平方衰减,位移/旋转都从 `trauma²` 派生(这样大冲击和小冲击的手感差异更自然)。

```js
let trauma = 0;                                  // 0..1
const MAX_OFFSET = 18, MAX_ANGLE = 0.035;        // 像素 / 弧度

function addTrauma(t) { trauma = Math.min(1, trauma + t); }

function applyShake(ctx, dt) {
  trauma = Math.max(0, trauma - dt * 1.4);       // 约 0.7s 归零
  const s = trauma * trauma;                     // 关键:平方
  if (s <= 0) return;
  const a = Math.random() * Math.PI * 2;
  const r = MAX_OFFSET * s * (0.6 + Math.random() * 0.4);
  ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
  ctx.rotate((Math.random() * 2 - 1) * MAX_ANGLE * s);
}
```
参数:小命中 `addTrauma(0.15)`、爆炸 `addTrauma(0.5)`、玩家死亡 `addTrauma(1.0)`;衰减 1.2–1.8/s;`MAX_OFFSET` 12–20px(1280 宽)。
参考实现与出处:Bevy 的 `2d_screen_shake` 官方示例就是 trauma 模型;原始出处是 Squirrel Eiserloh 的 GDC 演讲 *Math for Game Programmers: Juicing Your Cameras With Math*。
**坑**:抖动加在最后一步 `setTransform` 之后会连 UI 一起抖;HUD 应该画在抖动变换之外。

### 5.8 组合建议(合计 ≈ 1–2 趟额外成本)
1. 兄弟 `<div>`:暗角 + (可选)扫描线 → **canvas 开销 0**
2. 画布内:1/4 bloom(3 趟,~3ms)
3. 画布内:1 趟低 alpha `overlay` 颗粒(可选,~3ms)
4. 屏幕抖动:纯变换,0ms
5. 分级:`canvas { filter: saturate(1.1) contrast(1.05) }` → 0ms

---

## 6. 暗部被"洗白"与边缘锯齿/振铃

### 结论
**洗白的根因几乎总是"没有做亮部提取"或"叠加 alpha 太高"**——而不是模糊的问题:如果没有阈值,深底 `#04060a` 会被模糊+加性叠加一遍,底色整体抬升,看起来就是蒙了一层灰。**修法:① 一定要做阈值;② 常态 `BLOOM_A ≤ 0.5`;③ 用更小的模糊半径 + 更高的阈值(宁可"光晕窄而亮",不要"大面积泛白")。**
**边缘锯齿/振铃的根因是阈值过渡带太窄 + 低分辨率放大**,而不是高斯本身的振铃:Skia 的高斯是 box 近似的,基本不产生振铃。修法是**加宽过渡带**(降低 `contrast`)、`imageSmoothingQuality='high'`、以及给图层留 padding。

### 6.1 暗部洗白

诊断顺序:
1. **确认阈值真的生效**。用 §2 的自检代码打印 `0..255 → 输出`,确认你关心的暗部区间输出是 0。如果背景是 `#04060a`(4/255),而输出不是 0,说明 `b`/`c` 配错了或者滤镜没设上。
2. **降低叠加 alpha**。`BLOOM_A` 从 0.85 降到 **0.35–0.5**。实测 0.85 时暗部抬升非常明显。这是**零成本**的修法,优先做。
3. **提高阈值(减小 `brightness` 的 b)而不是提高对比度**。`brightness(2) contrast(4)` 的阈值是 0.188;如果暗部仍然泛光,试 `brightness(3) contrast(4)`(阈值 0.125)或 `brightness(4) contrast(4)`(阈值 0.094)。
4. **收窄光晕半径**。半径越大,被"抬起"的面积越大。把 `BLUR_R` 从 3 降到 1.5–2。
5. **恢复黑位(可选,一趟)**。如果已经洗白了,最后加一趟轻微的 `multiply` 常数把地板压回去:
```js
ctx.globalCompositeOperation = 'multiply';
ctx.globalAlpha = 1;
ctx.fillStyle = '#f5f5f5';    // k ≈ 0.96,等比压低全画面
ctx.fillRect(0, 0, W, H);
```
这一趟会把亮部也压暗 4%,可以接受;成本 ≈ 一趟 fillRect(实测 ~1.9ms)。更好的做法是让 bloom 本身别过度,而不是事后补救。
6. **用 CSS 收尾(0 成本)**:`canvas { filter: contrast(1.06) brightness(0.97); }` 能把抬起的黑位压回去一截,而且不占画布时间。

### 6.2 边缘锯齿 / 硬边 / 振铃

按可能性排序:

1. **阈值过渡带太窄 → 掩码边缘是硬边,再一模糊就变成一圈硬光环**。
   过渡带宽 = `1/(b*c)`。`brightness(4) contrast(8)` 只有 0.031(≈8 个 8bit 级别),任何一点抖动都会让边缘在"亮/不亮"之间跳。→ **把 `contrast` 从 8 降到 3–4**,过渡带变成 0.06–0.125(15–32 级),halo 边缘立刻变顺。
2. **低分辨率放大导致的块状/锯齿**。1/4 图层放回 1280×720 是 4 倍最近邻的邻居。→ 打开 `ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';`。**这一条几乎总是被漏掉**。
3. **图层边界把光晕切平**(最常见的"假锯齿")。bloom 图层是 320×180,和屏幕同尺寸;贴着屏幕边缘的亮物,光晕在边界被截断成一条直边。→ 给图层四周留 `pad = ceil(3 * BLUR_R)` 像素的空白,场景画进去时偏移 `+pad`、叠回时偏移 `-pad*DIV`。
4. **源图形本身就有锯齿,bloom 把它放大了**。发光体的亮部核心被模糊并加性复制,原来 1px 的硬边现在带一圈同样硬的复制品。→ 发光体本身用径向渐变(软边)绘制,而不是实心 `fillRect`;或者把 bloom 的核心(高 alpha、小半径)和光晕(低 alpha、大半径)分开成两层。
5. **`drop-shadow` 不要拿来当 glow**。它是"alpha 掩码的模糊+偏移",不是"亮部提取",会给出硬边影子和错误颜色,而且每个 draw call 都单独建图层。
6. **两级模糊替代一级大模糊**。两趟 `blur(r/√2)` 的总和 ≈ 一趟 `blur(r)`,但合成出来的过渡更平滑、更少方块感;实测双模糊只贵 ~0.9ms(3.97 vs 3.10)。
7. **如果真的有"振铃"**:检查是不是在 `contrast()` 之后又叠加了 `drop-shadow` 或用了 SVG filter(`feConvolveMatrix` 才会真正振铃)。Canvas 2D 的 `blur()` 是 box 近似,**本身不产生负向振铃**(负值会被 clamp,见 SVG 1.1 §15.7.1)。

---

## 7. "只在爆炸/受击瞬间强调性 bloom"(动态强度)

### 结论
**最便宜的做法是把 bloom 管线常态化、只在最后叠加那一步改 `globalAlpha`,并把阈值预设成 2–3 档切换**——零额外 draw call。想要"超过 1 倍"的强度,靠**再叠一次 bloom 层**或**降低阈值(brightness)**来实现,因为 `globalAlpha` 上限就是 1。

### 做法 A:全局 bloom 能量(推荐,0 额外成本)

```js
let bloomEnergy = 0;                 // 0..~1.6
const BASE_A = 0.45;                 // 常态
const FLASH_B = 1.2;                 // 闪光时把 brightness 降下来 → 阈值变低 → 更多像素发光

// 事件发生时
function onExplosion() { bloomEnergy = Math.min(1.6, bloomEnergy + 0.9); }
function onHit()       { bloomEnergy = Math.min(1.6, bloomEnergy + 0.35); }

// 每帧
function updateBloom(dt) {
  bloomEnergy *= Math.pow(0.02, dt);        // 半衰期 ≈ 0.18s(与帧率无关)
  if (bloomEnergy < 0.001) bloomEnergy = 0;
}

// 合成时
const a  = Math.min(1, BASE_A + bloomEnergy * 0.55);        // alpha 上限 1!
const bb = BRIGHT_B / (1 + bloomEnergy * 0.5);              // 阈值随能量下降
// 预设 2–3 套滤镜字符串,避免每帧拼接(见 §4 坑 5)
brightX.filter = bb > 1.6 ? BRIGHT_STRONG : BRIGHT_NORMAL;
ctx.globalAlpha = a;

// 想要 >1 倍的强度:再叠一次(第 4 趟)
if (bloomEnergy > 0.6) {
  ctx.globalAlpha = (bloomEnergy - 0.6) * 0.8;
  ctx.drawImage(blurC, 0, 0, bw, bh, 0, 0, W, H);
}
```

参数建议:
- 常态 `BASE_A = 0.35–0.5`
- 受击 `+0.3`,`bloomEnergy` 峰值 0.4–0.6,衰减半衰期 0.15–0.25s
- 爆炸 `+0.9`,`bloomEnergy` 峰值 1.0–1.6,额外叠一趟 alpha 0.2–0.5
- **务必用 `Math.pow(k, dt)` 而不是 `*= 0.9`**,否则不同刷新率(60/120/144Hz)下手感不一致

### 做法 B:局域强调(最省,推荐与 A 混用)
不要动全局管线,直接给爆炸本身画一层预制辉光精灵:

```js
// 初始化:预生成 1 张 256×256 的软辉光
const glowC = document.createElement('canvas'); glowC.width = glowC.height = 256;
const gx = glowC.getContext('2d');
const gg = gx.createRadialGradient(128, 128, 0, 128, 128, 128);
gg.addColorStop(0.00, 'rgba(255,255,255,1)');
gg.addColorStop(0.25, 'rgba(180,230,255,0.55)');
gg.addColorStop(1.00, 'rgba(60,120,255,0)');
gx.fillStyle = gg; gx.fillRect(0, 0, 256, 256);

// 爆炸时:一次加性绘制,半径随生命周期放大、alpha 衰减
function drawExplosionGlow(ctx, x, y, life) {   // life: 1 → 0
  const r = 90 + (1 - life) * 220;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, life * 1.4);
  ctx.drawImage(glowC, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
```
每个爆炸 1 趟 draw call,成本与面积成正比(几千像素,可忽略)。**爆炸不多的话,这是最划算的强调手段**,而且完全不依赖 `ctx.filter`(Safari 也能用)。

### 做法 C:闪光帧 + 抖动 + 缩放脉冲(几乎免费)
```js
// 全屏白闪(1 趟 fillRect,~1.9ms,只持续 2–4 帧)
ctx.globalCompositeOperation = 'lighter';
ctx.globalAlpha = 0.18 * flash;          // flash: 1 → 0
ctx.fillStyle = '#bfe4ff';
ctx.fillRect(0, 0, W, H);
ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

// bloom 层缩放脉冲:合成时把 dw/dh 放大 4–8%,做出"光晕炸开"感(0 额外成本)
const s = 1 + bloomEnergy * 0.06;
ctx.drawImage(blurC, -(W*s - W)/2, -(H*s - H)/2, W*s, H*s);

// 屏幕抖动:见 §5.7
```

### 坑
- **`globalAlpha` 只在 `[0,1]` 内生效,超出范围是"静默无效"而不是 clamp**。MDN 对 `globalAlpha` 的说明是值域 `0.0–1.0`,范围外的值被忽略——也就是说你写 `ctx.globalAlpha = 1.5` **不会变成 1,而是保持上一次的值**(很可能还是 0.45),你会以为"闪光是亮的",实际什么都没发生。这是极易踩的坑。想更强只能"多叠一趟"或"降阈值",这两条都要多一趟 draw call 或换滤镜字符串。
- **每帧换滤镜字符串**要小心:预制 `BRIGHT_NORMAL` / `BRIGHT_FLASH` 两个常量,二元切换,不要插值拼串。
- **能量不要直接线性衰减到 0**:线性衰减的"尾巴"很拖沓;用指数衰减(半衰期)手感更利落。
- **不同刷新率**:所有时间相关的量都用 `dt` 驱动(见上面的 `Math.pow`)。
- **别在爆炸时同时开满所有效果**(bloom + 色差 + 径向模糊 + 闪光 + 抖动),60fps 下会直接掉帧——而掉帧恰好发生在最需要流畅的时刻。

---

## 8. 落地清单(按顺序做)

1. **先加屏幕抖动**(纯变换,0 成本,手感提升最大)。
2. **暗角/扫描线/分级做成 CSS 兄弟 div + `canvas { filter }`**(0 画布成本)。
3. **加 1/4 bloom**:3 趟(阈值 → 模糊 → `lighter` 叠加),`brightness(2) contrast(4)`、`blur(2px)`(图层像素)、`globalAlpha 0.45`。
4. **加 `multiply` 颜色保留趟**(第 4 趟),让霓虹光晕有颜色。
5. **做成能量驱动的动态强度**(改 alpha,0 成本)。
6. **补特性探测 + 降级**:不支持时把发光烘焙进精灵图,不要硬上 SVG filter。
7. **扩展与维护**:`pad` 处理屏幕边缘、预存滤镜字符串、`imageSmoothingQuality='high'`、绝不在主循环里 `getImageData`、`willReadFrequently` 永不用于主画布。
8. **每加一个全屏后处理,就在你自己的机器上用 `bench/bloom-bench.html` 复测一次增量**——本机一个全屏趟 ≈1–3ms,你的目标得自己定。

---

## 9. 来源

**浏览器兼容 / 规范**
- MDN,`CanvasRenderingContext2D.filter`(含 "Limited availability / not Baseline" 状态与 filter 函数列表,`blur()` = 高斯标准差):
  https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter
- MDN Browser Compat Data(权威版本号:Chrome 52 / Firefox 49 / Safari 18 **带 `Canvas Filters` preference flag**):
  https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/CanvasRenderingContext2D.json
- caniuse 对应条目:https://caniuse.com/mdn-api_canvasrenderingcontext2d_filter
- WebKit Bugzilla 198416 "Support CanvasRenderingContext2D.filter"(2019 提交 → 2024-04-25 commit 278000@main 落地;含 bug 246697 实验开关;含 WebKit 工程师关于 Safari SVG filter 性能差的评论):
  https://bugs.webkit.org/show_bug.cgi?id=198416
- W3C,Filter Effects Module Level 1(`blur()` 等价 `feGaussianBlur`;§13.1.7 brightness / §13.1.8 contrast 的 markup 等价):
  https://www.w3.org/TR/filter-effects-1/
- SVG 1.1 §15.7.1(滤镜结果**逐 primitive 被 clamp**;`feColorMatrix`/`feComponentTransfer` 在非预乘数据上工作;`color-interpolation-filters` 默认 linearRGB):
  https://www.w3.org/TR/SVG11/filters.html
- MDN,`contrast()`(amount 语义、`contrast(0)` = 全灰、`contrast(1)` = 不变):
  https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/filter-function/contrast

**合成 / 混合语义**
- MDN,`globalCompositeOperation`(`"lighter"` = 颜色相加;`"multiply"` = 上下层相乘):
  https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
- W3C,Compositing and Blending Level 1(separable blend mode 的 `multiply`/`overlay` 公式;`lighter` 的 Porter-Duff `plus`):
  https://www.w3.org/TR/compositing-1/

**性能 / 读回**
- MDN,`HTMLCanvasElement.getContext()`,`willReadFrequently`:**"will force the use of a software (instead of hardware accelerated) 2D canvas"**:
  https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext

**Bloom 原理与降采样**
- LearnOpenGL, Bloom(亮部提取用亮度加权、加性合成、以及"没有 HDR 时阈值必须 <1、泛光容易过强"的明确警告):
  https://learnopengl.com/Advanced-Lighting/Bloom

**屏幕抖动**
- Bevy 官方示例 `2d_screen_shake`(trauma 模型的可运行参考实现):
  https://bevy.org/examples/camera/2d-screen-shake/
- Squirrel Eiserloh, *Math for Game Programmers: Juicing Your Cameras With Math*(trauma² 模型的原始出处,GDC)。

**本报告未找到可靠来源、已明确标注为"推断/推导"的部分**
- `brightness`/`contrast` 的 feComponentTransfer 等价式常量(规范章节存在,但本次抓取被截断,未取到逐字原文)→ 按线性传递函数推导,并给了自检代码。
- Firefox / Safari 上 `ctx.filter` 的**具体毫秒数**(未找到任何可信的第三方 benchmark)→ 只有本机 Chromium 实测数据。
- `desynchronized: true` 与逐帧多图层滤镜叠加的相互作用 → 无资料,默认不开。
- `ctx.filter` 字符串每帧拼接的重新解析开销 → 无资料,属工程经验。
- 一个全屏合成趟在"健康的 GPU 加速路径"上的真实成本 → 本机测得 1–3ms,但该机器连一次全屏 blit 都要 4ms,绝对值不应外推。

**本机实测原始数据**(自测,非第三方):本报告 §4 全部数字,环境 Edge/Chromium 127 · ANGLE D3D11 · RTX 4060 Laptop · 1280×720 · Windows · 30×3 次取中位。基准页:`F:\inkfall\bench\bloom-bench.html`(自包含,双击可跑)。
