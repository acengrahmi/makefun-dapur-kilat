// Dapur Kilat — everything the player sees: the kitchen, the chef, the food
// (all drawn with canvas shapes, no image assets), the order board and screens.

import {
  HUD_HEIGHT, INGREDIENTS, RUSH_AT_SECONDS, STATIONS, VIEW,
  recipeById, recipeForPlate, recipePlateCanBecome,
} from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, nearestStation, prepResult, starsForScore } from './world.js';

const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// ---------------------------------------------------------------------------
// Food icons: small original drawings, one per ingredient kind and state.
// ---------------------------------------------------------------------------
export function drawIngredientIcon(ctx, kind, state, x, y, size) {
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.4);
    ctx.lineTo(r * 0.4, r * 0.4);
    ctx.moveTo(r * 0.4, -r * 0.4);
    ctx.lineTo(-r * 0.4, r * 0.4);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (kind === 'nasi') {
    ctx.fillStyle = '#e4572e';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r * 0.85, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = state === 'cooked' ? '#fff8e1' : '#f5e6c4';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1, r * 0.8, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8d9a8';
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.arc(i * r * 0.28, -r * 0.35 + Math.abs(i) * r * 0.08, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'mie') {
    ctx.fillStyle = '#2a9d8f';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r * 0.85, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = state === 'cooked' ? '#ffcf4d' : '#e8c87a';
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, -r * 0.05, r * (0.55 - i * 0.16), Math.PI * 0.15, Math.PI * 0.9);
      ctx.stroke();
    }
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.9);
    ctx.lineTo(r * 0.75, r * 0.3);
    ctx.stroke();
  } else if (kind === 'telur') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.75, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state === 'cooked' ? '#ffb703' : '#ffd166';
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(r * 0.1 - r * 0.15, -r * 0.15, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'ayam') {
    if (state === 'chopped') {
      ctx.fillStyle = state === 'cooked' ? '#c96f2e' : '#f2a65a';
      for (const [dx, dy] of [[-0.4, -0.3], [0.35, -0.35], [0, 0.35]]) {
        ctx.save();
        ctx.translate(dx * r, dy * r);
        ctx.rotate(0.4);
        ctx.fillRect(-r * 0.32, -r * 0.32, r * 0.64, r * 0.64);
        ctx.restore();
      }
    } else {
      ctx.strokeStyle = '#f8f3e6';
      ctx.lineWidth = r * 0.28;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.45, r * 0.45);
      ctx.lineTo(r * 0.85, r * 0.85);
      ctx.stroke();
      ctx.fillStyle = '#f8f3e6';
      ctx.beginPath();
      ctx.arc(r * 0.9, r * 0.9, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = state === 'cooked' ? '#b45f2e' : state === 'raw' ? '#f4a988' : '#c96f2e';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, -r * 0.15, r * 0.72, r * 0.6, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'sayur') {
    if (state === 'chopped') {
      ctx.fillStyle = '#7ec850';
      for (const [dx, dy] of [[-0.35, -0.25], [0.3, -0.3], [-0.1, 0.3], [0.4, 0.35]]) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#3f7d2c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, 0);
      ctx.lineTo(r * 0.5, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#57a639';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.1, r * 0.5, r * 0.8, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7ec850';
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, r * 0.1, r * 0.42, r * 0.7, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3f7d2c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(0, r * 0.6);
      ctx.stroke();
    }
  } else if (kind === 'sambal') {
    ctx.fillStyle = '#8f1d26';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r * 0.85, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.15, r * 0.7, r * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, -r * 0.3, r * 0.3, r * 0.16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3f7d2c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.55);
    ctx.quadraticCurveTo(r * 0.55, -r * 0.8, r * 0.7, -r * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlate(ctx, x, y, radius, items) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8c9a3';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 0.7, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();
  items.forEach((item, i) => {
    const angle = (i / Math.max(1, items.length)) * Math.PI * 2 - Math.PI / 2;
    drawIngredientIcon(ctx, item.kind, item.state, x + Math.cos(angle) * radius * 0.45, y - 6 + Math.sin(angle) * radius * 0.14, radius * 0.72);
  });
}

// ---------------------------------------------------------------------------
// Kitchen and stations
// ---------------------------------------------------------------------------
function drawFloor(ctx) {
  ctx.fillStyle = '#f2ddb0';
  ctx.fillRect(0, HUD_HEIGHT, VIEW.width, VIEW.height - HUD_HEIGHT);
  ctx.fillStyle = '#e8cfa0';
  const tile = 64;
  for (let y = HUD_HEIGHT; y < VIEW.height; y += tile) {
    for (let x = 0; x < VIEW.width; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) ctx.fillRect(x, y, tile, tile);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = HUD_HEIGHT; y < VIEW.height; y += tile) ctx.fillRect(0, y, VIEW.width, 2);
  for (let x = 0; x < VIEW.width; x += tile) ctx.fillRect(x, HUD_HEIGHT, 2, VIEW.height - HUD_HEIGHT);
  // Wall strip above the bins.
  ctx.fillStyle = '#c96f4a';
  ctx.fillRect(0, HUD_HEIGHT, VIEW.width, 12);
  ctx.fillStyle = '#fff3d6';
  ctx.fillRect(0, HUD_HEIGHT + 12, VIEW.width, 6);
  // Centre rug and a potted plant to warm up the empty floor.
  ctx.fillStyle = '#b5524a';
  roundRect(ctx, 440, 452, 400, 72, 16);
  ctx.fill();
  ctx.strokeStyle = '#e8b4a0';
  ctx.lineWidth = 3;
  roundRect(ctx, 452, 462, 376, 52, 12);
  ctx.stroke();
  ctx.fillStyle = '#c96f4a';
  ctx.beginPath();
  ctx.moveTo(86, 668);
  ctx.lineTo(96, 624);
  ctx.lineTo(116, 624);
  ctx.lineTo(126, 668);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#57a639';
  ctx.beginPath();
  ctx.arc(106, 606, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7ec850';
  ctx.beginPath();
  ctx.arc(88, 596, 15, 0, Math.PI * 2);
  ctx.arc(124, 594, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawStationBase(ctx, station, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, station.x + 3, station.y + 5, station.w, station.h, 12);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, station.x, station.y, station.w, station.h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  roundRect(ctx, station.x + 2, station.y + 2, station.w - 4, station.h - 4, 10);
  ctx.stroke();
  text(ctx, label, station.x + station.w / 2, station.y + station.h - 13, 13, '#fff', 'bold', 'center');
}

function drawBins(ctx, world) {
  for (const station of Object.values(STATIONS)) {
    if (station.kind !== 'bin') continue;
    const ingredient = INGREDIENTS[station.ingredient];
    drawStationBase(ctx, station, '#8b5a2b', ingredient.label.toUpperCase());
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, station.x + 10, station.y + 8, station.w - 20, 38, 8);
    ctx.fill();
    drawIngredientIcon(ctx, station.ingredient, 'raw', station.x + station.w / 2, station.y + 27, 34);
  }
  const trash = STATIONS.trash;
  drawStationBase(ctx, trash, '#5b5b66', 'SAMPAH');
  ctx.fillStyle = '#2e2e33';
  roundRect(ctx, trash.x + 34, trash.y + 10, trash.w - 68, 34, 8);
  ctx.fill();
  ctx.strokeStyle = '#9a9aa5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(trash.x + 48, trash.y + 14);
  ctx.lineTo(trash.x + trash.w - 48, trash.y + 14);
  ctx.stroke();
}

function drawProgressRing(ctx, x, y, radius, fraction, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
  ctx.stroke();
}

function drawBoard(ctx, world) {
  const board = STATIONS.board;
  drawStationBase(ctx, board, '#a9713f', 'TALENAN');
  ctx.fillStyle = '#e8c898';
  roundRect(ctx, board.x + 14, board.y + 12, board.w - 28, 52, 8);
  ctx.fill();
  const slot = world.board;
  if (slot.item) {
    drawIngredientIcon(ctx, slot.item.kind, slot.item.state, board.x + 80, board.y + 38, 40);
    if (!slot.done) {
      drawProgressRing(ctx, board.x + board.w - 42, board.y + 38, 15, slot.progress, '#7ec850');
      // Knife mid-chop.
      const bob = Math.sin(world.time * 14) * 4;
      ctx.save();
      ctx.translate(board.x + 150, board.y + 26 + bob);
      ctx.rotate(-0.5);
      ctx.fillStyle = '#c0c8d0';
      ctx.fillRect(0, -5, 44, 10);
      ctx.fillStyle = '#5b3a1e';
      ctx.fillRect(44, -4, 18, 8);
      ctx.restore();
    } else {
      text(ctx, 'SIAP!', board.x + board.w - 42, board.y + 38, 14, '#2a7d2c', 'bold', 'center');
    }
  } else {
    text(ctx, 'taruh bahan di sini', board.x + board.w / 2, board.y + 38, 12, '#7a5a34', 'bold', 'center');
  }
}

function drawStove(ctx, world) {
  const stove = STATIONS.stove;
  drawStationBase(ctx, stove, '#4a4e69', 'KOMPOR');
  world.stove.forEach((burner, i) => {
    const bx = stove.x + 52 + i * 106;
    const by = stove.y + 44;
    ctx.fillStyle = '#22223b';
    ctx.beginPath();
    ctx.arc(bx, by, 34, 0, Math.PI * 2);
    ctx.fill();
    if (burner.item) {
      const flicker = 0.75 + Math.sin(world.time * 18 + i * 3) * 0.25;
      if (!burner.done) {
        ctx.fillStyle = `rgba(255, ${Math.floor(120 + 60 * flicker)}, 40, ${0.55 * flicker})`;
        ctx.beginPath();
        ctx.ellipse(bx, by + 26, 26, 10 + 6 * flicker, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = burner.burnt ? '#2b2b2b' : '#c0c8d0';
      ctx.beginPath();
      ctx.arc(bx, by - 4, 30, 0, Math.PI);
      ctx.fill();
      drawIngredientIcon(ctx, burner.item.kind, burner.item.state, bx, by - 6, 34);
      if (!burner.done) {
        drawProgressRing(ctx, bx + 34, by - 26, 11, burner.progress, '#ffb703');
      } else if (burner.burnt) {
        text(ctx, 'GOSONG', bx, by - 34, 12, '#ff6b6b', 'bold', 'center');
      } else {
        text(ctx, 'MATANG!', bx, by - 34, 12, '#7ee081', 'bold', 'center');
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function drawPlating(ctx, world) {
  const counter = STATIONS.plating;
  drawStationBase(ctx, counter, '#9c6644', 'MEJA RACIK');
  const recipe = recipeForPlate(world.plate);
  if (world.plate.length > 0) {
    drawPlate(ctx, counter.x + counter.w / 2, counter.y + 56, 62, world.plate);
    if (recipe) {
      const pulse = 0.6 + Math.sin(world.time * 6) * 0.4;
      ctx.strokeStyle = `rgba(42,157,143,${pulse})`;
      ctx.lineWidth = 4;
      roundRect(ctx, counter.x + 4, counter.y + 4, counter.w - 8, counter.h - 8, 10);
      ctx.stroke();
      text(ctx, `${recipe.name} — SIAP DISAJIKAN`, counter.x + counter.w / 2, counter.y + 20, 15, '#1d7a6e', 'bold', 'center');
    } else {
      const growing = recipePlateCanBecome(world.plate);
      if (growing) {
        text(ctx, `Merakit: ${growing.name} • ${world.plate.length}/${growing.needs.length} bahan`, counter.x + counter.w / 2, counter.y + 20, 14, '#ffe9b8', 'bold', 'center');
      } else {
        text(ctx, 'Racikan salah — buang ke SAMPAH', counter.x + counter.w / 2, counter.y + 20, 14, '#ff8a80', 'bold', 'center');
      }
    }
  } else {
    text(ctx, 'rakit hidangan di sini (E)', counter.x + counter.w / 2, counter.y + 46, 13, '#f3ddb0', 'bold', 'center');
  }
}

function drawServing(ctx, world) {
  const windowStation = STATIONS.serving;
  drawStationBase(ctx, windowStation, '#2a9d8f', 'JENDELA SAJI');
  ctx.fillStyle = '#f7e8c9';
  roundRect(ctx, windowStation.x + 14, windowStation.y + 10, windowStation.w - 28, 44, 8);
  ctx.fill();
  // Service bell.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(windowStation.x + windowStation.w / 2, windowStation.y + 34, 13, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(windowStation.x + windowStation.w / 2 - 14, windowStation.y + 34, 28, 3);
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.arc(windowStation.x + windowStation.w / 2 + 16, windowStation.y + 30, 3, 0, Math.PI * 2);
  ctx.fill();
  if (world.carryingPlate) {
    text(ctx, 'antar ke sini!', windowStation.x + windowStation.w / 2, windowStation.y + 62, 12, '#ffffff', 'bold', 'center');
  }
}

// ---------------------------------------------------------------------------
// Chef
// ---------------------------------------------------------------------------
function drawChef(ctx, world) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(chef.bob) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(chef.x, chef.y + 20, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(chef.x, chef.y + bob * 0.4);
  // Body: teal shirt, white apron.
  ctx.fillStyle = '#2a9d8f';
  ctx.beginPath();
  ctx.ellipse(0, 6, 20, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 10, 15, 15, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.lineTo(8, -2);
  ctx.stroke();
  // Head and chef hat.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -22, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-9, -32, 8, 0, Math.PI * 2);
  ctx.arc(0, -36, 9, 0, Math.PI * 2);
  ctx.arc(9, -32, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-14, -34, 28, 6);
  // Face.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-5 + chef.facing * 2, -22, 1.8, 0, Math.PI * 2);
  ctx.arc(5 + chef.facing * 2, -22, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(chef.facing * 2, -17, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Arms.
  ctx.strokeStyle = '#2a9d8f';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const swing = chef.moving ? Math.sin(chef.bob) * 6 : 0;
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.lineTo(-24, 12 + swing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, 2);
  ctx.lineTo(24, 12 - swing);
  ctx.stroke();
  ctx.restore();

  // Carried ingredients above the head; a finished plate is carried high.
  if (world.carryingPlate) {
    drawPlate(ctx, chef.x, chef.y - 58, 26, world.carryingPlate);
    const recipe = recipeForPlate(world.carryingPlate);
    if (recipe) text(ctx, recipe.name, chef.x, chef.y - 88, 13, '#1d7a6e', 'bold', 'center');
  } else if (world.hands.length > 0) {
    world.hands.forEach((item, i) => {
      const offset = (i - (world.hands.length - 1) / 2) * 30;
      drawIngredientIcon(ctx, item.kind, item.state, chef.x + offset, chef.y - 56, 26);
    });
  }
}

// ---------------------------------------------------------------------------
// Order board (HUD)
// ---------------------------------------------------------------------------
function drawOrderTicket(ctx, order, x, y, w, h) {
  const recipe = recipeById(order.recipeId);
  const fraction = Math.max(0, order.patience / order.maxPatience);
  const urgent = fraction < 0.35;
  ctx.fillStyle = urgent && Math.floor(order.patience * 4) % 2 === 0 ? '#fff0f0' : '#fffaf0';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#e63946' : '#d9c48f';
  ctx.lineWidth = urgent ? 3 : 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  text(ctx, `#${order.orderNumber} ${recipe.name}`, x + 10, y + 15, 14, '#3a2a1a', 'bold');
  recipe.needs.forEach((need, i) => {
    drawIngredientIcon(ctx, need.kind, need.state, x + 24 + i * 44, y + 42, 30);
  });
  text(ctx, `${order.reward} koin`, x + w - 10, y + 42, 13, '#b45f2e', 'bold', 'right');
  // Patience bar.
  ctx.fillStyle = '#e8dcc0';
  roundRect(ctx, x + 10, y + h - 16, w - 20, 8, 4);
  ctx.fill();
  ctx.fillStyle = fraction > 0.55 ? '#57a639' : fraction > 0.3 ? '#ffb703' : '#e63946';
  roundRect(ctx, x + 10, y + h - 16, (w - 20) * fraction, 8, 4);
  ctx.fill();
  text(ctx, `${Math.ceil(order.patience)} dtk`, x + w - 10, y + h - 30, 11, urgent ? '#e63946' : '#7a6a4a', 'bold', 'right');
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, VIEW.width, HUD_HEIGHT);
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(0, HUD_HEIGHT - 8, VIEW.width, 8);

  // Score panel.
  ctx.fillStyle = '#2b1d12';
  roundRect(ctx, 10, 10, 168, 80, 10);
  ctx.fill();
  text(ctx, 'KOIN', 22, 26, 12, '#ffd166', 'bold');
  text(ctx, `${world.coins}`, 22, 52, 30, '#ffffff', 'bold');
  text(ctx, world.combo >= 2 ? `KOMBO x${world.combo}` : `Sajian: ${world.served}`, 22, 76, 12, world.combo >= 2 ? '#ff6b6b' : '#f3ddb0', 'bold');

  // Order tickets.
  const ticketW = 218;
  world.orders.forEach((order, i) => {
    drawOrderTicket(ctx, order, 190 + i * (ticketW + 8), 8, ticketW, 88);
  });
  if (world.orders.length === 0) {
    text(ctx, 'Belum ada pesanan…', 200, 50, 15, '#f3ddb0', 'bold');
  }

  // Shift timer.
  const rush = world.timeLeft <= RUSH_AT_SECONDS;
  ctx.fillStyle = rush && Math.floor(world.timeLeft * 2) % 2 === 0 ? '#5b1a1a' : '#2b1d12';
  roundRect(ctx, 1096, 10, 174, 80, 10);
  ctx.fill();
  text(ctx, rush ? 'RUSH! ⏱' : 'WAKTU SHIFT', 1183, 26, 12, rush ? '#ff6b6b' : '#ffd166', 'bold', 'center');
  const minutes = Math.floor(world.timeLeft / 60);
  const seconds = Math.floor(world.timeLeft % 60);
  text(ctx, `${minutes}:${String(seconds).padStart(2, '0')}`, 1183, 54, 30, rush ? '#ff8a80' : '#ffffff', 'bold', 'center');
  const shiftFraction = world.timeLeft / 150;
  ctx.fillStyle = '#4a3220';
  roundRect(ctx, 1106, 76, 154, 6, 3);
  ctx.fill();
  ctx.fillStyle = rush ? '#e63946' : '#2a9d8f';
  roundRect(ctx, 1106, 76, 154 * shiftFraction, 6, 3);
  ctx.fill();
}

function drawHint(ctx, world) {
  const station = nearestStation(world);
  let hint = 'WASD jalan • E beraksi • klik stasiun untuk jalan otomatis';
  if (station) {
    if (station.kind === 'bin') hint = `E: ambil ${INGREDIENTS[station.ingredient].label}  (tangan: ${world.hands.length}/3)`;
    else if (station.kind === 'board') hint = world.board.item ? (world.board.done ? 'E: ambil hasil cincangan' : 'Mencincang… sabar!') : 'E: taruh bahan untuk dicincang';
    else if (station.kind === 'stove') hint = 'E: taruh bahan untuk dimasak / ambil yang matang';
    else if (station.kind === 'plating') hint = world.plate.length > 0 && recipeForPlate(world.plate) ? 'E: angkat piring, antar ke Jendela Saji!' : 'E: taruh bahan di piring';
    else if (station.kind === 'serving') hint = world.carryingPlate ? 'E: SAJIKAN!' : 'Bawa piring yang sudah lengkap ke sini';
    else if (station.kind === 'trash') hint = 'E: buang bahan / piring';
  }
  ctx.fillStyle = 'rgba(43,29,18,0.85)';
  roundRect(ctx, 330, 688, 620, 26, 13);
  ctx.fill();
  text(ctx, hint, 640, 701, 13, '#ffe9b8', 'bold', 'center');
}

function drawParticles(ctx, world) {
  for (const particle of world.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * (particle.life / particle.maxLife), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloats(ctx, world) {
  for (const float of world.floats) {
    ctx.globalAlpha = Math.min(1, float.life);
    text(ctx, float.text, float.x, float.y, 18, float.color, 'bold', 'center');
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(36,26,18,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#fff6e0';
  roundRect(ctx, 240, 90, 800, 540, 20);
  ctx.fill();
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 5;
  roundRect(ctx, 240, 90, 800, 540, 20);
  ctx.stroke();
  text(ctx, 'DAPUR KILAT', 640, 160, 64, '#e63946', 'bold', 'center');
  text(ctx, 'Warung Cepat Saji — masak, racik, sajikan sebelum pelanggan kabur!', 640, 205, 18, '#5b3a1e', 'bold', 'center');
  const lines = [
    '1. Ambil bahan dari rak (E / klik), cincang di TALENAN, masak di KOMPOR.',
    '2. Rakit hidangan di MEJA RACIK sesuai resep di papan pesanan.',
    '3. Angkat piring yang lengkap, antar ke JENDELA SAJI sebelum timer habis.',
    '4. Jangan biarkan masakan gosong di kompor — buang ke SAMPAH!',
    '5. Sajikan beruntun untuk KOMBO. 30 detik terakhir: RUSH, pesanan deras!',
  ];
  lines.forEach((line, i) => text(ctx, line, 640, 255 + i * 30, 16, '#3a2a1a', 'bold', 'center'));
  text(ctx, 'MENU HARI INI', 640, 425, 15, '#b45f2e', 'bold', 'center');
  const menu = ['Nasi Goreng Kilat', 'Mie Ayam Geprek', 'Ayam Geprek Nasi', 'Mie Pedas Sayur', 'Nasi Telur Dadar'];
  menu.forEach((name, i) => {
    const x = 340 + i * 150;
    text(ctx, name, x, 455, 12, '#3a2a1a', 'bold', 'center');
  });
  const blink = Math.floor(world.time * 2) % 2 === 0;
  if (blink) text(ctx, 'Tekan ENTER atau KLIK untuk mulai shift ▶', 640, 520, 20, '#e63946', 'bold', 'center');
  if (world.best > 0) text(ctx, `Rekor koinmu: ${world.best}`, 640, 560, 15, '#5b3a1e', 'bold', 'center');
  text(ctx, 'Game original — dibuat dari nol untuk make.fun', 640, 600, 12, '#9a8a6a', 'bold', 'center');
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(36,26,18,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#fff6e0';
  roundRect(ctx, 340, 110, 600, 500, 20);
  ctx.fill();
  ctx.strokeStyle = '#2a9d8f';
  ctx.lineWidth = 5;
  roundRect(ctx, 340, 110, 600, 500, 20);
  ctx.stroke();
  text(ctx, 'SHIFT SELESAI!', 640, 165, 44, '#2a9d8f', 'bold', 'center');
  const stars = starsForScore(world.coins);
  for (let i = 0; i < 3; i += 1) {
    drawStar(ctx, 560 + i * 80, 225, 30, i < stars ? '#ffb703' : '#d8c9a3');
  }
  text(ctx, `${world.coins} koin`, 640, 295, 40, '#3a2a1a', 'bold', 'center');
  const stats = [
    `Hidangan disajikan: ${world.served}`,
    `Pesanan hangus: ${world.lost}`,
    `Kombo terbaik: x${Math.max(1, world.bestCombo)}`,
    `Rekor: ${world.best} koin`,
  ];
  stats.forEach((line, i) => text(ctx, line, 640, 350 + i * 30, 17, '#5b3a1e', 'bold', 'center'));
  const verdict = stars === 3 ? 'Koki Kilat! Warungmu legendaris!' : stars === 2 ? 'Hebat! Pelanggan pulang kenyang.' : stars === 1 ? 'Lumayan — besok masak lebih cepat!' : 'Dapurmu masih berantakan… coba lagi!';
  text(ctx, verdict, 640, 500, 17, '#e63946', 'bold', 'center');
  const blink = Math.floor(world.time * 2) % 2 === 0;
  if (blink) text(ctx, 'Tekan R untuk shift baru', 640, 550, 18, '#2a9d8f', 'bold', 'center');
}

function drawStar(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawScene(ctx, world) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawFloor(ctx);
  drawBins(ctx, world);
  drawBoard(ctx, world);
  drawStove(ctx, world);
  drawPlating(ctx, world);
  drawServing(ctx, world);
  drawChef(ctx, world);
  drawParticles(ctx, world);
  drawFloats(ctx, world);
  drawHud(ctx, world);
  if (world.screen === SCREEN_PLAY) drawHint(ctx, world);
  if (world.screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (world.screen === SCREEN_OVER) drawGameOver(ctx, world);
  // Rush banner, on a pill so it never collides with the bins.
  if (world.screen === SCREEN_PLAY && world.timeLeft <= RUSH_AT_SECONDS && world.timeLeft > 0) {
    const pulse = 0.7 + Math.sin(world.time * 8) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = 'rgba(43,29,18,0.88)';
    roundRect(ctx, 440, 238, 400, 40, 20);
    ctx.fill();
    text(ctx, '⚡ RUSH! PESANAN DERAS! ⚡', 640, 258, 24, '#ffb703', 'bold', 'center');
    ctx.globalAlpha = 1;
  }
}

export { drawIngredientIcon as drawFoodIcon, prepResult };
