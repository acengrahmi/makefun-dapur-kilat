[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/acengrahmi/makefun-dapur-kilat/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/acengrahmi/makefun-dapur-kilat/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

# Dapur Kilat — Warung Cepat Saji

An original cooking game for make.fun `best-cooking-game-20261125-0137`, built from scratch in plain HTML5 Canvas + ES modules. No libraries, no network, no build step — `game/index.html` opens in desktop Chrome and plays offline.

## The game

You run a fast-food warung, "Dapur Kilat", for one 150-second shift. Orders appear on the order board; take ingredients from the racks, chop them on the cutting board, cook them on the two-burner stove (leave them too long and they burn), assemble dishes at the prep table following each recipe, and serve complete plates at the serving window before the customer's patience runs out.

- **Ingredients:** 6 (nasi, mie, telur, ayam, sayur, sambal) — **recipes:** 5, each 3 components.
- **Controls:** WASD / arrows to move, E to interact, mouse click on a station to walk there and act automatically, P to pause, M to mute, R to restart.
- **Complete loop:** title screen → 150-second shift with escalating orders → combo bonuses for consecutive serves → RUSH in the last 30 seconds → end-of-shift results with coins, dishes served, and stars.
- **Sounds:** WebAudio effects, all synthesized in code. All art is drawn on canvas — zero external assets.

## Play it

Open `game/index.html` in desktop Chrome. No server needed (or run `npx serve game/`).

## Build

`main.ts` (Node 22) generates the entry dossier from the game sources. No build step for the game itself.
