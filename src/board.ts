import leaflet from "leaflet";
import luck from "./luck";
const MULTIPLIER = 1e4;

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export interface Coin {
  readonly i: number;
  readonly j: number;
  readonly serial: string;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibility: number;
  readonly value: number;
  // coins
  readonly serial: string;
  coins: Coin[];

  private readonly knownCells: Map<string, Cell>;

  constructor(
    newTileWidth: number,
    newTileVisibility: number,
    location: leaflet.LatLng
  ) {
    this.tileWidth = newTileWidth;
    this.tileVisibility = newTileVisibility;
    this.knownCells = new Map();

    // coins
    this.value = Math.floor(
      luck([location.lat, location.lng, "initialValue"].toString()) * 25
    );

    this.coins = [];
    this.serial =
      (location.lat * MULTIPLIER).toString() +
      (location.lng * MULTIPLIER).toString();

    console.log(this.serial);
  }
  /*
  private getCanonicalCell(newCell: Cell): Cell {
    const { i, j } = newCell;
    const key = [i, j].toString();

    return this.knownCells.get(key)!;
  }
*/
  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor(point.lat / this.tileWidth);
    const j = Math.floor(point.lng / this.tileWidth);

    const newCell: Cell = { i, j };
    // delete bottom two only for commit
    //const canonicalCell = this.getCanonicalCell(newCell);
    //console.log(canonicalCell);

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

  createCoins(newCell: Cell, value: number): void {
    const serial = this.serial + value.toString();
    console.log(serial);
    const newCoin: Coin = { i: newCell.i, j: newCell.j, serial };
    this.addCoin(newCoin);
  }

  addCoin(newCoin: Coin): void {
    this.coins.push(newCoin);
  }
}

/*
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
    console.log(canonicalCell);

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
*/
