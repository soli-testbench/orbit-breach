import Phaser from 'phaser';
import { TowerConfig, GridPosition, ProjectileType } from '../types';
import { Enemy } from '../enemies/Enemy';

export class Tower {
  public scene: Phaser.Scene;
  public config: TowerConfig;
  public gridPos: GridPosition;
  public worldX: number;
  public worldY: number;
  // Task 3: procedural multi-shape body container for each tower type
  public body: Phaser.GameObjects.Container;
  // Task 4 (hover): invisible interactive hit area for mouse events
  public hitArea: Phaser.GameObjects.Rectangle;
  public rangeCircle: Phaser.GameObjects.Arc;
  public lastFireTime: number = 0;
  public target: Enemy | null = null;
  // Barrel sub-shape for turret-style towers (rotates toward target)
  private barrel: Phaser.GameObjects.Rectangle | null = null;
  private pulseT: number = 0;
  // Tracks time since last muzzle flash in real ms (visual-only). Unrelated
  // to lastFireTime, which lives on an internal scaled clock (Task 5).
  private muzzleFlashMs: number = 9999;

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

    // Procedural body per tower type (Task 3)
    this.body = this.buildProceduralBody(scene);

    this.rangeCircle = scene.add
      .circle(worldX, worldY, config.range, 0xffffff, 0.08)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setDepth(5)
      .setVisible(false);

    // Dedicated transparent hit-area rectangle. Using a rectangle keeps
    // pointer events reliable even when the procedural body is composed of
    // multiple shapes or a rotating barrel.
    this.hitArea = scene.add
      .rectangle(worldX, worldY, 34, 34, 0xffffff, 0.001)
      .setDepth(12)
      .setInteractive({ useHandCursor: true });

    this.hitArea.on('pointerover', () => {
      this.rangeCircle.setVisible(true);
      this.scene.events.emit('towerHover', this);
    });
    this.hitArea.on('pointerout', () => {
      this.rangeCircle.setVisible(false);
      this.scene.events.emit('towerHoverEnd', this);
    });
  }

  // Task 3: Build distinct visual shape per tower type using Phaser
  // Graphics primitives (circles, rectangles, polygons, strokes).
  private buildProceduralBody(
    scene: Phaser.Scene,
  ): Phaser.GameObjects.Container {
    const container = scene.add
      .container(this.worldX, this.worldY)
      .setDepth(10);
    const color = this.config.color;

    switch (this.config.projectileType) {
      case ProjectileType.LASER: {
        // Rotatable barrel/turret: round base with a long barrel that
        // points at the current target
        const base = scene.add.circle(0, 0, 13, 0x222233);
        base.setStrokeStyle(2, color, 1);
        const platform = scene.add.rectangle(0, 0, 22, 22, 0x111122);
        platform.setStrokeStyle(1, color, 0.7);
        const barrel = scene.add.rectangle(0, -8, 4, 18, color);
        barrel.setOrigin(0.5, 1);
        this.barrel = barrel;
        const muzzle = scene.add.circle(0, -16, 2.5, 0xffffff, 0.9);
        muzzle.setName('muzzle');
        container.add([platform, base, barrel, muzzle]);
        break;
      }
      case ProjectileType.PLASMA: {
        // Glowing orb with energy ring(s)
        const ring = scene.add.circle(0, 0, 15, 0x000000, 0);
        ring.setStrokeStyle(2, color, 0.8);
        ring.setName('ring');
        const orb = scene.add.circle(0, 0, 9, color, 0.95);
        const glow = scene.add.circle(0, 0, 6, 0xffffff, 0.8);
        glow.setName('glow');
        container.add([ring, orb, glow]);
        break;
      }
      case ProjectileType.MISSILE: {
        // Multi-tube launcher: base plate with 4 tubes
        const basePlate = scene.add.rectangle(0, 0, 24, 24, 0x221100);
        basePlate.setStrokeStyle(1, color, 0.8);
        const tube1 = scene.add.rectangle(-6, -6, 6, 12, 0x332200);
        tube1.setStrokeStyle(1, color, 0.9);
        const tube2 = scene.add.rectangle(6, -6, 6, 12, 0x332200);
        tube2.setStrokeStyle(1, color, 0.9);
        const tube3 = scene.add.rectangle(-6, 6, 6, 12, 0x332200);
        tube3.setStrokeStyle(1, color, 0.9);
        const tube4 = scene.add.rectangle(6, 6, 6, 12, 0x332200);
        tube4.setStrokeStyle(1, color, 0.9);
        const hatch = scene.add.circle(0, 0, 3, color, 1);
        container.add([basePlate, tube1, tube2, tube3, tube4, hatch]);
        break;
      }
      case ProjectileType.EMP: {
        // Pulsing antenna/dish
        const mast = scene.add.rectangle(0, 4, 3, 16, 0x8899aa);
        const dish = scene.add.ellipse(0, -4, 26, 10, 0x223344);
        dish.setStrokeStyle(2, color, 0.9);
        const dishInner = scene.add.ellipse(0, -4, 18, 6, color, 0.5);
        dishInner.setName('dishInner');
        const tip = scene.add.circle(0, -10, 3, 0xffffff, 1);
        tip.setName('tip');
        container.add([mast, dish, dishInner, tip]);
        break;
      }
      case ProjectileType.GRAVITY: {
        // Swirling vortex pattern - multiple rings at different angles
        const outer = scene.add.circle(0, 0, 14, 0x000000, 0);
        outer.setStrokeStyle(2, color, 0.9);
        const spiral = scene.add.circle(0, 0, 10, 0x000000, 0);
        spiral.setStrokeStyle(2, 0x9933ff, 0.8);
        spiral.setName('spiral');
        const swirl = scene.add.ellipse(0, 0, 22, 6, 0x9933ff, 0.5);
        swirl.setName('swirl');
        const core = scene.add.circle(0, 0, 4, 0xffffff, 0.9);
        core.setName('core');
        container.add([outer, spiral, swirl, core]);
        break;
      }
      default: {
        // Fallback: simple square
        const rect = scene.add.rectangle(0, 0, 28, 28, color);
        container.add(rect);
      }
    }
    return container;
  }

  // Per-frame animation for tower visuals (subtle). Called from CombatSystem.
  updateVisual(delta: number): void {
    this.pulseT += delta;
    this.muzzleFlashMs += delta;
    // Animate named decorative sub-shapes
    for (const child of this.body.list) {
      const named = child as Phaser.GameObjects.GameObject & {
        name?: string;
        setAlpha?: (n: number) => unknown;
        setScale?: (x: number, y?: number) => unknown;
        setRotation?: (r: number) => unknown;
      };
      if (named.name === 'glow' && named.setScale) {
        const s = 1 + Math.sin(this.pulseT / 200) * 0.2;
        named.setScale(s, s);
      }
      if (named.name === 'ring' && named.setRotation) {
        named.setRotation((this.pulseT / 1500) % (Math.PI * 2));
      }
      if (named.name === 'swirl' && named.setRotation) {
        named.setRotation((this.pulseT / 300) % (Math.PI * 2));
      }
      if (named.name === 'spiral' && named.setRotation) {
        named.setRotation(-(this.pulseT / 400) % (Math.PI * 2));
      }
      if (named.name === 'core' && named.setAlpha) {
        named.setAlpha(0.6 + Math.sin(this.pulseT / 180) * 0.4);
      }
      if (named.name === 'tip' && named.setAlpha) {
        named.setAlpha(0.5 + Math.sin(this.pulseT / 220) * 0.5);
      }
      if (named.name === 'dishInner' && named.setAlpha) {
        named.setAlpha(0.3 + Math.sin(this.pulseT / 260) * 0.3);
      }
      if (named.name === 'muzzle' && named.setAlpha) {
        // Muzzle gets bright briefly after firing
        named.setAlpha(this.muzzleFlashMs < 120 ? 1 : 0.25);
      }
    }
    // Rotate laser barrel toward current target if any
    if (this.barrel && this.target && this.target.isAlive()) {
      const angle = Math.atan2(
        this.target.y - this.worldY,
        this.target.x - this.worldX,
      );
      this.body.setRotation(angle + Math.PI / 2);
    }
  }

  findTarget(enemies: Enemy[]): Enemy | null {
    return this.findTargetWithRange(enemies, this.config.range);
  }

  findTargetWithRange(enemies: Enemy[], range: number): Enemy | null {
    let nearestDist = range;
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
    this.muzzleFlashMs = 0;
  }

  showRange(): void {
    this.rangeCircle.setVisible(true);
  }

  hideRange(): void {
    this.rangeCircle.setVisible(false);
  }

  destroy(): void {
    this.body.destroy();
    this.hitArea.destroy();
    this.rangeCircle.destroy();
  }
}
