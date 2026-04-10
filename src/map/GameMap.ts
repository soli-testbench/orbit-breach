import Phaser from 'phaser';
import {
  MapDefinition,
  TileType,
  GridPosition,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../types';

const TILE_COLORS: Record<TileType, number> = {
  [TileType.PATH]: 0x334455,
  [TileType.BUILDABLE]: 0x225522,
  [TileType.WALL]: 0x222222,
  [TileType.AIRLOCK]: 0x0088ff,
  [TileType.REACTOR]: 0xff2200,
};

interface PathNode {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export class GameMap {
  private scene: Phaser.Scene;
  private mapDef: MapDefinition;
  private tileGraphics: Phaser.GameObjects.Rectangle[][] = [];
  private offsetX: number;
  private offsetY: number;

  constructor(scene: Phaser.Scene, mapDef: MapDefinition) {
    this.scene = scene;
    this.mapDef = mapDef;
    const mapPixelWidth = mapDef.width * mapDef.tileSize;
    const mapPixelHeight = mapDef.height * mapDef.tileSize;
    this.offsetX = Math.floor((GAME_WIDTH - mapPixelWidth) / 2);
    this.offsetY = Math.floor((GAME_HEIGHT - mapPixelHeight) / 2);
  }

  get definition(): MapDefinition {
    return this.mapDef;
  }

  get mapOffsetX(): number {
    return this.offsetX;
  }

  get mapOffsetY(): number {
    return this.offsetY;
  }

  render(): void {
    const { width, height, tileSize, tiles } = this.mapDef;
    for (let row = 0; row < height; row++) {
      this.tileGraphics[row] = [];
      for (let col = 0; col < width; col++) {
        const tileType = tiles[row][col];
        const x = this.offsetX + col * tileSize + tileSize / 2;
        const y = this.offsetY + row * tileSize + tileSize / 2;
        const rect = this.scene.add
          .rectangle(x, y, tileSize - 1, tileSize - 1, TILE_COLORS[tileType])
          .setInteractive();

        rect.on('pointerdown', () => {
          console.log(`Tile clicked: (${col}, ${row}) - Type: ${tileType}`);
          this.scene.events.emit('tileClicked', { col, row }, tileType);
        });

        rect.on('pointerover', () => {
          this.scene.events.emit('tileHover', { col, row }, tileType);
        });

        this.tileGraphics[row][col] = rect;
      }
    }
  }

  getTileType(col: number, row: number): TileType | null {
    if (
      row < 0 ||
      row >= this.mapDef.height ||
      col < 0 ||
      col >= this.mapDef.width
    ) {
      return null;
    }
    return this.mapDef.tiles[row][col];
  }

  setTileType(col: number, row: number, type: TileType): void {
    if (
      row >= 0 &&
      row < this.mapDef.height &&
      col >= 0 &&
      col < this.mapDef.width
    ) {
      this.mapDef.tiles[row][col] = type;
      if (this.tileGraphics[row] && this.tileGraphics[row][col]) {
        this.tileGraphics[row][col].setFillStyle(TILE_COLORS[type]);
      }
    }
  }

  getTileWorldPosition(col: number, row: number): { x: number; y: number } {
    const { tileSize } = this.mapDef;
    return {
      x: this.offsetX + col * tileSize + tileSize / 2,
      y: this.offsetY + row * tileSize + tileSize / 2,
    };
  }

  worldToGrid(worldX: number, worldY: number): GridPosition | null {
    const { tileSize, width, height } = this.mapDef;
    const col = Math.floor((worldX - this.offsetX) / tileSize);
    const row = Math.floor((worldY - this.offsetY) / tileSize);
    if (col < 0 || col >= width || row < 0 || row >= height) return null;
    return { col, row };
  }

  getAirlocks(): GridPosition[] {
    const airlocks: GridPosition[] = [];
    const { width, height, tiles } = this.mapDef;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (tiles[row][col] === TileType.AIRLOCK) {
          airlocks.push({ col, row });
        }
      }
    }
    return airlocks;
  }

  getReactor(): GridPosition | null {
    const { width, height, tiles } = this.mapDef;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (tiles[row][col] === TileType.REACTOR) {
          return { col, row };
        }
      }
    }
    return null;
  }

  findPath(start: GridPosition, end: GridPosition): GridPosition[] | null {
    const { width, height, tiles } = this.mapDef;

    const isWalkable = (col: number, row: number): boolean => {
      if (col < 0 || col >= width || row < 0 || row >= height) return false;
      const t = tiles[row][col];
      return (
        t === TileType.PATH || t === TileType.AIRLOCK || t === TileType.REACTOR
      );
    };

    const heuristic = (a: GridPosition, b: GridPosition): number => {
      return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
    };

    const openList: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      col: start.col,
      row: start.row,
      g: 0,
      h: heuristic(start, end),
      f: heuristic(start, end),
      parent: null,
    };

    openList.push(startNode);

    const directions = [
      { col: 0, row: -1 },
      { col: 0, row: 1 },
      { col: -1, row: 0 },
      { col: 1, row: 0 },
    ];

    while (openList.length > 0) {
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;
      const key = `${current.col},${current.row}`;

      if (current.col === end.col && current.row === end.row) {
        const path: GridPosition[] = [];
        let node: PathNode | null = current;
        while (node) {
          path.unshift({ col: node.col, row: node.row });
          node = node.parent;
        }
        return path;
      }

      closedSet.add(key);

      for (const dir of directions) {
        const newCol = current.col + dir.col;
        const newRow = current.row + dir.row;
        const newKey = `${newCol},${newRow}`;

        if (!isWalkable(newCol, newRow) || closedSet.has(newKey)) continue;

        const g = current.g + 1;
        const h = heuristic({ col: newCol, row: newRow }, end);
        const f = g + h;

        const existingIdx = openList.findIndex(
          (n) => n.col === newCol && n.row === newRow,
        );
        if (existingIdx !== -1) {
          if (g < openList[existingIdx].g) {
            openList[existingIdx].g = g;
            openList[existingIdx].f = f;
            openList[existingIdx].parent = current;
          }
        } else {
          openList.push({
            col: newCol,
            row: newRow,
            g,
            h,
            f,
            parent: current,
          });
        }
      }
    }

    return null;
  }

  highlightTile(col: number, row: number, color: number): void {
    if (this.tileGraphics[row] && this.tileGraphics[row][col]) {
      this.tileGraphics[row][col].setStrokeStyle(2, color);
    }
  }

  clearHighlight(col: number, row: number): void {
    if (this.tileGraphics[row] && this.tileGraphics[row][col]) {
      this.tileGraphics[row][col].setStrokeStyle(0);
    }
  }
}
