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

  constructor(newCell: Cell) {
    const numOfCoins = Math.floor(
      luck([newCell.i, newCell.j, "initialValue"].toString()) * 5
    );
    this.description = `There is a pit here at "${newCell.i},${newCell.j}". It has value <span id="value">${numOfCoins}</span>.`;
    this.coins = [];

    for (let j = 0; j < numOfCoins; j++) {
      const serial: string = "#" + j.toString() + " : " + newCell.i + newCell.j;
      const newCoin: GeoCoin = { mintLocation: newCell, serial: serial };
      this.coins.push(newCoin);
    }
  }
  /*
  toMemento(): string {
    return JSON.stringify(this);
  }

  fromMemento(memento: string): void {
    const { coins, description } = JSON.parse(memento);
    this.coins = coins;
    this.description = description;
  }
  */
  deposit(newCoin: GeoCoin) {
    this.coins.push(newCoin);
  }

  poke(): GeoCoin | undefined {
    if (this.coins.length > 0) {
      return this.coins.pop();
    }
  }

  getCoinCount(): number {
    return this.coins.length;
  }

  toMemento(): string {
    return this.coins
      .map((coin) =>
        [coin.mintLocation.i, coin.mintLocation.j, coin.serial].toString()
      )
      .join(";");
  }

  fromMemento(memento: string): void {
    this.coins = memento.split(";").map((coin) => {
      const [i, j, serial] = coin.split(",");
      return {
        mintLocation: { i: parseInt(i), j: parseInt(j) },
        serial: serial,
      };
    });
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

  getKnownCells(): Map<string, Cell> {
    return this.knownCells;
  }

  private getCanonicalCell(newCell: Cell): Cell {
    let { i, j } = newCell;
    i = Math.floor(i / 10);
    j = Math.floor(j / 10);
    console.log("canonical cell", i, j);
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
    } else {
      const keyI = Math.floor(i / 10);
      const keyJ = Math.floor(j / 10);
      this.knownCells.set([keyI, keyJ].toString(), newCell);
      return newCell;
    }

    //return newCell;
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
