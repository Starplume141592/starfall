export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  radius: number;
  damage: number;
  xp: number;
  color: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  xiaogui: { id: 'xiaogui', name: '小鬼', hp: 18, speed: 78, radius: 10, damage: 3, xp: 3, color: 0x14140f },
  ligui:   { id: 'ligui',   name: '厉鬼', hp: 48, speed: 58, radius: 16, damage: 7, xp: 9, color: 0x3a2a2a },
};

export const ENEMY_LIST: EnemyDef[] = Object.values(ENEMIES);
