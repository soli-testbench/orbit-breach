import { UpgradeConfig } from '../types';

export const UPGRADE_POOL: UpgradeConfig[] = [
  {
    id: 'damage_boost',
    name: 'Overcharged Rounds',
    description: '+15% tower damage',
    rarity: 'common',
    effect: { stat: 'damage', value: 0.15 },
  },
  {
    id: 'fire_rate_boost',
    name: 'Rapid Cycling',
    description: '+15% fire rate',
    rarity: 'common',
    effect: { stat: 'fireRate', value: 0.15 },
  },
  {
    id: 'range_boost',
    name: 'Extended Sensors',
    description: '+10% tower range',
    rarity: 'common',
    effect: { stat: 'range', value: 0.1 },
  },
  {
    id: 'energy_grant',
    name: 'Emergency Reserves',
    description: '+75 energy',
    rarity: 'uncommon',
    effect: { stat: 'energy', value: 75 },
  },
  {
    id: 'armor_piercing',
    name: 'Armor Piercing Tips',
    description: 'Towers ignore 3 armor',
    rarity: 'uncommon',
    effect: { stat: 'armorPiercing', value: 3 },
  },
  {
    id: 'reactor_repair',
    name: 'Hull Patch',
    description: 'Heal 20 reactor HP',
    rarity: 'rare',
    effect: { stat: 'reactorHealth', value: 20 },
  },
  {
    id: 'salvage_boost',
    name: 'Salvage Protocol',
    description: '+25% enemy rewards',
    rarity: 'uncommon',
    effect: { stat: 'salvage', value: 0.25 },
  },
  {
    id: 'extra_energy',
    name: 'Power Surge',
    description: '+50 starting energy for placed towers',
    rarity: 'rare',
    effect: { stat: 'extraEnergy', value: 50 },
  },
];
