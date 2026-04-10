import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Starfield background
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.7 + 0.3;
      this.add.circle(x, y, size, 0xffffff, alpha);
    }

    this.add
      .text(centerX, centerY - 120, 'ORBIT BREACH', {
        fontSize: '48px',
        color: '#00ccff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 70, 'Space Tower Defense', {
        fontSize: '18px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.createButton(centerX, centerY + 20, 'NEW RUN', () => {
      this.scene.start('GameScene');
    });

    this.createButton(centerX, centerY + 80, 'STATION HUB', () => {
      this.scene.start('HubScene');
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): void {
    const bg = this.add
      .rectangle(x, y, 220, 45, 0x003366)
      .setStrokeStyle(2, 0x00ccff)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontSize: '20px',
        color: '#00ccff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x004488);
      text.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x003366);
      text.setColor('#00ccff');
    });

    bg.on('pointerdown', onClick);
  }
}
