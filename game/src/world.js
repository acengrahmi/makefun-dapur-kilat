// Dapur Kilat — the simulation: orders, stations, cooking, plating, serving.
// Pure state and rules; it knows nothing about the canvas or the DOM.

import {
  BIN_STATIONS, BURN_AFTER_SECONDS, CHEF_RADIUS, CHEF_SPEED, CHOP_SECONDS,
  COMBO_WINDOW_SECONDS, COOK_SECONDS, INGREDIENTS, MAX_HANDS, MAX_ORDERS,
  RECIPES, RUSH_AT_SECONDS, SHIFT_SECONDS, STATIONS, makeRng,
  plateMatchesRecipe, plateStillPossible, recipeById, recipeForPlate, stationAtPoint,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

let nextOrderId = 1;

export function makeItem(kind, state) {
  return { kind, state };
}

export function createWorld(seed = 20261125) {
  const rng = makeRng(seed);
  return {
    rng,
    screen: SCREEN_TITLE,
    time: 0,
    timeLeft: SHIFT_SECONDS,
    coins: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    lastServeAt: -999,
    spawnTimer: 2,
    chef: { x: 640, y: 430, facing: 1, moving: false, walkTarget: null, autoStation: null, bob: 0 },
    hands: [],
    carryingPlate: null, // array of items once the chef picks a finished plate up
    plate: [], // items sitting on the plating counter
    orders: [],
    board: { item: null, progress: 0, done: false }, // one chopping slot
    stove: [
      { item: null, progress: 0, done: false, burnt: false, burnTimer: 0 },
      { item: null, progress: 0, done: false, burnt: false, burnTimer: 0 },
    ],
    particles: [],
    floats: [], // floating score popups { x, y, text, color, life }
    events: [], // drained by main for sounds: 'pickup' | 'place' | 'chop' | ...
    best: 0,
    servedNames: [],
  };
}

function pushEvent(world, name) {
  world.events.push(name);
}

function addFloat(world, x, y, text, color) {
  world.floats.push({ x, y, text, color, life: 1.4 });
}

function spawnParticles(world, x, y, color, count, spread = 26) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const speed = 20 + world.rng() * 46;
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 26,
      life: 0.5 + world.rng() * 0.5,
      maxLife: 1,
      color,
      size: 2.5 + world.rng() * 3.5,
    });
  }
}

/** Steam puffs above a busy stove burner, every frame while cooking. */
function stoveSteam(world, burner, dt) {
  const burnerX = STATIONS.stove.x + 52 + (world.stove.indexOf(burner) * 106);
  const burnerY = STATIONS.stove.y + 46;
  if (world.rng() < dt * 14) {
    world.particles.push({
      x: burnerX + (world.rng() - 0.5) * 30,
      y: burnerY - 8,
      vx: (world.rng() - 0.5) * 8,
      vy: -34 - world.rng() * 18,
      life: 0.9,
      maxLife: 0.9,
      color: 'rgba(255,255,255,0.55)',
      size: 5 + world.rng() * 5,
    });
  }
}

function spawnOrder(world) {
  const recipe = RECIPES[Math.floor(world.rng() * RECIPES.length)];
  const rush = world.timeLeft <= RUSH_AT_SECONDS;
  const patience = rush ? 34 : 50;
  world.orders.push({
    id: nextOrderId,
    orderNumber: nextOrderId,
    recipeId: recipe.id,
    patience,
    maxPatience: patience,
    reward: recipe.reward,
  });
  nextOrderId += 1;
  pushEvent(world, 'order');
}

function expireOrder(world, order) {
  world.orders = world.orders.filter((o) => o !== order);
  world.combo = 0;
  addFloat(world, 640, 150, 'Pesanan hangus!', '#e63946');
  pushEvent(world, 'lost');
}

/** What the carried item becomes after the station's prep, or null if it cannot go there. */
export function prepResult(item, stationKind) {
  const prep = INGREDIENTS[item.kind].prep;
  if (stationKind === 'board') {
    if (item.state === 'raw' && (prep === 'chop' || prep === 'chopcook')) return 'chopped';
    return null;
  }
  if (stationKind === 'stove') {
    if (item.state === 'raw' && prep === 'cook') return 'cooked';
    if (item.state === 'chopped' && prep === 'chopcook') return 'cooked';
    return null;
  }
  return null;
}

/** The nearest station to the chef within reach, or null. */
export function nearestStation(world) {
  const chef = world.chef;
  let best = null;
  let bestDist = 78;
  for (const station of Object.values(STATIONS)) {
    const cx = Math.max(station.x, Math.min(chef.x, station.x + station.w));
    const cy = Math.max(station.y, Math.min(chef.y, station.y + station.h));
    const dist = Math.hypot(chef.x - cx, chef.y - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = station;
    }
  }
  return best;
}

/** Run one interaction with a station: the E key, or a click that walked here. */
export function interact(world, station) {
  if (!station || world.screen !== SCREEN_PLAY) return;
  const chef = world.chef;

  if (station.kind === 'bin') {
    if (world.carryingPlate) { pushEvent(world, 'error'); return; }
    if (world.hands.length >= MAX_HANDS) { pushEvent(world, 'error'); return; }
    const kind = station.ingredient;
    const state = INGREDIENTS[kind].prep === 'none' ? 'ready' : 'raw';
    world.hands.push(makeItem(kind, state));
    spawnParticles(world, chef.x, chef.y - 30, INGREDIENTS[kind].color, 8);
    pushEvent(world, 'pickup');
    return;
  }

  if (station.kind === 'trash') {
    if (world.carryingPlate) {
      world.carryingPlate = null;
      pushEvent(world, 'trash');
      return;
    }
    if (world.hands.length > 0) {
      world.hands = [];
      pushEvent(world, 'trash');
      return;
    }
    if (world.plate.length > 0) {
      world.plate = [];
      pushEvent(world, 'trash');
      return;
    }
    pushEvent(world, 'error');
    return;
  }

  if (station.kind === 'board') {
    const slot = world.board;
    if (slot.item && slot.done) {
      if (world.hands.length >= MAX_HANDS || world.carryingPlate) { pushEvent(world, 'error'); return; }
      world.hands.push(slot.item);
      slot.item = null;
      slot.progress = 0;
      slot.done = false;
      pushEvent(world, 'pickup');
      return;
    }
    if (!slot.item) {
      const index = world.hands.findIndex((item) => prepResult(item, 'board') !== null);
      if (index === -1) { pushEvent(world, 'error'); return; }
      slot.item = world.hands.splice(index, 1)[0];
      slot.progress = 0;
      slot.done = false;
      pushEvent(world, 'place');
      return;
    }
    pushEvent(world, 'error');
    return;
  }

  if (station.kind === 'stove') {
    const slot = world.stove.find((burner) => burner.item && burner.done)
      ?? world.stove.find((burner) => !burner.item);
    if (!slot) { pushEvent(world, 'error'); return; }
    if (slot.item && slot.done) {
      if (world.hands.length >= MAX_HANDS || world.carryingPlate) { pushEvent(world, 'error'); return; }
      if (slot.burnt) {
        slot.item = null;
        slot.progress = 0;
        slot.done = false;
        slot.burnt = false;
        pushEvent(world, 'trash');
        return;
      }
      world.hands.push(slot.item);
      slot.item = null;
      slot.progress = 0;
      slot.done = false;
      slot.burnt = false;
      pushEvent(world, 'pickup');
      return;
    }
    const index = world.hands.findIndex((item) => prepResult(item, 'stove') !== null);
    if (index === -1) { pushEvent(world, 'error'); return; }
    slot.item = world.hands.splice(index, 1)[0];
    slot.progress = 0;
    slot.done = false;
    slot.burnt = false;
    slot.burnTimer = 0;
    pushEvent(world, 'place');
    return;
  }

  if (station.kind === 'plating') {
    if (world.carryingPlate) { pushEvent(world, 'error'); return; }
    if (world.hands.length > 0) {
      for (const item of world.hands) world.plate.push(item);
      world.hands = [];
      const recipe = recipeForPlate(world.plate);
      if (recipe) {
        addFloat(world, station.x + station.w / 2, station.y - 14, `${recipe.name} SIAP!`, '#2a9d8f');
        pushEvent(world, 'ready');
      } else if (!plateStillPossible(world.plate)) {
        addFloat(world, station.x + station.w / 2, station.y - 14, 'Salah racik!', '#e63946');
        pushEvent(world, 'error');
      } else {
        pushEvent(world, 'place');
      }
      return;
    }
    if (world.plate.length > 0 && recipeForPlate(world.plate)) {
      world.carryingPlate = world.plate;
      world.plate = [];
      pushEvent(world, 'pickup');
      return;
    }
    pushEvent(world, 'error');
    return;
  }

  if (station.kind === 'serving') {
    if (!world.carryingPlate) { pushEvent(world, 'error'); return; }
    const recipe = recipeForPlate(world.carryingPlate);
    if (!recipe) { pushEvent(world, 'error'); return; }
    const order = world.orders.find((o) => o.recipeId === recipe.id);
    if (!order) { pushEvent(world, 'error'); return; }
    serveOrder(world, order, recipe);
    return;
  }
}

function serveOrder(world, order, recipe) {
  world.orders = world.orders.filter((o) => o !== order);
  const patienceFraction = order.patience / order.maxPatience;
  const tip = Math.round(order.reward * 0.5 * patienceFraction);
  if (world.time - world.lastServeAt <= COMBO_WINDOW_SECONDS) {
    world.combo += 1;
  } else {
    world.combo = 1;
  }
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.lastServeAt = world.time;
  const multiplier = Math.min(2, 1 + 0.1 * (world.combo - 1));
  const earned = Math.round((order.reward + tip) * multiplier);
  world.coins += earned;
  world.served += 1;
  world.servedNames.push(recipe.name);
  world.carryingPlate = null;
  const sx = STATIONS.serving.x + STATIONS.serving.w / 2;
  addFloat(world, sx, STATIONS.serving.y - 16, `+${earned} koin`, '#ffb703');
  if (world.combo >= 2) addFloat(world, sx, STATIONS.serving.y - 44, `KOMBO x${world.combo}!`, '#e63946');
  spawnParticles(world, sx, STATIONS.serving.y + 30, '#ffd166', 22);
  spawnParticles(world, sx, STATIONS.serving.y + 30, '#2a9d8f', 14);
  pushEvent(world, 'serve');
}

/** Circle-vs-station collision: push the chef out of any station rectangle. */
function resolveCollisions(world) {
  const chef = world.chef;
  for (const station of Object.values(STATIONS)) {
    const cx = Math.max(station.x, Math.min(chef.x, station.x + station.w));
    const cy = Math.max(station.y, Math.min(chef.y, station.y + station.h));
    const dx = chef.x - cx;
    const dy = chef.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < CHEF_RADIUS) {
      if (dist === 0) {
        chef.y = station.y + station.h + CHEF_RADIUS;
      } else {
        chef.x = cx + (dx / dist) * CHEF_RADIUS;
        chef.y = cy + (dy / dist) * CHEF_RADIUS;
      }
    }
  }
  chef.x = Math.max(CHEF_RADIUS + 4, Math.min(1280 - CHEF_RADIUS - 4, chef.x));
  chef.y = Math.max(112 + CHEF_RADIUS, Math.min(716 - CHEF_RADIUS, chef.y));
}

function moveChef(world, dt, move) {
  const chef = world.chef;
  chef.moving = false;
  if (move.x !== 0 || move.y !== 0) {
    chef.walkTarget = null;
    chef.autoStation = null;
    chef.x += move.x * CHEF_SPEED * dt;
    chef.y += move.y * CHEF_SPEED * dt;
    chef.facing = move.x !== 0 ? Math.sign(move.x) : chef.facing;
    chef.moving = true;
    chef.bob += dt * 11;
  } else if (chef.walkTarget) {
    const dx = chef.walkTarget.x - chef.x;
    const dy = chef.walkTarget.y - chef.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) {
      chef.walkTarget = null;
      chef.moving = false;
      if (chef.autoStation) {
        const station = chef.autoStation;
        chef.autoStation = null;
        interact(world, station);
      }
    } else {
      chef.x += (dx / dist) * CHEF_SPEED * dt;
      chef.y += (dy / dist) * CHEF_SPEED * dt;
      chef.facing = dx !== 0 ? Math.sign(dx) : chef.facing;
      chef.moving = true;
      chef.bob += dt * 11;
    }
  }
  resolveCollisions(world);
}

/**
 * Advance the simulation one fixed step.
 * `input` is { move: {x,y}, interactPressed: bool, click: {x,y} | null }.
 */
export function stepWorld(world, dt, input) {
  if (world.screen !== SCREEN_PLAY) return;

  world.time += dt;
  world.timeLeft = Math.max(0, SHIFT_SECONDS - world.time);
  if (world.timeLeft <= 0) {
    world.screen = SCREEN_OVER;
    world.best = Math.max(world.best, world.coins);
    pushEvent(world, 'fanfare');
    return;
  }

  // Orders arrive on a timer; the rush makes them come faster.
  world.spawnTimer -= dt;
  const interval = world.timeLeft <= RUSH_AT_SECONDS ? 9 : 14;
  if (world.spawnTimer <= 0 && world.orders.length < MAX_ORDERS) {
    spawnOrder(world);
    world.spawnTimer = interval;
  } else if (world.spawnTimer <= 0) {
    world.spawnTimer = 3;
  }

  for (const order of [...world.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) expireOrder(world, order);
  }

  // Chopping board: chops on its own once an item is placed.
  const slot = world.board;
  if (slot.item && !slot.done) {
    slot.progress += dt / CHOP_SECONDS;
    if (world.rng() < dt * 6) pushEvent(world, 'chopTick');
    if (slot.progress >= 1) {
      slot.done = true;
      slot.item = makeItem(slot.item.kind, 'chopped');
      spawnParticles(world, STATIONS.board.x + 105, STATIONS.board.y + 50, '#7ec850', 10);
      pushEvent(world, 'chopDone');
    }
  }

  // Stove burners: cook, then burn if left too long.
  for (const burner of world.stove) {
    if (burner.item && !burner.done) {
      burner.progress += dt / COOK_SECONDS;
      stoveSteam(world, burner, dt);
      if (burner.progress >= 1) {
        burner.done = true;
        burner.item = makeItem(burner.item.kind, 'cooked');
        pushEvent(world, 'cookDone');
      }
    } else if (burner.item && burner.done && !burner.burnt) {
      burner.burnTimer += dt;
      if (burner.burnTimer > BURN_AFTER_SECONDS) {
        burner.burnt = true;
        burner.item = makeItem(burner.item.kind, 'burnt');
        addFloat(world, STATIONS.stove.x + 105, STATIONS.stove.y - 12, 'Gosong!', '#e63946');
        pushEvent(world, 'error');
      }
    }
  }

  // Click: walk to a station and act on arrival, or just walk to the floor.
  if (input.click) {
    const station = stationAtPoint(input.click.x, input.click.y);
    if (station) {
      world.chef.walkTarget = { x: station.approach.x, y: station.approach.y };
      world.chef.autoStation = station;
    } else {
      world.chef.walkTarget = { x: input.click.x, y: Math.max(150, input.click.y) };
      world.chef.autoStation = null;
    }
  }

  if (input.interactPressed) {
    const station = nearestStation(world);
    if (station) interact(world, station);
  }

  moveChef(world, dt, input.move);

  for (const particle of world.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy -= 12 * dt;
    particle.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const float of world.floats) {
    float.y -= 34 * dt;
    float.life -= dt;
  }
  world.floats = world.floats.filter((f) => f.life > 0);
}

export function startShift(world) {
  const fresh = createWorld(world.rng ? 20261125 : 20261125);
  fresh.best = world.best;
  Object.assign(world, fresh);
  world.screen = SCREEN_PLAY;
  pushEvent(world, 'start');
}

export function starsForScore(coins) {
  if (coins >= 1000) return 3;
  if (coins >= 600) return 2;
  if (coins >= 300) return 1;
  return 0;
}

export { BIN_STATIONS, RECIPES as ALL_RECIPES, recipeById as findRecipe, recipeForPlate as plateRecipe };
