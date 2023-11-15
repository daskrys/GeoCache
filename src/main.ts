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
//console.log(cacheLocations.lat + " " + cacheLocations.lng);
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
let mementos: Map<Cell, string> = new Map<Geocache, string>();

// for inventory
let myInventory: GeoCoin[] = [];
let coinCollected: number = 0;

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
  let value = Math.floor(luck([i, j, "initialValue"].toString()) * 6);

  const newGeocache: Geocache = new Geocache();
  newGeocache.i = i;
  newGeocache.j = j;
  newGeocache.numCoins = value;

  mementos.set(newCell, newGeocache.toMemento());

  const cache: leaflet.Layer = leaflet.rectangle(newBounds);
  cacheLayers.push(cache);

  cache.bindPopup(() => {
    const container = document.createElement("div");
    container.innerHTML = `
                <div>There is a pit here at "${i},${j}". It has value <span id="value">${value}</span>.</div>
                <button id="poke">poke</button>
                <button id="deposit">deposit</button>
                <p id="playerLocation">playerLocation</p>`;
    const poke = container.querySelector<HTMLButtonElement>("#poke")!;
    const deposit = container.querySelector<HTMLButtonElement>("#deposit")!;

    poke.addEventListener("click", () => {
      if (value > 0) {
        value--;
        coinCollected++;
        // update inventory
        const serial = "#" + value.toString();
        const newCoin: GeoCoin = { i, j, serial };
        myInventory.push(newCoin);
        cacheUpdate(newCell, value);
      }

      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      showInventory();
      statusPanel.innerHTML = `${coinCollected} coins accumulated`;
    });

    deposit.addEventListener("click", () => {
      if (coinCollected > 0) {
        coinCollected--;
        value++;

        // update inventory
        const serial = "#" + value.toString();
        const newCoin: GeoCoin = { i, j, serial };
        myInventory.push(newCoin);
        cacheUpdate(newCell, value);
      }

      container.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        value.toString();
      showInventory();
      statusPanel.innerHTML = `${coinCollected} points accumulated`;
    });

    container.querySelector<HTMLSpanElement>(
      "#playerLocation"
    )!.innerHTML = `Player Location: ${playerLatLang.toString()}`;

    return container;
  });

  cache.addTo(map);
}

function cacheUpdate(newCell: Cell, newValue: number) {
  const cacheUpdate: Geocache = new Geocache();
  cacheUpdate.fromMemento(mementos.get(newCell)!);
  cacheUpdate.numCoins = newValue;
  mementos.set(newCell, cacheUpdate.toMemento());
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

  console.log(playerCell + " " + playerCell.i + " " + playerCell.j);

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
    //console.log(cacheLayers[i]);
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
  //map.distance(playerMarker.getLatLng(), playerMarker.getLatLng());
}

function checkCacheLocation(newLatLang: leaflet.LatLng): boolean {
  const exponent: number = 2;
  const distance: number = 0.001;

  let delta = Math.sqrt(
    (newLatLang.lat - mapCenter.lat) ** exponent +
      (newLatLang.lng - mapCenter.lng) ** exponent
  );

  if (delta > distance) {
    mapCenter = newLatLang;
    return true;
  } else {
    return false;
  }
}

function showInventory() {
  inventory.innerHTML = "Inventory: " + "<br/>";

  for (let k = 0; k < myInventory.length; k++) {
    inventory.innerHTML +=
      "🦃 " +
      myInventory[k].i.toString() +
      ": " +
      myInventory[k].j.toString() +
      myInventory[k].serial.toString() +
      "<br/>";
  }
}

createCache(playerLatLang);
