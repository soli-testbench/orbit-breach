import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export class HubScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HubScene' });
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add
      .rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x0a0a1a)
      .setOrigin(0.5);

    this.add
      .text(centerX, 80, 'STATION HUB', {
        fontSize: '36px',
        color: '#00ccff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 40, 'The Station Hub is under construction.', {
        fontSize: '18px',
        color: '#888888',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY, 'Upgrade your defenses between runs here.', {
        fontSize: '16px',
        color: '#666666',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    this.createButton(centerX, centerY + 80, 'BACK TO MENU', () => {
      this.scene.start('MainMenuScene');
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
