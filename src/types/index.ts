// =====================
// Map Types
// =====================

export enum TileType {
  PATH = 'PATH',
  BUILDABLE = 'BUILDABLE',
  WALL = 'WALL',
  TOWER = 'TOWER',
  AIRLOCK = 'AIRLOCK',
  REACTOR = 'REACTOR',
}

export interface MapDefinition {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: TileType[][];
}

export interface GridPosition {
  col: number;
  row: number;
}

// =====================
// Tower Types
// =====================

export enum ProjectileType {
  LASER = 'LASER',
  MISSILE = 'MISSILE',
  PLASMA = 'PLASMA',
  EMP = 'EMP',
  GRAVITY = 'GRAVITY',
}

export interface TowerConfig {
  id: string;
  name: string;
  damage: number;
  range: number;
  fireRate: number;
  cost: number;
  projectileType: ProjectileType;
  color: number;
  description: string;
}

// =====================
// Enemy Types
// =====================

export interface EnemyConfig {
  id: string;
  name: string;
  health: number;
  speed: number;
  armor: number;
  salvageReward: number;
  color: number;
  size: number;
  description: string;
}

// =====================
// Wave Types
// =====================

export interface EnemyGroup {
  enemyId: string;
  count: number;
  spawnDelay: number;
}

export interface WaveConfig {
  waveNumber: number;
  groups: EnemyGroup[];
  delayBetweenGroups: number;
}

// =====================
// Game State
// =====================

export interface GameState {
  energy: number;
  reactorHealth: number;
  maxReactorHealth: number;
  currentWave: number;
  score: number;
  activeUpgrades: UpgradeConfig[];
  damageModifier: number;
  fireRateModifier: number;
  rangeModifier: number;
  armorPiercing: number;
  salvageModifier: number;
}

// =====================
// Upgrade Types
// =====================

export type UpgradeRarity = 'common' | 'uncommon' | 'rare';

export interface UpgradeEffect {
  stat: string;
  value: number;
}

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  effect: UpgradeEffect;
}

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;
