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
}

export class CombatSystem {
  private scene: Phaser.Scene;
  private towers: Tower[] = [];
  private projectiles: Projectile[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  addTower(tower: Tower): void {
    this.towers.push(tower);
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
    for (const tower of this.towers) {
      const rangeBonus = gameState ? 1 + gameState.rangeModifier : 1;
      const effectiveRange = tower.config.range * rangeBonus;
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
        proj.target.takeDamage(proj.damage);
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

  cleanup(): void {
    for (const proj of this.projectiles) {
      proj.graphics.destroy();
    }
    this.projectiles = [];
    for (const tower of this.towers) {
      tower.destroy();
    }
    this.towers = [];
  }
}
