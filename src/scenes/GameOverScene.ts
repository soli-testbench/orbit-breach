import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { wave: number; score: number }): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x0a0000)
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 120, 'GAME OVER', {
        fontSize: '48px',
        color: '#ff2200',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 50, 'Reactor Destroyed', {
        fontSize: '20px',
        color: '#ff6644',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    const wave = data?.wave ?? 0;
    const score = data?.score ?? 0;

    this.add
      .text(centerX, centerY + 10, `Waves Survived: ${wave}`, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 45, `Final Score: ${score}`, {
        fontSize: '22px',
        color: '#ffcc00',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.createButton(centerX - 130, centerY + 120, 'MAIN MENU', () => {
      this.scene.start('MainMenuScene');
    });

    this.createButton(centerX + 130, centerY + 120, 'PLAY AGAIN', () => {
      this.scene.start('GameScene');
    });
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): void {
    const bg = this.add
      .rectangle(x, y, 220, 45, 0x660000)
      .setStrokeStyle(2, 0xff2200)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontSize: '20px',
        color: '#ff2200',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x880000);
      text.setColor('#ffffff');
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x660000);
      text.setColor('#ff2200');
    });

    bg.on('pointerdown', onClick);
  }
}
