# 星陨 · Starfall

俯视角霓虹科幻「幸存者 + 弹幕」生存游戏。原生 ES module + Canvas 2D，**零依赖、零打包、零外部美术资源**——所有画面（单位、特效、星空、图标）都是代码画的。

**▶ 在线试玩：https://starplume141592.github.io/starfall/**

## 怎么跑

在线版直接点上面的链接。本地跑：

```bash
npm run dev          # 起一个极简静态服务器
# 打开 http://localhost:5173/
```

必须走 HTTP 服务器：ES module 在 `file://` 下会被浏览器 CORS 拦掉，双击 `index.html` 打不开。

## 操作

| 键 | 作用 |
|---|---|
| `WASD` / 方向键 | 机动（自动开火） |
| 滚轮 或 `-` `=` | 调镜头高度 0.7×–1.6×（选择会记住） |
| `1` `2` `3` | 升级面板选卡 |
| `ESC` | 暂停 · `M` 静音 · `R` 结算后重开 |

触屏设备有虚拟摇杆。

## 玩法

击杀掉落数据残片 → 吃碎片升级 → 三选一改装。10 把武器（群攻/环绕/光束/回旋/霰弹…）+ 8 项属性 + 6 个「超频跃迁」模组。每 5 波出陨级装甲核心（Boss），精英波周期性来袭。单局目标 **8–15 分钟**。

**射程是核心属性**：从贴身 66 到远程 780，面板上的射程条与实际命中距离一致（有自检脚本保证）。

## 工程说明

写给未来的自己 / 接手的人：

- [`reference/架构.md`](reference/架构.md) —— **架构契约**：文件职责、坐标与镜头、不变式（改代码前必读）、平衡方法论、验证记录
- `reference/改造设计.md`、`reference/demo-spec.md` —— 立项时的改造方案与 Demo 规格
- `docs/canvas2d-bloom-report.md` —— Canvas 2D 辉光/后处理的技术调研（含实测数据表）
- `research/` —— 打击感、粒子预算、无障碍、击退数值等调研底稿
- `bench/palette-check.mjs` —— 调色板校验（明度分带 + 三型色盲模拟 + 跨带断言）：`node bench/palette-check.mjs`
- `bench/bloom-bench.html` —— 辉光开销基准页，浏览器直接打开

### 设计上的几条硬约束

1. `config.js` 不 import 任何模块，保持纯数据 + 纯函数
2. `render.js` 只读状态，绝不改状态
3. 碰撞一律走空间网格，禁止全量扫描敌人数组
4. 粒子/飘字必须有上限，实体删除用 `swapRemove`
5. 刷怪点必须落在视口外（垂直方向那条边不能 clamp 进世界）
6. 任何"一屏多大"的地方都必须走 `viewW()` / `viewH()`（镜头高度可调之后，裸用 `W`/`H` 会算错）
7. 改 `WORLD` 尺寸或武器射程，必须重跑对应的验证（见架构文档的验证记录表）

## 调试钩子

浏览器控制台里可以直接读写（不影响游戏）：

```js
__game.sim(60, { bot: true, step: 1 / 40, pick: 0 })  // 不出画面地推进 60 秒
__game.bot(true)          // 自动走位机器人
__game.snapshot()         // 当前局面摘要
__game.setZoom(0.7)       // 镜头高度
__game.fx.bloom = false   // 关掉辉光（backdrop / vignette 同理）
__game.restart()
```
