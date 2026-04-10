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
];
