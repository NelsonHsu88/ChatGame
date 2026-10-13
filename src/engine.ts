import * as T from "three";
import {
  CONFIG,
  WEAPONS,
  barrierArmy,
  multipliedArmy,
  segmentHit,
  type Weapon,
  UPGRADES,
} from "./config";
import { useGame } from "./store";
import { AudioSystem } from "./audio";
type Kind =
  | "enemy"
  | "crate"
  | "barrier"
  | "gate"
  | "split"
  | "barrel"
  | "boss"
  | "obstacle";
export type Target = {
  id: number;
  kind: Kind;
  x: number;
  z: number;
  hp: number;
  max: number;
  value: number;
  variant: number;
  reward: string;
  group: T.Group;
  label?: T.Sprite;
  lastLabel?: string;
  hit: number;
  age: number;
  attack: number;
  phase: number;
};
type Bullet = {
  active: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  weapon: Weapon;
  life: number;
  split: boolean;
  hits: Set<number>;
};
type Particle = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  color: T.Color;
};
const mat = (color: number) =>
  new T.MeshStandardMaterial({ color, roughness: 0.7 });
const blue = mat(0x238cfa),
  red = mat(0xf04d50),
  skin = mat(0xffc59b),
  dark = mat(0x263648),
  helmetBlue = mat(0x75c9ff),
  helmetRed = mat(0xff8580),
  wood = mat(0xa26b42);
const box = new T.BoxGeometry(1, 1, 1),
  sphere = new T.SphereGeometry(1, 8, 6);
function piece(
  g: T.Group,
  geo: T.BufferGeometry,
  m: T.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const a = new T.Mesh(geo, m);
  a.position.set(x, y, z);
  a.scale.set(sx, sy, sz);
  a.castShadow = true;
  a.receiveShadow = true;
  g.add(a);
  return a;
}
function soldier(friendly: boolean, scale = 1) {
  const g = new T.Group();
  piece(g, box, friendly ? blue : red, 0, 0.85, 0, 0.52, 0.65, 0.35);
  piece(g, sphere, skin, 0, 1.42, 0, 0.24, 0.25, 0.24);
  piece(
    g,
    sphere,
    friendly ? helmetBlue : helmetRed,
    0,
    1.56,
    0.03,
    0.27,
    0.18,
    0.27,
  );
  piece(g, box, dark, -0.16, 0.27, 0, 0.19, 0.55, 0.24);
  piece(g, box, dark, 0.16, 0.27, 0, 0.19, 0.55, 0.24);
  piece(g, box, friendly ? blue : red, -0.33, 0.83, -0.15, 0.18, 0.38, 0.2);
  piece(g, box, friendly ? blue : red, 0.33, 0.83, -0.15, 0.18, 0.38, 0.2);
  piece(g, box, dark, 0.22, 0.94, -0.47, 0.13, 0.16, 0.75);
  const flash = piece(
    g,
    sphere,
    new T.MeshBasicMaterial({ color: 0xffdf76 }),
    0.22,
    0.94,
    -0.87,
    0.17,
    0.17,
    0.25,
  );
  flash.visible = false;
  g.scale.setScalar(scale);
  return g;
}
function label(text: string, color = "#ffffff") {
  const c = document.createElement("canvas");
  c.width = 384;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#142332eb";
  ctx.beginPath();
  ctx.roundRect(12, 12, 360, 136, 30);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "bold 57px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 192, 80);
  const tx = new T.CanvasTexture(c);
  const s = new T.Sprite(new T.SpriteMaterial({ map: tx, depthTest: false }));
  s.scale.set(2.6, 1.08, 1);
  return s;
}
function removeLabel(s: T.Sprite) {
  (s.material as T.SpriteMaterial).map?.dispose();
  s.material.dispose();
}
export class Engine {
  scene = new T.Group();
  targets: Target[] = [];
  army: T.Group[] = [];
  bullets: Bullet[] = Array.from({ length: 1600 }, () => ({
    active: false,
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    damage: 0,
    weapon: "Rifle",
    life: 0,
    split: false,
    hits: new Set(),
  }));
  particles: Particle[] = Array.from({ length: 500 }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    max: 0,
    color: new T.Color(),
  }));
  bulletMesh = new T.InstancedMesh(
    new T.BoxGeometry(0.07, 0.07, 0.65),
    new T.MeshBasicMaterial({ color: 0xffec9b }),
    1600,
  );
  particleMesh = new T.InstancedMesh(
    new T.BoxGeometry(0.12, 0.12, 0.12),
    new T.MeshBasicMaterial(),
    500,
  );
  floating: { sprite: T.Sprite; life: number }[] = [];
  dummy = new T.Object3D();
  audio = new AudioSystem();
  lines: T.Mesh[] = [];
  scenery: T.Group[] = [];
  id = 0;
  x = 0;
  aim = 0;
  keys = new Set<string>();
  drag = false;
  time = 0;
  visualTime = 0;
  level = 1;
  xp = 0;
  totalXP = 0;
  xpLevel = 1;
  threshold = CONFIG.firstXP;
  kills = 0;
  peak = 1;
  earned = 0;
  weapon: Weapon = "Rifle";
  rate = 1;
  damage = 1;
  crit = 0;
  move = 1;
  extra = 0;
  shield = 0;
  fireClock = 0;
  enemyClock = 0;
  event = 0;
  bossSpawned = false;
  bossHP = 0;
  bossMax = 0;
  choices = UPGRADES.slice(0, 3);
  toast = "";
  toastTime = 0;
  shake = 0;
  bossWarning = "";
  constructor() {
    this.scene.add(this.bulletMesh, this.particleMesh);
    this.bulletMesh.frustumCulled = false;
    this.particleMesh.frustumCulled = false;
    // Suspension bridge: red steel, pale asphalt, and blue water.
    piece(this.scene, box, mat(0x5ba7cd), 0, -2, -28, 180, 0.3, 180);
    piece(this.scene, box, mat(0x8e929b), 0, -0.1, -28, 12, 0.22, 140);
    const steel = mat(0xb94235),
      rail = mat(0xe16149),
      white = mat(0xf5eee1);
    for (const side of [-1, 1]) {
      piece(this.scene, box, white, side * 5.8, 0.025, -28, 0.12, 0.025, 140);
      piece(this.scene, box, steel, side * 6.2, 0.55, -28, 0.16, 0.18, 140);
      piece(this.scene, box, rail, side * 6.2, 1.2, -28, 0.12, 0.12, 140);
      for (let z = -80; z < 20; z += 3)
        piece(this.scene, box, steel, side * 6.2, 0.6, z, 0.12, 1.2, 0.12);
      for (let z = -70; z < 20; z += 25) {
        const tower = new T.Group();
        tower.position.set(side * 6.5, 0, z);
        piece(tower, box, steel, 0, 4.5, 0, 0.6, 9, 0.65);
        piece(tower, box, rail, 0, 5.8, 0, 0.8, 0.2, 0.85);
        const cable = piece(tower, box, rail, 0, 4.5, -5, 0.12, 0.12, 16);
        cable.rotation.x = 0.48;
        this.scene.add(tower);
        this.scenery.push(tower);
      }
    }
    for (let z = -80; z < 20; z += 6)
      this.lines.push(
        piece(this.scene, box, white, 0, 0.023, z, 0.12, 0.025, 2.6),
      );
    this.setArmy(1);
    this.spawn("enemy", -1, -18, 0);
    this.spawn("enemy", 1, -22, 0);
    this.spawn("gate", -3, -31, 2);
    this.spawn("crate", 3, -36, 16, "SMG");
    this.renderPools();
  }
  float(text: string, x: number, z: number, color = "#fff1bb") {
    if (this.floating.length >= 24) return;
    const sprite = label(text, color);
    sprite.scale.set(1.2, 0.5, 1);
    sprite.position.set(x, 2, z);
    this.scene.add(sprite);
    this.floating.push({ sprite, life: 0.7 });
  }
  notify(text: string) {
    this.toast = text;
    this.toastTime = 3;
  }
  setArmy(count: number) {
    count = Math.min(CONFIG.maxArmy, Math.max(0, count));
    while (this.army.length < count) {
      const g = soldier(true);
      const used = new Set(this.army.map((a) => a.userData.slot as number));
      let slot = 0;
      while (used.has(slot)) slot++;
      g.userData.slot = slot;
      this.scene.add(g);
      this.army.push(g);
    }
    while (this.army.length > count)
      this.removeSoldier(this.army[this.army.length - 1]);
    this.placeArmy();
    this.peak = Math.max(this.peak, count);
  }
  removeSoldier(g: T.Group) {
    this.burst(g.position.x, g.position.z, 0x75c9ff, 12);
    this.scene.remove(g);
    ((g.children[8] as T.Mesh).material as T.Material).dispose();
    this.army = this.army.filter((a) => a !== g);
  }
  placeArmy() {
    const columns = [0, -0.65, 0.65, -1.3, 1.3, 1.95];
    for (const g of this.army) {
      const slot = g.userData.slot as number;
      g.position.set(
        this.x + columns[slot % 6],
        0,
        CONFIG.playerZ + Math.floor(slot / 6) * 0.8,
      );
    }
  }
  start(level = 1) {
    for (const t of [...this.targets]) this.remove(t);
    for (const f of this.floating) {
      this.scene.remove(f.sprite);
      removeLabel(f.sprite);
    }
    this.floating = [];
    this.time = 0;
    this.level = level;
    this.x = 0;
    this.aim = 0;
    this.xp = 0;
    this.totalXP = 0;
    this.xpLevel = 1;
    this.threshold = CONFIG.firstXP;
    this.kills = 0;
    this.peak = 1;
    this.earned = 0;
    this.weapon = "Rifle";
    this.rate = 1;
    this.damage = 1;
    this.crit = 0;
    this.move = 1;
    this.extra = 0;
    this.shield = 0;
    this.fireClock = 0;
    this.enemyClock = 1;
    this.event = 0;
    this.bossSpawned = false;
    this.bossHP = 0;
    this.bossMax = 0;
    this.bossWarning = "";
    for (const b of this.bullets) b.active = false;
    for (const p of this.particles) p.active = false;
    this.setArmy(0);
    this.setArmy(1 + useGame.getState().save.training);
    this.audio.unlock();
    useGame.getState().setMode("playing");
    this.notify("Move to line up shots. Dodge roadblocks.");
    this.spawn("enemy", -1, -20, 0);
    this.spawn("enemy", 1, -25, 0);
  }
  spawn(kind: Kind, x: number, z: number, value = 0, reward = ""): Target {
    const g =
      kind === "enemy" || kind === "boss"
        ? soldier(
            false,
            kind === "boss"
              ? 3.6
              : value === 3
                ? 1.55
                : value === 2
                  ? 1.2
                  : 0.95,
          )
        : new T.Group();
    const hp =
      kind === "boss"
        ? CONFIG.bossHP * (1 + (this.level - 1) * 0.4)
        : kind === "enemy"
          ? [30, 20, 70, 140][value] * (1 + (this.level - 1) * 0.15)
          : value;
    const t: Target = {
      id: ++this.id,
      kind,
      x,
      z,
      hp,
      max: hp,
      value,
      variant: value,
      reward,
      group: g,
      hit: 0,
      age: 0,
      attack: 0,
      phase: 0,
    };
    if (kind === "enemy" && value === 2)
      piece(g, box, dark, 0, 0.88, -0.21, 0.58, 0.55, 0.16);
    if (kind === "obstacle") {
      const concrete = mat(0x596271),
        warning = mat(0xffc546);
      piece(g, box, concrete, 0, 0.55, 0, 1.6, 1.1, 0.9);
      for (let i = -2; i <= 2; i++) {
        const stripe = piece(
          g,
          box,
          warning,
          i * 0.3,
          0.65,
          -0.46,
          0.16,
          0.65,
          0.025,
        );
        stripe.rotation.z = -0.4;
      }
      piece(g, box, red, -0.65, 1.2, 0, 0.12, 0.22, 0.15);
      piece(g, box, red, 0.65, 1.2, 0, 0.12, 0.22, 0.15);
    }
    if (kind === "crate" || kind === "barrel") {
      piece(g, box, wood, 0, 0.65, 0, 1.5, 1.3, 1.2);
      piece(g, box, dark, 0, 0.65, -0.63, 1.55, 0.12, 0.05);
      piece(g, box, dark, 0, 0.65, 0.63, 1.55, 0.12, 0.05);
      if (kind === "crate") piece(g, box, blue, 0, 1.45, 0, 0.9, 0.25, 0.4);
    }
    if (kind === "gate" || kind === "split" || kind === "barrier") {
      const m = mat(
        kind === "barrier" ? 0xf65865 : kind === "split" ? 0xad82ff : 0x4de9c2,
      );
      piece(g, box, m, -1.55, 1, 0, 0.16, 2, 0.18);
      piece(g, box, m, 1.55, 1, 0, 0.16, 2, 0.18);
      piece(g, box, m, 0, 2, 0, 3.25, 0.16, 0.18);
      const panel = new T.Mesh(
        box,
        new T.MeshStandardMaterial({
          color: m.color,
          transparent: true,
          opacity: 0.22,
          roughness: 0.3,
        }),
      );
      panel.scale.set(3, 1.8, 0.12);
      panel.position.y = 1;
      g.add(panel);
    }
    if (kind === "boss") {
      piece(g, box, dark, 0, 0.9, -0.23, 0.62, 0.65, 0.15);
      this.bossHP = hp;
      this.bossMax = hp;
    }
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.targets.push(t);
    this.updateLabel(t);
    return t;
  }
  updateLabel(t: Target) {
    let txt =
      t.kind === "enemy" || t.kind === "obstacle"
        ? ""
        : t.kind === "boss"
          ? "THE COLOSSUS"
          : t.kind === "barrier"
            ? (t.value > 0 ? "+" : "") + t.value
            : t.kind === "gate"
              ? t.reward === "add"
                ? "+" + t.value
                : "×" + t.value
              : t.kind === "split"
                ? "BULLETS ×2"
                : t.reward + " · " + Math.max(0, Math.ceil(t.hp));
    if (!txt || t.lastLabel === txt) return;
    if (t.label) {
      t.group.remove(t.label);
      removeLabel(t.label);
    }
    const color =
      t.kind === "barrier"
        ? t.value < 0
          ? "#ff8b96"
          : t.value === 0
            ? "#ffffff"
            : "#7fffd3"
        : t.kind === "gate"
          ? "#7fffd3"
          : t.kind === "split"
            ? "#d0b6ff"
            : "#fff1bb";
    t.label = label(txt, color);
    t.label.position.y =
      t.kind === "boss"
        ? 2.3
        : t.kind === "gate" || t.kind === "barrier" || t.kind === "split"
          ? 2.7
          : 2.4;
    if (t.kind === "boss") t.label.scale.set(1.9, 0.8, 1);
    t.group.add(t.label);
    t.lastLabel = txt;
  }
  remove(t: Target) {
    this.scene.remove(t.group);
    if (t.label) removeLabel(t.label);
    t.group.traverse((o) => {
      if (o instanceof T.Mesh) {
        const m = o.material;
        if (
          !Array.isArray(m) &&
          ![blue, red, skin, dark, helmetBlue, helmetRed, wood].includes(
            m as T.MeshStandardMaterial,
          )
        )
          m.dispose();
      }
    });
    this.targets = this.targets.filter((a) => a !== t);
  }
  burst(x: number, z: number, color: number, count = 10) {
    for (let i = 0; i < count; i++) {
      const p = this.particles.find((a) => !a.active);
      if (!p) break;
      Object.assign(p, {
        active: true,
        x,
        y: 0.8,
        z,
        vx: (Math.random() - 0.5) * 5,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 5,
        life: 0.5 + Math.random() * 0.3,
      });
      p.max = p.life;
      p.color.setHex(color);
    }
  }
  addXP(n: number) {
    this.xp += n;
    this.totalXP += n;
    if (this.xp >= this.threshold && useGame.getState().mode === "playing") {
      this.xp -= this.threshold;
      this.xpLevel++;
      this.threshold = Math.round(this.threshold * 1.45);
      this.choices = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
      this.audio.play("reward");
      useGame.getState().setMode("upgrade");
    }
  }
  choose(id: string) {
    if (id === "rate") this.rate *= 1.15;
    if (id === "damage") this.damage *= 1.2;
    if (id === "recruit") this.setArmy(this.army.length + 3);
    if (id === "shield") this.shield += 5;
    if (id === "crit") this.crit = Math.min(0.8, this.crit + 0.2);
    if (id === "speed") this.move *= 1.2;
    if (id === "pellet") this.extra = Math.min(3, this.extra + 1);
    useGame.getState().setMode("playing");
    if (this.xp >= this.threshold) this.addXP(0);
  }
  hurt(n: number) {
    if (this.shield) {
      const blocked = Math.min(this.shield, n);
      this.shield -= blocked;
      n -= blocked;
    }
    if (n) {
      this.setArmy(this.army.length - n);
      this.shake = 0.25;
      this.burst(this.x, CONFIG.playerZ, 0x71c4ff, 15);
    }
    if (!this.army.length) this.finish(false);
  }
  finish(win: boolean) {
    if (
      useGame.getState().mode === "victory" ||
      useGame.getState().mode === "defeat"
    )
      return;
    this.earned = Math.round(this.kills * 2 + (win ? 100 * this.level : 20));
    const s = useGame.getState().save;
    useGame.getState().persist({
      coins: s.coins + this.earned,
      best: Math.max(s.best, win ? this.level + 1 : this.level),
    });
    this.audio.play(win ? "win" : "lose");
    useGame.getState().setMode(win ? "victory" : "defeat");
    if (win) this.burst(this.x, 4, 0xffd77e, 100);
  }
  fire(x: number, z: number, vx: number, weapon = this.weapon, split = false) {
    const b = this.bullets.find((a) => !a.active);
    if (!b) return;
    Object.assign(b, {
      active: true,
      x,
      z,
      vx,
      vz: -CONFIG.bulletSpeed,
      damage:
        WEAPONS[weapon].damage *
        this.damage *
        (Math.random() < this.crit ? 2 : 1),
      weapon,
      life: 1.8,
      split,
    });
    b.hits.clear();
  }
  hit(t: Target, b: Bullet) {
    t.hit = 0.12;
    if (t.kind === "gate") return;
    if (t.kind === "barrier") {
      t.value++;
      this.updateLabel(t);
      this.burst(b.x, b.z, t.value < 0 ? 0xff6875 : 0x58edc3, 2);
      return;
    }
    if (t.kind === "crate" || t.kind === "barrel") {
      t.hp--;
      this.updateLabel(t);
      if (t.hp <= 0) {
        this.burst(t.x, t.z, 0xffd07b, 25);
        this.audio.play("reward");
        if (t.kind === "barrel") {
          for (const e of [...this.targets])
            if (
              (e.kind === "enemy" || e.kind === "boss") &&
              Math.hypot(e.x - t.x, e.z - t.z) < 8
            )
              this.damageTarget(e, 200);
        } else if (t.reward === "RECRUIT") {
          this.setArmy(this.army.length + 5);
          this.notify("+5 reinforcements");
        } else if (t.reward === "SHIELD") {
          this.shield += 8;
          this.notify("Shield online");
        } else if (t.reward === "XP") {
          this.addXP(100);
          this.notify("+100 XP");
        } else if (t.reward === "DAMAGE") {
          this.damage *= 1.3;
          this.notify("Damage +30%");
        } else if (t.reward === "RAPID") {
          this.rate *= 1.3;
          this.notify("Fire rate +30%");
        } else {
          this.weapon = t.reward as Weapon;
          this.notify(this.weapon + " equipped");
        }
        this.remove(t);
      }
      return;
    }
    if (b.weapon === "Rocket") {
      this.burst(t.x, t.z, 0xff9949, 24);
      this.shake = 0.15;
      for (const e of [...this.targets])
        if (
          (e.kind === "enemy" || e.kind === "boss") &&
          Math.hypot(e.x - t.x, e.z - t.z) < 4
        )
          this.damageTarget(e, b.damage);
    } else this.damageTarget(t, b.damage);
  }
  damageTarget(t: Target, n: number) {
    if (!this.targets.includes(t)) return;
    if (t.hit <= 0) this.float(Math.round(n).toString(), t.x, t.z);
    t.hp -=
      n *
      (t.kind === "boss" && t.age < 3
        ? 0.1
        : t.kind === "boss" && t.phase === 3
          ? 0.28
          : 1);
    t.hit = 0.13;
    this.burst(t.x, t.z, 0xff7e71, 3);
    if (t.kind === "boss") this.bossHP = Math.max(0, t.hp);
    if (t.hp <= 0) {
      this.kills++;
      this.burst(t.x, t.z, 0xff675c, t.kind === "boss" ? 90 : 12);
      this.audio.play("hit");
      this.remove(t);
      if (t.kind === "boss") {
        this.totalXP += 500;
        this.finish(true);
      } else {
        const xp = [10, 15, 25, 40][t.variant];
        this.float("+" + xp + " XP", t.x, t.z, "#83eaff");
        this.addXP(xp);
      }
    }
  }
  encounters() {
    const times = [3, 10, 18, 27, 36, 45, 54, 62, 71, 78];
    if (this.event >= times.length || this.time < times[this.event]) return;
    const i = this.event++;
    const side = i % 2 ? -3 : 3;
    if (i >= 1) this.spawn("obstacle", i % 3 === 0 ? 0 : -side, -56);
    if (i === 0) {
      this.spawn("gate", -3, -38, 2);
      this.spawn("crate", 3, -45, 16, "SMG");
      this.notify("Green gates multiply your soldiers");
    }
    if (i === 1) {
      this.spawn("crate", side, -44, 16, "RECRUIT");
      this.spawn("barrier", -side, -48, -10);
    }
    if (i === 2) {
      this.spawn("crate", side, -42, 40, "Minigun");
      this.spawn("gate", -side, -48, 3);
    }
    if (i === 3) {
      this.spawn("split", side, -35, 2);
      this.spawn("crate", -side, -43, 20, "SHIELD");
    }
    if (i === 4) {
      this.spawn("crate", side, -42, 25, "Shotgun");
      this.spawn("gate", -side, -45, 5, "add");
    }
    if (i === 5) {
      this.spawn("barrier", side, -42, -20);
      this.spawn("crate", -side, -43, 20, "DAMAGE");
    }
    if (i === 6) {
      this.spawn("crate", side, -42, 32, "Laser");
      this.spawn("gate", -side, -45, 2);
    }
    if (i === 7) {
      this.spawn("barrel", 0, -36, 12, "BOOM");
      this.spawn("crate", side, -46, 15, "XP");
      this.spawn("crate", -side, -48, 20, "RAPID");
    }
    if (i === 8) {
      this.spawn("crate", side, -42, 35, "Rocket");
      this.spawn("gate", -side, -48, 3);
    }
    if (i === 9) {
      this.spawn("crate", side, -33, 20, "RECRUIT");
      this.spawn("crate", -side, -34, 20, "SHIELD");
      this.notify("The Colossus is approaching");
    }
  }
  update(dt: number) {
    dt = Math.min(dt, 0.04);
    this.visualTime += dt;
    this.audio.volume = useGame.getState().save.volume;
    const playing = useGame.getState().mode === "playing";
    if (playing) {
      this.time += dt;
      this.toastTime -= dt;
      this.shake = Math.max(0, this.shake - dt);
      const dir =
        (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
        (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
      this.x = T.MathUtils.clamp(this.x + dir * 6 * this.move * dt, -4.2, 4.2);
      for (const l of this.lines) {
        l.position.z += dt * 5;
        if (l.position.z > 19) l.position.z -= 102;
      }
      for (const s of this.scenery) {
        s.position.z += dt * 5;
        if (s.position.z > 18) s.position.z -= 102;
      }
      this.encounters();
      this.enemyClock -= dt;
      if (!this.bossSpawned && this.enemyClock <= 0) {
        const wave = Math.floor(this.time / 18);
        const count = 2 + wave;
        for (let i = 0; i < count; i++)
          this.spawn(
            "enemy",
            (Math.random() - 0.5) * 9,
            -48 - i * 1.4,
            this.time > 25
              ? Math.random() < 0.2
                ? 3
                : Math.random() < 0.3
                  ? 2
                  : Math.random() < 0.4
                    ? 1
                    : 0
              : 0,
          );
        this.enemyClock =
          Math.max(1.5, 5.5 - this.time * 0.035) / Math.sqrt(this.level);
      }
      if (this.time >= CONFIG.stageSeconds && !this.bossSpawned) {
        this.bossSpawned = true;
        this.spawn("boss", 0, -44);
        this.audio.play("boss");
        this.notify("BOSS · The Colossus");
      }
      this.placeArmy();
      this.fireClock -= dt;
      if (this.fireClock <= 0) {
        this.fireClock += 1 / (WEAPONS[this.weapon].rate * this.rate);
        const pellets = WEAPONS[this.weapon].pellets + this.extra;
        for (const g of this.army)
          for (let p = 0; p < pellets; p++)
            this.fire(
              g.position.x + 0.22 + (p - (pellets - 1) / 2) * 0.13,
              g.position.z - 0.7,
              0,
            );
        this.audio.play("shot");
      }
      for (const t of [...this.targets]) {
        const previousZ = t.z;
        t.age += dt;
        t.hit = Math.max(0, t.hit - dt);
        if (t.kind === "enemy") {
          t.z += dt * ([3.8, 6, 3.2, 2.7][t.variant] + (this.level - 1) * 0.12);
          t.x += T.MathUtils.clamp(this.x - t.x, -1, 1) * dt * 0.3;
        } else if (t.kind === "boss") {
          t.attack += dt;
          t.phase = Math.floor(t.attack / 4) % 4;
          this.bossWarning = [
            "GROUND SLAM · keep moving",
            "CHARGE · clear the center",
            "SUMMON · incoming minions",
            "ARMORED · reduced damage",
          ][t.phase];
          t.z += dt * (t.phase === 1 ? 2.3 : 0.9);
          t.x = Math.sin(t.age * 0.4) * 2;
          if (t.attack >= 16) {
            t.attack = 0;
            for (let i = 0; i < 4; i++)
              this.spawn("enemy", t.x + (i - 1.5) * 1.2, t.z - 1, 1);
          }
          if (
            t.phase === 0 &&
            Math.floor(t.age * 2) !== Math.floor((t.age - dt) * 2) &&
            Math.floor(t.age * 2) % 8 === 0
          ) {
            this.burst(t.x, t.z, 0xffbc79, 25);
            this.shake = 0.2;
            if (t.z > 0 && Math.abs(t.x - this.x) < 2) this.hurt(2);
          }
        } else t.z += dt * 4;
        if (t.kind === "obstacle") {
          for (const g of [...this.army]) {
            // Sweep the obstacle through every formation row; retain untouched slots.
            if (
              Math.abs(g.position.x - t.x) < 1.02 &&
              g.position.z >= previousZ - 0.67 &&
              g.position.z <= t.z + 0.67
            )
              this.removeSoldier(g);
          }
          if (!this.army.length) {
            this.finish(false);
            break;
          }
          if (t.z > CONFIG.playerZ + 8) {
            this.remove(t);
            continue;
          }
        }
        if (t.kind !== "obstacle" && t.z >= CONFIG.playerZ - 0.65) {
          if (t.kind === "enemy") {
            if (
              Math.abs(t.x - this.x) <
              Math.min(6, this.army.length) * 0.325 + 0.5
            )
              this.hurt(t.variant === 3 ? 3 : t.variant === 2 ? 2 : 1);
          } else if (t.kind === "boss") {
            this.hurt(3);
            t.z -= 1.5;
          } else if (Math.abs(t.x - this.x) < 2) {
            if (t.kind === "gate") {
              this.setArmy(
                t.reward === "add"
                  ? barrierArmy(this.army.length, t.value)
                  : multipliedArmy(this.army.length, t.value),
              );
              this.notify(
                t.reward === "add"
                  ? "Reinforcements!"
                  : "Army multiplied ×" + t.value,
              );
              this.burst(this.x, 8, 0x55efbb, 30);
              this.audio.play("reward");
            } else if (t.kind === "barrier") {
              if (t.value < 0) this.hurt(-t.value);
              else this.setArmy(barrierArmy(this.army.length, t.value));
              this.notify("Barrier: " + (t.value > 0 ? "+" : "") + t.value);
            }
          }
          if (t.kind !== "boss") this.remove(t);
        }
        if (!this.targets.includes(t)) continue;
        t.group.position.set(t.x, t.hit ? 0.04 : 0, t.z);
        if (t.kind === "enemy" || t.kind === "boss") {
          t.group.rotation.z = Math.sin(t.age * 8) * 0.045;
          if (t.kind === "boss")
            t.group.rotation.x =
              t.phase === 0
                ? Math.sin(t.age * 3) * 0.15
                : t.phase === 1
                  ? 0.18
                  : 0;
          t.group.children[3].rotation.x = Math.sin(t.age * 9) * 0.35;
          t.group.children[4].rotation.x = -Math.sin(t.age * 9) * 0.35;
        } else t.group.rotation.z = t.hit ? Math.sin(t.age * 70) * 0.025 : 0;
      }
      for (const b of this.bullets) {
        if (!b.active) continue;
        const ax = b.x,
          az = b.z;
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.life -= dt;
        if (b.life <= 0 || b.z < -62) {
          b.active = false;
          continue;
        }
        const candidates = this.targets
          .filter(
            (t) =>
              !b.hits.has(t.id) &&
              t.kind !== "gate" &&
              segmentHit(
                ax,
                az,
                b.x,
                b.z,
                t.x,
                t.z,
                t.kind === "boss"
                  ? 1.45
                  : t.kind === "barrier" || t.kind === "split"
                    ? 1.55
                    : t.kind === "crate" || t.kind === "barrel"
                      ? 0.85
                      : 0.48 * (t.variant === 3 ? 1.55 : 1),
              ),
          )
          .sort((a, c) => c.z - a.z);
        for (const t of candidates) {
          if (t.kind === "split") {
            if (!b.split) {
              b.split = true;
              this.fire(b.x - 0.13, b.z, 0, b.weapon, true);
              b.x += 0.13;
            }
            b.hits.add(t.id);
            continue;
          }
          if (t.kind === "obstacle") {
            this.burst(b.x, b.z, 0xffce67, 2);
            b.active = false;
            break;
          }
          this.hit(t, b);
          b.hits.add(t.id);
          if (
            b.weapon !== "Laser" ||
            t.kind === "crate" ||
            t.kind === "barrier" ||
            t.kind === "barrel"
          ) {
            b.active = false;
            break;
          }
        }
      }
    }
    this.placeArmy();
    for (const g of this.army) {
      const stride = playing
        ? Math.sin(this.time * 10 + (g.userData.slot as number) * 0.7)
        : 0;
      g.position.y = playing ? Math.abs(stride) * 0.045 : 0;
      // March in place while the bridge scrolls; rifles remain pointed forward.
      g.children[3].rotation.x = stride * 0.48;
      g.children[4].rotation.x = -stride * 0.48;
      g.children[5].rotation.x = -stride * 0.1;
      g.children[6].rotation.x = stride * 0.1;
      g.rotation.y = 0;
      g.children[7].position.z =
        -0.47 + (playing && this.fireClock < 0.04 ? 0.1 : 0);
      g.children[8].visible = playing && this.fireClock < 0.045;
    }
    if (playing || useGame.getState().mode === "victory")
      for (const p of this.particles) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= dt * 10;
      }
    if (playing || useGame.getState().mode === "victory")
      for (const f of [...this.floating]) {
        f.life -= dt;
        f.sprite.position.y += dt * 1.8;
        (f.sprite.material as T.SpriteMaterial).opacity = Math.min(
          1,
          f.life * 3,
        );
        if (f.life <= 0) {
          this.scene.remove(f.sprite);
          removeLabel(f.sprite);
          this.floating = this.floating.filter((a) => a !== f);
        }
      }
    this.renderPools();
  }
  renderPools() {
    let n = 0;
    for (const b of this.bullets) {
      if (!b.active) continue;
      this.dummy.position.set(b.x, 1, b.z);
      this.dummy.scale.set(
        b.weapon === "Rocket" ? 2 : 1,
        1,
        b.weapon === "Laser" ? 2 : 1,
      );
      this.dummy.rotation.set(0, -Math.atan2(b.vx, -b.vz), 0);
      this.dummy.updateMatrix();
      this.bulletMesh.setMatrixAt(n, this.dummy.matrix);
      this.bulletMesh.setColorAt(n, new T.Color(WEAPONS[b.weapon].color));
      n++;
    }
    this.bulletMesh.count = n;
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    if (this.bulletMesh.instanceColor)
      this.bulletMesh.instanceColor.needsUpdate = true;
    n = 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.life * 5, p.life * 2, 0);
      this.dummy.scale.setScalar((p.life / p.max) * 1.5);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(n, this.dummy.matrix);
      this.particleMesh.setColorAt(n, p.color);
      n++;
    }
    this.particleMesh.count = n;
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor)
      this.particleMesh.instanceColor.needsUpdate = true;
  }
  dispose() {
    for (const t of this.targets) if (t.label) removeLabel(t.label);
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        geometries.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          materials.add(m);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.audio.context?.close();
  }
}
