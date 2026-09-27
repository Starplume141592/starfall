import { realmName } from '../core/realm';

export interface RunResult {
  survivedMs: number;
  level: number;
  kills: number;
}

const INK = '#14140f';

export class ResultPanel {
  private readonly scene: Phaser.Scene;
  private readonly onRestart: () => void;
  private readonly container: Phaser.GameObjects.Container;
  private destroyed: boolean;

  constructor(scene: Phaser.Scene, result: RunResult, onRestart: () => void) {
    this.scene = scene;
    this.onRestart = onRestart;
    this.destroyed = false;
    this.container = scene.add.container(scene.scale.width / 2, scene.scale.height / 2);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);
    this.buildPanel(result);
    this.bindInput();
  }

  private buildPanel(result: RunResult): void {
    // 全屏遮罩，初始alpha保底0.55，tween做淡入锦上添花
    const maskRect = this.scene.add.rectangle(0, 0, 960, 540, 0x000000, 0.55).setOrigin(0.5);
    this.container.add(maskRect);

    // 道消标题
    const title = this.scene.add.text(0, -100, '道消', {
      fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
      fontSize: '64px',
      color: INK
    }).setOrigin(0.5).setScale(1.6);
    this.container.add(title);

    // 时间格式化 mm:ss
    const totalSec = Math.floor(result.survivedMs / 1000);
    const minutes = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const seconds = String(totalSec % 60).padStart(2, '0');
    const timeText = `存活 ${minutes}:${seconds}`;
    const realmText = `境界 ${realmName(result.level)}`;
    const killText = `斩妖 ${result.kills} 只`;

    const statText = this.scene.add.text(0, 20, `${timeText}\n${realmText}\n${killText}`, {
      fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
      fontSize: '24px',
      color: INK,
      align: 'center'
    }).setOrigin(0.5);
    this.container.add(statText);

    const restartHint = this.scene.add.text(0, 160, '按 R 重来', {
      fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
      fontSize: '22px',
      color: INK
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.container.add(restartHint);

    restartHint.on('pointerdown', () => this.handleRestart());

    // 淡入tween，从0.35到保底0.55
    this.scene.tweens.add({
      targets: maskRect,
      alpha: { from: 0.35, to: 0.55 },
      duration: 400
    });
    this.scene.tweens.add({
      targets: title,
      scale: 1,
      duration: 500,
      ease: 'Sine.easeOut'
    });
  }

  private bindInput(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    kb.on('keydown-R', () => this.handleRestart());
  }

  private handleRestart(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.onRestart();
    this.container.destroy(true);
  }
}
