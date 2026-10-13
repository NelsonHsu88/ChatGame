import { test } from "node:test";
import assert from "node:assert/strict";
import {
  barrierArmy,
  multipliedArmy,
  segmentHit,
  CONFIG,
  WEAPONS,
} from "./config";
test("barriers apply their exact signed value and can eliminate the army", () => {
  assert.equal(barrierArmy(8, -3), 5);
  assert.equal(barrierArmy(2, -10), 0);
  assert.equal(barrierArmy(3, 5), 8);
  assert.equal(barrierArmy(46, 10), CONFIG.maxArmy);
});
test("gates multiply the army with a performance cap", () => {
  assert.equal(multipliedArmy(3, 2), 6);
  assert.equal(multipliedArmy(6, 3), 18);
  assert.equal(multipliedArmy(18, 5), 48);
  assert.equal(multipliedArmy(0, 3), 0);
});
test("swept projectile collision catches targets between frames", () => {
  assert.equal(segmentHit(0, 8, 0, -4, 0, 1, 0.5), true);
  assert.equal(segmentHit(0, 8, 0, -4, 2, 1, 0.5), false);
  assert.equal(segmentHit(-2, 8, 2, -8, 0, 0, 0.5), true);
  assert.equal(segmentHit(0, 0, 0, 0, 0, 0, 0.5), true);
});
test("weapon unlocks meaningfully change combat", () => {
  assert.ok(WEAPONS.Minigun.rate > WEAPONS.Rifle.rate * 2);
  assert.equal(WEAPONS.Shotgun.pellets, 5);
  assert.ok(WEAPONS.Rocket.damage > WEAPONS.Rifle.damage * 5);
});
