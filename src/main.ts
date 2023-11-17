import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Cell, Board } from "./board";
import { GeoCoin, Geocache } from "./board";
import L from "leaflet";

const API_KEY: string =
  "pNqux0l8wwTaqsXV8xLJHzHT2p0uqgFjhn06I0XCfCqmzXopyKCi97a4JGRz1MaJ";

let playerLatLang: leaflet.LatLng =
  //parsedPlayerLatLang ??
  leaflet.latLng({
    lat: 36.9995,
    lng: -122.0533,
  });

//const NULL_ISLAND: leaflet.LatLng = leaflet.latLng(0, 0);
const GAMEPLAY_ZOOM_LEVEL: number = 18.5;
const TILE_DEGREES: number = 1e-4;
const NEIGHBORHOOD_SIZE: number = 8;
const PIT_SPAWN_PROBABILITY: number = 0.1;
const MOVE_DISTANCE: number = 1e-4;

// get from local storage
const getMementos = localStorage.getItem("mementos");
const getBoardCells = localStorage.getItem("boardCells");
const getInventory = localStorage.getItem("inventory");
const getPolylines = localStorage.getItem("polylines");

const parsedMementos: Map<string, string> = JSON.parse(getMementos!);
const parsedBoardCells: Map<string, Cell[]> = JSON.parse(getBoardCells!);
const parsedInventory: GeoCoin[] = JSON.parse(getInventory!);
const parsedPolylines: leaflet.LatLng[] = JSON.parse(getPolylines!);

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
board.knownCells = new Map(parsedBoardCells);
let mementos: Map<string, string> =
  new Map<string, string>(parsedMementos) ?? new Map<string, string>();
let myInventory: GeoCoin[] = parsedInventory ?? [];
const polylines: leaflet.LatLng[] = parsedPolylines ?? [];

const mapContainer: HTMLElement = document.querySelector<HTMLElement>("#map")!;
let cacheLayers: leaflet.Layer[] = [];

let mapCenter: leaflet.LatLng = playerLatLang;

const map = leaflet.map(mapContainer, {
  center: playerLatLang,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});
/*
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map); */

let Jawd_Street = L.tileLayer(
  `https://{s}.tile.jawg.io/jawg-streets/{z}/{x}/{y}{r}.png?access-token=${API_KEY}`,
  {
    attribution:
      '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: "abcd",
    accessToken: API_KEY,
  }
);

Jawd_Street.addTo(map);

const playerMarker: leaflet.Marker<any> = leaflet.marker(playerLatLang);

updatePlayerMarker();

function updatePlayerMarker() {
  if (parsedInventory) {
    playerMarker.bindTooltip(showInvenTooltip());
  } else {
    playerMarker.bindTooltip(
      "That's you! </br>" + `${playerLatLang.toString()}`
    );
  }
}

playerMarker.addTo(map);

if (parsedPolylines) {
  updatePolyline(playerLatLang);
}

const sensorButton: Element = document.querySelector("#sensor")!;
const westButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#west")!;
const eastButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#east")!;
const northButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#north")!;
const southButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#south")!;

const resetButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#reset")!;

sensorButton.addEventListener("click", () => {
  let watchId: number = navigator.geolocation.watchPosition((position) => {
    const newLatLang = leaflet.latLng(
      position.coords.latitude,
      position.coords.longitude
    );

    updatePlayerLocation(newLatLang);
    navigator.geolocation.clearWatch(watchId);
  });
});
const statusPanel: HTMLDivElement =
  document.querySelector<HTMLDivElement>("#statusPanel")!;
const inventory: HTMLDivElement =
  document.querySelector<HTMLDivElement>("#inventory")!;

if (parsedInventory) {
  showInventory();
} else {
  statusPanel.innerHTML = "Nothing to see here... yet";
  inventory.innerHTML = "Inventory: ";
}

function makeGeocacheLocation(i: number, j: number, exists: boolean) {
  const newCell: Cell = { i, j };
  const newBounds = board.getCellBounds(newCell);
  let newGeocache: Geocache = new Geocache();
  const key = i.toString() + j.toString();

  if (exists) {
    newGeocache.fromMemento(mementos.get(key)!);
  } else {
    newGeocache.mintCoins(newCell);
    mementos.set(key, newGeocache.toMemento());
  }

  const cache: leaflet.Layer = leaflet.rectangle(newBounds, {
    color: "#317873",
    weight: 2.5,
  });

  cacheLayers.push(cache);
  cache.bindPopup(popup(newGeocache, newCell));
  cache.addTo(map);
}

function popup(newGeocache: Geocache, newCell: Cell): HTMLElement {
  const container = document.createElement("div");
  let numOfCoins = newGeocache.getCoinCount();

  container.innerHTML = `
                <div>${newGeocache.getDescription()}</span></div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>
                <p id="playerLocation">playerLocation</p>`;
  const poke = container.querySelector<HTMLButtonElement>("#poke")!;
  const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;

  const key: string = newCell.i.toString() + newCell.j.toString();

  poke.addEventListener("click", () => {
    if (numOfCoins > 0) {
      myInventory.push(newGeocache.poke()!);
      numOfCoins = newGeocache.getCoinCount();

      mementos.set(key, newGeocache.toMemento());
      saveGame();
    }

    container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
      numOfCoins.toString();

    showInventory();
    playerMarker.bindTooltip(showInvenTooltip());
  });

  deposit.addEventListener("click", () => {
    if (myInventory.length > 0) {
      newGeocache.deposit(myInventory.pop()!);
      numOfCoins = newGeocache.getCoinCount();

      mementos.set(key, newGeocache.toMemento());
      saveGame();
    }

    container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
      numOfCoins.toString();
    showInventory();
    statusPanel.innerHTML = `${myInventory.length} points accumulated`;
  });

  container.querySelector<HTMLSpanElement>(
    "#playerLocation"
  )!.innerHTML = `Player Location: ${playerLatLang.toString()}`;

  return container;
}

// buttons for moving player location
westButton.addEventListener("click", () => {
  const newLatLang = leaflet.latLng(
    playerLatLang.lat,
    playerLatLang.lng - MOVE_DISTANCE
  );

  updatePlayerLocation(newLatLang);
});

eastButton.addEventListener("click", () => {
  const newLatLang = leaflet.latLng(
    playerLatLang.lat,
    playerLatLang.lng + MOVE_DISTANCE
  );

  updatePlayerLocation(newLatLang);
});

northButton.addEventListener("click", () => {
  const newLatLang = leaflet.latLng(
    playerLatLang.lat + MOVE_DISTANCE,
    playerLatLang.lng
  );

  updatePlayerLocation(newLatLang);
});

southButton.addEventListener("click", () => {
  const newLatLang = leaflet.latLng(
    playerLatLang.lat - MOVE_DISTANCE,
    playerLatLang.lng
  );

  updatePlayerLocation(newLatLang);
});

resetButton.addEventListener("click", () => {
  let prompt: string | null = window.prompt(
    "Type 'yes' to reset the game\nWARNING: this will delete and reset your progress\nand your data will be sold to the highest bidder\nhaha just kidding.. 🤨"
  );

  if (prompt === null) {
    return;
  } else if (prompt.toLowerCase() == "yes") {
    clearData();
    location.reload();
  }
});

function createCache(location: leaflet.LatLng) {
  const playerCell = board.getCellForPoint(location);
  const exists: boolean = board.isKnownCell(location);

  if (exists) {
    const existingCells: Cell[] = board.getKnownCells(location);
    const existingCellsLen = existingCells.length;
    // don't touch this actually works

    for (let i = 0; i < existingCellsLen; i++) {
      makeGeocacheLocation(existingCells[i].i, existingCells[i].j, exists);
    }
  } else {
    for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
      for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
        if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
          makeGeocacheLocation(playerCell.i + i, playerCell.j + j, exists);
          const newCell: Cell = { i: playerCell.i + i, j: playerCell.j + j };
          board.pushCell(newCell, location);
        }
      }
    }
  }
}

function clearPits() {
  for (let i = 0; i < cacheLayers.length; i++) {
    map.removeLayer(cacheLayers[i]);
  }
  cacheLayers = [];
}

function updatePlayerLocation(newLatLang: leaflet.LatLng) {
  updatePolyline(newLatLang);
  playerMarker.setLatLng(newLatLang);
  playerLatLang = playerMarker.getLatLng();
  map.setView(playerMarker.getLatLng());

  if (checkCacheLocation(newLatLang)) {
    clearPits();
    createCache(playerLatLang);
  }
  updatePlayerMarker();
  saveGame();
}

function checkCacheLocation(newLatLang: leaflet.LatLng): boolean {
  const distance: number = 100; // for testing its 10 otherwise 100
  let delta = map.distance(newLatLang, mapCenter);

  if (delta > distance) {
    mapCenter = newLatLang;
    return true;
  } else {
    return false;
  }
}

function updatePolyline(newLatLang: leaflet.LatLng) {
  polylines.push(playerMarker.getLatLng());
  polylines.push(newLatLang);

  const polyline = leaflet.polyline(polylines, { color: "#0f1c21" });

  polyline.addTo(map);
}

function showInventory() {
  statusPanel.innerHTML = `${myInventory.length} GeoTurkeys accumulated`;
  inventory.innerHTML = "Inventory: " + "<br/>";
  const inventoryLen = myInventory.length;

  for (let k = 0; k < inventoryLen; k++) {
    inventory.innerHTML += "🦃 " + myInventory[k].serial + "<br/>";
  }
}

function showInvenTooltip(): string {
  let str = "Inventory: " + "<br/>";
  const inventoryLen = myInventory.length;

  for (let k = 0; k < inventoryLen; k++) {
    str += "🦃 " + myInventory[k].serial + "<br/>";
  }

  str += playerLatLang.toString();

  return str;
}

function saveGame() {
  const stringifyMementos = JSON.stringify(Array.from(mementos.entries()));
  const stringifyBoardCells = JSON.stringify(
    Array.from(board.knownCells.entries())
  );
  const stringifyInventory = JSON.stringify(myInventory);
  const stringifyPolylines = JSON.stringify(polylines);

  localStorage.setItem("mementos", stringifyMementos);
  localStorage.setItem("boardCells", stringifyBoardCells);
  localStorage.setItem("inventory", stringifyInventory);
  localStorage.setItem("polylines", stringifyPolylines);
}

function clearData() {
  localStorage.clear();
}

createCache(playerLatLang);
