import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Cell, Board } from "./board";
import { GeoCoin, Geocache } from "./board";

let playerLatLang: leaflet.LatLng = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});
//const NULL_ISLAND: leaflet.LatLng = leaflet.latLng(0, 0);
const GAMEPLAY_ZOOM_LEVEL: number = 18.5;
const TILE_DEGREES: number = 1e-4;
const NEIGHBORHOOD_SIZE: number = 8;
const PIT_SPAWN_PROBABILITY: number = 0.1;
const MOVE_DISTANCE: number = 1e-4;

const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
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

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerMarker: leaflet.Marker<any> = leaflet.marker(playerLatLang);
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

//memento pattern
//let mementos: Map<Cell, string> = new Map<Geocache, string>();
//let mementos: Map<Cell, string> = new Map<Cell, string>();

// for inventory
let myInventory: GeoCoin[] = [];
//let coinCollected: number = 0;

// buttons for live player location
const sensorButton: Element = document.querySelector("#sensor")!;
const westButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#west")!;
const eastButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#east")!;
const northButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#north")!;
const southButton: HTMLButtonElement =
  document.querySelector<HTMLButtonElement>("#south")!;

sensorButton.addEventListener("click", () => {
  let watchId: number = navigator.geolocation.watchPosition((position) => {
    const newLatLang = leaflet.latLng(
      position.coords.latitude,
      position.coords.longitude
    );
    // ensures pits aren't remade if location is the same for now

    updatePlayerLocation(newLatLang);
    navigator.geolocation.clearWatch(watchId);
  });
});

const statusPanel: HTMLDivElement =
  document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "Nothing to see here... yet";

const inventory: HTMLDivElement =
  document.querySelector<HTMLDivElement>("#inventory")!;
inventory.innerHTML = "Inventory: ";

function makeGeocacheLocation(i: number, j: number) {
  const newCell: Cell = { i, j };
  const newBounds = board.getCellBounds(newCell);
  const newGeocache = new Geocache(newCell);

  const cache: leaflet.Layer = leaflet.rectangle(newBounds);
  cacheLayers.push(cache);

  cache.bindPopup(popup(newGeocache, newCell));
  cache.addTo(map);
}

function popup(newGeocache: Geocache, newCell: Cell): HTMLElement {
  const container = document.createElement("div");
  let numOfCoins = newGeocache.getCoinCount();

  container.innerHTML = `
                <div>There is a pit here at "${newCell.i},${newCell.j}". It has value <span id="value">${numOfCoins}</span>.</div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>
                <p id="playerLocation">playerLocation</p>`;
  const poke = container.querySelector<HTMLButtonElement>("#poke")!;
  const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;

  poke.addEventListener("click", () => {
    if (numOfCoins > 0) {
      myInventory.push(newGeocache.poke()!);
      numOfCoins = newGeocache.getCoinCount();
    }

    container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
      numOfCoins.toString();

    showInventory();
    statusPanel.innerHTML = `${myInventory.length} coins accumulated`;
  });

  deposit.addEventListener("click", () => {
    if (myInventory.length > 0) {
      newGeocache.deposit(myInventory.pop()!);
      numOfCoins = newGeocache.getCoinCount();
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

function createCache(location: leaflet.LatLng) {
  const playerCell: Cell = board.getCellForPoint(location);

  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      if (luck([i, j].toString()) < PIT_SPAWN_PROBABILITY) {
        makeGeocacheLocation(playerCell.i + i, playerCell.j + j);
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
  if (checkCacheLocation(newLatLang)) {
    clearPits();
    createCache(playerLatLang);
  }
  playerMarker.setLatLng(newLatLang);
  playerLatLang = playerMarker.getLatLng();
  map.setView(playerMarker.getLatLng());
}

function checkCacheLocation(newLatLang: leaflet.LatLng): boolean {
  const distance: number = 100;
  let delta = map.distance(newLatLang, mapCenter);

  if (delta > distance) {
    mapCenter = newLatLang;
    return true;
  } else {
    return false;
  }
}

function showInventory() {
  inventory.innerHTML = "Inventory: " + "<br/>";
  const inventoryLen = myInventory.length;

  for (let k = 0; k < inventoryLen; k++) {
    inventory.innerHTML += "🦃 " + myInventory[k].serial + "<br/>";
  }
}

const knCells = board.getKnownCells();
console.log(knCells);

createCache(playerLatLang);
