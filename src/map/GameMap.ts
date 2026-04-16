import Phaser from 'phaser';
import {
  MapDefinition,
  TileType,
  GridPosition,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../types';

const TILE_COLORS: Record<TileType, number> = {
  [TileType.PATH]: 0x1a2a3a,
  [TileType.BUILDABLE]: 0x1a2a1a,
  [TileType.WALL]: 0x111122,
  [TileType.TOWER]: 0x1a1a2a,
  [TileType.AIRLOCK]: 0x003366,
  [TileType.REACTOR]: 0x661100,
};

// Task 3: per-tile stroke accents for the sci-fi theme
const TILE_ACCENT_COLORS: Record<TileType, number> = {
  [TileType.PATH]: 0x4488cc,
  [TileType.BUILDABLE]: 0x336633,
  [TileType.WALL]: 0x334466,
  [TileType.TOWER]: 0x444466,
  [TileType.AIRLOCK]: 0x00ccff,
  [TileType.REACTOR]: 0xff6622,
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
  // Task 3: per-tile decoration containers (for panel/rivet/line accents,
  // reactor glow, airlock door indicators, etc.)
  private tileDecor: Phaser.GameObjects.Container[][] = [];
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
      this.tileDecor[row] = [];
      for (let col = 0; col < width; col++) {
        const tileType = tiles[row][col];
        const x = this.offsetX + col * tileSize + tileSize / 2;
        const y = this.offsetY + row * tileSize + tileSize / 2;
        const rect = this.scene.add
          .rectangle(x, y, tileSize - 1, tileSize - 1, TILE_COLORS[tileType])
          .setStrokeStyle(1, TILE_ACCENT_COLORS[tileType], 0.6)
          .setInteractive();

        rect.on('pointerdown', () => {
          const currentType = this.getTileType(col, row);
          this.scene.events.emit('tileClicked', { col, row }, currentType);
        });

        rect.on('pointerover', () => {
          const currentType = this.getTileType(col, row);
          this.scene.events.emit('tileHover', { col, row }, currentType);
        });

        this.tileGraphics[row][col] = rect;
        // Task 3: sci-fi themed procedural decoration per tile type
        this.tileDecor[row][col] = this.buildTileDecoration(
          tileType,
          x,
          y,
          tileSize,
        );
      }
    }
  }

  // Task 3: Procedural sci-fi decoration drawn per tile based on its type.
  // Returns a container of decoration shapes that can be destroyed and
  // rebuilt when the tile type changes.
  private buildTileDecoration(
    tileType: TileType,
    x: number,
    y: number,
    tileSize: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y).setDepth(1);
    const accent = TILE_ACCENT_COLORS[tileType];
    const half = tileSize / 2 - 2;

    switch (tileType) {
      case TileType.WALL: {
        // Panel/rivet detail: inner panel + small corner rivets
        const panel = this.scene.add.rectangle(
          0,
          0,
          tileSize - 8,
          tileSize - 8,
          0x0a0a18,
        );
        panel.setStrokeStyle(1, accent, 0.5);
        const rivet = (dx: number, dy: number) =>
          this.scene.add.circle(dx, dy, 1.2, accent, 0.7);
        container.add([
          panel,
          rivet(-half + 3, -half + 3),
          rivet(half - 3, -half + 3),
          rivet(-half + 3, half - 3),
          rivet(half - 3, half - 3),
        ]);
        break;
      }
      case TileType.PATH: {
        // Illuminated track line down the middle + subtle edge glow
        const track = this.scene.add.rectangle(
          0,
          0,
          tileSize - 10,
          2,
          accent,
          0.55,
        );
        const edge = this.scene.add.rectangle(
          0,
          0,
          tileSize - 4,
          tileSize - 4,
          0x000000,
          0,
        );
        edge.setStrokeStyle(1, accent, 0.35);
        container.add([edge, track]);
        break;
      }
      case TileType.BUILDABLE: {
        // Subtle grid pattern (crosshair) on buildable tiles
        const h = this.scene.add.rectangle(0, 0, tileSize - 6, 1, accent, 0.25);
        const v = this.scene.add.rectangle(0, 0, 1, tileSize - 6, accent, 0.25);
        const corner = (dx: number, dy: number) =>
          this.scene.add.rectangle(dx, dy, 3, 3, accent, 0.5);
        container.add([
          h,
          v,
          corner(-half + 3, -half + 3),
          corner(half - 3, -half + 3),
          corner(-half + 3, half - 3),
          corner(half - 3, half - 3),
        ]);
        break;
      }
      case TileType.TOWER: {
        // Placeholder indicator under tower sprites - inner frame
        const frame = this.scene.add.rectangle(
          0,
          0,
          tileSize - 4,
          tileSize - 4,
          0x000000,
          0,
        );
        frame.setStrokeStyle(1, accent, 0.6);
        container.add([frame]);
        break;
      }
      case TileType.AIRLOCK: {
        // Door-frame details with animated indicator lights
        const frame = this.scene.add.rectangle(
          0,
          0,
          tileSize - 4,
          tileSize - 4,
          0x000000,
          0,
        );
        frame.setStrokeStyle(2, accent, 0.9);
        const doorL = this.scene.add.rectangle(
          -tileSize * 0.2,
          0,
          tileSize * 0.2,
          tileSize - 12,
          0x002244,
          0.9,
        );
        const doorR = this.scene.add.rectangle(
          tileSize * 0.2,
          0,
          tileSize * 0.2,
          tileSize - 12,
          0x002244,
          0.9,
        );
        doorL.setStrokeStyle(1, accent, 0.8);
        doorR.setStrokeStyle(1, accent, 0.8);
        const light = this.scene.add.circle(0, 0, 3, 0xffffff, 1);
        // Animated pulse on the central indicator light
        this.scene.tweens.add({
          targets: light,
          alpha: { from: 1, to: 0.25 },
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        container.add([frame, doorL, doorR, light]);
        break;
      }
      case TileType.REACTOR: {
        // Pulsing glowing reactor with ring details
        const outer = this.scene.add.circle(0, 0, tileSize * 0.45, 0x000000, 0);
        outer.setStrokeStyle(2, accent, 0.9);
        const glow = this.scene.add.circle(0, 0, tileSize * 0.3, accent, 0.55);
        const core = this.scene.add.circle(0, 0, tileSize * 0.15, 0xffffff, 1);
        this.scene.tweens.add({
          targets: glow,
          alpha: { from: 0.35, to: 0.75 },
          scale: { from: 0.9, to: 1.1 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.scene.tweens.add({
          targets: core,
          scale: { from: 0.9, to: 1.15 },
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        container.add([outer, glow, core]);
        break;
      }
    }
    return container;
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
        this.tileGraphics[row][col].setStrokeStyle(
          1,
          TILE_ACCENT_COLORS[type],
          0.6,
        );
      }
      // Task 3: rebuild decoration when tile type changes (e.g., tower built)
      if (this.tileDecor[row] && this.tileDecor[row][col]) {
        this.tileDecor[row][col].destroy();
        const { tileSize } = this.mapDef;
        const x = this.offsetX + col * tileSize + tileSize / 2;
        const y = this.offsetY + row * tileSize + tileSize / 2;
        this.tileDecor[row][col] = this.buildTileDecoration(
          type,
          x,
          y,
          tileSize,
        );
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
