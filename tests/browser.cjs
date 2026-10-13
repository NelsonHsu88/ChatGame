const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (require("node:fs").existsSync("/usr/bin/chromium")
        ? "/usr/bin/chromium"
        : undefined),
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await page.getByRole("button", { name: "DEPLOY SQUAD" }).waitFor();
  await page.getByRole("button", { name: "DEPLOY SQUAD" }).click();
  await page.waitForTimeout(1500);
  await page.keyboard.down("a");
  await page.waitForTimeout(300);
  await page.keyboard.up("a");
  const moved = await page.evaluate(
    async () => (await import(performance.getEntriesByType("resource").find(r=>new URL(r.name).pathname==="/src/App.tsx").name)).engine.x,
  );
  if (moved >= 0)
    throw new Error("Keyboard movement did not reposition the squad");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "RESUME OPERATION" }).waitFor();
  await page.getByRole("button", { name: "RESUME OPERATION" }).click();
  const checks = await page.evaluate(async () => {
    const { Engine } = await import("/src/engine.ts");
    const { useGame } = await import("/src/store.ts");
    const e = new Engine();
    const results = [];
    const assert = (condition, name) => {
      if (!condition) throw Error(name);
      results.push(name);
    };
    const clean = () => {
      for (const t of [...e.targets]) e.remove(t);
      for (const b of e.bullets) b.active = false;
    };
    e.start();
    clean();
    e.enemyClock = 100;
    e.event = 10;
    e.fireClock = 100;
    const zombie = e.spawn("enemy", 0, 0, 0);
    e.fire(0, 1, 0);
    e.update(0.04);
    assert(zombie.hp === 20, "moving projectile damages enemy");
    e.fire(0, 1, 0);
    e.fire(0, 1, 0);
    e.update(0.04);
    assert(
      !e.targets.includes(zombie) && e.kills === 1 && e.totalXP === 10,
      "enemy death awards XP",
    );
    const crate = e.spawn("crate", 0, 0, 2, "SMG");
    e.fire(0, 1, 0);
    e.update(0.04);
    assert(crate.hp === 1, "crate decrements by one per hit");
    e.fire(0, 1, 0);
    e.update(0.04);
    assert(
      e.weapon === "SMG" && !e.targets.includes(crate),
      "crate equips weapon",
    );
    const barrier = e.spawn("barrier", 0, 0, -2);
    e.fire(0, 1, 0);
    e.update(0.04);
    assert(barrier.value === -1, "barrier value increments");
    e.setArmy(5);
    barrier.z = 7.5;
    e.update(0.04);
    assert(e.army.length === 4, "negative barrier removes soldiers");
    const gate = e.spawn("gate", 0, 7.5, 3);
    e.update(0.04);
    assert(e.army.length === 12, "gate creates actual soldiers");
    e.fireClock = 0;
    e.update(0.04);
    assert(
      e.bullets.filter((b) => b.active).length >= 12,
      "every soldier fires a projectile",
    );
    assert(
      e.bullets.filter((b) => b.active).every((b) => b.vx === 0),
      "all soldiers shoot straight ahead",
    );
    const walking = e.army[0].children[3].rotation.x;
    e.update(0.04);
    assert(
      e.army[0].children[3].rotation.x !== walking,
      "army legs animate while marching",
    );
    clean();
    e.fireClock = 100;
    const untouched = e.army.filter((g) => Math.abs(g.position.x) > 1.02);
    const slots = untouched.map((g) => [g, g.position.x, g.position.z]);
    const roadblock = e.spawn("obstacle", 0, 7.5);
    e.update(0.04);
    assert(
      e.army.length === 9,
      "roadblock kills only contacted soldiers in the first row",
    );
    for (let i = 0; i < 6; i++) e.update(0.04);
    assert(e.army.length === 6, "roadblock sweeps through the back rows too");
    assert(
      slots.every(
        ([g, x, z]) =>
          e.army.includes(g) && g.position.x === x && g.position.z === z,
      ),
      "untouched soldiers keep their formation slots",
    );
    e.remove(roadblock);
    e.setArmy(12);
    e.spawn("obstacle", -4, 7.5);
    e.update(0.04);
    assert(
      e.army.length === 12,
      "dodged obstacle does not kill distant soldiers",
    );
    clean();
    e.fireClock = 100;
    const split = e.spawn("split", 0, 0, 2);
    e.fire(0, 1, 0);
    e.update(0.04);
    assert(
      e.bullets.filter((b) => b.active).length === 2,
      "bullet gate duplicates projectile",
    );
    clean();
    e.setArmy(8);
    const armored = e.spawn("enemy", 0, 0, 2);
    const basic = e.spawn("enemy", 0, -2, 0);
    e.fire(0, 1, 0, "Laser");
    e.update(0.04);
    e.update(0.04);
    assert(armored.hp < 70 && basic.hp < 30, "laser pierces multiple enemies");
    clean();
    const a = e.spawn("enemy", 0, 0, 0),
      b = e.spawn("enemy", 2, 0, 0);
    e.fire(0, 1, 0, "Rocket");
    e.update(0.04);
    assert(
      !e.targets.includes(a) && !e.targets.includes(b),
      "rocket splash kills nearby enemies",
    );
    e.addXP(100);
    assert(
      useGame.getState().mode === "upgrade" && e.choices.length === 3,
      "XP opens three upgrade choices",
    );
    const damage = e.damage;
    e.choose("damage");
    assert(
      e.damage > damage && useGame.getState().mode === "playing",
      "selected upgrade changes stats and resumes",
    );
    clean();
    e.bossSpawned = true;
    const boss = e.spawn("boss", 0, 0);
    boss.age = 4;
    e.damageTarget(boss, 4000);
    assert(
      useGame.getState().mode === "victory" && e.bossHP === 0,
      "boss defeat triggers victory and rewards",
    );
    e.start();
    clean();
    e.setArmy(1);
    e.spawn("enemy", 0, 7.5, 0);
    e.update(0.04);
    assert(
      useGame.getState().mode === "defeat",
      "enemy contact triggers defeat",
    );
    e.start();
    assert(
      useGame.getState().mode === "playing" &&
        e.weapon === "Rifle" &&
        e.kills === 0,
      "restart resets run",
    );
    clean();
    e.event = 10;
    e.enemyClock = 100;
    const z = e.spawn("enemy", 0, -10);
    useGame.getState().setMode("paused");
    const before = z.z;
    e.update(0.04);
    assert(z.z === before, "pause freezes simulation");
    e.dispose();
    useGame.getState().setMode("menu");
    return results;
  });
  console.log(JSON.stringify({ checks, errors }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "DEPLOY SQUAD" }).click();
  const touchSession = await page.context().newCDPSession(page);
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 60, y: 460 }],
  });
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 90, y: 460 }],
  });
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const touched = await page.evaluate(
    async () => (await import(performance.getEntriesByType("resource").find(r=>new URL(r.name).pathname==="/src/App.tsx").name)).engine.x,
  );
  if (touched >= 0)
    throw new Error("Touch movement did not reposition the squad");
  const progression = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("horde-rush-v1")),
  );
  await page.reload();
  const restored = await page.evaluate(
    async () => (await import("/src/store.ts")).useGame.getState().save,
  );
  if (
    restored.coins !== progression.coins ||
    restored.best !== progression.best
  )
    throw new Error("Progression failed to persist across reload");
  console.log(
    "Keyboard movement, mobile pointer movement, and persistent progression passed",
  );
  await browser.close();
  if (errors.length) process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
