import Phaser from 'phaser';
import { BASE_STATS, type PlayerStats } from '../core/stats';
import { moveAxis } from '../core/input';
import { CombatSystem, type EnemySnapshot } from '../systems/combat';
import { SpawnSystem } from '../systems/spawn';
import type { EnemyDef } from '../data/enemies';
import { xpToNext, rollUpgrades } from '../systems/leveling';
import { LevelUpPanel, type UpgradeChoice } from '../ui/LevelUpPanel';
import { ResultPanel } from '../ui/ResultPanel';
import { realmName } from '../core/realm';

const W = 960;
const H = 540;
const WORLD = 2000;
const POOL_SIZE = 128;
const MAX_LEVEL = 99;
const PLAYER_RADIUS = 12;
const PLAYER_HIT_COOLDOWN_MS = 500;
const ORB_ABSORB_DIST = 12;
const ORB_MAX_SPEED = 720;

interface EnemyUnit {
  id: number;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  radius: number;
  damage: number;
  xp: number;
  gfx: Phaser.GameObjects.Arc;
  body: Phaser.Physics.Arcade.Body;
  active: boolean;
}

interface InkShot {
  gfx: Phaser.GameObjects.Arc;
  body: Phaser.Physics.Arcade.Body;
  damage: number;
  lifeMs: number;
}

interface XpOrb {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  xp: number;
  pulled: boolean;
}

type MoveKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class PlayScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private playerBody!: Phaser.Physics.Arcade.Body;
  private stats: PlayerStats = { ...BASE_STATS };
  private currentHp = BASE_STATS.maxHp;

  private keys: MoveKeys | null = null;

  private combat = new CombatSystem();
  private spawner = new SpawnSystem();

  private enemies: EnemyUnit[] = [];
  private shots: InkShot[] = [];
  private orbs: XpOrb[] = [];

  private shotGroup!: Phaser.Physics.Arcade.Group;
  private orbGroup!: Phaser.Physics.Arcade.Group;

  private elapsedMs = 0;
  private nextId = 1;
  private xp = 0;
  private level = 1;
  private invulnMs = 0;
  private kills = 0;

  private takenLevels: Record<string, number> = {};
  private paused = false;
  private dead = false;
  private pendingLevelUps = 0;
  private panel: LevelUpPanel | null = null;

  private hud!: Phaser.GameObjects.Graphics;
  private hudHpText!: Phaser.GameObjects.Text;
  private hudLevelText!: Phaser.GameObjects.Text;
  private hudTimeText!: Phaser.GameObjects.Text;

  onLevelUp?: () => void;

  constructor() {
    super('Play');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD, WORLD);
    this.cameras.main.setBounds(0, 0, WORLD, WORLD);

    this.player = this.add.circle(WORLD / 2, WORLD / 2, PLAYER_RADIUS, 0x14140f);
    this.physics.add.existing(this.player);
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.playerBody.setCircle(PLAYER_RADIUS);
    this.playerBody.setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player, true);

    this.shotGroup = this.physics.add.group();
    this.orbGroup = this.physics.add.group();

    this.buildEnemyPool();
    this.buildHud();

    const kb = this.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = {
        up: kb.addKey(K.W),
        down: kb.addKey(K.S),
        left: kb.addKey(K.A),
        right: kb.addKey(K.D),
      };
      kb.addKey(K.UP);
      kb.addKey(K.DOWN);
      kb.addKey(K.LEFT);
      kb.addKey(K.RIGHT);
    }

    this.onLevelUp = () => { this.openLevelUpPanel(); };

    // 重置场景态（restart 复用实例）
    this.stats = { ...BASE_STATS };
    this.currentHp = this.stats.maxHp;
    this.elapsedMs = 0;
    this.xp = 0;
    this.level = 1;
    this.kills = 0;
    this.invulnMs = 0;
    this.takenLevels = {};
    this.paused = false;
    this.dead = false;
    this.pendingLevelUps = 0;
    this.panel = null;
    this.shots = [];
    this.orbs = [];
    for (const u of this.enemies) this.releaseEnemy(u);
    this.combat.reset();
    this.spawner.reset();
  }

  private buildHud(): void {
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(1000);
    this.hudHpText = this.add.text(16, 12, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#14140f',
    }).setScrollFactor(0).setDepth(1001);
    this.hudLevelText = this.add.text(16, 46, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#14140f',
    }).setScrollFactor(0).setDepth(1001);
    this.hudTimeText = this.add.text(W - 16, 12, '00:00', {
      fontFamily: 'monospace', fontSize: '14px', color: '#14140f',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001);
  }

  private drawHud(): void {
    const g = this.hud;
    g.clear();
    const barW = 180;
    const barH = 10;
    // 血量条
    g.fillStyle(0xe9e3d5, 1).fillRect(16, 28, barW, barH);
    const hpRatio = Phaser.Math.Clamp(this.currentHp / this.stats.maxHp, 0, 1);
    g.fillStyle(0x14140f, 1).fillRect(16, 28, barW * hpRatio, barH);
    g.lineStyle(1, 0x14140f, 1).strokeRect(16, 28, barW, barH);
    // 经验条
    const need = xpToNext(this.level);
    const xpRatio = Phaser.Math.Clamp(this.xp / need, 0, 1);
    g.fillStyle(0xe9e3d5, 1).fillRect(16, 62, barW, 6);
    g.fillStyle(0x7a5c2e, 1).fillRect(16, 62, barW * xpRatio, 6);
    g.lineStyle(1, 0x14140f, 1).strokeRect(16, 62, barW, 6);

    this.hudHpText.setText(`气血 ${Math.ceil(this.currentHp)}/${this.stats.maxHp}`);
    this.hudLevelText.setText(`${realmName(this.level)}  斩 ${this.kills}`);
    const totalSec = Math.floor(this.elapsedMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    this.hudTimeText.setText(`${mm}:${ss}`);
  }

  private buildEnemyPool(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const gfx = this.add.circle(0, 0, 10, 0x14140f).setVisible(false).setActive(false);
      this.physics.add.existing(gfx);
      const body = gfx.body as Phaser.Physics.Arcade.Body;
      body.setCircle(10);
      body.enable = false;
      const unit: EnemyUnit = {
        id: 0,
        def: { id: 'x', name: 'x', hp: 1, speed: 0, radius: 10, damage: 0, xp: 0, color: 0x14140f },
        hp: 0,
        maxHp: 0,
        radius: 10,
        damage: 0,
        xp: 0,
        gfx,
        body,
        active: false,
      };
      gfx.setData('unit', unit);
      this.enemies.push(unit);
    }
  }

  private acquireEnemy(def: EnemyDef, hpMult: number, x: number, y: number): EnemyUnit | null {
    for (const u of this.enemies) {
      if (!u.active) {
        const hp = Math.round(def.hp * hpMult);
        u.id = this.nextId++;
        u.def = def;
        u.hp = hp;
        u.maxHp = hp;
        u.radius = def.radius;
        u.damage = def.damage;
        u.xp = def.xp;
        u.active = true;
        u.gfx.setFillStyle(def.color);
        u.gfx.setRadius(def.radius);
        u.gfx.setPosition(x, y).setVisible(true).setActive(true);
        u.body.enable = true;
        u.body.setCircle(def.radius, -def.radius, -def.radius);
        u.body.reset(x, y);
        return u;
      }
    }
    return null;
  }

  private releaseEnemy(u: EnemyUnit): void {
    u.active = false;
    u.body.enable = false;
    u.body.stop();
    u.gfx.setVisible(false).setActive(false);
    u.gfx.setPosition(-1000, -1000);
  }

  private fireShot(order: { targetX: number; targetY: number; damage: number }): void {
    const px = this.player.x;
    const py = this.player.y;
    const gfx = this.add.circle(px, py, 4, 0x14140f);
    this.physics.add.existing(gfx);
    const body = gfx.body as Phaser.Physics.Arcade.Body;
    body.setCircle(4);
    const dx = order.targetX - px;
    const dy = order.targetY - py;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 420;
    body.setVelocity((dx / len) * speed, (dy / len) * speed);
    this.shots.push({ gfx, body, damage: order.damage, lifeMs: 1200 });
  }

  private despawnShot(s: InkShot): void {
    s.gfx.destroy();
    s.body.destroy();
    const i = this.shots.indexOf(s);
    if (i >= 0) this.shots.splice(i, 1);
  }

  private dropXp(x: number, y: number, xp: number): void {
    const gfx = this.add.circle(x, y, 5, 0x7a5c2e);
    this.orbGroup.add(gfx);
    const body = gfx.body as Phaser.Physics.Arcade.Body;
    body.setCircle(5);
    const orb: XpOrb = { gfx, x, y, xp, pulled: false };
    this.orbs.push(orb);
  }

  private damagePlayer(amount: number): void {
    if (this.invulnMs > 0 || this.dead) return;
    this.currentHp -= amount;
    this.invulnMs = PLAYER_HIT_COOLDOWN_MS;
    this.cameras.main.shake(120, 0.006);
    const t = this.add.circle(this.player.x, this.player.y, 18, 0x8b1a1a, 0.5);
    this.tweens.add({ targets: t, alpha: 0, scale: 2, duration: 220, onComplete: () => t.destroy() });
    if (this.currentHp <= 0) {
      this.currentHp = 0;
      this.onDeath();
    }
  }

  private onDeath(): void {
    if (this.dead) return;
    this.dead = true;
    this.paused = true;
    this.physics.world.pause();
    this.playerBody.setVelocity(0, 0);
    for (const u of this.enemies) if (u.active) u.body.stop();
    this.panel = null;
    new ResultPanel(this, {
      survivedMs: this.elapsedMs,
      level: this.level,
      kills: this.kills,
    }, () => this.scene.restart());
  }

  private gainXp(amount: number): void {
    this.xp += amount;
    let gained = 0;
    while (this.level < MAX_LEVEL && this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      gained++;
    }
    if (gained > 0) {
      this.pendingLevelUps += gained;
      if (!this.paused) this.openLevelUpPanel();
    }
  }

  private openLevelUpPanel(): void {
    if (this.paused || this.dead) return;
    if (this.pendingLevelUps <= 0) return;
    this.pendingLevelUps--;
    this.paused = true;
    this.physics.world.pause();
    this.playerBody.setVelocity(0, 0);
    for (const u of this.enemies) if (u.active) u.body.stop();

    const choices: UpgradeChoice[] = rollUpgrades(this.level, this.takenLevels, Math.random).map((def) => ({
      def,
      level: this.takenLevels[def.id] ?? 0,
    }));

    this.panel = new LevelUpPanel(this, choices, (c: UpgradeChoice) => {
      c.def.apply(this.stats);
      this.takenLevels[c.def.id] = (this.takenLevels[c.def.id] ?? 0) + 1;
      if (c.def.heal) this.currentHp = Math.min(this.stats.maxHp, this.currentHp + this.stats.maxHp * c.def.heal);
      this.applyUpgradeStats(this.stats);
      this.resumeAfterLevelUp();
    });
  }

  private applyUpgradeStats(stats: PlayerStats): void {
    if (this.currentHp > stats.maxHp) this.currentHp = stats.maxHp;
    this.combat.reset();
  }

  private resumeAfterLevelUp(): void {
    this.panel = null;
    this.physics.world.resume();
    this.paused = false;
    if (this.pendingLevelUps > 0 && !this.dead) this.openLevelUpPanel();
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    if (!this.paused) {
      this.elapsedMs += dt;
      if (this.invulnMs > 0) this.invulnMs -= dt;

      const k = this.keys;
      const pressed = {
        up: !!k?.up.isDown,
        down: !!k?.down.isDown,
        left: !!k?.left.isDown,
        right: !!k?.right.isDown,
      };
      const axis = moveAxis(pressed);
      this.playerBody.setVelocity(axis.x * this.stats.moveSpeed, axis.y * this.stats.moveSpeed);

      const orders = this.spawner.update(dt, this.elapsedMs, W, H, Math.random);
      for (const o of orders) {
        const u = this.acquireEnemy(o.def, o.hpMultiplier, o.x, o.y);
        if (!u) break;
      }

      const snapshots: EnemySnapshot[] = [];
      let hitThisFrame = false;
      for (const u of this.enemies) {
        if (!u.active) continue;
        this.physics.moveToObject(u.gfx, this.player, u.def.speed);
        snapshots.push({ id: u.id, x: u.gfx.x, y: u.gfx.y, alive: u.hp > 0 });

        if (!hitThisFrame) {
          const dx = u.gfx.x - this.player.x;
          const dy = u.gfx.y - this.player.y;
          const rr = u.radius + PLAYER_RADIUS;
          if (dx * dx + dy * dy <= rr * rr) {
            this.damagePlayer(u.damage);
            hitThisFrame = true;
          }
        }
      }

      const res = this.combat.update(dt, this.stats, this.player.x, this.player.y, snapshots);
      for (const s of res.shots) this.fireShot(s);

      for (let i = this.shots.length - 1; i >= 0; i--) {
        const s = this.shots[i]!;
        s.lifeMs -= dt;
        if (s.lifeMs <= 0) { this.despawnShot(s); continue; }
        for (const u of this.enemies) {
          if (!u.active) continue;
          const dx = u.gfx.x - s.gfx.x;
          const dy = u.gfx.y - s.gfx.y;
          const rr = u.radius + 4;
          if (dx * dx + dy * dy <= rr * rr) {
            u.hp -= s.damage;
            const hitFx = this.add.circle(u.gfx.x, u.gfx.y, u.radius + 3, 0x14140f, 0.35);
            this.tweens.add({ targets: hitFx, alpha: 0, duration: 140, onComplete: () => hitFx.destroy() });
            if (u.hp <= 0) {
              this.kills++;
              this.dropXp(u.gfx.x, u.gfx.y, u.xp);
              this.releaseEnemy(u);
            }
            this.despawnShot(s);
            break;
          }
        }
      }

      this.updateOrbs(dt);
    }

    this.drawHud();
  }

  private updateOrbs(dt: number): void {
    const pr = this.stats.pickupRange;
    const pr2 = pr * pr;
    const dtSec = dt / 1000;
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i]!;
      const dx = this.player.x - o.x;
      const dy = this.player.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= ORB_ABSORB_DIST * ORB_ABSORB_DIST) {
        this.gainXp(o.xp);
        o.gfx.destroy();
        this.orbs.splice(i, 1);
        continue;
      }
      if (d2 <= pr2) o.pulled = true;
      else if (o.pulled) o.pulled = false;

      if (o.pulled) {
        const d = Math.sqrt(d2) || 1;
        // 越近越快：速度随接近线性提升
        const t = 1 - Phaser.Math.Clamp(d / pr, 0, 1);
        const speed = 120 + (ORB_MAX_SPEED - 120) * t;
        const step = speed * dtSec;
        if (step >= d) {
          o.x = this.player.x;
          o.y = this.player.y;
        } else {
          o.x += (dx / d) * step;
          o.y += (dy / d) * step;
        }
        o.gfx.setPosition(o.x, o.y);
      }
    }
  }
}
