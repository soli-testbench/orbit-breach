import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(data: {
    wave: number;
    score: number;
    reactorHealth: number;
    maxReactorHealth: number;
  }): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000a1a)
      .setOrigin(0.5);

    const title = this.add
      .text(centerX, centerY - 160, 'VICTORY', {
        fontSize: '56px',
        color: '#00ff88',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      ease: 'Back.easeOut',
    });

    const subtitle = this.add
      .text(centerX, centerY - 95, 'Station Defended Successfully', {
        fontSize: '18px',
        color: '#44ddaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 600,
      delay: 400,
    });

    const wave = data?.wave ?? 0;
    const score = data?.score ?? 0;
    const reactorHealth = data?.reactorHealth ?? 0;
    const maxReactorHealth = data?.maxReactorHealth ?? 100;

    const stats = [
      { label: 'Waves Survived', value: `${wave}`, color: '#ffffff' },
      { label: 'Final Score', value: `${score}`, color: '#ffcc00' },
      {
        label: 'Reactor Integrity',
        value: `${reactorHealth}/${maxReactorHealth}`,
        color: '#00ff44',
      },
    ];

    stats.forEach((stat, index) => {
      const y = centerY - 20 + index * 45;
      const statText = this.add
        .text(centerX, y, `${stat.label}: ${stat.value}`, {
          fontSize: '22px',
          color: stat.color,
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setAlpha(0);

      this.tweens.add({
        targets: statText,
        alpha: 1,
        duration: 500,
        delay: 700 + index * 200,
      });
    });

    this.time.delayedCall(1400, () => {
      this.createButton(centerX - 130, centerY + 160, 'MAIN MENU', () => {
        this.scene.start('MainMenuScene');
      });

      this.createButton(centerX + 130, centerY + 160, 'PLAY AGAIN', () => {
        this.scene.start('GameScene');
      });
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): void {
    const bg = this.add
      .rectangle(x, y, 200, 45, 0x004422)
      .setStrokeStyle(2, 0x00ff88)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const text = this.add
      .text(x, y, label, {
        fontSize: '18px',
        color: '#00ff88',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: [bg, text],
      alpha: 1,
      duration: 400,
    });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x006633);
      text.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x004422);
      text.setColor('#00ff88');
    });

    bg.on('pointerdown', onClick);
  }
}
