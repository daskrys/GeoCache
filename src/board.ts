import leaflet from "leaflet";
//import luck from "./luck";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export interface GeoCoin {
  readonly i: number;
  readonly j: number;
  readonly serial: string;
}

export interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

export class Geocache implements Memento<string> {
  i: number;
  j: number;
  numCoins: number;

  constructor() {
    this.i = 0;
    this.j = 0;
    this.numCoins = 0;
  }

  toMemento(): string {
    return JSON.stringify(this);
  }

  fromMemento(memento: string): void {
    this.i = JSON.parse(memento).i;
    this.j = JSON.parse(memento).j;
    this.numCoins = JSON.parse(memento).numCoins;
  }
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibility: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(newTileWidth: number, newTileVisibility: number) {
    this.tileWidth = newTileWidth;
    this.tileVisibility = newTileVisibility;
    this.knownCells = new Map();
  }

  private getCanonicalCell(newCell: Cell): Cell {
    const { i, j } = newCell;
    const key = [i, j].toString();

    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor(point.lat / this.tileWidth);
    const j = Math.floor(point.lng / this.tileWidth);

    const newCell: Cell = { i, j };
    // delete bottom two only for commit
    const canonicalCell = this.getCanonicalCell(newCell);

    if (canonicalCell) {
      return canonicalCell;
    }

    return newCell;
  }

  getCellBounds(newCell: Cell): leaflet.LatLngBounds {
    const sw = leaflet.latLng(
      newCell.i * this.tileWidth,
      newCell.j * this.tileWidth
    );

    const ne = leaflet.latLng(
      (newCell.i + 1) * this.tileWidth,
      (newCell.j + 1) * this.tileWidth
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
