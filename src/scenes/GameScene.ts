import Phaser from 'phaser';
import {
  TileType,
  GameState,
  UpgradeConfig,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../types';
import { GameMap } from '../map/GameMap';
import { TEST_MAP } from '../data/maps';
import { TOWER_CONFIGS } from '../data/towers';
import { Tower } from '../towers/Tower';
import { WaveManager } from '../systems/WaveManager';
import { CombatSystem } from '../systems/CombatSystem';
import { Enemy } from '../enemies/Enemy';
import { UPGRADE_POOL } from '../data/upgrades';

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
  private enemyText!: Phaser.GameObjects.Text;
  private waveBanner: Phaser.GameObjects.Container | null = null;
  private buttonPulseTween: Phaser.Tweens.Tween | null = null;
  private victoryTriggered: boolean = false;
  private upgradeOverlay: Phaser.GameObjects.Container | null = null;
  private upgradeHudTexts: Phaser.GameObjects.Text[] = [];
  private awaitingUpgradeChoice: boolean = false;

  private tileClickHandler!: (
    pos: { col: number; row: number },
    type: TileType,
  ) => void;
  private tileHoverHandler!: (
    pos: { col: number; row: number },
    _type: TileType,
  ) => void;
  private waveCompleteHandler!: (waveIndex: number) => void;

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
      activeUpgrades: [],
      damageModifier: 0,
      fireRateModifier: 0,
      rangeModifier: 0,
      armorPiercing: 0,
      salvageModifier: 0,
    };

    this.selectedTowerId = null;
    this.placementPreview = null;
    this.rangePreview = null;
    this.invalidFeedback = null;
    this.waveBanner = null;
    this.buttonPulseTween = null;
    this.victoryTriggered = false;
    this.upgradeOverlay = null;
    this.upgradeHudTexts = [];
    this.awaitingUpgradeChoice = false;

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

    this.tileClickHandler = (
      pos: { col: number; row: number },
      type: TileType,
    ) => {
      this.handleTileClick(pos, type);
    };
    this.tileHoverHandler = (
      pos: { col: number; row: number },
      _type: TileType,
    ) => {
      this.handleTileHover(pos);
    };
    this.waveCompleteHandler = (waveIndex: number) => {
      this.updateStartWaveButton(true);
      this.showWaveCompleteBanner(waveIndex);

      if (!this.waveManager.hasMoreWaves && !this.victoryTriggered) {
        this.victoryTriggered = true;
        this.time.delayedCall(2000, () => {
          this.waveManager.cleanup();
          this.combatSystem.cleanup();
          this.scene.start('VictoryScene', {
            wave: this.gameState.currentWave,
            score: this.gameState.score,
            reactorHealth: this.gameState.reactorHealth,
            maxReactorHealth: this.gameState.maxReactorHealth,
          });
        });
      } else if (this.waveManager.hasMoreWaves) {
        this.showUpgradeSelection();
      }
    };

    this.events.on('tileClicked', this.tileClickHandler);
    this.events.on('tileHover', this.tileHoverHandler);
    this.events.on('waveComplete', this.waveCompleteHandler);
  }

  shutdown(): void {
    this.events.off('tileClicked', this.tileClickHandler);
    this.events.off('tileHover', this.tileHoverHandler);
    this.events.off('waveComplete', this.waveCompleteHandler);
    this.waveManager.cleanup();
    this.combatSystem.cleanup();
  }

  update(time: number, delta: number): void {
    this.waveManager.update(delta);

    const enemies = this.waveManager.activeEnemies;
    this.combatSystem.update(time, delta, enemies as Enemy[], this.gameState);

    // Harvest killed enemies for rewards
    const killed = this.waveManager.harvestKilledEnemies();
    for (const enemy of killed) {
      const salvageMult = 1 + this.gameState.salvageModifier;
      const reward = Math.round(enemy.config.salvageReward * salvageMult);
      this.gameState.energy += reward;
      this.gameState.score += reward;
    }

    // Remove leaked enemies and apply reactor damage
    const leaked = this.waveManager.removeLeakedEnemies();
    for (const enemy of leaked) {
      this.gameState.reactorHealth -= REACTOR_DAMAGE_PER_ENEMY;
      enemy.destroy();
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

    this.enemyText = this.add
      .text(GAME_WIDTH / 2 + 140, 6, '', {
        fontSize: '16px',
        color: '#ff8844',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0)
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
      if (
        !this.waveManager.isWaveInProgress &&
        this.waveManager.hasMoreWaves &&
        !this.awaitingUpgradeChoice
      ) {
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

  private wouldBlockAllPaths(col: number, row: number): boolean {
    const originalType = this.gameMap.getTileType(col, row);
    if (originalType === null) return true;

    this.gameMap.setTileType(col, row, TileType.TOWER);

    const airlocks = this.gameMap.getAirlocks();
    const reactor = this.gameMap.getReactor();
    let blocked = true;

    if (reactor) {
      for (const airlock of airlocks) {
        if (this.gameMap.findPath(airlock, reactor) !== null) {
          blocked = false;
          break;
        }
      }
    }

    this.gameMap.setTileType(col, row, originalType);
    return blocked;
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

    if (this.wouldBlockAllPaths(pos.col, pos.row)) {
      this.showInvalidFeedback(pos, 'Cannot block path!');
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
    this.gameMap.setTileType(pos.col, pos.row, TileType.TOWER);
    this.clearPlacementPreview();
  }

  private handleTileHover(pos: { col: number; row: number }): void {
    if (!this.selectedTowerId) return;

    const config = TOWER_CONFIGS[this.selectedTowerId];
    if (!config) return;

    this.clearPlacementPreview();

    const worldPos = this.gameMap.getTileWorldPosition(pos.col, pos.row);
    const tileType = this.gameMap.getTileType(pos.col, pos.row);
    const isBuildable = tileType === TileType.BUILDABLE;
    const canAfford = this.gameState.energy >= config.cost;
    const wouldBlock = isBuildable
      ? this.wouldBlockAllPaths(pos.col, pos.row)
      : false;
    const isValid = isBuildable && canAfford && !wouldBlock;

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
    this.stopButtonPulse();
    if (this.awaitingUpgradeChoice) {
      this.startWaveButton.setFillStyle(0x333300);
      this.startWaveButton.setStrokeStyle(2, 0x666600);
      this.startWaveLabel.setColor('#666600');
      this.startWaveLabel.setText('CHOOSE UPGRADE');
    } else if (enabled && this.waveManager.hasMoreWaves) {
      this.startWaveButton.setFillStyle(0x006600);
      this.startWaveButton.setStrokeStyle(2, 0x00ff00);
      this.startWaveLabel.setColor('#00ff00');
      this.startWaveLabel.setText('START WAVE');
      this.startButtonPulse();
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

  private showWaveCompleteBanner(waveIndex: number): void {
    if (this.waveBanner) {
      this.waveBanner.destroy();
      this.waveBanner = null;
    }

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const bg = this.add
      .rectangle(centerX, centerY, 400, 80, 0x000000, 0.85)
      .setStrokeStyle(2, 0x00ff88)
      .setDepth(100);

    const text = this.add
      .text(centerX, centerY, `WAVE ${waveIndex} COMPLETE!`, {
        fontSize: '28px',
        color: '#00ff88',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(101);

    this.waveBanner = this.add.container(0, 0, [bg, text]).setDepth(100);
    this.waveBanner.setAlpha(0);

    this.tweens.add({
      targets: this.waveBanner,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });

    const dismissBanner = () => {
      if (!this.waveBanner) return;
      this.tweens.add({
        targets: this.waveBanner,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          if (this.waveBanner) {
            this.waveBanner.destroy();
            this.waveBanner = null;
          }
        },
      });
    };

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', dismissBanner);

    this.time.delayedCall(3000, dismissBanner);
  }

  private startButtonPulse(): void {
    this.stopButtonPulse();
    if (!this.waveManager.hasMoreWaves) return;

    this.buttonPulseTween = this.tweens.add({
      targets: this.startWaveButton,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.startWaveLabel,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopButtonPulse(): void {
    if (this.buttonPulseTween) {
      this.buttonPulseTween.stop();
      this.buttonPulseTween = null;
    }
    this.tweens.killTweensOf(this.startWaveButton);
    this.tweens.killTweensOf(this.startWaveLabel);
    this.startWaveButton.setScale(1);
    this.startWaveLabel.setScale(1);
  }

  private showUpgradeSelection(): void {
    this.awaitingUpgradeChoice = true;
    this.updateStartWaveButton(false);

    // Pick 3 random upgrades without duplicates
    const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const overlay = this.add.container(0, 0).setDepth(200);

    const dimBg = this.add
      .rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setDepth(200);
    overlay.add(dimBg);

    const titleText = this.add
      .text(centerX, centerY - 130, 'CHOOSE AN UPGRADE', {
        fontSize: '24px',
        color: '#00ccff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(201);
    overlay.add(titleText);

    const rarityColors: Record<string, string> = {
      common: '#aaaaaa',
      uncommon: '#44dd44',
      rare: '#ff8800',
    };

    choices.forEach((upgrade, index) => {
      const cardX = centerX + (index - 1) * 210;
      const cardY = centerY + 20;

      const cardBg = this.add
        .rectangle(cardX, cardY, 190, 180, 0x112233, 0.95)
        .setStrokeStyle(2, 0x00ccff)
        .setInteractive({ useHandCursor: true })
        .setDepth(201);
      overlay.add(cardBg);

      const nameText = this.add
        .text(cardX, cardY - 60, upgrade.name, {
          fontSize: '14px',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: 170 },
        })
        .setOrigin(0.5)
        .setDepth(202);
      overlay.add(nameText);

      const descText = this.add
        .text(cardX, cardY, upgrade.description, {
          fontSize: '12px',
          color: '#cccccc',
          fontFamily: 'monospace',
          align: 'center',
          wordWrap: { width: 170 },
        })
        .setOrigin(0.5)
        .setDepth(202);
      overlay.add(descText);

      const rarityText = this.add
        .text(cardX, cardY + 50, upgrade.rarity.toUpperCase(), {
          fontSize: '11px',
          color: rarityColors[upgrade.rarity] || '#aaaaaa',
          fontFamily: 'monospace',
        })
        .setOrigin(0.5)
        .setDepth(202);
      overlay.add(rarityText);

      cardBg.on('pointerover', () => {
        cardBg.setStrokeStyle(2, 0xffffff);
      });
      cardBg.on('pointerout', () => {
        cardBg.setStrokeStyle(2, 0x00ccff);
      });
      cardBg.on('pointerdown', () => {
        this.applyUpgrade(upgrade);
        overlay.destroy();
        this.upgradeOverlay = null;
        this.awaitingUpgradeChoice = false;
        this.updateStartWaveButton(true);
        this.updateUpgradeHud();
      });
    });

    this.upgradeOverlay = overlay;
  }

  private applyUpgrade(upgrade: UpgradeConfig): void {
    this.gameState.activeUpgrades.push(upgrade);

    switch (upgrade.effect.stat) {
      case 'damage':
        this.gameState.damageModifier += upgrade.effect.value;
        break;
      case 'fireRate':
        this.gameState.fireRateModifier += upgrade.effect.value;
        break;
      case 'range':
        this.gameState.rangeModifier += upgrade.effect.value;
        break;
      case 'energy':
        this.gameState.energy += upgrade.effect.value;
        break;
      case 'armorPiercing':
        this.gameState.armorPiercing += upgrade.effect.value;
        break;
      case 'reactorHealth': {
        this.gameState.reactorHealth = Math.min(
          this.gameState.reactorHealth + upgrade.effect.value,
          this.gameState.maxReactorHealth,
        );
        break;
      }
      case 'salvage':
        this.gameState.salvageModifier += upgrade.effect.value;
        break;
      case 'extraEnergy':
        this.gameState.energy += upgrade.effect.value;
        break;
    }
  }

  private updateUpgradeHud(): void {
    for (const t of this.upgradeHudTexts) {
      t.destroy();
    }
    this.upgradeHudTexts = [];

    const startY = GAME_HEIGHT - 70;
    const x = 10;

    if (this.gameState.activeUpgrades.length > 0) {
      const header = this.add
        .text(x, startY - 15, 'UPGRADES:', {
          fontSize: '10px',
          color: '#00ccff',
          fontFamily: 'monospace',
        })
        .setDepth(51);
      this.upgradeHudTexts.push(header);

      this.gameState.activeUpgrades.forEach((u, i) => {
        const text = this.add
          .text(x, startY + i * 13, `- ${u.name}`, {
            fontSize: '10px',
            color: '#aaaaaa',
            fontFamily: 'monospace',
          })
          .setDepth(51);
        this.upgradeHudTexts.push(text);
      });
    }
  }

  private updateHUD(): void {
    this.energyText.setText('Energy: ' + this.gameState.energy);
    this.waveText.setText(
      'Wave: ' + this.gameState.currentWave + '/' + this.waveManager.totalWaves,
    );
    this.reactorText.setText(
      'Reactor: ' +
        this.gameState.reactorHealth +
        '/' +
        this.gameState.maxReactorHealth,
    );

    if (this.waveManager.isWaveInProgress) {
      this.enemyText.setText(
        'Enemies: ' +
          this.waveManager.remainingEnemies +
          '/' +
          this.waveManager.totalEnemiesInWave,
      );
    } else {
      this.enemyText.setText('');
    }
  }
}
