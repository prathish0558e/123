import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LOW_POWER } from "./support.js";
import { state } from "./store.js";
import { glowTexture, zzzTexture, shadowTexture } from "./textures.js";
import Robot from "./Robot.jsx";

/*
 * Timer-driven ResizeObserver stand-in. In occluded/embedded webviews the
 * real ResizeObserver callbacks (like rAF) can stall forever, which would
 * keep react-three-fiber from ever measuring its container. Polling with a
 * timer keeps the canvas measurable everywhere; in normal browsers this
 * simply no-ops after the size stops changing.
 */
class TimerResizeObserver {
  constructor(cb) {
    this.cb = cb;
    this.els = new Set();
    this.sizes = new WeakMap();
    this.iv = setInterval(() => {
      this.els.forEach((el) => this.measure(el));
    }, 220);
  }
  measure(el) {
    if (!el.isConnected) return;
    const rect = el.getBoundingClientRect();
    const previous = this.sizes.get(el);
    // Polling is only a fallback for webviews where ResizeObserver delivery
    // can stall. Re-notifying unchanged dimensions makes R3F repeatedly
    // resize its renderer and can look like a small camera/character shake.
    if (
      previous &&
      Math.abs(previous.width - rect.width) < 0.25 &&
      Math.abs(previous.height - rect.height) < 0.25
    ) return;
    this.sizes.set(el, { width: rect.width, height: rect.height });
    this.cb([{ target: el, contentRect: rect }]);
  }
  observe(el) {
    this.els.add(el);
    this.measure(el);
  }
  unobserve(el) {
    this.els.delete(el);
    this.sizes.delete(el);
  }
  disconnect() {
    this.els.clear();
    clearInterval(this.iv);
  }
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------------------------- Camera rig ---------------------------- */
function CameraRig() {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.8, 0));
  useFrame((_, dt) => {
    const r = state.rig;
    const k = 1 - Math.exp(-dt * 6);
    camera.position.x = lerp(camera.position.x, r.x, k);
    camera.position.y = lerp(camera.position.y, r.y, k);
    camera.position.z = lerp(camera.position.z, r.z, k);
    look.current.x = lerp(look.current.x, r.x * 0.35, k);
    look.current.y = lerp(look.current.y, r.y - 0.08, k);
    camera.lookAt(look.current);
  });
  return null;
}

/* Neutral studio reflections make the ceramic shell, visor and metal joints
 * read as PBR surfaces. This environment belongs to this transparent canvas;
 * it never changes the website's CSS background or lighting.
 *
 * RoomEnvironment is a heavy PMREM pass (and an ~800 kB module). Phones and
 * tablets skip it entirely — they get the filler lights in <Lights /> instead,
 * which keeps the extra download and GPU cost away from iOS, where both are
 * the usual reason the scene never appears. */
function StudioReflections() {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (LOW_POWER) return undefined;
    let cancelled = false;
    let generator = null;
    let room = null;
    let target = null;
    let previousEnvironment;
    let previousIntensity;
    let applied = false;

    import("three/addons/environments/RoomEnvironment.js")
      .then(({ RoomEnvironment }) => {
        if (cancelled) return;
        generator = new THREE.PMREMGenerator(gl);
        room = new RoomEnvironment();
        target = generator.fromScene(room, 0.04);
        previousEnvironment = scene.environment;
        previousIntensity = scene.environmentIntensity;
        scene.environment = target.texture;
        scene.environmentIntensity = 0.62;
        applied = true;
      })
      .catch(() => { /* no reflections is a far better outcome than no robot */ });

    return () => {
      cancelled = true;
      if (applied) {
        scene.environment = previousEnvironment;
        scene.environmentIntensity = previousIntensity;
      }
      target?.dispose();
      generator?.dispose();
      room?.dispose();
    };
  }, [gl, scene]);
  return null;
}

/* A restrained contact shadow keeps the white cloud readable on the site's
 * light sections without tinting or covering the surrounding page. */
function CloudContactShadow() {
  const shadow = useRef();
  const opacity = useRef(0);
  const tex = useMemo(() => shadowTexture(), []);
  const material = useMemo(() => new THREE.SpriteMaterial({
    map: tex,
    color: "#25324a",
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  }), [tex]);

  useFrame((_, dt) => {
    const L = state.layout;
    if (!L || !shadow.current) return;
    const visible = ["sleep", "waking", "stretch", "settle"].includes(state.phase);
    const target = state.phase === "transform" ? 1 - easeInOut(state.t)
      : state.phase === "board" ? easeInOut(state.t)
      : visible ? 1 : 0;
    opacity.current = lerp(opacity.current, target * 0.18, 1 - Math.exp(-dt * 3));
    shadow.current.position.set(L.home.x, L.home.y - L.cloudR * 0.55, -0.38);
    shadow.current.scale.set(L.cloudR * 3.35, L.cloudR * 1.15, 1);
    material.opacity = opacity.current;
  });

  useEffect(() => () => material.dispose(), [material]);
  return <sprite ref={shadow} material={material} renderOrder={0} />;
}

/* ------------------------------ Lights ------------------------------ */
function Lights() {
  const stageLight = useRef();
  const homeLight = useRef();
  const sun = useRef();
  useFrame((_, dt) => {
    const L = state.layout;
    if (!L) return;
    if (stageLight.current) {
      stageLight.current.position.set(L.stage.x + 0.6, L.stage.y + 1.4, 1.6);
      const on = ["arrive", "chat", "goodnight", "dissolve"].includes(state.phase);
      stageLight.current.intensity = lerp(
        stageLight.current.intensity,
        on ? (state.thinking ? 4.2 : 3.2) : 0,
        1 - Math.exp(-dt * 3)
      );
    }
    if (homeLight.current) {
      homeLight.current.position.set(L.home.x + 1.2, L.home.y + 1.6, 1.6);
      const vis = ["sleep", "waking", "stretch", "board", "settle"].includes(state.phase);
      homeLight.current.intensity = lerp(homeLight.current.intensity, vis ? 1.2 : 0.2, 0.05);
    }
  });
  return (
    <>
      <ambientLight intensity={0.72} color="#fffaf4" />
      <hemisphereLight args={["#eaf4ff", "#737d98", 0.42]} />
      {/* Without the PMREM environment (phones/tablets) these two keep the
          shell and metal joints from reading flat. */}
      {LOW_POWER && (
        <>
          <hemisphereLight args={["#dceaff", "#9aa6c2", 0.6]} />
          <pointLight position={[-2.4, 2.8, 2.4]} intensity={0.75} distance={10} color="#eaf2ff" />
        </>
      )}
      <directionalLight
        ref={sun}
        position={[3.5, 6, 4]}
        intensity={1.45}
        color="#ffffff"
        castShadow
        shadow-mapSize={LOW_POWER ? [512, 512] : [1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={24}
        shadow-normalBias={0.035}
      />
      <pointLight position={[-4, 2, -3]} intensity={0.8} distance={9} color="#8b9cff" />
      {/* cyan rim light that kisses the cloud + robot from the right */}
      <pointLight position={[3.2, 1.2, -1.5]} intensity={1.25} distance={8} color="#38bdf8" />
      <pointLight ref={homeLight} distance={6} color="#6366f1" intensity={1.2} />
      <pointLight ref={stageLight} distance={7} color="#22d3ee" intensity={0} />
    </>
  );
}

/* --------------------- Volumetric fluffy cloud ---------------------- */
function VolumetricCloud() {
  const group = useRef();
  const inner = useRef(); // squash is applied to this wrapper
  const puffs = useRef([]);
  const logoGroup = useRef();
  const squash = useRef(1);
  const bounce = useRef({ t0: -10 });
  const lastPhase = useRef("sleep");

  const R = state.layout ? state.layout.cloudR : 0.85;

  /* three shells of overlapping spheres = a fluffy volumetric mass */
  const defs = useMemo(() => {
    const out = [];
    const base = [
      [0, 0, 0, 0.56], [-0.55, -0.06, 0.06, 0.4], [0.55, -0.05, 0.05, 0.42],
      [-0.95, -0.14, -0.05, 0.3], [0.92, -0.12, -0.08, 0.32], [0, -0.16, 0.12, 0.42],
      [-0.3, 0.14, -0.08, 0.36], [0.3, 0.16, -0.06, 0.34], [0, 0.02, -0.22, 0.46],
      [-0.15, -0.04, 0.22, 0.34], [0.42, 0.05, 0.18, 0.3], [-0.42, 0.02, 0.2, 0.28],
      [0.72, 0.1, 0.02, 0.26], [-0.72, 0.08, -0.12, 0.25], [0.12, -0.24, -0.05, 0.3], [-0.2, -0.22, 0.1, 0.28],
    ];
    base.forEach(([x, y, z, s], i) =>
      out.push({ p: [x * R, y * R, z * R], s: s * R, d: (i % 8) * 0.045, shell: 0 })
    );
    const fluff = [
      [-0.62, 0.3, -0.1, 0.2], [0.66, 0.28, 0.0, 0.21], [0.15, 0.34, 0.05, 0.19], [-0.25, 0.32, -0.2, 0.17],
      [0.45, -0.28, 0.1, 0.19], [-0.5, -0.26, -0.05, 0.18], [0.05, -0.34, -0.1, 0.2], [-0.85, -0.02, 0.15, 0.17],
      [0.88, 0.02, -0.15, 0.18], [-0.1, 0.1, 0.32, 0.22], [0.3, 0.12, 0.3, 0.18], [-0.35, 0.06, 0.3, 0.17],
      [0.2, -0.12, 0.32, 0.2], [-0.18, -0.14, -0.32, 0.2], [0.5, 0.2, -0.2, 0.16], [-0.55, 0.18, -0.22, 0.16],
      [0.75, -0.18, 0.12, 0.15], [-0.78, -0.16, -0.18, 0.15], [0.0, 0.28, 0.18, 0.18], [0.35, 0.3, -0.12, 0.15],
    ];
    fluff.forEach(([x, y, z, s], i) =>
      out.push({ p: [x * R, y * R, z * R], s: s * R, d: 0.3 + (i % 10) * 0.04, shell: 1 })
    );
    const far = [
      [-0.4, 0.18, -0.38, 0.26], [0.42, 0.16, -0.35, 0.27], [0.1, 0.05, -0.42, 0.3],
      [-0.68, -0.1, -0.3, 0.2], [0.68, -0.08, -0.28, 0.2],
    ];
    far.forEach(([x, y, z, s], i) =>
      out.push({ p: [x * R, y * R, z * R], s: s * R, d: 0.55 + i * 0.03, shell: 2 })
    );
    // Fine rounded lobes break up the silhouette so the cloud reads as soft
    // piled-up vapor instead of a handful of large spheres.
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const wobble = Math.sin(i * 12.7) * 0.045;
      const rx = 0.96 + wobble;
      const ry = 0.38 + Math.cos(i * 7.1) * 0.045;
      const radius = 0.105 + ((i * 17) % 7) * 0.012;
      out.push({
        p: [Math.cos(a) * rx * R, Math.sin(a) * ry * R, (Math.sin(i * 3.4) * 0.16 + 0.08) * R],
        s: radius * R,
        d: 0.7 + (i % 8) * 0.025,
        shell: 2,
      });
    }
    return out;
  }, [R]);

  const mats = useMemo(() => {
    const core = new THREE.MeshStandardMaterial({
      color: "#cbd8ee", roughness: 0.96, metalness: 0,
      emissive: "#7286bf", emissiveIntensity: 0.08, transparent: true,
    });
    const fluff = new THREE.MeshStandardMaterial({
      color: "#e2ebfa", roughness: 0.95, metalness: 0,
      emissive: "#7f94cc", emissiveIntensity: 0.08, transparent: true,
    });
    // small puffs on the lit side catch a soft cyan rim
    const rim = new THREE.MeshStandardMaterial({
      color: "#d5e5fb", roughness: 0.9, metalness: 0,
      emissive: "#41d3f7", emissiveIntensity: 0.16, transparent: true,
    });
    return { core, fluff, rim };
  }, []);

  const matFor = (d) => (d.shell === 0 ? mats.core : d.shell === 1 ? mats.fluff : mats.rim);

  const logoTex = useMemo(() => {
    const tex = new THREE.TextureLoader().load("/tct-logo.png");
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    group.current?.traverse((o) => {
      if (o.isMesh) o.receiveShadow = true;
    });
  }, []);

  useFrame((st, dt) => {
    const s = state;
    const L = s.layout;
    if (!L || !group.current) return;
    const clock = st.clock.elapsedTime;
    const g = group.current;

    // IMPORTANT: this bob must stay in exact sync with the robot's own bob
    // (same 0.55 rad/s, same 0.02 amp in Robot.jsx) so the robot always
    // rests ON the drifting cloud instead of sliding up and down its surface.
    g.position.set(L.home.x, L.home.y + Math.sin(clock * 0.55) * 0.02 * (s.reduced ? 0.58 : 1), 0);
    const base = L.cloudR / R;
    g.scale.setScalar(base);

    // phase-entry bounce
    if (s.phase !== lastPhase.current) {
      if (s.phase === "stretch" || s.phase === "board") bounce.current.t0 = clock;
      lastPhase.current = s.phase;
    }
    const bt = clock - bounce.current.t0;
    // soft, quickly-decaying cushion pulse when the robot lands/launches
    const amp = Math.exp(-Math.max(bt, 0) * 3.2) * 0.05 * (bt > 0 ? 1 : 0);

    // weight: the cloud compresses softly while the robot rests on it
    let load = 0;
    if (["sleep", "waking", "stretch", "settle"].includes(s.phase)) load = 1;
    else if (s.phase === "board") load = easeInOut(s.t);
    squash.current = lerp(squash.current, load, 1 - Math.exp(-dt * 4));
    const sq = squash.current;

    let vis = 1;
    if (s.phase === "transform") vis = 1 - easeInOut(s.t);
    else if (["walk", "walkback", "arrive", "chat", "goodnight", "dissolve"].includes(s.phase)) vis = 0;
    else if (s.phase === "board") vis = easeInOut(s.t);
    mats.core.opacity = vis;
    mats.fluff.opacity = vis;
    mats.rim.opacity = vis;

    puffs.current.forEach((m, i) => {
      if (!m) return;
      const def = defs[i];
      const stagger = clamp((s.phase === "board" ? 1 - s.t : s.t) * 1.6 - def.d * 4, 0, 1);
      const sc = s.phase === "board" ? 0.2 + 0.8 * (1 - stagger) : lerp(1, 0.2, stagger);
      m.scale.setScalar(Math.max(0.001, def.s * sc));
      m.position.y = def.p[1] + Math.sin(clock * 0.8 + i * 1.7) * 0.009 * (1 + sq);
      if (s.phase === "transform") {
        m.position.y += easeInOut(s.t) * 0.5 * (i % 2 ? 1 : -1) * 0.5;
      }
    });

    g.scale.set(
      base * (1 + amp * 0.6 + sq * 0.055),
      base * (1 - amp - sq * 0.085 + Math.sin(clock * 2.2) * 0.002 * sq),
      base * (1 + amp * 0.6 + sq * 0.055)
    );
    if (logoGroup.current) {
      logoGroup.current.visible = vis > 0.5;
      logoGroup.current.position.set(R * 0.58, R * 0.18 - sq * 0.05, R * 0.58);
    }
  });

  return (
    <group ref={group}>
      <group ref={inner}>
        {defs.map((d, i) => (
          <mesh
            key={i}
            ref={(el) => (puffs.current[i] = el)}
            material={matFor(d)}
            position={d.p}
            castShadow={d.shell === 0}
          >
            <sphereGeometry args={[1, 22, 18]} />
          </mesh>
        ))}
        <group ref={logoGroup} position={[R * 0.58, R * 0.18, R * 0.58]}>
          <mesh position={[0, 0, 0]}>
            <circleGeometry args={[0.17, 24]} />
            <meshStandardMaterial color="#101830" roughness={0.4} metalness={0.3} transparent />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[0.22, 0.18]} />
            <meshBasicMaterial map={logoTex} transparent depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* --------------- Glowing footstep puffs (pooled) -------------------- */
const StepPuffs = forwardRef(function StepPuffs(_, ref) {
  const COUNT = state.reduced ? 7 : 14;
  const sprites = useRef([]);
  const live = useRef(
    Array.from({ length: COUNT }, () => ({ t: 0, max: 0.9, big: false, x: 0, y: 0, z: 0 }))
  );

  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTexture(), color: "#e9fbff", transparent: true, opacity: 0,
        blending: THREE.NormalBlending, depthWrite: false,
      }),
    []
  );

  useFrame((st, dt) => {
    const L = state.layout;
    if (!L) return;
    live.current.forEach((p, i) => {
      const sp = sprites.current[i];
      if (!sp) return;
      if (p.t >= p.max) { sp.material.opacity = 0; return; }
      p.t += dt;
      const k = p.t / p.max;
      const s0 = (p.big ? 0.42 : 0.17) * (state.reduced ? 0.72 : 1);
      const sc = s0 * (0.45 + k * 1.2);
      sp.position.set(p.x, p.y + k * (p.big ? 0.28 : 0.12), p.z + 0.02);
      sp.scale.set(sc, sc * 0.62, sc);
      sp.material.opacity = (p.big ? 0.58 : 0.4) * (state.reduced ? 0.72 : 1) * Math.sin(Math.PI * Math.min(k, 1));
    });
  });

  useImperativeExpose(ref, {
    spawn(pos, big = false) {
      const slot =
        live.current.find((p) => p.t >= p.max) ||
        live.current.reduce((a, b) => (a.t / a.max > b.t / b.max ? a : b));
      slot.t = 0;
      slot.max = state.reduced ? (big ? 0.8 : 0.55) : (big ? 1.3 : 0.9);
      slot.big = big;
      slot.x = pos.x; slot.y = pos.y; slot.z = pos.z;
    },
  });

  return (
    <group>
      {Array.from({ length: COUNT }, (_, i) => (
        <sprite key={i} ref={(el) => (sprites.current[i] = el)} material={mat.clone()} />
      ))}
    </group>
  );
});

function useImperativeExpose(ref, api) {
  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") ref(api);
    else ref.current = api;
    return () => { if (ref && typeof ref !== "function") ref.current = null; };
  }, []);
}

/* --------------------- Burst particles (reuse) ---------------------- */
function Burst() {
  const ref = useRef();
  const life = useRef({ active: false, t: 0, max: 1.6, mode: "out", origin: new THREE.Vector3() });
  const lastPhase = useRef("sleep");
  const COUNT = 90;
  const particleCount = state.reduced ? 24 : COUNT;

  const { positions, vels } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const vels = new Float32Array(COUNT * 3);
    return { positions, vels };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setDrawRange(0, particleCount);
    return g;
  }, [positions, particleCount]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#8ff3ff",
        size: state.reduced ? 0.038 : 0.055,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    []
  );

  const ignite = (origin, mode) => {
    const l = life.current;
    l.active = true;
    l.t = 0;
    l.mode = mode;
    l.origin.copy(origin);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      if (mode === "out") {
        positions[i3] = origin.x; positions[i3 + 1] = origin.y; positions[i3 + 2] = origin.z;
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        const sp = 0.8 + Math.random() * 1.6;
        vels[i3] = Math.sin(ph) * Math.cos(th) * sp;
        vels[i3 + 1] = Math.cos(ph) * sp * 0.8 + 0.4;
        vels[i3 + 2] = Math.sin(ph) * Math.sin(th) * sp * 0.5;
      } else {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        const r = 1.2 + Math.random() * 0.8;
        positions[i3] = origin.x + Math.sin(ph) * Math.cos(th) * r;
        positions[i3 + 1] = origin.y + Math.cos(ph) * r;
        positions[i3 + 2] = origin.z + Math.sin(ph) * Math.sin(th) * r * 0.5;
        vels[i3] = -Math.sin(ph) * Math.cos(th) * 1.4;
        vels[i3 + 1] = -Math.cos(ph) * 1.4;
        vels[i3 + 2] = -Math.sin(ph) * Math.sin(th) * 0.7;
      }
    }
    geo.attributes.position.needsUpdate = true;
  };

  useFrame((st, dt) => {
    const s = state;
    const L = s.layout;
    if (!L) return;
    if (s.phase !== lastPhase.current) {
      if (s.phase === "transform") ignite(new THREE.Vector3(L.home.x, L.home.y + 0.2, 0.1), "out");
      if (s.phase === "dissolve") ignite(new THREE.Vector3(L.beamAnchor.x, L.beamAnchor.y, 0.4), "out");
      if (s.phase === "board") ignite(new THREE.Vector3(L.home.x, L.home.y + 0.2, 0.1), "in");
      lastPhase.current = s.phase;
    }
    const l = life.current;
    if (!l.active) return;
    l.t += dt;
    const k = l.t / l.max;
    mat.opacity = Math.max(0, 1 - k) * 0.85;
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] += vels[i] * dt;
      vels[i] *= 0.985;
    }
    geo.attributes.position.needsUpdate = true;
    if (k >= 1) { l.active = false; mat.opacity = 0; }
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/* ------------------- Stars + drifting dust motes -------------------- */
function NightSky() {
  const L = state.layout;
  const starA = useRef();
  const starB = useRef();
  const dust = useRef();

  const starGeo = useMemo(() => {
    const n = state.reduced ? (L && L.mobile ? 36 : 60) : (L && L.mobile ? 90 : 150);
    const pos = new Float32Array(n * 3);
    const hw = (L ? L.halfW : 6) * 1.6;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * hw;
      pos[i * 3 + 1] = (L ? L.camY : 0.9) + (Math.random() * 2 - 1) * 4.2;
      pos[i * 3 + 2] = -3 - Math.random() * 5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [L]);

  const dustGeo = useMemo(() => {
    const n = state.reduced ? (L && L.mobile ? 10 : 18) : (L && L.mobile ? 26 : 46);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * (L ? L.halfW * 0.9 : 5);
      pos[i * 3 + 1] = -1.5 + Math.random() * 4;
      pos[i * 3 + 2] = -1 + Math.random() * 3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [L]);

  const starMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#9db4ff", size: 0.05, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    []
  );
  const dustMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#22d3ee", size: 0.045, transparent: true, opacity: 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    []
  );

  useFrame((st, dt) => {
    const c = st.clock.elapsedTime;
    if (starA.current) starA.current.material.opacity = 0.3 + 0.22 * Math.sin(c * 0.7);
    if (starB.current) starB.current.material.opacity = 0.38 + 0.2 * Math.sin(c * 0.53 + 2);
    if (dust.current) {
      const pos = dust.current.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * (state.reduced ? 0.035 : 0.07);
        if (y > 2.8) y = -1.6;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(c * 0.4 + i) * dt * 0.02);
      }
      pos.needsUpdate = true;
      dust.current.material.opacity = 0.14 + (state.reduced ? 0.035 : 0.08) * Math.sin(c * 0.8);
    }
  });

  return (
    <>
      <points ref={starA} geometry={starGeo} material={starMat} frustumCulled={false} />
      <points ref={starB} geometry={starGeo} material={starMat.clone()} frustumCulled={false} />
      <points ref={dust} geometry={dustGeo} material={dustMat} frustumCulled={false} />
    </>
  );
}

/* --------------------------- ZZZ sprites ---------------------------- */
function Zzz() {
  const group = useRef();
  const sprites = useRef([]);
  const op = useRef(0);
  const tex = useMemo(() => zzzTexture(), []);
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false,
      }),
    [tex]
  );

  useFrame((st, dt) => {
    const s = state;
    const L = s.layout;
    if (!L || !group.current) return;
    const clock = st.clock.elapsedTime;
    let target = 0;
    if (s.phase === "sleep") target = 1;
    else if (s.phase === "settle") target = seg(s.t, 0.72, 1);
    else if (s.phase === "waking") target = 1 - easeInOut(s.t);
    op.current = lerp(op.current, target, 1 - Math.exp(-dt * 3.5));

    // Keep sleep glyphs tucked beside the cloud. On desktop the CTA sits
    // above/right of the launcher, so place the Zs to the left and limit
    // their rise; the old long float carried them across the CTA button.
    const hx = L.home.x + (L.mobile ? 0.65 : -0.18);
    const hy = L.cloudTop + (L.mobile ? 0.08 : 0.18);
    group.current.position.set(hx, hy, 0.3);
    sprites.current.forEach((sp, i) => {
      if (!sp) return;
      const cyc = (clock * 0.42 + i / 3) % 1;
      const float = 0.36 * (s.reduced ? 0.68 : 1);
      sp.position.set(0.05 + i * 0.09 + cyc * 0.22, cyc * float, 0);
      const sc = 0.14 + cyc * 0.12;
      sp.scale.set(sc, sc, sc);
      sp.material.opacity = op.current * Math.sin(Math.PI * cyc) * 0.9;
    });
  });

  return (
    <group ref={group}>
      {[0, 1, 2].map((i) => (
        <sprite key={i} ref={(el) => (sprites.current[i] = el)} material={mat.clone()} />
      ))}
    </group>
  );
}

/* --------- Hologram particles ---------- */
function Hologram() {
  const holoPts = useRef();
  const { camera } = useThree();

  /* holographic particles hovering in the projection column */
  const holoCount = state.reduced ? 28 : 70;
  const holoGeo = useMemo(() => {
    const n = holoCount;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.12 + Math.random() * 0.34;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.random() * 1.5;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [holoCount]);
  const holoMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#9ff4ff", size: 0.032, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    []
  );

  const anchor = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const projectionPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.45), []);
  const projectionPoint = useMemo(() => new THREE.Vector3(), []);

  useFrame((st, dt) => {
    const s = state;
    const L = s.layout;
    if (!L) return;
    const clock = st.clock.elapsedTime;
    let hasProjectionPixel = false;
    if (s.projectionPixel) {
      ndc.set((s.projectionPixel.x / L.w) * 2 - 1, 1 - (s.projectionPixel.y / L.h) * 2);
      camera.updateMatrixWorld();
      raycaster.setFromCamera(ndc, camera);
      hasProjectionPixel = !!raycaster.ray.intersectPlane(projectionPlane, projectionPoint);
    }
    if (hasProjectionPixel) anchor.copy(projectionPoint);
    else anchor.set(L.beamAnchor.x, L.beamAnchor.y, 0.45);

    let screenProgress = 0;
    if (s.phase === "arrive") screenProgress = seg(s.t, 0.08, 0.78);
    else if (s.phase === "project") screenProgress = seg(s.t, 0.03, 0.82);
    else if (s.phase === "chat") screenProgress = 1;
    else if (s.phase === "goodnight") screenProgress = 1 - seg(s.t, 0, 0.2);
    else if (s.phase === "dissolve") screenProgress = 1 - seg(s.t, 0, 1);
    // Holographic particles collect around the exact projected chat point.
    if (holoPts.current) {
      holoPts.current.visible = screenProgress > 0.01;
      holoPts.current.position.set(anchor.x, anchor.y - 0.75, anchor.z + 0.12);
      holoPts.current.rotation.y = clock * 0.5;
      holoMat.opacity = screenProgress * (0.4 + Math.sin(clock * 3) * 0.1);
      const col = holoGeo.attributes.position;
      for (let i = 0; i < col.count; i++) {
        let y = col.getY(i) + dt * 0.35;
        if (y > 1.5) y = 0;
        col.setY(i, y);
      }
      col.needsUpdate = true;
    }
  });

  return (
    <points ref={holoPts} geometry={holoGeo} material={holoMat} visible={false} frustumCulled={false} />
  );
}

/* ------------------------------ Scene ------------------------------- */

function SceneContent() {
  const puffs = useRef(null);
  const onStep = useCallback((pos, big) => {
    window.__tctSteps = (window.__tctSteps || 0) + 1; // debug bridge
    puffs.current && puffs.current.spawn(pos, big);
  }, []);

  const L = state.layout;
  const reduced = state.reduced;

  return (
    <>
      <StudioReflections />
      <CameraRig />
      <Lights />
      <Zzz />
      <CloudContactShadow />
      <VolumetricCloud />
      <Robot onStep={onStep} />
      <Hologram />
      <StepPuffs ref={puffs} />
      <Burst />
    </>
  );
}

export default function Scene({ onFail }) {
  const glOptions = LOW_POWER
    ? {
      antialias: false,
      alpha: true,
      powerPreference: "default",
      toneMapping: THREE.ACESFilmicToneMapping,
      outputColorSpace: THREE.SRGBColorSpace,
    }
    : {
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      toneMapping: THREE.ACESFilmicToneMapping,
      outputColorSpace: THREE.SRGBColorSpace,
    };
  return (
    <Canvas
      dpr={LOW_POWER ? [0.9, 1.25] : [1, 1.35]}
      // Let R3F own one render clock. A second manual rAF/timer driver can
      // interleave frames with GSAP and produce visible pose/camera jitter.
      frameloop="always"
      shadows
      resize={{ polyfill: TimerResizeObserver }}
      gl={glOptions}
      camera={{ fov: 42, position: [0, 0.9, 8.6], near: 0.1, far: 60 }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearAlpha(0);
        window.__tct3dGl = gl;
        window.__tct3dScene = scene;
        window.__tct3dCam = camera;
        /* iOS kills WebGL contexts aggressively (memory pressure, backgrounding,
           Lockdown Mode). Hand the failure to the parent so the CSS robot can
           take over instead of leaving an empty corner. */
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault?.();
          onFail?.("context-lost");
        });
      }}
      style={{ pointerEvents: "none" }}
    >
      <SceneContent />
    </Canvas>
  );
}
