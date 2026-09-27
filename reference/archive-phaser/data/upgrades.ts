import type { PlayerStats } from '../core/stats';

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  weight: number;
  maxLevel: number;
  apply: (stats: PlayerStats) => void;
  heal?: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'swordPower',
    name: '御剑',
    desc: '攻击力 +4',
    weight: 14,
    maxLevel: 8,
    apply: (s) => { s.damage += 4; }
  },
  {
    id: 'swordArt',
    name: '剑诀',
    desc: '攻击冷却 -80ms',
    weight: 12,
    maxLevel: 6,
    apply: (s) => { s.attackCooldownMs = Math.max(150, s.attackCooldownMs - 80); }
  },
  {
    id: 'divineSense',
    name: '神识',
    desc: '攻击射程 +35',
    weight: 10,
    maxLevel: 7,
    apply: (s) => { s.attackRange += 35; }
  },
  {
    id: 'splitLight',
    name: '分光',
    desc: '投射物数量 +1',
    weight: 6,
    maxLevel: 3,
    apply: (s) => { s.projectiles += 1; }
  },
  {
    id: 'bodySkill',
    name: '身法',
    desc: '移动速度 +18',
    weight: 11,
    maxLevel: 6,
    apply: (s) => { s.moveSpeed += 18; }
  },
  {
    id: 'refineBody',
    name: '炼体',
    desc: '最大生命值 +15',
    weight: 13,
    maxLevel: 8,
    apply: (s) => { s.maxHp += 15; }
  },
  {
    id: 'gatherSpirit',
    name: '采灵',
    desc: '拾取范围 +12',
    weight: 9,
    maxLevel: 5,
    apply: (s) => { s.pickupRange += 12; }
  },
  {
    id: 'rejuvenate',
    name: '回春',
    desc: '立即回复 25% 最大生命',
    weight: 8,
    maxLevel: 4,
    apply: () => {},
    heal: 0.25
  },
  {
    id: 'ironSword',
    name: '重剑',
    desc: '攻击力 +6，移速 -5',
    weight: 7,
    maxLevel: 5,
    apply: (s) => { s.damage += 6; s.moveSpeed -= 5; }
  },
  {
    id: 'swiftMind',
    name: '清心',
    desc: '攻击冷却 -50ms，拾取范围 +5',
    weight: 8,
    maxLevel: 5,
    apply: (s) => { s.attackCooldownMs = Math.max(150, s.attackCooldownMs - 50); s.pickupRange += 5; }
  },
  {
    id: 'vastVitality',
    name: '固本',
    desc: '最大生命 +10，攻击力 +2',
    weight: 10,
    maxLevel: 6,
    apply: (s) => { s.maxHp += 10; s.damage += 2; }
  },
  {
    id: 'farSight',
    name: '遥视',
    desc: '攻击射程 +22，拾取范围 +8',
    weight: 7,
    maxLevel: 5,
    apply: (s) => { s.attackRange += 22; s.pickupRange += 8; }
  }
];
