import type { UpgradeDef } from '../data/upgrades';
import { UPGRADES } from '../data/upgrades';

export function xpToNext(level: number): number {
  if (level <= 1) return 5;
  const prev = xpToNext(level - 1);
  return Math.floor(prev * 1.25);
}

export function rollUpgrades(
  _level: number,
  takenLevels: Record<string, number>,
  rng: () => number
): UpgradeDef[] {
  // 过滤未满级
  const pool = UPGRADES.filter(def => {
    const lv = takenLevels[def.id] ?? 0;
    return lv < def.maxLevel;
  });
  const result: UpgradeDef[] = [];
  const usedIds = new Set<string>();
  const targetCount = 3;

  while (result.length < targetCount && pool.length > usedIds.size) {
    let totalWeight = 0;
    const candidates = pool.filter(d => !usedIds.has(d.id));
    for (const c of candidates) totalWeight += c.weight;

    let roll = rng() * totalWeight;
    roll = Math.min(roll, totalWeight - Number.EPSILON);
    let accum = 0;
    for (const def of candidates) {
      accum += def.weight;
      if (roll < accum) {
        usedIds.add(def.id);
        result.push(def);
        break;
      }
    }
  }
  return result;
}
