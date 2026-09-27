// 星陨 · 图标集 —— 24×24 网格、单色霓虹矢量（描边 + 半透明填充），零依赖。
//
// 为什么不用 emoji：emoji 的字形和配色由系统字体决定，Windows/Mac/Android 三套完全不同，
// 而且自带颜色（黄色的 🛡️、彩色的 🦠）会和调色板的"威胁分带"打架 —— 图标颜色必须可控。
// 这里所有图标只用两种笔触：1.7px 描边 + 22% 透明填充，颜色跟随调用方（武器用自己的色，其余用 UI 主色）。

const svg = (color, body) =>
  `<svg class="ico" viewBox="0 0 24 24" style="color:${color}" fill="none" stroke="currentColor"` +
  ` stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const F = 'fill="currentColor" fill-opacity=".22"';   // 半透明填充：给形体内芯
const S = 'fill="currentColor"';                      // 实心：核心 / 光点

/** UI 默认色（调色板 ui.accent）；武器会传自己的颜色进来 */
const UI = '#8FB0CF';

export const ICONS = {
  /* ==================== 武器 ==================== */
  dart: c => svg(c || '#63b3ff',
    `<path d="M3 6l5 3-5 3"/><path d="M3 12l5 3-5 3"/><path d="M11.5 8l7.5 4-7.5 4z" ${F}/><circle cx="14.5" cy="12" r="1.2" ${S}/>`),
  orbit: c => svg(c || '#7FD8FF',
    `<path d="M12 9.4l2.3 1.3v2.6L12 14.6l-2.3-1.3v-2.6z" ${F}/><circle cx="12" cy="3.6" r="1.7" ${S}/><circle cx="19.3" cy="16.2" r="1.7" ${S}/><circle cx="4.7" cy="16.2" r="1.7" ${S}/>`),
  saw: c => svg(c || '#B8F0FF',
    `<circle cx="12" cy="12" r="3.2" ${F}/><path d="M12 2.8v3.4M12 17.8v3.4M2.8 12h3.4M17.8 12h3.4M5.5 5.5l2.4 2.4M16.1 16.1l2.4 2.4M18.5 5.5l-2.4 2.4M7.9 16.1l-2.4 2.4"/>`),
  nova: c => svg(c || '#6F8CFF',
    `<circle cx="12" cy="12" r="2.6" ${S}/><path d="M12 5.6a6.4 6.4 0 010 12.8"/><path d="M7.4 3.4a10.6 10.6 0 000 17.2"/><path d="M16.6 3.4a10.6 10.6 0 010 17.2"/>`),
  chain: c => svg(c || '#9ae6ff',
    `<path d="M13.6 2.6L6.4 13.2h4.2l-1.2 8.2 7.2-11h-4.2z" ${F}/>`),
  laser: c => svg(c || '#7cf5a0',
    `<path d="M2.6 12h12.8"/><path d="M14.5 8.4l6.9 3.6-6.9 3.6z" ${F}/>`),
  boomerang: c => svg(c || '#4FD6C8',
    `<path d="M4.8 5.6l7.2 6.2 7.2-6.2"/><path d="M5.6 13.4c1 4.2 3.4 6.4 6.4 6.4s5.4-2.2 6.4-6.4" stroke-dasharray="3 3"/>`),
  overload: c => svg(c || '#a855f7',
    `<circle cx="12" cy="12" r="2" ${S}/><path d="M12 9.4V3.2"/><path d="M14.5 13.4l5.3 3.1"/><path d="M9.5 13.4l-5.3 3.1"/><circle cx="12" cy="12" r="8.6" stroke-dasharray="2 4"/>`),
  nanoswarm: c => svg(c || '#22d3ee',
    `<circle cx="7.6" cy="7.6" r="2.1" ${F}/><circle cx="16.4" cy="7.6" r="2.1" ${F}/><circle cx="7.6" cy="16.4" r="2.1" ${F}/><circle cx="16.4" cy="16.4" r="2.1" ${F}/><circle cx="12" cy="12" r="1.5" ${S}/>`),
  flak: c => svg(c || '#A8C8FF',
    `<path d="M12 2.8l7.2 3v5.6c0 4.3-3 7.4-7.2 9.4-4.2-2-7.2-5.1-7.2-9.4V5.8z" ${F}/><circle cx="12" cy="9.6" r="1.3" ${S}/><circle cx="9.2" cy="13.6" r="1.3" ${S}/><circle cx="14.8" cy="13.6" r="1.3" ${S}/>`),

  /* ==================== 属性 ==================== */
  dmg: c => svg(c || UI, `<path d="M12 20.5V5"/><path d="M6.5 10.5L12 5l5.5 5.5"/><path d="M5 20.5h14"/>`),
  as: c => svg(c || UI, `<circle cx="12" cy="12.4" r="8.2"/><path d="M12 8v4.6l3.2 2"/>`),
  spd: c => svg(c || UI, `<path d="M5 6l6 6-6 6"/><path d="M13 6l6 6-6 6"/>`),
  hp: c => svg(c || UI, `<path d="M12 3l7 3v5.8c0 4.4-3 7.6-7 9.2-4-1.6-7-4.8-7-9.2V6z" ${F}/><path d="M12 8.6v6M9 11.6h6"/>`),
  heal: c => svg(c || UI, `<circle cx="12" cy="12" r="8.2"/><path d="M12 8.2v7.6M8.2 12h7.6"/>`),
  pick: c => svg(c || UI, `<path d="M6.6 4.4v7.2a5.4 5.4 0 0010.8 0V4.4"/><path d="M6.6 9.6h3.6M13.8 9.6h3.6"/>`),
  armor: c => svg(c || UI, `<path d="M12 3l7 3v5.8c0 4.4-3 7.6-7 9.2-4-1.6-7-4.8-7-9.2V6z"/><path d="M8.4 11.8l3.6 2.1 3.6-2.1"/>`),
  crit: c => svg(c || UI, `<circle cx="12" cy="12" r="6.4"/><path d="M12 2.6v3.4M12 18v3.4M2.6 12H6M18 12h3.4"/><circle cx="12" cy="12" r="1.4" ${S}/>`),

  /* ==================== 超频跃迁模组 ==================== */
  matrix: c => svg(c || UI, `<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" ${F}/>`),
  phase: c => svg(c || UI, `<path d="M12 2.8l7.6 4.4v9.6L12 21.2l-7.6-4.4V7.2z" ${F}/><circle cx="12" cy="12" r="3.4"/>`),
  slowfield: c => svg(c || UI, `<circle cx="12" cy="12" r="2.6" ${S}/><circle cx="12" cy="12" r="6.2" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="9.6" stroke-dasharray="2 4"/>`),
  nano: c => svg(c || UI, `<circle cx="12" cy="12" r="8.4" stroke-dasharray="2 3"/><path d="M12 8.4v7.2M8.4 12h7.2"/>`),
  singularity: c => svg(c || UI, `<circle cx="12" cy="12" r="3.4" ${S}/><path d="M12 2.8a9.2 9.2 0 019.2 9.2"/><path d="M12 21.2A9.2 9.2 0 012.8 12"/>`),
  overcore: c => svg(c || UI, `<path d="M12 2.8l7.6 4.4v9.6L12 21.2l-7.6-4.4V7.2z"/><path d="M13.2 7.6l-3.6 5.2h3l-1 4.2 3.8-5.4h-3z" ${S}/>`),

  /* ==================== 保底选项 ==================== */
  repair: c => svg(c || UI, `<path d="M4 7.5h16v12H4z" ${F}/><path d="M12 10.4v6.2M8.9 13.5h6.2"/>`),
  salvage: c => svg(c || UI, `<path d="M12 3l7 9-7 9-7-9z" ${F}/><path d="M5 12h14"/>`),

  /* ==================== 后补的两条生存属性 ==================== */
  hpPct: c => svg(c || UI, `<path d="M12 2.8l7.6 4.4v9.6L12 21.2l-7.6-4.4V7.2z" ${F}/><path d="M12 7.6v9M9.2 10.4h5.6M9.2 13.6h5.6"/>`),
  vamp: c => svg(c || UI, `<path d="M12 3.2c3.4 4.2 5.6 7 5.6 9.8a5.6 5.6 0 11-11.2 0C6.4 10.2 8.6 7.4 12 3.2z" ${F}/><path d="M9.7 14.2a2.5 2.5 0 002.5 2.5"/>`)
};

/** 取图标：先查表，查不到就退回 emoji（保证任何新加的内容都不会变成空白） */
export function iconFor(id, color, fallback) {
  const f = ICONS[id];
  return f ? f(color) : (fallback || '');
}
