import leaflet from "leaflet";
import luck from "./luck";

export interface Cell {
  i: number;
  j: number;
}

export interface GeoCoin {
  mintLocation: Cell;
  serial: string;
}

export interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

export class Geocache implements Memento<string> {
  coins: GeoCoin[];
  description: string;
  mintLocation: Cell;

  constructor() {
    this.coins = [];
    this.description = "";
    this.mintLocation = { i: 0, j: 0 };
  }

  getDescription(): string {
    return this.description;
  }

  updateDescription() {
    this.description = `There is a pit here at "${this.mintLocation.i},${this.mintLocation.j}". It has value <span id="value">${this.coins.length}</span>`;
  }

  mintCoins(newCell: Cell) {
    this.mintLocation = newCell;
    const numOfCoins = Math.floor(
      luck([newCell.i, newCell.j, "initialValue"].toString()) * 5
    );
    this.description = `There is a pit here at "${newCell.i},${newCell.j}". `;

    for (let j = 0; j < numOfCoins; j++) {
      const serial: string = "#" + j.toString() + " : " + newCell.i + newCell.j;
      const newCoin: GeoCoin = { mintLocation: newCell, serial: serial };
      this.coins.push(newCoin);
    }

    this.updateDescription();
  }

  deposit(newCoin: GeoCoin) {
    this.coins.push(newCoin);

    this.updateDescription();
  }

  poke(): GeoCoin | undefined {
    if (this.coins.length > 0) {
      return this.coins.pop();
    }

    this.updateDescription();
  }

  getCoinCount(): number {
    return this.coins.length;
  }

  toMemento(): string {
    return JSON.stringify(this);
  }

  fromMemento(memento: string): void {
    const obj = JSON.parse(memento);
    this.coins = obj.coins;
    this.description = obj.description;
    this.mintLocation = obj.mintLocation;
    this.updateDescription();
  }
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibility: number;

  knownCells: Map<string, Cell[]>;

  constructor(newTileWidth: number, newTileVisibility: number) {
    this.tileWidth = newTileWidth;
    this.tileVisibility = newTileVisibility;
    this.knownCells = new Map();
  }

  getKnownCells(location: leaflet.LatLng): Cell[] {
    const key = this.generateKey(this.getCellForPoint(location));

    const cellArr: Cell[] = this.knownCells.get(key)!;
    return cellArr;
  }

  isKnownCell(location: leaflet.LatLng): boolean {
    const key = this.generateKey(this.getCellForPoint(location));
    const cellArr: Cell[] = this.knownCells.get(key)!;

    if (cellArr) {
      return true;
    } else {
      return false;
    }
  }

  pushCell(newCell: Cell, location: leaflet.LatLng) {
    const key = this.generateKey(this.getCellForPoint(location));
    let cellArr: Cell[] = this.knownCells.get(key)!;

    if (!cellArr) {
      cellArr = [];
    }

    cellArr.push(newCell);
    this.knownCells.set(key, cellArr);
  }

  generateKey(cell: Cell): string {
    const i = Math.floor(cell.i / 10);
    const j = Math.floor(cell.j / 10);
    const key = [i, j].toString();

    return key;
  }

  getCellForPoint(point: leaflet.LatLng) {
    const i = Math.floor(point.lat / this.tileWidth);
    const j = Math.floor(point.lng / this.tileWidth);

    const newCell: Cell = { i, j };

    const key = this.generateKey(newCell);
    let cellArr: Cell[] = this.knownCells.get(key)!;

    if (!cellArr) {
      cellArr = [];
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
}
