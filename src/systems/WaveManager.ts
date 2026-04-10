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
  private totalKilled: number = 0;
  private totalLeaked: number = 0;
  private allTimersFired: boolean = false;
  private safetyGraceTimer: number = 0;
  private static readonly SAFETY_GRACE_MS = 3000;

  constructor(scene: Phaser.Scene, gameMap: GameMap) {
    this.scene = scene;
    this.gameMap = gameMap;
  }

  get activeEnemies(): readonly Enemy[] {
    return [...this.enemies];
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

  get totalWaves(): number {
    return WAVE_CONFIGS.length;
  }

  get totalEnemiesInWave(): number {
    return this.totalToSpawn;
  }

  get remainingEnemies(): number {
    return this.enemies.filter((e) => e.isAlive()).length;
  }

  // Task 1: Expose wave state counters for diagnostics
  get waveState(): {
    spawned: number;
    killed: number;
    leaked: number;
    total: number;
  } {
    return {
      spawned: this.totalSpawned,
      killed: this.totalKilled,
      leaked: this.totalLeaked,
      total: this.totalToSpawn,
    };
  }

  startNextWave(): void {
    if (!this.hasMoreWaves || this.waveInProgress) return;

    this.waveInProgress = true;
    this.totalSpawned = 0;
    this.totalToSpawn = 0;
    this.totalKilled = 0;
    this.totalLeaked = 0;
    this.allTimersFired = false;
    this.safetyGraceTimer = 0;

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
    const config = ENEMY_CONFIGS[enemyId];
    if (!config) return;

    const airlocks = this.gameMap.getAirlocks();
    const reactor = this.gameMap.getReactor();
    if (airlocks.length === 0 || !reactor) return;

    // Filter to airlocks that have a valid path to the reactor
    const reachableAirlocks = airlocks.filter(
      (a) => this.gameMap.findPath(a, reactor) !== null,
    );
    if (reachableAirlocks.length === 0) {
      // Task 1: Decrement totalToSpawn when spawn fails to keep accounting balanced
      this.totalToSpawn = Math.max(0, this.totalToSpawn - 1);
      console.warn(
        `[WaveManager] Spawn failed: no reachable airlocks. totalToSpawn adjusted to ${this.totalToSpawn}`,
      );
      return;
    }

    const airlock =
      reachableAirlocks[Math.floor(Math.random() * reachableAirlocks.length)];
    const path = this.gameMap.findPath(airlock, reactor);
    if (!path) {
      // Task 1: Decrement totalToSpawn when spawn fails to keep accounting balanced
      this.totalToSpawn = Math.max(0, this.totalToSpawn - 1);
      console.warn(
        `[WaveManager] Spawn failed: no valid path from airlock. totalToSpawn adjusted to ${this.totalToSpawn}`,
      );
      return;
    }

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
    this.totalSpawned++;
  }

  harvestKilledEnemies(): Enemy[] {
    const killed: Enemy[] = [];
    const remaining: Enemy[] = [];

    for (const enemy of this.enemies) {
      if (!enemy.alive && !enemy.reachedReactor) {
        killed.push(enemy);
        this.totalKilled++;
      } else {
        remaining.push(enemy);
      }
    }

    this.enemies = remaining;
    return killed;
  }

  update(delta: number): void {
    for (const enemy of this.enemies) {
      enemy.update(delta);
    }

    if (this.waveInProgress) {
      const allSpawned = this.totalSpawned >= this.totalToSpawn;
      const allAccountedFor =
        this.totalKilled + this.totalLeaked >= this.totalToSpawn;

      if (allSpawned && allAccountedFor) {
        this.waveInProgress = false;
        this.scene.events.emit('waveComplete', this.currentWaveIndex);
        return;
      }

      // Task 1: Track when all spawn timers have fired
      if (
        !this.allTimersFired &&
        this.spawnTimers.length > 0 &&
        this.spawnTimers.every((t) => t.hasDispatched)
      ) {
        this.allTimersFired = true;
        this.safetyGraceTimer = 0;
      }

      // Task 1: Safety net - force-complete wave if stuck
      if (this.allTimersFired) {
        const anyAlive = this.enemies.some((e) => e.isAlive());
        if (!anyAlive) {
          this.safetyGraceTimer += delta;
          if (this.safetyGraceTimer >= WaveManager.SAFETY_GRACE_MS) {
            console.warn(
              `[WaveManager] Safety net: force-completing wave. spawned=${this.totalSpawned}, killed=${this.totalKilled}, leaked=${this.totalLeaked}, total=${this.totalToSpawn}`,
            );
            this.waveInProgress = false;
            this.scene.events.emit('waveComplete', this.currentWaveIndex);
          }
        } else {
          this.safetyGraceTimer = 0;
        }
      }
    }
  }

  getLeakedEnemies(): Enemy[] {
    return this.enemies.filter((e) => e.reachedReactor && e.alive);
  }

  removeLeakedEnemies(): Enemy[] {
    const leaked = this.enemies.filter((e) => e.reachedReactor && e.alive);
    this.enemies = this.enemies.filter((e) => !(e.reachedReactor && e.alive));
    this.totalLeaked += leaked.length;
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
