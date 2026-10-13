export const CONFIG = {
  maxArmy: 48,
  roadWidth: 12,
  playerZ: 8,
  spawnZ: -52,
  bulletSpeed: 49,
  fireRate: 4,
  damage: 10,
  basicHP: 30,
  firstXP: 80,
  bossHP: 3000,
  stageSeconds: 85,
};
export type Weapon =
  "Rifle" | "SMG" | "Minigun" | "Shotgun" | "Laser" | "Rocket";
export const WEAPONS: Record<
  Weapon,
  { rate: number; damage: number; pellets: number; color: number }
> = {
  Rifle: { rate: 4, damage: 10, pellets: 1, color: 0xffe188 },
  SMG: { rate: 7, damage: 9, pellets: 1, color: 0xffe188 },
  Minigun: { rate: 12, damage: 9, pellets: 1, color: 0xffbb54 },
  Shotgun: { rate: 2.8, damage: 14, pellets: 5, color: 0xffe188 },
  Laser: { rate: 5, damage: 16, pellets: 1, color: 0x5fffff },
  Rocket: { rate: 1.8, damage: 90, pellets: 1, color: 0xff7844 },
};
export const UPGRADES = [
  {
    id: "rate",
    title: "Quick trigger",
    description: "+15% firing speed",
    icon: "»",
  },
  {
    id: "damage",
    title: "Heavy rounds",
    description: "+20% bullet damage",
    icon: "✦",
  },
  {
    id: "recruit",
    title: "Reinforcements",
    description: "+3 soldiers now",
    icon: "+",
  },
  {
    id: "shield",
    title: "Field armor",
    description: "Block the next 5 attacks",
    icon: "⬡",
  },
  {
    id: "crit",
    title: "Deadeye",
    description: "+20% critical hit chance",
    icon: "◎",
  },
  {
    id: "speed",
    title: "Light on your feet",
    description: "+20% movement speed",
    icon: "↗",
  },
  {
    id: "pellet",
    title: "Double tap",
    description: "+1 projectile per shot",
    icon: "Ⅱ",
  },
];
export function barrierArmy(army: number, value: number) {
  return Math.max(0, Math.min(CONFIG.maxArmy, army + value));
}
export function multipliedArmy(army: number, value: number) {
  return Math.min(CONFIG.maxArmy, army * value);
}
export function segmentHit(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  x: number,
  z: number,
  r: number,
) {
  const dx = bx - ax,
    dz = bz - az,
    t = Math.max(
      0,
      Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)),
    );
  return (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2 <= r * r;
}
