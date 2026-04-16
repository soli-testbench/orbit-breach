import Phaser from 'phaser';
import { Tower } from '../towers/Tower';
import { Enemy } from '../enemies/Enemy';
import { ProjectileType, GameState } from '../types';

interface Projectile {
  graphics: Phaser.GameObjects.Line | Phaser.GameObjects.Arc;
  target: Enemy;
  tower: Tower;
  x: number;
  y: number;
  speed: number;
  damage: number;
  type: ProjectileType;
  alive: boolean;
  armorPiercing: number; // Task 3: store armor piercing per projectile
}

export class CombatSystem {
  private scene: Phaser.Scene;
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];
  private towerMap: Map<string, Tower> = new Map(); // Task 5: grid position to tower lookup

  // Task 4: Gravity Well visual effects tracking
  private gravityWellEffects: Map<Tower, Phaser.GameObjects.Arc> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addTower(tower: Tower): void {
    this.towers.push(tower);
    const key = `${tower.gridPos.col},${tower.gridPos.row}`;
    this.towerMap.set(key, tower);
  }

  // Task 5: Remove a tower from the combat system
  removeTower(tower: Tower): void {
    const idx = this.towers.indexOf(tower);
    if (idx !== -1) {
      this.towers.splice(idx, 1);
    }
    const key = `${tower.gridPos.col},${tower.gridPos.row}`;
    this.towerMap.delete(key);

    // Clean up gravity well effect if applicable
    const effect = this.gravityWellEffects.get(tower);
    if (effect) {
      effect.destroy();
      this.gravityWellEffects.delete(tower);
    }

    tower.destroy();
  }

  // Task 5: Get tower at a grid position
  getTowerAt(col: number, row: number): Tower | null {
    const key = `${col},${row}`;
    return this.towerMap.get(key) || null;
  }

  get allTowers(): Tower[] {
    return this.towers;
  }

  update(
    time: number,
    delta: number,
    enemies: Enemy[],
    gameState?: GameState,
  ): void {
    // Task 4: Clear gravity slow on all enemies before reapplying
    for (const enemy of enemies) {
      if (enemy.isAlive()) {
        enemy.clearGravitySlow();
      }
    }

    for (const tower of this.towers) {
      const rangeBonus = gameState ? 1 + gameState.rangeModifier : 1;
      const effectiveRange = tower.config.range * rangeBonus;

      // Task 4: Handle Gravity Well passive area slow
      if (tower.config.projectileType === ProjectileType.GRAVITY) {
        this.updateGravityWell(tower, enemies, effectiveRange, delta);
        continue;
      }

      // Task 4: Handle EMP Tower area slow
      if (tower.config.projectileType === ProjectileType.EMP) {
        const fireRateBonus = gameState ? 1 + gameState.fireRateModifier : 1;
        const effectiveFireRate = tower.config.fireRate / fireRateBonus;

        if (time - tower.lastFireTime >= effectiveFireRate) {
          tower.fire(time);
          this.fireEMP(tower, enemies, effectiveRange);
        }
        continue;
      }

      const target = tower.findTargetWithRange(enemies, effectiveRange);

      const fireRateBonus = gameState ? 1 + gameState.fireRateModifier : 1;
      const effectiveFireRate = tower.config.fireRate / fireRateBonus;

      if (target && time - tower.lastFireTime >= effectiveFireRate) {
        tower.fire(time);
        this.fireProjectile(tower, target, gameState);
      }
    }

    this.updateProjectiles(delta);
  }

  private fireProjectile(
    tower: Tower,
    target: Enemy,
    gameState?: GameState,
  ): void {
    const type = tower.config.projectileType;
    const damageBonus = gameState ? 1 + gameState.damageModifier : 1;
    const armorPiercing = gameState ? gameState.armorPiercing : 0;
    const effectiveDamage = tower.config.damage * damageBonus;

    if (type === ProjectileType.LASER) {
      const line = this.scene.add
        .line(
          0,
          0,
          tower.worldX,
          tower.worldY,
          target.x,
          target.y,
          tower.config.color,
        )
        .setOrigin(0, 0)
        .setDepth(20)
        .setAlpha(0.8);

      target.takeDamage(effectiveDamage, armorPiercing);

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 100,
        onComplete: () => line.destroy(),
      });
    } else {
      const projectile = this.scene.add
        .circle(tower.worldX, tower.worldY, 4, tower.config.color)
        .setDepth(20);

      this.projectiles.push({
        graphics: projectile,
        target,
        tower,
        x: tower.worldX,
        y: tower.worldY,
        speed: type === ProjectileType.MISSILE ? 300 : 400,
        damage: effectiveDamage,
        type,
        alive: true,
        armorPiercing, // Task 3: store armor piercing on projectile
      });
    }
  }

  private updateProjectiles(delta: number): void {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;

      if (!proj.target.isAlive()) {
        proj.alive = false;
        proj.graphics.destroy();
        continue;
      }

      const dx = proj.target.x - proj.x;
      const dy = proj.target.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 8) {
        proj.target.takeDamage(proj.damage, proj.armorPiercing); // Task 3: pass armor piercing
        proj.alive = false;
        proj.graphics.destroy();

        if (proj.type === ProjectileType.PLASMA) {
          const explosion = this.scene.add
            .circle(proj.x, proj.y, 15, 0x9900ff, 0.5)
            .setDepth(20);
          this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 2,
            duration: 200,
            onComplete: () => explosion.destroy(),
          });
        }
        continue;
      }

      const moveAmount = (proj.speed * delta) / 1000;
      proj.x += (dx / dist) * moveAmount;
      proj.y += (dy / dist) * moveAmount;
      (proj.graphics as Phaser.GameObjects.Arc).setPosition(proj.x, proj.y);
    }

    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  // Task 4: Handle EMP tower firing - area slow effect
  private fireEMP(tower: Tower, enemies: Enemy[], range: number): void {
    let hitCount = 0;
    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dist = Phaser.Math.Distance.Between(
        tower.worldX,
        tower.worldY,
        enemy.x,
        enemy.y,
      );
      if (dist <= range) {
        enemy.applySlow(0.5, 2000); // 50% slow for 2 seconds
        hitCount++;
      }
    }

    // Visual: EMP pulse ring expanding outward
    const pulseRing = this.scene.add
      .circle(tower.worldX, tower.worldY, 10, 0x4488ff, 0)
      .setStrokeStyle(3, 0x4488ff, 0.9)
      .setDepth(20);
    this.scene.tweens.add({
      targets: pulseRing,
      scaleX: range / 10,
      scaleY: range / 10,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => pulseRing.destroy(),
    });

    // Visual: inner flash on the tower itself
    const flash = this.scene.add
      .circle(tower.worldX, tower.worldY, 18, 0x88ccff, 0.7)
      .setDepth(21);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 0.3,
      duration: 250,
      onComplete: () => flash.destroy(),
    });

    // Visual: lightning arcs to hit enemies
    if (hitCount > 0) {
      for (const enemy of enemies) {
        if (!enemy.isAlive()) continue;
        const dist = Phaser.Math.Distance.Between(
          tower.worldX,
          tower.worldY,
          enemy.x,
          enemy.y,
        );
        if (dist <= range) {
          const line = this.scene.add
            .line(0, 0, tower.worldX, tower.worldY, enemy.x, enemy.y, 0x4488ff)
            .setOrigin(0, 0)
            .setAlpha(0.6)
            .setDepth(20);
          this.scene.tweens.add({
            targets: line,
            alpha: 0,
            duration: 200,
            onComplete: () => line.destroy(),
          });
        }
      }
    }
  }

  // Task 4: Handle Gravity Well passive area slow
  private updateGravityWell(
    tower: Tower,
    enemies: Enemy[],
    range: number,
    delta: number,
  ): void {
    // Create or update persistent visual effect
    let effect = this.gravityWellEffects.get(tower);
    if (!effect || !effect.active) {
      effect = this.scene.add
        .circle(tower.worldX, tower.worldY, range, 0x6600cc, 0.06)
        .setStrokeStyle(1, 0x6600cc, 0.3)
        .setDepth(5);
      this.gravityWellEffects.set(tower, effect);
    }

    // Pulse the effect with gravitational distortion animation
    const pulse = 0.06 + Math.sin(this.scene.time.now / 500) * 0.03;
    const scalePulse = 1.0 + Math.sin(this.scene.time.now / 800) * 0.05;
    effect.setAlpha(pulse);
    effect.setScale(scalePulse);

    let hasTargets = false;
    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dist = Phaser.Math.Distance.Between(
        tower.worldX,
        tower.worldY,
        enemy.x,
        enemy.y,
      );
      if (dist <= range) {
        hasTargets = true;
        enemy.applyGravitySlow(0.3); // 30% slow while in range
        // Low damage (5) applied per second - scaled by frame delta
        const damagePerFrame = (5 * delta) / 1000; // 5 damage per second, frame-rate independent
        enemy.takeDamage(damagePerFrame);

        // Visual: periodic gravitational pull lines toward tower
        if (Math.random() < 0.08) {
          const pullLine = this.scene.add
            .line(0, 0, enemy.x, enemy.y, tower.worldX, tower.worldY, 0x9933ff)
            .setOrigin(0, 0)
            .setAlpha(0.4)
            .setDepth(19);
          this.scene.tweens.add({
            targets: pullLine,
            alpha: 0,
            duration: 300,
            onComplete: () => pullLine.destroy(),
          });
        }
      }
    }

    // Visual: when actively affecting enemies, show inner distortion ring
    if (hasTargets && Math.random() < 0.05) {
      const innerRing = this.scene.add
        .circle(tower.worldX, tower.worldY, range * 0.3, 0x9933ff, 0)
        .setStrokeStyle(2, 0x9933ff, 0.5)
        .setDepth(19);
      this.scene.tweens.add({
        targets: innerRing,
        scale: range / (range * 0.3),
        alpha: 0,
        duration: 600,
        ease: 'Cubic.easeOut',
        onComplete: () => innerRing.destroy(),
      });
    }
  }

  cleanup(): void {
    for (const proj of this.projectiles) {
      proj.graphics.destroy();
    }
    this.projectiles = [];
    for (const tower of this.towers) {
      tower.destroy();
    }
    this.towers = [];
    this.towerMap.clear();
    for (const effect of this.gravityWellEffects.values()) {
      effect.destroy();
    }
    this.gravityWellEffects.clear();
  }
}
