export class AudioSystem {
  context: AudioContext | null = null;
  volume = 0.3;
  lastShot = 0;
  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume();
  }
  play(kind: "shot" | "hit" | "reward" | "boss" | "win" | "lose") {
    if (!this.context || !this.volume) return;
    const t = this.context.currentTime;
    if (kind === "shot" && t - this.lastShot < 0.085) return;
    if (kind === "shot") this.lastShot = t;
    const o = this.context.createOscillator(),
      g = this.context.createGain();
    const f = {
      shot: 140,
      hit: 90,
      reward: 660,
      boss: 65,
      win: 880,
      lose: 160,
    }[kind];
    o.type = kind === "shot" || kind === "boss" ? "sawtooth" : "sine";
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(
      kind === "reward" || kind === "win" ? f * 1.5 : 40,
      t + 0.13,
    );
    g.gain.setValueAtTime(this.volume * (kind === "shot" ? 0.035 : 0.12), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g);
    g.connect(this.context.destination);
    o.start(t);
    o.stop(t + 0.2);
  }
}
