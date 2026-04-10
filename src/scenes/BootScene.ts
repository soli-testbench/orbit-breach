import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../types';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const title = this.add
      .text(centerX, centerY - 60, 'ORBIT BREACH', {
        fontSize: '32px',
        color: '#00ccff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    const loadingText = this.add
      .text(centerX, centerY + 20, 'Loading...', {
        fontSize: '16px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    const barBg = this.add
      .rectangle(centerX, centerY + 60, 300, 20, 0x333333)
      .setOrigin(0.5);
    const barFill = this.add
      .rectangle(centerX - 150, centerY + 60, 0, 20, 0x00ccff)
      .setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      barFill.width = 300 * value;
    });

    this.load.on('complete', () => {
      title.destroy();
      loadingText.destroy();
      barBg.destroy();
      barFill.destroy();
    });

    // Load a dummy asset to trigger progress events
    // In a real game, assets would be loaded here
    this.load.image(
      'placeholder',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    );
  }

  create(): void {
    this.scene.start('MainMenuScene');
  }
}
