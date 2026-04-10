import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';
import { HubScene } from './scenes/HubScene';
import { GameOverScene } from './scenes/GameOverScene';
import { VictoryScene } from './scenes/VictoryScene';
import { GAME_WIDTH, GAME_HEIGHT } from './types';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 512,
      height: 384,
    },
    max: {
      width: 2048,
      height: 1536,
    },
  },
  scene: [
    BootScene,
    MainMenuScene,
    GameScene,
    HubScene,
    GameOverScene,
    VictoryScene,
  ],
};

new Phaser.Game(config);
