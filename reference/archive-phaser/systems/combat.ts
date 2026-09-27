import type { PlayerStats } from '../core/stats';

export interface EnemySnapshot {
  id: number;
  x: number;
  y: number;
  alive: boolean;
}

export interface FireOrder {
  targetId: number;
  targetX: number;
  targetY: number;
  damage: number;
}

export interface CombatResult {
  shots: FireOrder[];
  cooldownLeftMs: number;
}

/**
 * 纯逻辑自动攻击：射程内最近敌人，冷却归零时发射 projectiles 发（多目标就近分配）。
 * 无敌人时冷却保持就绪但不发射。
 */
export class CombatSystem {
  private cooldownLeftMs = 0;

  update(
    dtMs: number,
    stats: PlayerStats,
    px: number,
    py: number,
    enemies: readonly EnemySnapshot[],
  ): CombatResult {
    this.cooldownLeftMs -= dtMs;
    const shots: FireOrder[] = [];
    if (this.cooldownLeftMs > 0) return { shots, cooldownLeftMs: this.cooldownLeftMs };

    const range2 = stats.attackRange * stats.attackRange;
    const inRange = enemies
      .filter((e) => e.alive)
      .map((e) => {
        const dx = e.x - px;
        const dy = e.y - py;
        return { e, d2: dx * dx + dy * dy };
      })
      .filter((c) => c.d2 <= range2)
      .sort((a, b) => a.d2 - b.d2);

    if (inRange.length === 0) {
      this.cooldownLeftMs = 0;
      return { shots, cooldownLeftMs: 0 };
    }

    const n = Math.min(stats.projectiles, inRange.length);
    for (let i = 0; i < n; i++) {
      const t = inRange[i]!.e;
      shots.push({ targetId: t.id, targetX: t.x, targetY: t.y, damage: stats.damage });
    }
    this.cooldownLeftMs = stats.attackCooldownMs;
    return { shots, cooldownLeftMs: this.cooldownLeftMs };
  }

  reset(): void {
    this.cooldownLeftMs = 0;
  }
}
