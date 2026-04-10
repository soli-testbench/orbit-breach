// =====================
// Map Types
// =====================

export enum TileType {
  PATH = 'PATH',
  BUILDABLE = 'BUILDABLE',
  WALL = 'WALL',
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
}

export const GAME_WIDTH = 1024;
export const GAME_HEIGHT = 768;
