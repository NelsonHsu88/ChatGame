import { create } from "zustand";
export type Mode =
  "menu" | "playing" | "paused" | "upgrade" | "victory" | "defeat" | "shop";
export type Save = {
  coins: number;
  best: number;
  training: number;
  volume: number;
};
const defaults: Save = { coins: 0, best: 1, training: 0, volume: 0.3 };
function load(): Save {
  try {
    const s = JSON.parse(localStorage.getItem("horde-rush-v1") || "null");
    return s
      ? {
          coins: Math.max(0, Number(s.coins) || 0),
          best: Math.max(1, Number(s.best) || 1),
          training: Math.min(5, Math.max(0, Number(s.training) || 0)),
          volume: Math.min(1, Math.max(0, Number(s.volume) || 0)),
        }
      : defaults;
  } catch {
    return defaults;
  }
}
export const useGame = create<{
  mode: Mode;
  save: Save;
  settings: boolean;
  setMode: (m: Mode) => void;
  persist: (s: Partial<Save>) => void;
  setSettings: (b: boolean) => void;
}>((set, get) => ({
  mode: "menu",
  save: load(),
  settings: false,
  setMode: (mode) => set({ mode }),
  setSettings: (settings) => set({ settings }),
  persist: (partial) => {
    const save = { ...get().save, ...partial };
    try {
      localStorage.setItem("horde-rush-v1", JSON.stringify(save));
    } catch {
      /* Storage is optional in private browsing. */
    }
    set({ save });
  },
}));
