import { EnemyConfig } from '../types';

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  scout: {
    id: 'scout',
    name: 'Scout Drone',
    health: 60,
    speed: 120,
    armor: 0,
    salvageReward: 10,
    color: 0x00ffff,
    size: 8,
    description: 'Fast but fragile reconnaissance drone',
  },
  brute: {
    id: 'brute',
    name: 'Shielded Brute',
    health: 200,
    speed: 50,
    armor: 10,
    salvageReward: 25,
    color: 0xff0000,
    size: 14,
    description: 'Heavily armored assault unit',
  },
  carrier: {
    id: 'carrier',
    name: 'Carrier',
    health: 150,
    speed: 70,
    armor: 5,
    salvageReward: 20,
    color: 0xffff00,
    size: 12,
    description: 'Medium transport vessel',
  },
};
