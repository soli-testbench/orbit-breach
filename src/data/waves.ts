import { WaveConfig } from '../types';

export const WAVE_CONFIGS: WaveConfig[] = [
  {
    waveNumber: 1,
    groups: [{ enemyId: 'scout', count: 5, spawnDelay: 800 }],
    delayBetweenGroups: 0,
  },
  {
    waveNumber: 2,
    groups: [
      { enemyId: 'scout', count: 8, spawnDelay: 700 },
      { enemyId: 'brute', count: 2, spawnDelay: 1200 },
    ],
    delayBetweenGroups: 2000,
  },
  {
    waveNumber: 3,
    groups: [
      { enemyId: 'scout', count: 6, spawnDelay: 600 },
      { enemyId: 'carrier', count: 4, spawnDelay: 900 },
      { enemyId: 'brute', count: 3, spawnDelay: 1000 },
    ],
    delayBetweenGroups: 1500,
  },
  {
    waveNumber: 4,
    groups: [
      { enemyId: 'brute', count: 5, spawnDelay: 800 },
      { enemyId: 'carrier', count: 5, spawnDelay: 800 },
      { enemyId: 'scout', count: 10, spawnDelay: 500 },
    ],
    delayBetweenGroups: 1000,
  },
  {
    waveNumber: 5,
    groups: [
      { enemyId: 'scout', count: 15, spawnDelay: 400 },
      { enemyId: 'brute', count: 6, spawnDelay: 700 },
      { enemyId: 'carrier', count: 6, spawnDelay: 700 },
    ],
    delayBetweenGroups: 1000,
  },
  {
    waveNumber: 6,
    groups: [
      { enemyId: 'carrier', count: 8, spawnDelay: 600 },
      { enemyId: 'brute', count: 6, spawnDelay: 700 },
      { enemyId: 'scout', count: 12, spawnDelay: 350 },
    ],
    delayBetweenGroups: 800,
  },
  {
    waveNumber: 7,
    groups: [
      { enemyId: 'brute', count: 8, spawnDelay: 600 },
      { enemyId: 'carrier', count: 8, spawnDelay: 500 },
      { enemyId: 'scout', count: 15, spawnDelay: 300 },
    ],
    delayBetweenGroups: 700,
  },
  {
    waveNumber: 8,
    groups: [
      { enemyId: 'scout', count: 20, spawnDelay: 250 },
      { enemyId: 'brute', count: 10, spawnDelay: 500 },
      { enemyId: 'carrier', count: 8, spawnDelay: 500 },
    ],
    delayBetweenGroups: 600,
  },
  {
    waveNumber: 9,
    groups: [
      { enemyId: 'brute', count: 12, spawnDelay: 400 },
      { enemyId: 'carrier', count: 10, spawnDelay: 400 },
      { enemyId: 'scout', count: 20, spawnDelay: 200 },
    ],
    delayBetweenGroups: 500,
  },
  {
    waveNumber: 10,
    groups: [
      { enemyId: 'scout', count: 10, spawnDelay: 300 },
      { enemyId: 'brute', count: 6, spawnDelay: 500 },
      { enemyId: 'boss', count: 1, spawnDelay: 0 },
      { enemyId: 'carrier', count: 8, spawnDelay: 400 },
    ],
    delayBetweenGroups: 1000,
  },
];
