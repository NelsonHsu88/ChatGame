import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as T from "three";
import { Engine } from "./engine";
import { useGame } from "./store";
function World({ engine }: { engine: Engine }) {
  const { camera, size } = useThree();
  const baseline = useRef(new T.Vector3());
  const focusZ = useRef(-5);
  useEffect(() => {
    camera.position.set(
      0,
      size.width / size.height < 0.8 ? 24 : 23,
      size.width / size.height < 0.8 ? 31 : 28,
    );
    camera.lookAt(0, 0, -5);
    baseline.current.copy(camera.position);
  }, [camera, size]);
  useFrame((_, dt) => {
    let remaining = Math.min(dt, 0.15);
    while (remaining > 0) {
      const step = Math.min(remaining, 0.04);
      engine.update(step);
      remaining -= step;
    }
    const lastRow=Math.max(0,...engine.army.map(g=>Math.floor((g.userData.slot as number)/6)));
    focusZ.current=T.MathUtils.damp(focusZ.current,-5+lastRow*.7,3,dt);
    camera.lookAt(0,0,focusZ.current);
    camera.position.x =
      baseline.current.x +
      (engine.shake ? (Math.random() - 0.5) * engine.shake * 0.7 : 0);
  });
  return (
    <>
      <color attach="background" args={["#8fc9e4"]} />
      <fog attach="fog" args={["#8fc9e4", 48, 105]} />
      <ambientLight intensity={1.9} />
      <directionalLight
        position={[-14, 30, 10]}
        intensity={2.7}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={30}
        shadow-camera-bottom={-40}
        shadow-camera-far={100}
        shadow-bias={-0.0005}
      />
      <primitive object={engine.scene} />
    </>
  );
}
export function Scene({ engine }: { engine: Engine }) {
  const host = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", " ", "Escape"].includes(e.key))
        e.preventDefault();
      engine.keys.add(e.key.toLowerCase());
      if (e.repeat) return;
      if (e.key === "Escape" || e.key === " ") {
        const s = useGame.getState();
        if (s.mode === "playing") s.setMode("paused");
        else if (s.mode === "paused") s.setMode("playing");
      }
    };
    const keyup = (e: KeyboardEvent) => engine.keys.delete(e.key.toLowerCase());
    const blur = () => {
      engine.keys.clear();
      dragging.current = false;
      if (useGame.getState().mode === "playing")
        useGame.getState().setMode("paused");
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [engine]);
  function point(e: React.PointerEvent) {
    if (useGame.getState().mode !== "playing") return;
    const r = host.current!.getBoundingClientRect();
    const normalized = ((e.clientX - r.left) / r.width) * 2 - 1;
    if (dragging.current)
      engine.x = T.MathUtils.clamp(normalized * 5, -4.2, 4.2);
  }
  return (
    <div
      className="scene"
      ref={host}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        point(e);
      }}
      onPointerMove={point}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ fov: 48, near: 0.1, far: 180 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <World engine={engine} />
      </Canvas>
    </div>
  );
}
