import Phaser from 'phaser';
import { EnemyConfig, GridPosition } from '../types';

export class Enemy {
  public scene: Phaser.Scene;
  public config: EnemyConfig;
  public x: number;
  public y: number;
  public health: number;
  public maxHealth: number;
  public speed: number;
  public armor: number;
  public alive: boolean = true;
  public reachedReactor: boolean = false;

  private sprite: Phaser.GameObjects.Arc;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  private path: GridPosition[];
  private pathIndex: number = 0;
  private tileSize: number;
  private mapOffsetX: number;
  private mapOffsetY: number;

  constructor(
    scene: Phaser.Scene,
    config: EnemyConfig,
    startX: number,
    startY: number,
    path: GridPosition[],
    tileSize: number,
    mapOffsetX: number,
    mapOffsetY: number,
  ) {
    this.scene = scene;
    this.config = config;
    this.x = startX;
    this.y = startY;
    this.health = config.health;
    this.maxHealth = config.health;
    this.speed = config.speed;
    this.armor = config.armor;
    this.path = path;
    this.tileSize = tileSize;
    this.mapOffsetX = mapOffsetX;
    this.mapOffsetY = mapOffsetY;

    this.sprite = scene.add
      .circle(startX, startY, config.size, config.color)
      .setDepth(15);

    this.healthBarBg = scene.add
      .rectangle(startX, startY - config.size - 6, 24, 4, 0x333333)
      .setDepth(16);

    this.healthBarFill = scene.add
      .rectangle(startX, startY - config.size - 6, 24, 4, 0x00ff00)
      .setDepth(17);
  }

  isAlive(): boolean {
    return this.alive && !this.reachedReactor;
  }

  update(delta: number): void {
    if (!this.alive || this.reachedReactor) return;

    if (this.pathIndex >= this.path.length) {
      this.reachedReactor = true;
      return;
    }

    const targetPos = this.path[this.pathIndex];
    const targetX =
      this.mapOffsetX + targetPos.col * this.tileSize + this.tileSize / 2;
    const targetY =
      this.mapOffsetY + targetPos.row * this.tileSize + this.tileSize / 2;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      this.pathIndex++;
      return;
    }

    const moveAmount = (this.speed * delta) / 1000;
    this.x += (dx / dist) * moveAmount;
    this.y += (dy / dist) * moveAmount;

    this.sprite.setPosition(this.x, this.y);
    this.healthBarBg.setPosition(this.x, this.y - this.config.size - 6);
    this.healthBarFill.setPosition(this.x, this.y - this.config.size - 6);

    const healthPercent = this.health / this.maxHealth;
    this.healthBarFill.setScale(healthPercent, 1);
    this.healthBarFill.x = this.x - (24 * (1 - healthPercent)) / 2;

    if (healthPercent > 0.5) {
      this.healthBarFill.setFillStyle(0x00ff00);
    } else if (healthPercent > 0.25) {
      this.healthBarFill.setFillStyle(0xffff00);
    } else {
      this.healthBarFill.setFillStyle(0xff0000);
    }
  }

  takeDamage(damage: number, armorPiercing: number = 0): void {
    const effectiveArmor = Math.max(0, this.armor - armorPiercing);
    const effectiveDamage = Math.max(1, damage - effectiveArmor);
    this.health -= effectiveDamage;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.destroy();
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
  }
}
