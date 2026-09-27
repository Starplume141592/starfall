import type { UpgradeDef } from '../data/upgrades';

const INK = '#14140f';
const XUANZHI = '#e9e3d5';

export interface UpgradeChoice {
  def: UpgradeDef;
  level: number;
}

export class LevelUpPanel {
  private readonly scene: Phaser.Scene;
  private readonly choices: UpgradeChoice[];
  private readonly onPick: (c: UpgradeChoice) => void;
  private readonly container: Phaser.GameObjects.Container;
  private cardData: Array<{ choice: UpgradeChoice; rect: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }>;
  private destroyed: boolean;

  constructor(scene: Phaser.Scene, choices: UpgradeChoice[], onPick: (c: UpgradeChoice) => void) {
    this.scene = scene;
    this.choices = choices;
    this.onPick = onPick;
    this.destroyed = false;
    this.cardData = [];
    this.container = scene.add.container(scene.scale.width / 2, scene.scale.height / 2);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);
    this.buildPanel();
    this.bindKeys();
  }

  private buildPanel(): void {
    const bg = this.scene.add.rectangle(0, 0, 720, 320, 0xe9e3d5, 0.92).setStrokeStyle(3, 0x14140f);
    this.container.add(bg);

    const title = this.scene.add.text(0, -130, '修为提升', {
      fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
      fontSize: '28px',
      color: INK
    }).setOrigin(0.5);
    this.container.add(title);

    const cardW = 190;
    const cardH = 220;
    const gap = 30;
    const startX = -(cardW + gap);

    for (let i = 0; i < this.choices.length; i++) {
      const choice = this.choices[i];
      const cardX = startX + i * (cardW + gap);

      const rect = this.scene.add.rectangle(cardX, 20, cardW, cardH, 0xf3efe4, 1).setStrokeStyle(2, 0x14140f);
      rect.setInteractive({ useHandCursor: true });

      const lvStr = `${choice.level}/${choice.def.maxLevel}`;
      const text = this.scene.add.text(cardX, 20, `${choice.def.name}\n${lvStr}\n\n${choice.def.desc}\n\n[${i + 1}]`, {
        fontFamily: '"STKaiti", "KaiTi", "SimSun", serif',
        fontSize: '16px',
        color: INK,
        align: 'center'
      }).setOrigin(0.5);

      this.container.add([rect, text]);
      this.cardData.push({ choice, rect, text });

      rect.on('pointerover', () => rect.setFillStyle(0xe0dacc, 1));
      rect.on('pointerout', () => rect.setFillStyle(0xf3efe4, 1));
      rect.on('pointerdown', () => this.selectUpgrade(choice));
    }
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    kb.once('keydown-ONE', () => this.selectUpgrade(this.choices[0]));
    kb.once('keydown-TWO', () => this.selectUpgrade(this.choices[1]));
    kb.once('keydown-THREE', () => this.selectUpgrade(this.choices[2]));
  }

  private selectUpgrade(choice: UpgradeChoice): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.onPick(choice);
    this.container.destroy(true);
  }
}
