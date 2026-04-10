import Phaser from 'phaser';
import { TowerConfig, GridPosition } from '../types';
import { Enemy } from '../enemies/Enemy';

export class Tower {
  public scene: Phaser.Scene;
  public config: TowerConfig;
  public gridPos: GridPosition;
  public worldX: number;
  public worldY: number;
  public sprite: Phaser.GameObjects.Rectangle;
  public rangeCircle: Phaser.GameObjects.Arc;
  public lastFireTime: number = 0;
  public target: Enemy | null = null;

  constructor(
    scene: Phaser.Scene,
    config: TowerConfig,
    gridPos: GridPosition,
    worldX: number,
    worldY: number,
  ) {
    this.scene = scene;
    this.config = config;
    this.gridPos = gridPos;
    this.worldX = worldX;
    this.worldY = worldY;

    this.sprite = scene.add
      .rectangle(worldX, worldY, 30, 30, config.color)
      .setDepth(10);

    // Add a small inner shape to distinguish tower types
    const innerSize = 10;
    scene.add
      .rectangle(worldX, worldY, innerSize, innerSize, 0xffffff, 0.5)
      .setDepth(11);

    this.rangeCircle = scene.add
      .circle(worldX, worldY, config.range, 0xffffff, 0.08)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setDepth(5)
      .setVisible(false);

    this.sprite.setInteractive();
    this.sprite.on('pointerover', () => {
      this.rangeCircle.setVisible(true);
    });
    this.sprite.on('pointerout', () => {
      this.rangeCircle.setVisible(false);
    });
  }

  findTarget(enemies: Enemy[]): Enemy | null {
    let nearestDist = this.config.range;
    let nearest: Enemy | null = null;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dist = Phaser.Math.Distance.Between(
        this.worldX,
        this.worldY,
        enemy.x,
        enemy.y,
      );
      if (dist <= nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    this.target = nearest;
    return nearest;
  }

  canFire(time: number): boolean {
    return time - this.lastFireTime >= this.config.fireRate;
  }

  fire(time: number): void {
    this.lastFireTime = time;
  }

  showRange(): void {
    this.rangeCircle.setVisible(true);
  }

  hideRange(): void {
    this.rangeCircle.setVisible(false);
  }

  destroy(): void {
    this.sprite.destroy();
    this.rangeCircle.destroy();
  }
}
