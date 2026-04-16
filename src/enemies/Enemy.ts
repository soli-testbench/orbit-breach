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

  // Slow mechanic fields (Task 4)
  public slowFactor: number = 0;
  public slowDuration: number = 0;
  public slowTimer: number = 0;
  public gravitySlowFactor: number = 0;

  private sprite: Phaser.GameObjects.Arc;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  private path: GridPosition[];
  private pathIndex: number = 0;
  private tileSize: number;
  private mapOffsetX: number;
  private mapOffsetY: number;
  private isBoss: boolean;
  private healthBarWidth: number;

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
    this.isBoss = config.id === 'boss';
    this.healthBarWidth = this.isBoss ? 48 : 24;

    this.sprite = scene.add
      .circle(startX, startY, config.size, config.color)
      .setDepth(15);

    // Boss gets extra visual ring for distinction
    if (this.isBoss) {
      this.sprite.setStrokeStyle(3, 0xffd700, 0.9);
    }

    this.healthBarBg = scene.add
      .rectangle(
        startX,
        startY - config.size - 6,
        this.healthBarWidth,
        this.isBoss ? 6 : 4,
        0x333333,
      )
      .setDepth(16);

    this.healthBarFill = scene.add
      .rectangle(
        startX,
        startY - config.size - 6,
        this.healthBarWidth,
        this.isBoss ? 6 : 4,
        this.isBoss ? 0xff00ff : 0x00ff00,
      )
      .setDepth(17);

    // Boss spawn: screen shake effect
    if (this.isBoss) {
      scene.cameras.main.shake(400, 0.01);
    }
  }

  isAlive(): boolean {
    return this.alive && !this.reachedReactor;
  }

  applySlow(factor: number, duration: number): void {
    if (factor > this.slowFactor) {
      this.slowFactor = factor;
    }
    this.slowDuration = Math.max(this.slowDuration, duration);
    this.slowTimer = this.slowDuration;
  }

  applyGravitySlow(factor: number): void {
    this.gravitySlowFactor = factor;
  }

  clearGravitySlow(): void {
    this.gravitySlowFactor = 0;
  }

  update(delta: number): void {
    if (!this.alive || this.reachedReactor) return;

    // Update slow timer
    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowTimer = 0;
        this.slowFactor = 0;
        this.slowDuration = 0;
      }
    }

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

    // Apply slow: use the stronger of timed slow and gravity slow
    const effectiveSlow = Math.max(this.slowFactor, this.gravitySlowFactor);
    const speedMultiplier = 1 - effectiveSlow;
    const moveAmount = (this.speed * speedMultiplier * delta) / 1000;
    this.x += (dx / dist) * moveAmount;
    this.y += (dy / dist) * moveAmount;

    this.sprite.setPosition(this.x, this.y);
    this.healthBarBg.setPosition(this.x, this.y - this.config.size - 6);
    this.healthBarFill.setPosition(this.x, this.y - this.config.size - 6);

    const healthPercent = this.health / this.maxHealth;
    this.healthBarFill.setScale(healthPercent, 1);
    this.healthBarFill.x =
      this.x - (this.healthBarWidth * (1 - healthPercent)) / 2;

    if (this.isBoss) {
      // Boss always uses magenta health bar
      this.healthBarFill.setFillStyle(0xff00ff);
    } else if (healthPercent > 0.5) {
      this.healthBarFill.setFillStyle(0x00ff00);
    } else if (healthPercent > 0.25) {
      this.healthBarFill.setFillStyle(0xffff00);
    } else {
      this.healthBarFill.setFillStyle(0xff0000);
    }

    // Tint sprite when slowed
    if (effectiveSlow > 0) {
      this.sprite.setAlpha(0.8);
    } else {
      this.sprite.setAlpha(1);
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
    this.alive = false;
    this.sprite.destroy();
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
  }
}
