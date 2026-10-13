# Horde Rush — Bridge Division

A playable 3D arcade shooter built with React, TypeScript, Vite, React Three Fiber, Three.js, and Zustand. Models, effects, and audio are procedural; fonts ship locally. No API keys, database, or external assets are required.

## Run

Use Node.js 22 or newer and npm:

```sh
npm ci
npm run dev
```

Open the development address printed by Vite in a local browser. `npm run build` produces a static `dist/` directory; `npm run preview` serves that production build. Publish `dist/` to any static hosting provider.

## Controls

- A/D or left/right arrows move the squad. Every soldier fires straight forward from their own rifle.
- Drag with mouse or touch to reposition the squad and line up shots. Shooting is automatic.
- Space, Escape, or the pause button pauses. Losing focus also pauses.
- Settings controls sound volume and mute. Sound starts after deployment.

## Field manual

Red bridge roadblocks kill only the soldiers they physically touch, row by row. Surviving soldiers keep their slots, leaving visible gaps; recruits fill those gaps. Roadblocks stop bullets and cannot be destroyed. Dodge them by moving the squad. Soldiers march with alternating leg movements while the bridge scrolls.

Enemy contact removes soldiers within your formation. Fast, armored, and tank enemies appear in later waves. Every soldier fires real projectiles, up to a 48-soldier cap.

Shoot weapon crates until their counters reach zero to equip SMG, minigun, shotgun, piercing laser, or explosive rockets. Other crates give recruits, shield, XP, damage, or fire rate. Bullets increase red barriers by exactly one; crossing applies the remaining signed value. Green gates multiply the actual army or add recruits. Purple gates duplicate passing bullets once. Explosive barrels damage nearby enemies.

Eliminations award XP. Level-ups pause the action for a choice of three randomized upgrades. Survive five escalating waves to face the Colossus: slam, charge, summons, and an armored phase. Its entrance has three seconds of defensive armor. Victory unlocks the next, harder sector. Both victory and defeat award coins. The armory sells up to five permanent starting soldiers. Coins, training, best sector, and sound preferences are saved in browser localStorage.

## Validation

```sh
npm test
npm run build
# With the development server running in another terminal:
npm run test:browser
```

Browser checks use Playwright and `/usr/bin/chromium` when installed. Otherwise run `npx playwright install chromium` first, or set `CHROMIUM_PATH` to a compatible executable. `TEST_URL` overrides the default test server address. The suite checks desktop rendering and pause/resume, real projectile collisions, XP, weapon unlocks, barrier counters, army multiplication and firing, bullet splitting, piercing, splash, upgrades, boss victory, defeat, restart, and pausing. It fails on browser exceptions.

A full deterministic simulated sector was also exercised during development, including natural projectile damage to the boss. Mobile layout and touch input were checked in Chromium emulation; physical mobile devices and sustained 60 FPS across devices have not been benchmarked.

## Code map

- `src/config.ts`: balance, weapons, upgrades, swept collision helpers.
- `src/engine.ts`: army, projectile/effect pools, enemies, encounters, interactables, progression, and boss simulation.
- `src/Scene.tsx`: Three.js rendering, lights, responsive camera, fixed-size simulation steps, desktop/touch controls, focus pausing.
- `src/store.ts`: menu state and safe persistent progression.
- `src/audio.ts`: rate-limited synthesized arcade sound.
- `src/App.tsx` / `src/style.css`: responsive menus, HUD, settings, upgrades, and debrief.

Projectiles and particles use instanced rendering and fixed pools. Soldier models share low-poly geometry and materials. Simulation uses delta time with substeps and swept collision to avoid tunneling at high fire rates. Rendering requires WebGL; no expensive general-purpose physics engine is used.
