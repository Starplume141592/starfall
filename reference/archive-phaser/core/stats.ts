export interface PlayerStats { maxHp: number; moveSpeed: number; damage: number; attackCooldownMs: number; attackRange: number; pickupRange: number; projectiles: number }
export const BASE_STATS: PlayerStats = { maxHp: 100, moveSpeed: 220, damage: 10, attackCooldownMs: 900, attackRange: 260, pickupRange: 70, projectiles: 1 }
