import { MapDefinition, TileType } from '../types';

const W = TileType.WALL;
const P = TileType.PATH;
const B = TileType.BUILDABLE;
const A = TileType.AIRLOCK;
const R = TileType.REACTOR;

export const TEST_MAP: MapDefinition = {
  name: 'Station Alpha',
  width: 20,
  height: 15,
  tileSize: 40,
  tiles: [
    //  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19
    [W, W, W, A, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 0
    [W, B, B, P, B, B, B, B, W, W, W, W, B, B, B, B, B, B, B, W], // 1
    [W, B, W, P, W, W, B, B, W, W, W, W, B, B, W, W, B, B, B, W], // 2
    [W, B, B, P, P, P, P, P, P, P, B, B, B, B, B, W, B, B, B, W], // 3
    [W, B, W, W, W, W, B, B, W, P, W, W, W, W, B, W, B, B, B, W], // 4
    [W, B, B, B, B, B, B, B, W, P, W, B, B, B, B, W, B, B, B, W], // 5
    [W, W, W, W, W, W, B, B, W, P, B, B, W, W, W, W, B, B, B, W], // 6
    [A, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, R, W], // 7
    [W, W, W, W, P, B, B, B, W, P, B, B, W, W, W, W, B, B, B, W], // 8
    [W, B, B, B, P, B, B, B, W, P, W, B, B, B, B, W, B, B, B, W], // 9
    [W, B, W, W, P, W, W, B, W, P, W, W, W, W, B, W, B, B, B, W], // 10
    [W, B, B, P, P, P, P, P, P, P, B, B, B, B, B, W, B, B, B, W], // 11
    [W, B, W, P, W, W, B, B, W, W, W, W, B, B, W, W, B, B, B, W], // 12
    [W, B, B, P, B, B, B, B, W, W, W, W, B, B, B, B, B, B, B, W], // 13
    [W, W, W, A, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W], // 14
  ],
};
