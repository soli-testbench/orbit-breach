import { TowerConfig, ProjectileType } from '../types';

export const TOWER_CONFIGS: Record<string, TowerConfig> = {
  laser: {
    id: 'laser',
    name: 'Laser Array',
    damage: 15,
    range: 150,
    fireRate: 200,
    cost: 50,
    projectileType: ProjectileType.LASER,
    color: 0x00ff00,
    description: 'Fast-firing laser turret with moderate damage',
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma Cannon',
    damage: 40,
    range: 120,
    fireRate: 600,
    cost: 80,
    projectileType: ProjectileType.PLASMA,
    color: 0x9900ff,
    description: 'Slow but powerful plasma shots',
  },
  missile: {
    id: 'missile',
    name: 'Missile Pod',
    damage: 60,
    range: 200,
    fireRate: 1200,
    cost: 120,
    projectileType: ProjectileType.MISSILE,
    color: 0xff6600,
    description: 'Long-range missiles with high damage',
  },
};
