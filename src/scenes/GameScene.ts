import Phaser from 'phaser';
import {
  TileType,
  GameState,
  UpgradeConfig,
  GAME_WIDTH,
  GAME_HEIGHT,
  TowerConfig,
  ProjectileType,
} from '../types';
import { GameMap } from '../map/GameMap';
import { TEST_MAP } from '../data/maps';
import { TOWER_CONFIGS } from '../data/towers';
import { Tower } from '../towers/Tower';
import { WaveManager } from '../systems/WaveManager';
import { CombatSystem } from '../systems/CombatSystem';
import { Enemy } from '../enemies/Enemy';
import { UPGRADE_POOL } from '../data/upgrades';
import { WAVE_CONFIGS } from '../data/waves';
import { ENEMY_CONFIGS } from '../data/enemies';

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

  // Tower selling state
  private selectedTower: Tower | null = null;
  private sellOverlay: Phaser.GameObjects.Container | null = null;
  private selectedTowerRangeCircle: Phaser.GameObjects.Arc | null = null;

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

  // Task 3: Track selected non-stackable upgrades
  private selectedNonStackableIds: Set<string> = new Set();

  // Task 2: Wave preview panel
  private wavePreviewContainer: Phaser.GameObjects.Container | null = null;

  // Task 5: Game speed toggle (1x / 2x / 3x)
  private gameSpeed: number = 1;
  private speedButton: Phaser.GameObjects.Rectangle | null = null;
  private speedLabel: Phaser.GameObjects.Text | null = null;

  // Task 4: Tower tooltip elements
  private tooltipContainer: Phaser.GameObjects.Container | null = null;
  private hoveredTowerPanelId: string | null = null;
  private hoveredPlacedTower: Tower | null = null;
  private towerHoverHandler!: (tower: Tower) => void;
  private towerHoverEndHandler!: (tower: Tower) => void;

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
      towerDiscount: 0,
      extraEnergy: 0,
      bossSalvageBonus: 0,
    };
    this.gameSpeed = 1;

    this.selectedTowerId = null;
    this.placementPreview = null;
    this.rangePreview = null;
    this.invalidFeedback = null;
    this.selectedTower = null;
    this.sellOverlay = null;
    this.selectedTowerRangeCircle = null;
    this.waveBanner = null;
    this.buttonPulseTween = null;
    this.victoryTriggered = false;
    this.upgradeOverlay = null;
    this.upgradeHudTexts = [];
    this.awaitingUpgradeChoice = false;
    this.selectedNonStackableIds = new Set();
    this.wavePreviewContainer = null;

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
      // Task 5: reset speed to 1x and hide toggle between waves
      this.resetGameSpeed();
      this.showWaveCompleteBanner(waveIndex);

      // Apply reactor regen if upgrade is active
      const regenUpgrade = this.gameState.activeUpgrades.find(
        (u) => u.effect.stat === 'reactorRegen',
      );
      if (regenUpgrade) {
        this.gameState.reactorHealth = Math.min(
          this.gameState.reactorHealth + regenUpgrade.effect.value,
          this.gameState.maxReactorHealth,
        );
      }

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

    // Task 4: Tower hover tooltip handlers (emitted by Tower hitArea)
    this.towerHoverHandler = (tower: Tower) => {
      this.hoveredPlacedTower = tower;
      this.showPlacedTowerTooltip(tower);
    };
    this.towerHoverEndHandler = (tower: Tower) => {
      if (this.hoveredPlacedTower === tower) {
        this.hoveredPlacedTower = null;
        this.hideTooltip();
      }
    };
    this.events.on('towerHover', this.towerHoverHandler);
    this.events.on('towerHoverEnd', this.towerHoverEndHandler);

    // Escape key to deselect tower
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.selectedTower) {
        this.deselectTower();
      }
    });

    // Show wave preview for wave 1
    this.showWavePreview();
  }

  shutdown(): void {
    this.events.off('tileClicked', this.tileClickHandler);
    this.events.off('tileHover', this.tileHoverHandler);
    this.events.off('waveComplete', this.waveCompleteHandler);
    this.events.off('towerHover', this.towerHoverHandler);
    this.events.off('towerHoverEnd', this.towerHoverEndHandler);
    this.waveManager.cleanup();
    this.combatSystem.cleanup();
  }

  update(time: number, delta: number): void {
    // Task 5: scale simulation delta by current game speed. Phaser's
    // time.timeScale additionally drives delayedCall-based timers (spawn
    // timers, banners, etc.) so they also scale.
    const scaledDelta = delta * this.gameSpeed;
    this.waveManager.update(scaledDelta);

    const enemies = this.waveManager.activeEnemies;
    this.combatSystem.update(
      time,
      scaledDelta,
      enemies as Enemy[],
      this.gameState,
    );

    // Harvest killed enemies for rewards
    const killed = this.waveManager.harvestKilledEnemies();
    for (const enemy of killed) {
      const salvageMult = 1 + this.gameState.salvageModifier;
      let reward = Math.round(enemy.config.salvageReward * salvageMult);
      // Task 2: flat bonus on boss kill if Scavenger Protocol is active
      if (enemy.isBoss && this.gameState.bossSalvageBonus > 0) {
        reward += this.gameState.bossSalvageBonus;
      }
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
      .rectangle(GAME_WIDTH / 2, 20, GAME_WIDTH, 40, 0x000000, 0.7)
      .setDepth(50);

    this.energyText = this.add
      .text(16, 8, '', {
        fontSize: '20px',
        color: '#ffcc00',
        fontFamily: 'monospace',
      })
      .setDepth(51);

    this.waveText = this.add
      .text(GAME_WIDTH / 2, 8, '', {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0)
      .setDepth(51);

    this.reactorText = this.add
      .text(GAME_WIDTH - 16, 8, '', {
        fontSize: '20px',
        color: '#ff4444',
        fontFamily: 'monospace',
      })
      .setOrigin(1, 0)
      .setDepth(51);

    this.enemyText = this.add
      .text(GAME_WIDTH / 2 + 200, 8, '', {
        fontSize: '20px',
        color: '#ff8844',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5, 0)
      .setDepth(51);

    this.startWaveButton = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 40, 200, 44, 0x006600)
      .setStrokeStyle(2, 0x00ff00)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);

    this.startWaveLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'START WAVE', {
        fontSize: '20px',
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
        this.hideWavePreview();
        this.waveManager.startNextWave();
        this.gameState.currentWave = this.waveManager.currentWave;
        this.updateStartWaveButton(false);
        // Task 5: reset speed to 1x at start of each wave and show toggle
        this.resetGameSpeed();
        this.updateSpeedButtonVisibility();
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
      .rectangle(GAME_WIDTH - 90, GAME_HEIGHT - 40, 140, 44, 0x660000)
      .setStrokeStyle(2, 0xff2200)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);

    this.add
      .text(GAME_WIDTH - 90, GAME_HEIGHT - 40, 'END RUN', {
        fontSize: '18px',
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

    // Task 5: Speed toggle button (1x / 2x / 3x). Sits to the right of the
    // START WAVE button so it's clearly visible in the HUD during gameplay.
    this.speedButton = this.add
      .rectangle(GAME_WIDTH / 2 + 160, GAME_HEIGHT - 40, 80, 44, 0x114466)
      .setStrokeStyle(2, 0x4488cc)
      .setInteractive({ useHandCursor: true })
      .setDepth(50);
    this.speedLabel = this.add
      .text(GAME_WIDTH / 2 + 160, GAME_HEIGHT - 40, '1x', {
        fontSize: '20px',
        color: '#88ccff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.speedButton.on('pointerdown', () => {
      if (!this.waveManager.isWaveInProgress) return;
      this.cycleGameSpeed();
    });
    this.speedButton.on('pointerover', () => {
      if (this.waveManager.isWaveInProgress) {
        this.speedButton?.setFillStyle(0x1a5a88);
      }
    });
    this.speedButton.on('pointerout', () => {
      if (this.waveManager.isWaveInProgress) {
        this.speedButton?.setFillStyle(0x114466);
      }
    });
    this.updateSpeedButtonVisibility();

    this.updateHUD();
  }

  // Task 5: Cycle game speed 1x -> 2x -> 3x -> 1x
  private cycleGameSpeed(): void {
    this.gameSpeed = this.gameSpeed >= 3 ? 1 : this.gameSpeed + 1;
    this.applyGameSpeed();
  }

  private applyGameSpeed(): void {
    // Scene time scale drives Phaser's delayedCall-based timers (spawn
    // timers, wave banner dismiss) and scene-level tweens.
    this.time.timeScale = this.gameSpeed;
    if (this.speedLabel) {
      this.speedLabel.setText(`${this.gameSpeed}x`);
    }
  }

  private resetGameSpeed(): void {
    this.gameSpeed = 1;
    this.applyGameSpeed();
    this.updateSpeedButtonVisibility();
  }

  // Hide/disable speed toggle when no wave is in progress.
  private updateSpeedButtonVisibility(): void {
    const active = this.waveManager?.isWaveInProgress ?? false;
    if (!this.speedButton || !this.speedLabel) return;
    if (active) {
      this.speedButton.setVisible(true);
      this.speedLabel.setVisible(true);
      this.speedButton.setFillStyle(0x114466);
      this.speedButton.setStrokeStyle(2, 0x4488cc);
      this.speedLabel.setColor('#88ccff');
    } else {
      this.speedButton.setVisible(false);
      this.speedLabel.setVisible(false);
    }
  }

  private createTowerPanel(): void {
    const panelX = 16;
    const panelY = 55;

    this.add
      .text(panelX, panelY, 'TOWERS', {
        fontSize: '16px',
        color: '#00ccff',
        fontFamily: 'monospace',
      })
      .setDepth(50);

    const towerIds = Object.keys(TOWER_CONFIGS);
    towerIds.forEach((id, index) => {
      const config = TOWER_CONFIGS[id];
      const y = panelY + 30 + index * 50;

      const container = this.add.container(panelX, y).setDepth(50);

      const bg = this.add
        .rectangle(60, 0, 120, 44, 0x111122)
        .setStrokeStyle(1, 0x334466)
        .setInteractive({ useHandCursor: true })
        .setOrigin(0, 0);

      const swatch = this.add.rectangle(10, 22, 18, 18, config.color);

      const label = this.add.text(28, 5, config.name, {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'monospace',
      });

      const costText = this.add
        .text(28, 22, '$' + this.getDiscountedCost(config.cost), {
          fontSize: '12px',
          color: '#ffcc00',
          fontFamily: 'monospace',
        })
        .setName('costText');

      container.add([bg, swatch, label, costText]);

      // Task 4: Tower panel hover tooltip
      bg.on('pointerover', () => {
        this.hoveredTowerPanelId = id;
        this.showTowerPanelTooltip(id, panelX + 130, y);
      });
      bg.on('pointerout', () => {
        if (this.hoveredTowerPanelId === id) {
          this.hoveredTowerPanelId = null;
          this.hideTooltip();
        }
      });

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

  // Check that ALL airlocks still have a valid path after hypothetical placement
  private wouldBlockAllPaths(col: number, row: number): boolean {
    const originalType = this.gameMap.getTileType(col, row);
    if (originalType === null) return true;

    this.gameMap.setTileType(col, row, TileType.TOWER);

    const airlocks = this.gameMap.getAirlocks();
    const reactor = this.gameMap.getReactor();
    let wouldBlockAny = false;

    if (reactor) {
      for (const airlock of airlocks) {
        if (this.gameMap.findPath(airlock, reactor) === null) {
          wouldBlockAny = true;
          break;
        }
      }
    } else {
      wouldBlockAny = true;
    }

    this.gameMap.setTileType(col, row, originalType);
    return wouldBlockAny;
  }

  private handleTileClick(
    pos: { col: number; row: number },
    type: TileType,
  ): void {
    // If clicking a tower tile, select it for selling
    if (type === TileType.TOWER) {
      const tower = this.combatSystem.getTowerAt(pos.col, pos.row);
      if (tower) {
        this.selectTowerForSell(tower);
        return;
      }
    }

    // Clicking elsewhere deselects the sell overlay
    if (this.selectedTower) {
      this.deselectTower();
    }

    if (!this.selectedTowerId) return;

    const config = TOWER_CONFIGS[this.selectedTowerId];
    if (!config) return;

    if (type !== TileType.BUILDABLE) {
      this.showInvalidFeedback(pos, 'Cannot build here!');
      return;
    }

    // Task 2: apply tower cost discount when Supply Line Optimization active
    const effectiveCost = this.getDiscountedCost(config.cost);
    if (this.gameState.energy < effectiveCost) {
      this.showInvalidFeedback(pos, 'Not enough energy!');
      return;
    }

    if (this.wouldBlockAllPaths(pos.col, pos.row)) {
      this.showInvalidFeedback(pos, 'Would block airlock path!');
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
    this.gameState.energy -= effectiveCost;
    this.gameMap.setTileType(pos.col, pos.row, TileType.TOWER);
    this.clearPlacementPreview();
  }

  // Task 2: Compute discounted tower cost given the current towerDiscount
  // modifier. Clamped to a minimum of 1 energy. Rounded for display parity.
  private getDiscountedCost(baseCost: number): number {
    const d = Math.max(0, Math.min(1, this.gameState?.towerDiscount ?? 0));
    return Math.max(1, Math.round(baseCost * (1 - d)));
  }

  // =====================
  // Task 4: Tower tooltip system
  // =====================

  // Shared formatter for tooltip body text. Applies current gameState
  // modifiers so players see the stats they'll actually get.
  private formatTowerTooltipLines(config: TowerConfig): string[] {
    const dmgMod = 1 + (this.gameState?.damageModifier ?? 0);
    const rangeMod = 1 + (this.gameState?.rangeModifier ?? 0);
    const fireMod = 1 + (this.gameState?.fireRateModifier ?? 0);
    const effDamage = Math.round(config.damage * dmgMod);
    const effRange = Math.round(config.range * rangeMod);
    // Firing rate: lower fireRate (ms) = faster. Present as shots/sec.
    const effFireRateMs = config.fireRate / fireMod;
    const shotsPerSec =
      effFireRateMs > 0 ? (1000 / effFireRateMs).toFixed(2) : '—';
    const cost = this.getDiscountedCost(config.cost);

    let damageLine = `Damage: ${effDamage}`;
    if (config.projectileType === ProjectileType.EMP) {
      damageLine = 'Damage: 0 (Slow effect)';
    } else if (config.projectileType === ProjectileType.GRAVITY) {
      damageLine = `Damage: ${config.damage}/s (Slow zone)`;
    }

    const lines: string[] = [
      config.name,
      config.description,
      '',
      damageLine,
      `Range: ${effRange}`,
      `Fire rate: ${shotsPerSec}/s`,
      `Cost: ${cost}⚡`,
    ];
    return lines;
  }

  // Build a freshly-rendered tooltip container at the given anchor (x, y).
  // Automatically clamps within the game viewport so nothing clips.
  private buildTooltip(
    anchorX: number,
    anchorY: number,
    lines: string[],
  ): Phaser.GameObjects.Container {
    this.hideTooltip();
    const padding = 8;
    const lineHeight = 16;
    const maxLineWidth = 240;
    const texts: Phaser.GameObjects.Text[] = [];
    let width = 0;
    for (let i = 0; i < lines.length; i++) {
      const isTitle = i === 0;
      const t = this.add
        .text(padding, padding + i * lineHeight, lines[i], {
          fontSize: isTitle ? '14px' : '12px',
          color: isTitle ? '#00ccff' : '#e0e6f0',
          fontFamily: 'monospace',
          fontStyle: isTitle ? 'bold' : 'normal',
          wordWrap: { width: maxLineWidth },
        })
        .setDepth(201);
      texts.push(t);
      width = Math.max(width, t.width);
    }
    const totalHeight =
      padding * 2 + Math.max(1, lines.length) * lineHeight - 4;
    const totalWidth = Math.min(maxLineWidth, width) + padding * 2;

    // Position so that the tooltip avoids the cursor and screen edges
    let x = anchorX + 12;
    let y = anchorY + 12;
    if (x + totalWidth > GAME_WIDTH - 4) x = anchorX - totalWidth - 12;
    if (y + totalHeight > GAME_HEIGHT - 4) y = anchorY - totalHeight - 12;
    if (x < 4) x = 4;
    if (y < 4) y = 4;

    const bg = this.add
      .rectangle(0, 0, totalWidth, totalHeight, 0x0a0a1a, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x4488cc, 0.9)
      .setDepth(200);

    const container = this.add.container(x, y, [bg, ...texts]).setDepth(200);
    this.tooltipContainer = container;
    return container;
  }

  private showTowerPanelTooltip(
    towerId: string,
    anchorX: number,
    anchorY: number,
  ): void {
    const config = TOWER_CONFIGS[towerId];
    if (!config) return;
    const lines = this.formatTowerTooltipLines(config);
    this.buildTooltip(anchorX, anchorY, lines);
  }

  private showPlacedTowerTooltip(tower: Tower): void {
    const lines = this.formatTowerTooltipLines(tower.config);
    this.buildTooltip(tower.worldX, tower.worldY, lines);
  }

  private hideTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
  }

  // Refresh displayed tower panel costs after upgrades change the discount.
  private refreshTowerPanelCosts(): void {
    const towerIds = Object.keys(TOWER_CONFIGS);
    towerIds.forEach((id, index) => {
      const container = this.towerButtons[index];
      if (!container) return;
      const costText = container.getByName(
        'costText',
      ) as Phaser.GameObjects.Text | null;
      if (costText) {
        const config = TOWER_CONFIGS[id];
        costText.setText('$' + this.getDiscountedCost(config.cost));
      }
    });
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
        fontSize: '14px',
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
      .rectangle(centerX, centerY, 500, 100, 0x000000, 0.85)
      .setStrokeStyle(2, 0x00ff88)
      .setDepth(100);

    const text = this.add
      .text(centerX, centerY, `WAVE ${waveIndex} COMPLETE!`, {
        fontSize: '36px',
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

  // Task 2: Show wave preview panel
  private showWavePreview(): void {
    this.hideWavePreview();

    const nextWaveIndex = this.waveManager.currentWave;
    if (nextWaveIndex >= WAVE_CONFIGS.length) return;

    const waveConfig = WAVE_CONFIGS[nextWaveIndex];
    const btnX = GAME_WIDTH / 2;
    const btnY = GAME_HEIGHT - 40;

    const container = this.add.container(0, 0).setDepth(49);

    const lineHeight = 24;
    const panelHeight = 40 + waveConfig.groups.length * lineHeight;
    const panelWidth = 260;
    const panelX = btnX;
    const panelY = btnY - 44 - panelHeight / 2;

    const bg = this.add
      .rectangle(panelX, panelY, panelWidth, panelHeight, 0x0a0a2a, 0.9)
      .setStrokeStyle(1, 0x334466);
    container.add(bg);

    const titleY = panelY - panelHeight / 2 + 16;
    const title = this.add
      .text(panelX, titleY, `WAVE ${nextWaveIndex + 1} PREVIEW`, {
        fontSize: '13px',
        color: '#00ccff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    container.add(title);

    waveConfig.groups.forEach((group, i) => {
      const enemyConfig = ENEMY_CONFIGS[group.enemyId];
      if (!enemyConfig) return;

      const rowY = titleY + 20 + i * lineHeight;

      // Color-coded circle
      const colorCircle = this.add
        .circle(panelX - panelWidth / 2 + 20, rowY, 6, enemyConfig.color)
        .setDepth(49);
      container.add(colorCircle);

      // Enemy name and count
      const label = this.add
        .text(
          panelX - panelWidth / 2 + 36,
          rowY,
          `${group.count}\u00D7 ${enemyConfig.name}`,
          {
            fontSize: '13px',
            color: '#cccccc',
            fontFamily: 'monospace',
          },
        )
        .setOrigin(0, 0.5);
      container.add(label);
    });

    this.wavePreviewContainer = container;
  }

  private hideWavePreview(): void {
    if (this.wavePreviewContainer) {
      this.wavePreviewContainer.destroy();
      this.wavePreviewContainer = null;
    }
  }

  // Task 3: Upgrade selection with stackable tracking
  private showUpgradeSelection(): void {
    this.awaitingUpgradeChoice = true;
    this.updateStartWaveButton(false);
    this.hideWavePreview();

    // Build pool of available upgrades, excluding used non-stackable ones
    const availablePool = UPGRADE_POOL.filter(
      (u) => u.stackable || !this.selectedNonStackableIds.has(u.id),
    );

    // Pick 3 random distinct upgrades
    const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);

    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const overlay = this.add.container(0, 0).setDepth(200);

    const dimBg = this.add
      .rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setDepth(200);
    overlay.add(dimBg);

    const titleText = this.add
      .text(centerX, centerY - 160, 'CHOOSE AN UPGRADE', {
        fontSize: '30px',
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
      const cardX = centerX + (index - 1) * 260;
      const cardY = centerY + 20;

      const cardBg = this.add
        .rectangle(cardX, cardY, 230, 210, 0x112233, 0.95)
        .setStrokeStyle(2, 0x00ccff)
        .setInteractive({ useHandCursor: true })
        .setDepth(201);
      overlay.add(cardBg);

      const nameText = this.add
        .text(cardX, cardY - 70, upgrade.name, {
          fontSize: '16px',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: 210 },
        })
        .setOrigin(0.5)
        .setDepth(202);
      overlay.add(nameText);

      const descText = this.add
        .text(cardX, cardY, upgrade.description, {
          fontSize: '14px',
          color: '#cccccc',
          fontFamily: 'monospace',
          align: 'center',
          wordWrap: { width: 210 },
        })
        .setOrigin(0.5)
        .setDepth(202);
      overlay.add(descText);

      const rarityText = this.add
        .text(cardX, cardY + 55, upgrade.rarity.toUpperCase(), {
          fontSize: '12px',
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

        // Track non-stackable selection
        if (!upgrade.stackable) {
          this.selectedNonStackableIds.add(upgrade.id);
        }

        overlay.destroy();
        this.upgradeOverlay = null;
        this.awaitingUpgradeChoice = false;
        this.updateStartWaveButton(true);
        this.updateUpgradeHud();
        this.showWavePreview();
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
        // Task 2: add to tracked field and grant energy immediately
        this.gameState.extraEnergy += upgrade.effect.value;
        this.gameState.energy += upgrade.effect.value;
        break;
      case 'towerDiscount':
        // Task 2: tower-cost discount applied at purchase time
        this.gameState.towerDiscount += upgrade.effect.value;
        this.refreshTowerPanelCosts();
        break;
      case 'bossSalvage':
        // Task 2: flat bonus applied when the boss is killed
        this.gameState.bossSalvageBonus += upgrade.effect.value;
        break;
      case 'reactorRegen':
        // Effect applied at wave completion via waveCompleteHandler
        break;
    }
  }

  private updateUpgradeHud(): void {
    for (const t of this.upgradeHudTexts) {
      t.destroy();
    }
    this.upgradeHudTexts = [];

    const startY = GAME_HEIGHT - 90;
    const x = 16;

    if (this.gameState.activeUpgrades.length > 0) {
      const header = this.add
        .text(x, startY - 15, 'UPGRADES:', {
          fontSize: '11px',
          color: '#00ccff',
          fontFamily: 'monospace',
        })
        .setDepth(51);
      this.upgradeHudTexts.push(header);

      this.gameState.activeUpgrades.forEach((u, i) => {
        const text = this.add
          .text(x, startY + i * 14, `- ${u.name}`, {
            fontSize: '11px',
            color: '#aaaaaa',
            fontFamily: 'monospace',
          })
          .setDepth(51);
        this.upgradeHudTexts.push(text);
      });
    }
  }

  // Select a tower and show sell UI
  private selectTowerForSell(tower: Tower): void {
    this.deselectTower();
    this.selectedTower = tower;

    const refundAmount = Math.ceil(tower.config.cost * 0.6);

    // Show range circle
    this.selectedTowerRangeCircle = this.add
      .circle(tower.worldX, tower.worldY, tower.config.range, 0xffffff, 0.08)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setDepth(5);

    // Create sell overlay
    this.sellOverlay = this.add.container(0, 0).setDepth(100);

    const bg = this.add
      .rectangle(tower.worldX, tower.worldY - 45, 130, 55, 0x000000, 0.85)
      .setStrokeStyle(1, 0xff4444);
    this.sellOverlay.add(bg);

    const nameText = this.add
      .text(tower.worldX, tower.worldY - 60, tower.config.name, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(101);
    this.sellOverlay.add(nameText);

    const sellBtn = this.add
      .rectangle(tower.worldX, tower.worldY - 38, 110, 24, 0x660000)
      .setStrokeStyle(1, 0xff2200)
      .setInteractive({ useHandCursor: true })
      .setDepth(101);
    this.sellOverlay.add(sellBtn);

    const sellLabel = this.add
      .text(tower.worldX, tower.worldY - 38, `SELL (+${refundAmount}E)`, {
        fontSize: '12px',
        color: '#ff4444',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setDepth(102);
    this.sellOverlay.add(sellLabel);

    sellBtn.on('pointerover', () => sellBtn.setFillStyle(0x880000));
    sellBtn.on('pointerout', () => sellBtn.setFillStyle(0x660000));
    sellBtn.on('pointerdown', () => {
      this.sellTower(tower, refundAmount);
    });
  }

  // Deselect tower and remove sell UI
  private deselectTower(): void {
    if (this.sellOverlay) {
      this.sellOverlay.destroy();
      this.sellOverlay = null;
    }
    if (this.selectedTowerRangeCircle) {
      this.selectedTowerRangeCircle.destroy();
      this.selectedTowerRangeCircle = null;
    }
    this.selectedTower = null;
  }

  // Execute tower sell
  private sellTower(tower: Tower, refundAmount: number): void {
    // Refund energy
    this.gameState.energy += refundAmount;

    // Revert tile to buildable
    this.gameMap.setTileType(
      tower.gridPos.col,
      tower.gridPos.row,
      TileType.BUILDABLE,
    );

    // Remove tower from combat system (also destroys graphics)
    this.combatSystem.removeTower(tower);

    // Clear sell UI
    this.deselectTower();
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
