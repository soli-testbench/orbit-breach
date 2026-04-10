import Phaser from 'phaser';
import { WaveConfig } from '../types';
import { WAVE_CONFIGS } from '../data/waves';
import { ENEMY_CONFIGS } from '../data/enemies';
import { Enemy } from '../enemies/Enemy';
import { GameMap } from '../map/GameMap';

export class WaveManager {
  private scene: Phaser.Scene;
  private gameMap: GameMap;
  private enemies: Enemy[] = [];
  private currentWaveIndex: number = 0;
  private waveInProgress: boolean = false;
  private spawnTimers: Phaser.Time.TimerEvent[] = [];
  private totalSpawned: number = 0;
  private totalToSpawn: number = 0;

  constructor(scene: Phaser.Scene, gameMap: GameMap) {
    this.scene = scene;
    this.gameMap = gameMap;
  }

  get activeEnemies(): Enemy[] {
    return this.enemies;
  }

  get isWaveInProgress(): boolean {
    return this.waveInProgress;
  }

  get currentWave(): number {
    return this.currentWaveIndex;
  }

  get hasMoreWaves(): boolean {
    return this.currentWaveIndex < WAVE_CONFIGS.length;
  }

  startNextWave(): void {
    if (!this.hasMoreWaves || this.waveInProgress) return;

    this.waveInProgress = true;
    this.totalSpawned = 0;
    this.totalToSpawn = 0;

    const waveConfig: WaveConfig = WAVE_CONFIGS[this.currentWaveIndex];

    for (const group of waveConfig.groups) {
      this.totalToSpawn += group.count;
    }

    let groupDelay = 0;
    for (const group of waveConfig.groups) {
      for (let i = 0; i < group.count; i++) {
        const delay = groupDelay + i * group.spawnDelay;
        const timer = this.scene.time.delayedCall(delay, () => {
          this.spawnEnemy(group.enemyId);
        });
        this.spawnTimers.push(timer);
      }
      groupDelay +=
        group.count * group.spawnDelay + waveConfig.delayBetweenGroups;
    }

    this.currentWaveIndex++;
  }

  private spawnEnemy(enemyId: string): void {
    this.totalSpawned++;

    const config = ENEMY_CONFIGS[enemyId];
    if (!config) return;

    const airlocks = this.gameMap.getAirlocks();
    const reactor = this.gameMap.getReactor();
    if (airlocks.length === 0 || !reactor) return;

    // Filter to airlocks that have a valid path to the reactor
    const reachableAirlocks = airlocks.filter(
      (a) => this.gameMap.findPath(a, reactor) !== null,
    );
    if (reachableAirlocks.length === 0) return;

    const airlock =
      reachableAirlocks[Math.floor(Math.random() * reachableAirlocks.length)];
    const path = this.gameMap.findPath(airlock, reactor);
    if (!path) return;

    const startPos = this.gameMap.getTileWorldPosition(
      airlock.col,
      airlock.row,
    );

    const enemy = new Enemy(
      this.scene,
      config,
      startPos.x,
      startPos.y,
      path,
      this.gameMap.definition.tileSize,
      this.gameMap.mapOffsetX,
      this.gameMap.mapOffsetY,
    );

    this.enemies.push(enemy);
  }

  update(delta: number): void {
    for (const enemy of this.enemies) {
      enemy.update(delta);
    }

    if (this.waveInProgress) {
      const allSpawned = this.totalSpawned >= this.totalToSpawn;
      const allDead = this.enemies.every((e) => !e.isAlive());

      if (allSpawned && allDead) {
        this.waveInProgress = false;
        this.scene.events.emit('waveComplete', this.currentWaveIndex);
      }
    }
  }

  getLeakedEnemies(): Enemy[] {
    return this.enemies.filter((e) => e.reachedReactor && e.alive);
  }

  removeDeadAndLeaked(): Enemy[] {
    const leaked = this.enemies.filter((e) => e.reachedReactor && e.alive);
    this.enemies = this.enemies.filter((e) => e.isAlive());
    return leaked;
  }

  cleanup(): void {
    for (const timer of this.spawnTimers) {
      timer.destroy();
    }
    this.spawnTimers = [];
    for (const enemy of this.enemies) {
      if (enemy.alive) enemy.destroy();
    }
    this.enemies = [];
  }
}
