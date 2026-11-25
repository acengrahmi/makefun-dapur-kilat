// Dapur Kilat — deterministic screenshot scenes.
// Each scene plays the real rules forward from a fresh world, steered by a
// simple autopilot (fetch each missing recipe component, prep it, plate it,
// serve it), so every frame is what a real game looks like at that moment.

import { RECIPES, SHIFT_SECONDS, STATIONS, recipeById, recipeForPlate } from './config.js';
import {
  SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, createWorld, makeItem,
  prepResult, startShift, stepWorld,
} from './world.js';

const STEP = 1 / 60;
const BIN_FOR_KIND = {};
for (const station of Object.values(STATIONS)) {
  if (station.kind === 'bin') BIN_FOR_KIND[station.ingredient] = station.id;
}

/** Components of `recipe` not yet on the plate or in the chef's hands. */
function missingComponents(world, recipe) {
  const have = [...world.plate, ...world.hands].map((item) => `${item.kind}:${item.state}`);
  const missing = [];
  for (const need of recipe.needs) {
    const key = `${need.kind}:${need.state}`;
    const at = have.indexOf(key);
    if (at === -1) missing.push(need);
    else have.splice(at, 1);
  }
  return missing;
}

/** Components of `recipe` not yet on the plate (hands may already hold them). */
function plateMissing(world, recipe) {
  const onPlate = world.plate.map((item) => `${item.kind}:${item.state}`);
  const missing = [];
  for (const need of recipe.needs) {
    const key = `${need.kind}:${need.state}`;
    const at = onPlate.indexOf(key);
    if (at === -1) missing.push(need);
    else onPlate.splice(at, 1);
  }
  return missing;
}

/** True when the plate can still grow into this recipe. */
function plateCanBecome(plate, recipe) {
  const left = recipe.needs.map((need) => `${need.kind}:${need.state}`);
  for (const item of plate) {
    const key = `${item.kind}:${item.state}`;
    const at = left.indexOf(key);
    if (at === -1) return false;
    left.splice(at, 1);
  }
  return true;
}

function walkTo(world, stationId) {
  const station = STATIONS[stationId];
  world.chef.walkTarget = { x: station.approach.x, y: station.approach.y };
  world.chef.autoStation = station;
}

/** The state an item ends in after its full prep chain (board, then stove). */
function finalState(item) {
  let state = item.state;
  const afterBoard = prepResult({ kind: item.kind, state }, 'board');
  if (afterBoard !== null) state = afterBoard;
  const afterStove = prepResult({ kind: item.kind, state }, 'stove');
  if (afterStove !== null) state = afterStove;
  return state;
}

/** True when an item is a missing need as-is, or its prep chain ends in one. */
function itemLeadsToNeed(item, missing) {
  return missing.some((need) => need.kind === item.kind
    && (need.state === item.state || need.state === finalState(item)));
}

/** One autopilot decision per tick; the world handles walking and acting. */
export function autopilotTick(world) {
  if (world.chef.walkTarget) return;
  const chef = world.chef;

  if (world.carryingPlate) {
    const recipe = recipeForPlate(world.carryingPlate);
    if (recipe && world.orders.some((o) => o.recipeId === recipe.id)) walkTo(world, 'serving');
    else walkTo(world, 'trash');
    return;
  }

  const completed = recipeForPlate(world.plate);
  if (completed) {
    // A finished plate waits for its order to come back rather than being trashed.
    if (world.orders.some((o) => o.recipeId === completed.id)) walkTo(world, 'plating');
    return;
  }

  // Lock one recipe while a dish is being built, so a new order arriving
  // mid-build never orphans the ingredients already gathered. No recipe is
  // locked before any order exists: cooking for a phantom dish is how
  // orphan ingredients end up on the stove.
  let target = world.autoRecipe ? recipeById(world.autoRecipe) : null;
  const building = world.plate.length > 0 || world.hands.length > 0
    || world.board.item !== null || world.stove.some((burner) => burner.item !== null);
  if (!target || (!building && !world.orders.some((o) => o.recipeId === target.id))) {
    target = null;
    for (const order of world.orders) {
      const recipe = recipeById(order.recipeId);
      if (plateCanBecome([...world.plate, ...world.hands], recipe)) { target = recipe; break; }
    }
    if (!target) return; // no order yet: idle by the counter
    world.autoRecipe = target.id;
  }
  if (world.plate.length > 0 && !plateCanBecome(world.plate, target)) {
    walkTo(world, 'trash');
    world.autoRecipe = null;
    return;
  }

  const missing = missingComponents(world, target);
  if (missing.length === 0) {
    walkTo(world, 'plating'); // hands hold the last piece: deposit it
    return;
  }

  // A needed piece is already in hand: take it to the plate. (Checked
  // against what the plate still needs, not against hands+plate.)
  const plateNeeds = plateMissing(world, target);
  const inHand = world.hands.find((item) =>
    plateNeeds.some((need) => need.kind === item.kind && need.state === item.state));
  if (inHand) {
    walkTo(world, 'plating');
    return;
  }
  if (world.hands.length >= 3) {
    walkTo(world, 'trash'); // safety valve: should not happen with the lock on
    return;
  }

  // A needed piece is done on the board or stove: go and collect it.
  // (A chopped ayam counts: one stove trip away from the cooked ayam needed.)
  const board = world.board;
  if (board.item && board.done && itemLeadsToNeed(board.item, missing)) {
    walkTo(world, 'board');
    return;
  }
  for (const burner of world.stove) {
    if (burner.item && burner.done && itemLeadsToNeed(burner.item, missing)) {
      walkTo(world, 'stove');
      return;
    }
  }

  // A needed piece is still being prepped: wait for it.
  if (board.item && !board.done && itemLeadsToNeed(board.item, missing)) return;
  for (const burner of world.stove) {
    if (burner.item && !burner.done && itemLeadsToNeed(burner.item, missing)) return;
  }

  // Fetch the first missing component, starting with its raw ingredient.
  const need = missing[0];
  const heldRaw = world.hands.find((item) => item.kind === need.kind);
  if (heldRaw) {
    if (prepResult(heldRaw, 'board') !== null && need.state === 'chopped') { walkTo(world, 'board'); return; }
    if (prepResult(heldRaw, 'board') !== null && need.state === 'cooked' && heldRaw.state === 'raw') { walkTo(world, 'board'); return; }
    if (prepResult(heldRaw, 'stove') !== null) { walkTo(world, 'stove'); return; }
    walkTo(world, 'plating');
    return;
  }
  walkTo(world, BIN_FOR_KIND[need.kind]);
}

function playForward(world, seconds, stopWhen) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilotTick(world);
    stepWorld(world, STEP, { move: { x: 0, y: 0 }, interactPressed: false, click: null });
    if (world.screen !== SCREEN_PLAY) break;
    if (stopWhen && stopWhen(world)) break;
  }
  world.chef.walkTarget = null;
  world.chef.autoStation = null;
}

function addStagedOrder(world, recipeId, patience) {
  const recipe = recipeById(recipeId);
  world.orders.push({
    id: 900 + world.orders.length,
    orderNumber: 900 + world.orders.length,
    recipeId,
    patience,
    maxPatience: patience,
    reward: recipe.reward,
  });
}

/**
 * Set `world` to the named scene and return the screen to draw.
 * Scenes: 'title' | 'play' (mid-assembly cover) | 'rush' | 'end'.
 */
export function stageShot(name, world) {
  const fresh = createWorld(20261125);
  Object.assign(world, fresh);
  if (name === 'title') {
    world.screen = SCREEN_TITLE;
    world.time = 3.2;
    return { screen: SCREEN_TITLE };
  }

  startShift(world);

  if (name === 'end') {
    playForward(world, SHIFT_SECONDS + 2);
    return { screen: SCREEN_OVER };
  }

  if (name === 'rush') {
    playForward(world, 96);
    // Force the last stretch: little time left, a full board, a finished plate.
    world.time = SHIFT_SECONDS - 16;
    world.timeLeft = 16;
    while (world.orders.length < 4) {
      const recipe = RECIPES[world.orders.length % RECIPES.length];
      addStagedOrder(world, recipe.id, 12 + world.orders.length * 4);
    }
    const first = recipeById(world.orders[0].recipeId);
    world.plate = first.needs.map((need) => makeItem(need.kind, need.state));
    world.hands = [];
    world.carryingPlate = null;
    world.chef.x = STATIONS.plating.approach.x;
    world.chef.y = STATIONS.plating.approach.y;
    world.chef.walkTarget = null;
    world.chef.autoStation = null;
    return { screen: SCREEN_PLAY };
  }

  // Cover: play until a dish is visibly mid-assembly at the plating counter.
  playForward(world, 60, (state) => {
    if (state.plate.length < 2) return false;
    const approach = STATIONS.plating.approach;
    return Math.hypot(state.chef.x - approach.x, state.chef.y - approach.y) < 130;
  });
  return { screen: SCREEN_PLAY };
}
