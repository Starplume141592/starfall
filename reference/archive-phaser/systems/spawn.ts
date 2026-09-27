import type { EnemyDef } from '../data/enemies';
import { ENEMIES } from '../data/enemies';

export interface SpawnOrder {
  def: EnemyDef;
  hpMultiplier: number;
  x: number;
  y: number;
}

export interface SpawnConfig {
  intervalMs: number;
  hpMultiplier: number;
}

/**
 * 分钟曲线（目标：站着不动也能活过 3 分钟）
 *   0–1 分：间隔 1100ms，血量 ×1.00，仅小鬼
 *   1–2 分：间隔  950ms，血量 ×1.20
 *   2–3 分：间隔  820ms，血量 ×1.45
 *   3–5 分：间隔  700ms，血量 ×1.85，开始混入厉鬼
 *   5 分+ ：每 60s 间隔 −60ms（下限 260），血量 +0.35
 */
export function spawnConfigAt(elapsedMs: number): SpawnConfig {
  const min = elapsedMs / 60000;
  if (min < 1) return { intervalMs: 1100, hpMultiplier: 1.0 };
  if (min < 2) return { intervalMs: 950, hpMultiplier: 1.2 };
  if (min < 3) return { intervalMs: 820, hpMultiplier: 1.45 };
  if (min < 5) return { intervalMs: 700, hpMultiplier: 1.85 };
  const extra = Math.floor(min - 5);
  const intervalMs = Math.max(260, 700 - extra * 60);
  const hpMultiplier = 1.85 + extra * 0.35;
  return { intervalMs, hpMultiplier };
}

/** 纯刷怪调度，返回本帧要生成的敌人；rng 注入便于单测。 */
export class SpawnSystem {
  private accumMs = 0;

  update(
    dtMs: number,
    elapsedMs: number,
    viewW: number,
    viewH: number,
    rng: () => number = Math.random,
  ): SpawnOrder[] {
    const cfg = spawnConfigAt(elapsedMs);
    this.accumMs += dtMs;
    const orders: SpawnOrder[] = [];
    while (this.accumMs >= cfg.intervalMs) {
      this.accumMs -= cfg.intervalMs;
      orders.push(this.makeOrder(cfg.hpMultiplier, viewW, viewH, elapsedMs, rng));
    }
    return orders;
  }

  private makeOrder(
    hpMultiplier: number,
    viewW: number,
    viewH: number,
    elapsedMs: number,
    rng: () => number,
  ): SpawnOrder {
    const useLi = elapsedMs > 180000 && rng() < 0.3;
    const def = useLi ? ENEMIES.ligui! : ENEMIES.xiaogui!;
    const cx = viewW / 2;
    const cy = viewH / 2;
    const ang = rng() * Math.PI * 2;
    const rad = Math.max(viewW, viewH) * 0.6 + rng() * 60;
    return {
      def,
      hpMultiplier,
      x: cx + Math.cos(ang) * rad,
      y: cy + Math.sin(ang) * rad,
    };
  }

  reset(): void {
    this.accumMs = 0;
  }
}
