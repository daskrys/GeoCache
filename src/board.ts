import leaflet from "leaflet";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibility: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(newTileWidth: number, newTileVisibility: number) {
    this.tileWidth = newTileWidth;
    this.tileVisibility = newTileVisibility;

    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();

    return this.knownCells.get(key)!;
    //return this.knownCells.get(key) ?? cell;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const { lat, lng } = point;
    const i = Math.floor(lat / this.tileWidth);
    const j = Math.floor(lng / this.tileWidth);
    const cell: Cell = { i, j };

    return this.getCanonicalCell(cell);
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    const sw = leaflet.latLng(i * this.tileWidth, j * this.tileWidth);
    const ne = leaflet.latLng(
      (i + 1) * this.tileWidth,
      (j + 1) * this.tileWidth
    );

    return leaflet.latLngBounds(sw, ne);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    resultCells.push(originCell);

    return resultCells;
  }
}
