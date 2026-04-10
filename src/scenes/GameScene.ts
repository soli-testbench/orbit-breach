import Phaser from 'phaser';
import { TileType, GameState, GAME_WIDTH, GAME_HEIGHT } from '../types';
import { GameMap } from '../map/GameMap';
import { TEST_MAP } from '../data/maps';
import { TOWER_CONFIGS } from '../data/towers';
import { Tower } from '../towers/Tower';
import { WaveManager } from '../systems/WaveManager';
import { CombatSystem } from '../systems/CombatSystem';

const INITIAL_ENERGY = 200;
const INITIAL_REACTOR_HEALTH = 100;
const REACTOR_DAMAGE_PER_ENEMY = 10;

export class GameScene extends Phaser.Scene {
  private gameMap!: GameMap;
  private waveManager!: WaveManager;
  private combatSystem!: CombatSystem;
  private gameState!: GameState;
  private selectedTowerId: string | null = null;
  private placementPreview: Phaser.GameObjects.Rectangle | null = null;
  private rangePreview: Phaser.GameObjects.Arc | null = null;

  private energyText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private reactorText!: Phaser.GameObjects.Text;
  private startWaveButton!: Phaser.GameObjects.Rectangle;
  private startWaveLabel!: Phaser.GameObjects.Text;
  private towerButtons: Phaser.GameObjects.Container[] = [];
  private invalidFeedback: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameState = {
      energy: INITIAL_ENERGY,
      reactorHealth: INITIAL_REACTOR_HEALTH,
      maxReactorHealth: INITIAL_REACTOR_HEALTH,
      currentWave: 0,
      score: 0,
    };

    this.selectedTowerId = null;
    this.placementPreview = null;
    this.rangePreview = null;
    this.invalidFeedback = null;

    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x0a0a1a,
      )
      .setOrigin(0.5);

    this.gameMap = new GameMap(this, TEST_MAP);
    this.gameMap.render();

    this.waveManager = new WaveManager(this, this.gameMap);
    this.combatSystem = new CombatSystem(this);

    this.createHUD();
    this.createTowerPanel();

    this.events.on(
      'tileClicked',
      (pos: { col: number; row: number }, type: TileType) => {
        this.handleTileClick(pos, type);
      },
    );

    this.events.on(
      'tileHover',
      (pos: { col: number; row: number }, _type: TileType) => {
        this.handleTileHover(pos);
      },
    );

    this.events.on('waveComplete', () => {
      this.updateStartWaveButton(true);
    });
  }

  update(time: number, delta: number): void {
    this.waveManager.update(delta);

    const leaked = this.waveManager.removeDeadAndLeaked();
    for (const enemy of leaked) {
      this.gameState.reactorHealth -= REACTOR_DAMAGE_PER_ENEMY;
      enemy.destroy();
    }

    this.combatSystem.update(time, delta, this.waveManager.activeEnemies);

    const activeEnemies = this.waveManager.activeEnemies;
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
      const enemy = activeEnemies[i];
      if (!enemy.alive && !enemy.reachedReactor) {
        this.gameState.energy += enemy.config.salvageReward;
        this.gameState.score += enemy.config.salvageReward;
        activeEnemies.splice(i, 1);
      }
    }

    if (this.gameState.reactorHealth <= 0) {
      this.gameState.reactorHealth = 0;
      this.waveManager.cleanup();
      this.combatSystem.cleanup();
      this.scene.start('GameOverScene', {
        wave: this.gameState.currentWave,
        score: this.gameState.score,
      });
      return;
    }

    this.updateHUD();
  }

  private createHUD(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, 16, GAME_WIDTH, 32, 0x000000, 0.7)
      .setDepth(50);

    this.energyText = this.add
      .text(10, 6, '', {
        fontSize: '16px',
        color: '#ffcc00',
        fontFamily: 'monospace',
      })
      .setDepth(51);

    this.waveText = this.add
      .text(GAME_WIDTH / 2, 6, '', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0)
      .setDepth(51);

    this.reactorText = this.add
      .text(GAME_WIDTH - 10, 6, '', {
        fontSize: '16px',
        color: '#ff4444',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 0)
      .setDepth(51);

    this.startWaveButton = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 30, 160, 35, 0x006600)
      .setStrokeStyle(2, 0x00ff00)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);

    this.startWaveLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'START WAVE', {
        fontSize: '16px',
        color: '#00ff00',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.startWaveButton.on('pointerdown', () => {
      if (!this.waveManager.isWaveInProgress && this.waveManager.hasMoreWaves) {
        this.waveManager.startNextWave();
        this.gameState.currentWave = this.waveManager.currentWave;
        this.updateStartWaveButton(false);
      }
    });

    this.startWaveButton.on('pointerover', () => {
      if (!this.waveManager.isWaveInProgress) {
        this.startWaveButton.setFillStyle(0x008800);
      }
    });

    this.startWaveButton.on('pointerout', () => {
      if (!this.waveManager.isWaveInProgress) {
        this.startWaveButton.setFillStyle(0x006600);
      }
    });

    const endRunBtn = this.add
      .rectangle(GAME_WIDTH - 80, GAME_HEIGHT - 30, 120, 35, 0x660000)
      .setStrokeStyle(2, 0xff2200)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);

    this.add
      .text(GAME_WIDTH - 80, GAME_HEIGHT - 30, 'END RUN', {
        fontSize: '14px',
        color: '#ff2200',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(51);

    endRunBtn.on('pointerdown', () => {
      this.waveManager.cleanup();
      this.combatSystem.cleanup();
      this.scene.start('GameOverScene', {
        wave: this.gameState.currentWave,
        score: this.gameState.score,
      });
    });

    endRunBtn.on('pointerover', () => endRunBtn.setFillStyle(0x880000));
    endRunBtn.on('pointerout', () => endRunBtn.setFillStyle(0x660000));

    this.updateHUD();
  }

  private createTowerPanel(): void {
    const panelX = 10;
    const panelY = 45;

    this.add
      .text(panelX, panelY, 'TOWERS', {
        fontSize: '14px',
        color: '#00ccff',
        fontFamily: 'monospace',
      })
      .setDepth(50);

    const towerIds = Object.keys(TOWER_CONFIGS);
    towerIds.forEach((id, index) => {
      const config = TOWER_CONFIGS[id];
      const y = panelY + 25 + index * 45;

      const container = this.add.container(panelX, y).setDepth(50);

      const bg = this.add
        .rectangle(55, 0, 110, 40, 0x111122)
        .setStrokeStyle(1, 0x334466)
        .setInteractive({ useHandCursor: true })
        .setOrigin(0, 0);

      const swatch = this.add.rectangle(10, 20, 16, 16, config.color);

      const label = this.add.text(25, 5, config.name, {
        fontSize: '11px',
        color: '#cccccc',
        fontFamily: 'monospace',
      });

      const costText = this.add.text(25, 20, '$' + config.cost, {
        fontSize: '11px',
        color: '#ffcc00',
        fontFamily: 'monospace',
      });

      container.add([bg, swatch, label, costText]);

      bg.on('pointerdown', () => {
        if (this.selectedTowerId === id) {
          this.selectedTowerId = null;
          this.clearPlacementPreview();
        } else {
          this.selectedTowerId = id;
        }
        this.updateTowerPanelSelection();
      });

      bg.on('pointerover', () => {
        if (this.selectedTowerId !== id) {
          bg.setFillStyle(0x1a1a33);
        }
      });

      bg.on('pointerout', () => {
        if (this.selectedTowerId !== id) {
          bg.setFillStyle(0x111122);
        }
      });

      this.towerButtons.push(container);
    });
  }

  private updateTowerPanelSelection(): void {
    const towerIds = Object.keys(TOWER_CONFIGS);
    towerIds.forEach((id, index) => {
      const container = this.towerButtons[index];
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      if (this.selectedTowerId === id) {
        bg.setFillStyle(0x002244);
        bg.setStrokeStyle(2, 0x00ccff);
      } else {
        bg.setFillStyle(0x111122);
        bg.setStrokeStyle(1, 0x334466);
      }
    });
  }

  private handleTileClick(
    pos: { col: number; row: number },
    type: TileType,
  ): void {
    if (!this.selectedTowerId) return;

    const config = TOWER_CONFIGS[this.selectedTowerId];
    if (!config) return;

    if (type !== TileType.BUILDABLE) {
      this.showInvalidFeedback(pos, 'Cannot build here!');
      return;
    }

    if (this.gameState.energy < config.cost) {
      this.showInvalidFeedback(pos, 'Not enough energy!');
      return;
    }

    const worldPos = this.gameMap.getTileWorldPosition(pos.col, pos.row);
    const tower = new Tower(
      this,
      config,
      { col: pos.col, row: pos.row },
      worldPos.x,
      worldPos.y,
    );

    this.combatSystem.addTower(tower);
    this.gameState.energy -= config.cost;
    this.gameMap.setTileType(pos.col, pos.row, TileType.WALL);
    this.clearPlacementPreview();
  }

  private handleTileHover(pos: { col: number; row: number }): void {
    if (!this.selectedTowerId) return;

    const config = TOWER_CONFIGS[this.selectedTowerId];
    if (!config) return;

    this.clearPlacementPreview();

    const worldPos = this.gameMap.getTileWorldPosition(pos.col, pos.row);
    const tileType = this.gameMap.getTileType(pos.col, pos.row);
    const isValid =
      tileType === TileType.BUILDABLE && this.gameState.energy >= config.cost;

    this.placementPreview = this.add
      .rectangle(
        worldPos.x,
        worldPos.y,
        30,
        30,
        isValid ? config.color : 0xff0000,
        0.5,
      )
      .setDepth(30);

    this.rangePreview = this.add
      .circle(
        worldPos.x,
        worldPos.y,
        config.range,
        isValid ? 0xffffff : 0xff0000,
        0.1,
      )
      .setStrokeStyle(1, isValid ? 0xffffff : 0xff0000, 0.3)
      .setDepth(29);
  }

  private clearPlacementPreview(): void {
    if (this.placementPreview) {
      this.placementPreview.destroy();
      this.placementPreview = null;
    }
    if (this.rangePreview) {
      this.rangePreview.destroy();
      this.rangePreview = null;
    }
  }

  private showInvalidFeedback(
    pos: { col: number; row: number },
    message: string,
  ): void {
    if (this.invalidFeedback) {
      this.invalidFeedback.destroy();
    }

    const worldPos = this.gameMap.getTileWorldPosition(pos.col, pos.row);
    this.invalidFeedback = this.add
      .text(worldPos.x, worldPos.y - 25, message, {
        fontSize: '12px',
        color: '#ff4444',
        fontFamily: 'monospace',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(60);

    this.tweens.add({
      targets: this.invalidFeedback,
      alpha: 0,
      y: worldPos.y - 45,
      duration: 1000,
      onComplete: () => {
        if (this.invalidFeedback) {
          this.invalidFeedback.destroy();
          this.invalidFeedback = null;
        }
      },
    });
  }

  private updateStartWaveButton(enabled: boolean): void {
    if (enabled && this.waveManager.hasMoreWaves) {
      this.startWaveButton.setFillStyle(0x006600);
      this.startWaveButton.setStrokeStyle(2, 0x00ff00);
      this.startWaveLabel.setColor('#00ff00');
      this.startWaveLabel.setText('START WAVE');
    } else if (!this.waveManager.hasMoreWaves) {
      this.startWaveButton.setFillStyle(0x333333);
      this.startWaveButton.setStrokeStyle(2, 0x666666);
      this.startWaveLabel.setColor('#666666');
      this.startWaveLabel.setText('NO MORE WAVES');
    } else {
      this.startWaveButton.setFillStyle(0x333300);
      this.startWaveButton.setStrokeStyle(2, 0x666600);
      this.startWaveLabel.setColor('#666600');
      this.startWaveLabel.setText('WAVE IN PROGRESS');
    }
  }

  private updateHUD(): void {
    this.energyText.setText('Energy: ' + this.gameState.energy);
    this.waveText.setText('Wave: ' + this.gameState.currentWave);
    this.reactorText.setText(
      'Reactor: ' +
        this.gameState.reactorHealth +
        '/' +
        this.gameState.maxReactorHealth,
    );
  }
}
