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

  // Procedural body rendering (Task 3): a container of shapes per enemy type
  private body: Phaser.GameObjects.Container;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  private path: GridPosition[];
  private pathIndex: number = 0;
  private tileSize: number;
  private mapOffsetX: number;
  private mapOffsetY: number;
  public readonly isBoss: boolean;
  private healthBarWidth: number;
  // Visual helpers for procedural body animation (Task 3)
  private headingAngle: number = 0;
  private pulseT: number = 0;

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

    // Procedural multi-shape body per enemy type (Task 3)
    this.body = this.buildProceduralBody(scene, startX, startY);

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

    // Heading for facing the body in the direction of travel
    this.headingAngle = Math.atan2(dy, dx);
    this.body.setPosition(this.x, this.y);
    this.body.setRotation(this.headingAngle + Math.PI / 2);
    this.pulseT += delta;
    this.animateProceduralBody();

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

    // Tint body when slowed
    this.body.setAlpha(effectiveSlow > 0 ? 0.8 : 1);
  }

  // Task 3: Build distinct multi-shape composition per enemy type using
  // Phaser Graphics primitives. Shapes are added to a container positioned
  // at the enemy's world coordinates so we can rotate/animate them together.
  private buildProceduralBody(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(startX, startY).setDepth(15);
    const color = this.config.color;
    const size = this.config.size;

    switch (this.config.id) {
      case 'scout': {
        // Diamond/arrow shape pointing forward (up in local space)
        const hull = scene.add.polygon(
          0,
          0,
          [
            0,
            -size,
            size * 0.7,
            size * 0.6,
            0,
            size * 0.3,
            -size * 0.7,
            size * 0.6,
          ],
          color,
        );
        hull.setStrokeStyle(1, 0xffffff, 0.5);
        // Engine trail indicator behind (below in local space)
        const trail = scene.add.ellipse(
          0,
          size * 0.7,
          size * 0.6,
          size * 0.9,
          0xff8844,
          0.7,
        );
        trail.setName('trail');
        container.add([trail, hull]);
        break;
      }
      case 'brute': {
        // Hexagonal hull
        const hexPts: number[] = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          hexPts.push(Math.cos(a) * size, Math.sin(a) * size);
        }
        const hull = scene.add.polygon(0, 0, hexPts, color);
        hull.setStrokeStyle(2, 0x880000, 1);
        // Shield ring (outer stroked circle)
        const shield = scene.add.circle(0, 0, size + 4, 0xffaa00, 0);
        shield.setStrokeStyle(2, 0xffaa00, 0.5);
        shield.setName('shield');
        // Inner core
        const core = scene.add.circle(0, 0, size * 0.35, 0xffffff, 0.9);
        container.add([shield, hull, core]);
        break;
      }
      case 'carrier': {
        // Elongated capsule shape (taller than wide) with cargo panels
        const hull = scene.add.ellipse(0, 0, size * 1.3, size * 2.2, color);
        hull.setStrokeStyle(1, 0xaa8800, 0.9);
        const panelL = scene.add.rectangle(
          -size * 0.45,
          0,
          size * 0.35,
          size * 1.3,
          0x886600,
          0.9,
        );
        const panelR = scene.add.rectangle(
          size * 0.45,
          0,
          size * 0.35,
          size * 1.3,
          0x886600,
          0.9,
        );
        const bridge = scene.add.rectangle(
          0,
          -size * 0.5,
          size * 0.5,
          size * 0.4,
          0xffffaa,
          0.9,
        );
        container.add([hull, panelL, panelR, bridge]);
        break;
      }
      case 'boss': {
        // Multi-layered polygon: outer octagon, inner polygon, glowing core,
        // orbiting particle dots
        const octPts: number[] = [];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          octPts.push(Math.cos(a) * size, Math.sin(a) * size);
        }
        const outer = scene.add.polygon(0, 0, octPts, color);
        outer.setStrokeStyle(3, 0xffd700, 0.9);
        const inner = scene.add.polygon(
          0,
          0,
          octPts.map((v) => v * 0.6),
          0x660066,
        );
        inner.setStrokeStyle(2, 0xff66ff, 0.9);
        const core = scene.add.circle(0, 0, size * 0.35, 0xffffff, 1);
        core.setName('core');
        // Orbiting particles (decorative)
        const p1 = scene.add.circle(size + 4, 0, 3, 0xffd700, 1);
        const p2 = scene.add.circle(-size - 4, 0, 3, 0xffd700, 1);
        const p3 = scene.add.circle(0, size + 4, 3, 0xffd700, 1);
        const p4 = scene.add.circle(0, -size - 4, 3, 0xffd700, 1);
        p1.setName('p');
        p2.setName('p');
        p3.setName('p');
        p4.setName('p');
        container.add([outer, inner, core, p1, p2, p3, p4]);
        // Boss spawn: screen shake effect (preserved from previous version)
        scene.cameras.main.shake(400, 0.01);
        break;
      }
      default: {
        // Fallback: simple circle
        const hull = scene.add.circle(0, 0, size, color);
        container.add(hull);
      }
    }
    return container;
  }

  // Subtle per-frame animation of visual sub-elements without affecting
  // gameplay. Scout's engine trail flickers, brute's shield ring pulses,
  // boss's core pulses.
  private animateProceduralBody(): void {
    const flicker = 0.6 + Math.sin(this.pulseT / 60) * 0.25;
    for (const child of this.body.list) {
      const named = child as Phaser.GameObjects.GameObject & {
        name?: string;
        setAlpha?: (n: number) => unknown;
        setScale?: (x: number, y?: number) => unknown;
      };
      if (named.name === 'trail' && named.setAlpha) {
        named.setAlpha(flicker);
      }
      if (named.name === 'shield' && named.setScale) {
        const s = 1 + Math.sin(this.pulseT / 400) * 0.08;
        named.setScale(s, s);
      }
      if (named.name === 'core' && named.setScale) {
        const s = 1 + Math.sin(this.pulseT / 200) * 0.15;
        named.setScale(s, s);
      }
      if (named.name === 'p' && named.setAlpha) {
        named.setAlpha(0.6 + Math.sin(this.pulseT / 150) * 0.4);
      }
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
    this.body.destroy();
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
  }
}
