// Dapur Kilat — entry point: the frame loop, screen flow, sounds and the
// ?shot= staging used for screenshots (title | play | rush | end).

import { VIEW } from './config.js';
import { KitchenAudio } from './audio.js';
import { Input } from './input.js';
import { drawScene } from './render.js';
import { stageShot } from './shots.js';
import {
  SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, createWorld, interact,
  nearestStation, startShift, stepWorld,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const audio = new KitchenAudio();
const world = createWorld(20261125);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotMode = shotName !== null;

let best = 0;
try {
  best = Number(window.localStorage.getItem('dapur-kilat-best') || 0) || 0;
} catch { /* storage unavailable: play without a saved best */ }
world.best = best;

if (shotMode) {
  // Stage the scene synchronously before the first paint, so a headless
  // screenshot captures exactly this frame of the real game.
  const staged = stageShot(shotName, world);
  world.best = best;
  drawScene(ctx, world);
  document.title = `Dapur Kilat — shot ${shotName}`;
} else {
  let last = performance.now();
  let sizzleOn = false;

  function drainEvents() {
    for (const event of world.events) {
      if (event === 'pickup') audio.pickup();
      else if (event === 'place') audio.place();
      else if (event === 'chopDone') audio.chopDone();
      else if (event === 'cookDone') audio.cookDone();
      else if (event === 'serve') audio.serve();
      else if (event === 'error') audio.error();
      else if (event === 'order') audio.orderArrive();
      else if (event === 'lost') audio.orderLost();
      else if (event === 'trash') audio.trash();
      else if (event === 'ready') audio.cookDone();
      else if (event === 'fanfare') audio.fanfare();
      else if (event === 'start') audio.orderArrive();
    }
    world.events.length = 0;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    world.time += dt * (world.screen === SCREEN_PLAY ? 0 : 1); // animate title/over screens

    const click = input.takeClick();
    if (input.takeMute()) {
      audio.ensure();
      audio.toggleMute();
    }

    if (world.screen === SCREEN_TITLE) {
      if (input.takeStart() || click) {
        audio.ensure();
        audio.startMusic();
        startShift(world);
        drainEvents();
      }
    } else if (world.screen === SCREEN_PLAY) {
      const cooking = world.stove.some((burner) => burner.item && !burner.done);
      if (cooking && !sizzleOn) { audio.startSizzle(); sizzleOn = true; }
      if (!cooking && sizzleOn) { audio.stopSizzle(); sizzleOn = false; }
      stepWorld(world, dt, {
        move: input.moveVector(),
        interactPressed: input.takeInteract(),
        click,
      });
      drainEvents();
      if (world.screen === SCREEN_OVER) {
        audio.stopSizzle();
        sizzleOn = false;
        try {
          if (world.coins > best) window.localStorage.setItem('dapur-kilat-best', String(world.coins));
        } catch { /* ignore */ }
      }
    } else if (world.screen === SCREEN_OVER) {
      if (input.takeRestart() || click) {
        audio.ensure();
        startShift(world);
        drainEvents();
      }
    }

    // Clicking a station while playing walks there; a bare E uses the nearest one.
    if (world.screen === SCREEN_PLAY && click) {
      // stepWorld already consumed the click above.
    }

    drawScene(ctx, world);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export { world };
