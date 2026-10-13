import { useEffect, useState } from "react";
import { Engine } from "./engine";
import { Scene } from "./Scene";
import { useGame } from "./store";
import { CONFIG } from "./config";
export const engine = new Engine();
function App() {
  const { mode, save, setMode, persist, settings, setSettings } = useGame();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 100);
    return () => clearInterval(t);
  }, []);
  const active = ["playing", "paused", "upgrade"].includes(mode);
  const wave = Math.min(5, 1 + Math.floor(engine.time / 18));
  return (
    <main className="app">
      <Scene engine={engine} />
      <div className="vignette" />
      <header className="brand">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (mode === "playing") setMode("paused");
            else if (mode === "menu") return;
          }}
        >
          H<span>R</span>
          <i /> <small>BRIDGE DIVISION</small>
        </a>
        <div className="header-right">
          <span className="coins">◈ {save.coins.toLocaleString()}</span>
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => {
              if (mode === "playing") setMode("paused");
              setSettings(true);
            }}
          >
            ⚙
          </button>
        </div>
      </header>
      {mode === "menu" && (
        <section className="menu">
          <div className="eyebrow">
            <span /> THE HORDE IS COMING
          </div>
          <h1>
            HORDE
            <br />
            <em>RUSH</em>
            <span className="edition">01 / BRIDGE DIVISION</span>
          </h1>
          <p>
            One soldier. An unstoppable army.
            <br />
            Shoot, recruit, and take down the Colossus.
          </p>
          <div className="menu-actions">
            <button className="primary" onClick={() => engine.start(1)}>
              DEPLOY SQUAD <span>↗</span>
            </button>
            <button className="secondary" onClick={() => setMode("shop")}>
              ARMORY <span>+</span>
            </button>
          </div>
          <div className="menu-record">
            <div>
              <b>{String(save.best).padStart(2, "0")}</b>
              <span>BEST SECTOR</span>
            </div>
            <div>
              <b>{save.training + 1}</b>
              <span>STARTING SQUAD</span>
            </div>
            <div>
              <b>∞</b>
              <span>NO SURRENDER</span>
            </div>
          </div>
        </section>
      )}
      {mode === "menu" && (
        <aside className="briefing">
          <div className="briefing-heading">
            <span>FIELD MANUAL</span>
            <span>01—03</span>
          </div>
          <div>
            <b>01</b>
            <p>
              <strong>LET THE BULLETS FLY</strong>
              <span>
                Auto-fire is on. Drag or use A/D to line up your shots.
              </span>
            </p>
          </div>
          <div>
            <b>02</b>
            <p>
              <strong>BUILD YOUR DIVISION</strong>
              <span>Shoot crates. Cross green gates. Multiply.</span>
            </p>
          </div>
          <div>
            <b>03</b>
            <p>
              <strong>HOLD THE LINE</strong>
              <span>Survive the rush. Defeat the Colossus.</span>
            </p>
          </div>
          <footer>
            DRAG TO MOVE <i /> A / D OR ← / →
          </footer>
        </aside>
      )}
      {active && (
        <>
          <section className="hud">
            <div className="hud-top">
              <div>
                <span className="eyebrow">OPERATION HORDE RUSH</span>
                <h2>
                  SECTOR {String(engine.level).padStart(2, "0")}{" "}
                  <small>
                    {engine.bossSpawned ? "BOSS ENCOUNTER" : `WAVE ${wave} / 5`}
                  </small>
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Pause game"
                onClick={() => setMode("paused")}
              >
                ⏸
              </button>
            </div>
            <div className="progress">
              <div
                style={{
                  width: `${Math.min(100, (engine.time / CONFIG.stageSeconds) * 100)}%`,
                }}
              />
            </div>
            <div className="xp-row">
              <span>LV {engine.xpLevel}</span>
              <div className="xp-track">
                <div
                  style={{ width: `${(engine.xp / engine.threshold) * 100}%` }}
                />
              </div>
              <span>
                {engine.xp} / {engine.threshold} XP
              </span>
            </div>
            {engine.bossSpawned && (
              <div className="boss-hud">
                <div>
                  <strong>THE COLOSSUS</strong>
                  <span>
                    {Math.ceil(engine.bossHP)} / {engine.bossMax}
                  </span>
                </div>
                <div className="boss-track">
                  <div
                    style={{
                      width: `${(engine.bossHP / engine.bossMax) * 100}%`,
                    }}
                  />
                </div>
                <small>{engine.bossWarning}</small>
              </div>
            )}
          </section>
          <section className="bottom-hud">
            <div>
              <span>SQUAD</span>
              <b>
                {String(engine.army.length).padStart(2, "0")}
                <small> / 48</small>
              </b>
            </div>
            <div>
              <span>LOADOUT</span>
              <b className="weapon">{engine.weapon.toUpperCase()}</b>
              <small>
                {engine.shield > 0
                  ? `⬡ ${engine.shield} shield`
                  : "AUTO-FIRE ACTIVE"}
              </small>
            </div>
            <div>
              <span>ELIMINATED</span>
              <b>{engine.kills}</b>
            </div>
          </section>
          {engine.toastTime > 0 && (
            <div className="toast" role="status">
              ✦ {engine.toast}
            </div>
          )}
          <div className="control-hint">
            A / D TO MOVE · DRAG TO MOVE · DRAG ON MOBILE
          </div>
        </>
      )}
      {mode === "paused" && !settings && (
        <div className="overlay">
          <section className="panel">
            <span className="eyebrow">TAKE A BREATHER</span>
            <h2>HOLD POSITION.</h2>
            <p>Your squad is waiting for orders.</p>
            <button className="primary" onClick={() => setMode("playing")}>
              RESUME OPERATION <span>→</span>
            </button>
            <button className="secondary" onClick={() => setMode("menu")}>
              RETURN TO BASE
            </button>
          </section>
        </div>
      )}
      {mode === "upgrade" && (
        <div className="overlay">
          <section className="panel wide">
            <span className="eyebrow">
              LEVEL {engine.xpLevel} · FIELD PROMOTION
            </span>
            <h2>CHOOSE YOUR EDGE.</h2>
            <p>One upgrade. A stronger division.</p>
            <div className="upgrade-grid">
              {engine.choices.map((u) => (
                <button
                  key={u.id}
                  className="upgrade-card"
                  onClick={() => engine.choose(u.id)}
                >
                  <i>{u.icon}</i>
                  <strong>{u.title}</strong>
                  <span>{u.description}</span>
                  <small>SELECT UPGRADE ↗</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {(mode === "victory" || mode === "defeat") && (
        <div className="overlay">
          <section className="panel result">
            <span className="eyebrow">
              SECTOR {String(engine.level).padStart(2, "0")} · DEBRIEF
            </span>
            <h2>
              {mode === "victory" ? "HORDE CRUSHED." : "LAST SOLDIER DOWN."}
            </h2>
            <p>
              {mode === "victory"
                ? "The Colossus has fallen. Your next mission awaits."
                : "Regroup, rearm, and give them everything."}
            </p>
            <div className="result-grid">
              <div>
                <span>ELIMINATIONS</span>
                <b>{engine.kills}</b>
              </div>
              <div>
                <span>XP EARNED</span>
                <b>{engine.totalXP}</b>
              </div>
              <div>
                <span>COINS EARNED</span>
                <b>◈ {engine.earned}</b>
              </div>
              <div>
                <span>PEAK SQUAD</span>
                <b>{engine.peak}</b>
              </div>
            </div>
            <button
              className="primary"
              onClick={() =>
                engine.start(
                  mode === "victory" ? engine.level + 1 : engine.level,
                )
              }
            >
              {mode === "victory" ? "NEXT SECTOR" : "DEPLOY AGAIN"}{" "}
              <span>↗</span>
            </button>
            <button className="secondary" onClick={() => setMode("menu")}>
              RETURN TO BASE
            </button>
          </section>
        </div>
      )}
      {mode === "shop" && (
        <div className="overlay">
          <section className="panel">
            <span className="eyebrow">PERMANENT UPGRADES</span>
            <h2>THE ARMORY.</h2>
            <p>
              Invest in your next deployment. Each training upgrade adds one
              starting soldier.
            </p>
            <div className="training">
              <span>SQUAD TRAINING</span>
              <b>{save.training} / 5</b>
              <div>
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} className={i < save.training ? "filled" : ""} />
                ))}
              </div>
              <small>Current starting army: {1 + save.training} soldiers</small>
            </div>
            <button
              className="primary"
              disabled={
                save.training >= 5 || save.coins < 100 * (save.training + 1)
              }
              onClick={() =>
                persist({
                  coins: save.coins - 100 * (save.training + 1),
                  training: save.training + 1,
                })
              }
            >
              {save.training === 5
                ? "FULLY TRAINED"
                : `TRAIN SQUAD · ◈ ${100 * (save.training + 1)}`}{" "}
              <span>+</span>
            </button>
            <button className="secondary" onClick={() => setMode("menu")}>
              RETURN TO BASE
            </button>
          </section>
        </div>
      )}
      {settings && (
        <div className="overlay settings">
          <section className="panel">
            <span className="eyebrow">PREFERENCES</span>
            <h2>COMMS CHECK.</h2>
            <label className="volume">
              SOUND VOLUME <span>{Math.round(save.volume * 100)}%</span>
              <input
                aria-label="Sound volume"
                type="range"
                min="0"
                max="1"
                step=".05"
                value={save.volume}
                onChange={(e) => {
                  engine.audio.unlock();
                  persist({ volume: Number(e.target.value) });
                }}
              />
            </label>
            <button
              className="secondary"
              onClick={() => persist({ volume: save.volume ? 0 : 0.3 })}
            >
              {save.volume ? "MUTE SOUND" : "ENABLE SOUND"}
            </button>
            <p>
              Shots fly straight. A/D or arrows to move.
              <br />
              Touch: drag to move.
              <br />
              Space or Escape to pause.
            </p>
            <button className="primary" onClick={() => setSettings(false)}>
              DONE <span>✓</span>
            </button>
          </section>
        </div>
      )}
      <footer className="site-footer">
        <span>BRIDGE DIVISION · HORDE RUSH</span>
        <span>STAY SHARP. STAY TOGETHER.</span>
      </footer>
    </main>
  );
}
export default App;
