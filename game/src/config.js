// Dapur Kilat — constants, ingredients, recipes and the kitchen layout.
// One clear job: everything the rest of the game looks up lives here.

export const VIEW = { width: 1280, height: 720 };
export const HUD_HEIGHT = 104;
export const SHIFT_SECONDS = 150;
export const RUSH_AT_SECONDS = 30;
export const MAX_ORDERS = 4;
export const MAX_HANDS = 3;
export const CHEF_SPEED = 265;
export const CHEF_RADIUS = 22;
export const CHOP_SECONDS = 2.0;
export const COOK_SECONDS = 3.5;
export const BURN_AFTER_SECONDS = 7;
export const COMBO_WINDOW_SECONDS = 12;

// Ingredient kinds and how each one must be prepared before it can be plated.
export const INGREDIENTS = {
  nasi:   { label: 'Nasi',    prep: 'cook', color: '#fff7e0', dark: '#d9c48f' },
  mie:    { label: 'Mie',     prep: 'cook', color: '#ffd166', dark: '#c98f1b' },
  telur:  { label: 'Telur',   prep: 'cook', color: '#fff3c4', dark: '#e0a458' },
  ayam:   { label: 'Ayam',    prep: 'chopcook', color: '#f4a261', dark: '#b45f2e' },
  sayur:  { label: 'Sayur',   prep: 'chop', color: '#7ec850', dark: '#3f7d2c' },
  sambal: { label: 'Sambal',  prep: 'none', color: '#e63946', dark: '#8f1d26' },
};

export const PREP_LABEL = { none: 'siap', chop: 'cincang', cook: 'masak', chopcook: 'cincang+masak' };

// A recipe component is { kind, state } where state is 'raw' | 'chopped' | 'cooked' | 'ready'.
export const RECIPES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng Kilat',
    needs: [
      { kind: 'nasi', state: 'cooked' },
      { kind: 'telur', state: 'cooked' },
      { kind: 'sambal', state: 'ready' },
    ],
    reward: 120,
  },
  {
    id: 'mie-ayam',
    name: 'Mie Ayam Geprek',
    needs: [
      { kind: 'mie', state: 'cooked' },
      { kind: 'ayam', state: 'cooked' },
      { kind: 'sayur', state: 'chopped' },
    ],
    reward: 140,
  },
  {
    id: 'ayam-geprek',
    name: 'Ayam Geprek Nasi',
    needs: [
      { kind: 'ayam', state: 'cooked' },
      { kind: 'sambal', state: 'ready' },
      { kind: 'nasi', state: 'cooked' },
    ],
    reward: 150,
  },
  {
    id: 'mie-pedas',
    name: 'Mie Pedas Sayur',
    needs: [
      { kind: 'mie', state: 'cooked' },
      { kind: 'sayur', state: 'chopped' },
      { kind: 'sambal', state: 'ready' },
    ],
    reward: 110,
  },
  {
    id: 'nasi-telur',
    name: 'Nasi Telur Dadar',
    needs: [
      { kind: 'nasi', state: 'cooked' },
      { kind: 'telur', state: 'cooked' },
      { kind: 'sayur', state: 'chopped' },
    ],
    reward: 100,
  },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

/** True when the plate's items are exactly the recipe's components, order aside. */
export function plateMatchesRecipe(plate, recipe) {
  if (plate.length !== recipe.needs.length) return false;
  const left = plate.map((item) => `${item.kind}:${item.state}`);
  for (const need of recipe.needs) {
    const key = `${need.kind}:${need.state}`;
    const at = left.indexOf(key);
    if (at === -1) return false;
    left.splice(at, 1);
  }
  return true;
}

/** The recipe a plate completes, or null when it matches nothing. */
export function recipeForPlate(plate) {
  for (const recipe of RECIPES) {
    if (plateMatchesRecipe(plate, recipe)) return recipe;
  }
  return null;
}

/** The first recipe a partially-filled plate can still grow into, or null. */
export function recipePlateCanBecome(plate) {
  for (const recipe of RECIPES) {
    if (plate.length > recipe.needs.length) continue;
    const left = recipe.needs.map((need) => `${need.kind}:${need.state}`);
    let fits = true;
    for (const item of plate) {
      const key = `${item.kind}:${item.state}`;
      const at = left.indexOf(key);
      if (at === -1) { fits = false; break; }
      left.splice(at, 1);
    }
    if (fits) return recipe;
  }
  return null;
}

/** True when the plate can still grow into some recipe (no wrong item yet). */
export function plateStillPossible(plate) {
  if (plate.length === 0) return true;
  return RECIPES.some((recipe) => {
    if (plate.length > recipe.needs.length) return false;
    const left = recipe.needs.map((need) => `${need.kind}:${need.state}`);
    for (const item of plate) {
      const key = `${item.kind}:${item.state}`;
      const at = left.indexOf(key);
      if (at === -1) return false;
      left.splice(at, 1);
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Kitchen layout. Every station is a rectangle the chef walks around; the
// approach point is where the chef stands to use it.
// ---------------------------------------------------------------------------
export const STATIONS = {
  binNasi:   { id: 'binNasi',   kind: 'bin', ingredient: 'nasi',   x: 30,  y: 124, w: 158, h: 76, approach: { x: 109, y: 228 } },
  binMie:    { id: 'binMie',    kind: 'bin', ingredient: 'mie',    x: 208, y: 124, w: 158, h: 76, approach: { x: 287, y: 228 } },
  binTelur:  { id: 'binTelur',  kind: 'bin', ingredient: 'telur',  x: 386, y: 124, w: 158, h: 76, approach: { x: 465, y: 228 } },
  binAyam:   { id: 'binAyam',   kind: 'bin', ingredient: 'ayam',   x: 564, y: 124, w: 158, h: 76, approach: { x: 643, y: 228 } },
  binSayur:  { id: 'binSayur',  kind: 'bin', ingredient: 'sayur',  x: 742, y: 124, w: 158, h: 76, approach: { x: 821, y: 228 } },
  binSambal: { id: 'binSambal', kind: 'bin', ingredient: 'sambal', x: 920, y: 124, w: 158, h: 76, approach: { x: 999, y: 228 } },
  trash:     { id: 'trash',     kind: 'trash',                    x: 1108, y: 124, w: 142, h: 76, approach: { x: 1179, y: 228 } },
  board:     { id: 'board',     kind: 'board',                    x: 30,  y: 300, w: 210, h: 110, approach: { x: 135, y: 438 } },
  stove:     { id: 'stove',     kind: 'stove',                    x: 1040, y: 300, w: 210, h: 110, approach: { x: 1145, y: 438 } },
  plating:   { id: 'plating',   kind: 'plating',                  x: 430, y: 560, w: 420, h: 110, approach: { x: 640, y: 536 } },
  serving:   { id: 'serving',   kind: 'serving',                  x: 1040, y: 560, w: 210, h: 110, approach: { x: 1145, y: 536 } },
};

export const STATION_LIST = Object.values(STATIONS);
export const BIN_STATIONS = STATION_LIST.filter((station) => station.kind === 'bin');

export function stationAtPoint(x, y) {
  for (const station of STATION_LIST) {
    if (x >= station.x && x <= station.x + station.w && y >= station.y && y <= station.y + station.h) {
      return station;
    }
  }
  return null;
}

/** Deterministic RNG (mulberry32) so screenshot scenes replay exactly. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
