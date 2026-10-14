import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinnedScene } from "three/addons/utils/SkeletonUtils.js";
import { state } from "./store.js";
import { findHumanClip, missingHumanNodes, HUMAN_GLB_URL } from "./robotAsset.js";

/* A compatible authored GLB can be loaded through robotAsset.js. This source
 * currently uses a procedural human because no rigged character asset is
 * installed in public/. Both sources share this phase controller. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

/*
 * The previous GLB's pivots and several body pieces were separated in the
 * exported file. Build the mascot from smooth shared primitives so every
 * animated part has a real, connected joint and the two optics stay separate.
 * This also keeps the asset self-contained and fast to load on mobile.
 */
export function createProceduralHumanCharacter() {
  const root = new THREE.Group();
  root.name = "TCTFashionGuide";

  const skin = new THREE.MeshStandardMaterial({ color: "#d59a78", roughness: 0.72 });
  const skinLight = new THREE.MeshStandardMaterial({ color: "#e3ad8c", roughness: 0.68 });
  const hair = new THREE.MeshStandardMaterial({ color: "#2b2028", roughness: 0.76 });
  const shirt = new THREE.MeshStandardMaterial({ color: "#d93471", roughness: 0.72 });
  const shirtLight = new THREE.MeshStandardMaterial({ color: "#f05b91", roughness: 0.76 });
  const denim = new THREE.MeshStandardMaterial({ color: "#29456c", roughness: 0.82 });
  const denimLight = new THREE.MeshStandardMaterial({ color: "#3e5f89", roughness: 0.8 });
  const shoe = new THREE.MeshStandardMaterial({ color: "#312a31", roughness: 0.78 });
  const eyeWhite = new THREE.MeshStandardMaterial({ color: "#fff7ef", roughness: 0.48 });
  const pupil = new THREE.MeshStandardMaterial({ color: "#39251f", roughness: 0.38 });
  const trim = new THREE.MeshStandardMaterial({ color: "#ffe4ec", roughness: 0.72 });
  const logoTexture = new THREE.TextureLoader().load("/tct-logo.png");
  logoTexture.colorSpace = THREE.SRGBColorSpace;
  logoTexture.anisotropy = 4;

  const sphere = new THREE.SphereGeometry(1, 32, 24);
  const capsule = (radius, length) => new THREE.CapsuleGeometry(radius, length, 6, 16);
  const add = (parent, name, geometry, material, position, scale, rotation) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    if (position) mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const group = (parent, name, position) => {
    const node = new THREE.Group();
    node.name = name;
    if (position) node.position.set(...position);
    parent.add(node);
    return node;
  };

  // A soft tee and a small studio logo replace the plated mechanical chest.
  const torso = group(root, "Torso shell", [0, 1.12, 0]);
  add(torso, "TCT guide tee", capsule(0.33, 0.36), shirt, [0, 0.02, 0], [1, 1.12, 0.88]);
  add(torso, "Tee collar", new THREE.TorusGeometry(0.13, 0.018, 10, 32), trim,
    [0, 0.47, 0], [1, 1, 0.78], [Math.PI / 2, 0, 0]);
  const chest = group(torso, "TCT badge frame", [0, 0.1, 0.295]);
  add(chest, "TCT printed shirt logo", new THREE.PlaneGeometry(0.24, 0.19),
    new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false }), [0, 0, 0]);
  add(root, "Pelvis shell", capsule(0.24, 0.12), denim, [0, 0.62, 0], [1.1, 1, 0.86]);

  // Human face, dark swept hair, visible ears, eyes, brows and a subtle nose.
  const head = group(root, "HeadPivot", [0, 1.99, 0]);
  add(head, "Face", sphere, skinLight, [0, 0, 0], [0.33, 0.4, 0.3]);
  const hairCap = new THREE.SphereGeometry(1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58);
  add(head, "Hair crown", hairCap, hair, [0, 0.12, -0.025], [0.342, 0.36, 0.315]);
  add(head, "Swept fringe", sphere, hair, [0, 0.23, 0.225], [0.29, 0.085, 0.095], [0, 0, -0.08]);
  for (const side of [-1, 1]) {
    add(head, `Ear ${side}`, sphere, skin, [side * 0.325, -0.01, 0.005], [0.067, 0.105, 0.08]);
    add(head, `Eye white ${side}`, sphere, eyeWhite, [side * 0.112, 0.06, 0.255], [0.057, 0.044, 0.025]);
    const eye = group(head, side < 0 ? "EyeLeft" : "EyeRight", [side * 0.112, 0.06, 0.278]);
    add(eye, `Warm brown eye ${side}`, sphere, pupil, [0, 0, 0], [0.022, 0.027, 0.012]);
    const closed = group(head, side < 0 ? "EyeClosedLeft" : "EyeClosedRight", [side * 0.112, 0.052, 0.285]);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.04, 0.008, 0), new THREE.Vector3(-0.025, -0.014, 0),
      new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0.025, -0.014, 0),
      new THREE.Vector3(0.04, 0.008, 0),
    ]);
    add(closed, `Closed eyelid ${side}`, new THREE.TubeGeometry(curve, 18, 0.006, 8, false), hair);
    add(head, `Natural brow ${side}`, capsule(0.012, 0.055), hair,
      [side * 0.112, 0.132, 0.267], [1, 0.45, 1], [0, 0, side * -0.08]);
  }
  add(head, "Nose", sphere, skin, [0, -0.015, 0.293], [0.031, 0.052, 0.034]);
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.055, -0.105, 0), new THREE.Vector3(-0.03, -0.12, 0),
    new THREE.Vector3(0, -0.124, 0), new THREE.Vector3(0.03, -0.12, 0),
    new THREE.Vector3(0.055, -0.105, 0),
  ]);
  add(head, "Natural smile", new THREE.TubeGeometry(smileCurve, 20, 0.006, 8, false),
    new THREE.MeshStandardMaterial({ color: "#9c514d", roughness: 0.7 }), [0, 0, 0.299]);

  // Shirt sleeves, articulated forearms and hands.
  for (const [side, label] of [[-1, "L"], [1, "R"]]) {
    const arm = group(root, `Arm_${label}`, [side * 0.37, 1.45, 0]);
    add(arm, `Tee sleeve ${label}`, capsule(0.12, 0.12), shirtLight, [0, -0.11, 0], [1, 1, 0.92]);
    add(arm, `Upper arm ${label}`, capsule(0.088, 0.23), skin, [0, -0.29, 0], [1, 1, 0.9]);
    const elbow = group(arm, `Elbow_${label}`, [0, -0.44, 0]);
    add(elbow, `Forearm ${label}`, capsule(0.075, 0.25), skinLight, [0, -0.17, 0], [1, 1, 0.92]);
    add(elbow, `Hand ${label}`, sphere, skinLight, [0, -0.34, 0.025], [0.09, 0.11, 0.075]);
    for (let finger = 0; finger < 3; finger++) {
      add(elbow, `Finger ${label}-${finger + 1}`, capsule(0.018, 0.035), skinLight,
        [(finger - 1) * 0.036, -0.42, 0.045], [1, 1, 0.9]);
    }

    const leg = group(root, `Leg_${label}`, [side * 0.16, 0.64, 0]);
    add(leg, `Denim thigh ${label}`, capsule(0.115, 0.21), denim, [0, -0.16, 0], [1, 1, 0.94]);
    const knee = group(leg, `Knee_${label}`, [0, -0.33, 0]);
    add(knee, `Denim shin ${label}`, capsule(0.09, 0.28), denimLight, [0, -0.18, 0], [1, 1, 0.96]);
    const foot = group(knee, `Foot_${label}`, [0, -0.35, 0.035]);
    add(foot, `Shoe upper ${label}`, sphere, shoe, [0, 0.015, 0.085], [0.13, 0.075, 0.19]);
    add(foot, `Shoe sole ${label}`, sphere, trim, [0, -0.045, 0.09], [0.134, 0.025, 0.195]);
  }

  root.userData.materials = { skin, skinLight, hair, shirt, denim, denimLight, shoe, eyeWhite, pupil, trim, logoTexture };
  return root;
}
function disposeRobotModel(model) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  model.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => {
      if (!material) return;
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value?.isTexture) textures.add(value);
      });
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

/* The canonical sleeping pose — legs crossed, arm behind head, eyes shut. */
const SLEEP = {
  // Lie on the cloud with the head high/right and one boot crossed over the other.
  yaw: 0, recline: -0.12, bodyZ: -1.04, bodyX: 0,
  chestY: 0, ankleLX: 0, ankleRX: 0,
  headX: 0.34, headY: 0, headZ: 0.06,
  eyeOpen: 0, eyeHappy: 0, eyeGlow: 0.3, mouth: 0, antenna: 0.12,
  armLZ: 0.42, armLX: 0.12, elbowLX: -0.28, elbowLZ: 0,
  armRZ: -0.48, armRX: -0.22, elbowRX: -0.78, elbowRZ: -0.12,
  hipLX: 1.12, kneeLX: -0.18, hipLZ: 0.32, kneeLZ: 0,
  hipRX: 1.08, kneeRX: -0.52, hipRZ: -0.58, kneeRZ: 0.24,
};

function basePose() {
  return {
    yaw: 0, recline: 0, bodyZ: 0, bodyX: 0,
    chestY: 0, ankleLX: 0, ankleRX: 0,
    headX: 0, headY: 0, headZ: 0,
    eyeOpen: 1, eyeHappy: 0, eyeGlow: 2.2, mouth: 0, antenna: 0.4,
    armLZ: 0.16, armLX: 0, elbowLX: -0.18, elbowLZ: 0,
    armRZ: -0.16, armRX: 0, elbowRX: -0.18, elbowRZ: 0,
    hipLX: 0.06, kneeLX: -0.08, hipLZ: 0, kneeLZ: 0,
    hipRX: 0.06, kneeRX: -0.08, hipRZ: 0, kneeRZ: 0,
  };
}

export default function Robot({ onStep }) {
  const root = useRef();
  const recline = useRef();
  const placeholder = useMemo(() => createProceduralHumanCharacter(), []);
  const [riggedAsset, setRiggedAsset] = useState(null);
  const model = riggedAsset?.model || placeholder;

  useEffect(() => {
    if (!HUMAN_GLB_URL) return undefined;
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      HUMAN_GLB_URL,
      (gltf) => {
        const imported = cloneSkinnedScene(gltf.scene);
        const missing = missingHumanNodes(imported);
        if (missing.length) {
          console.warn(`[TCT mascot] Human GLB rig is missing required nodes: ${missing.join(", ")}. Using the procedural human guide.`);
          disposeRobotModel(imported);
          return;
        }
        if (cancelled) {
          disposeRobotModel(imported);
          return;
        }
        imported.name = "RiggedTCTCharacter";
        setRiggedAsset({ model: imported, animations: gltf.animations || [] });
      },
      undefined,
      (error) => {
        if (!cancelled) console.warn(`[TCT mascot] Could not load ${HUMAN_GLB_URL}. Using the procedural human guide.`, error);
      }
    );
    return () => { cancelled = true; };
  }, []);

  const mixer = useMemo(
    () => riggedAsset ? new THREE.AnimationMixer(model) : null,
    [riggedAsset, model]
  );
  const activeAction = useRef(null);
  const activeClip = useRef(null);
  useEffect(() => {
    activeAction.current = null;
    activeClip.current = null;
    return () => {
      mixer?.stopAllAction();
      if (mixer) mixer.uncacheRoot(model);
    };
  }, [mixer, model]);
  const getNode = (name) => {
    const exact = model.getObjectByName(name);
    if (exact) return exact;
    const key = name.replace(/[ _-]+/g, "").toLowerCase();
    let match;
    model.traverse((object) => {
      if (!match && object.name.replace(/[ _-]+/g, "").toLowerCase() === key) match = object;
    });
    return match;
  };
  const body = useMemo(() => ({ current: getNode("Torso shell") || getNode("TorsoPivot") }), [model]);
  const chest = useMemo(() => ({ current: getNode("TCT badge frame") || getNode("TorsoPivot") }), [model]);
  const head = useMemo(() => ({ current: getNode("HeadPivot") }), [model]);
  const eyeL = useMemo(() => ({ current: getNode("EyeLeft") }), [model]);
  const eyeR = useMemo(() => ({ current: getNode("EyeRight") }), [model]);
  const arcL = useMemo(() => ({ current: getNode("EyeClosedLeft") }), [model]);
  const arcR = useMemo(() => ({ current: getNode("EyeClosedRight") }), [model]);
  const armL = useMemo(() => ({ current: getNode("Arm_L") }), [model]);
  const elbowL = useMemo(() => ({ current: getNode("Elbow_L") }), [model]);
  const armR = useMemo(() => ({ current: getNode("Arm_R") }), [model]);
  const elbowR = useMemo(() => ({ current: getNode("Elbow_R") }), [model]);
  const legL = useMemo(() => ({ current: getNode("Leg_L") }), [model]);
  const kneeL = useMemo(() => ({ current: getNode("Knee_L") }), [model]);
  const legR = useMemo(() => ({ current: getNode("Leg_R") }), [model]);
  const kneeR = useMemo(() => ({ current: getNode("Knee_R") }), [model]);
  const footL = useMemo(() => ({ current: getNode("Foot_L") }), [model]);
  const footR = useMemo(() => ({ current: getNode("Foot_R") }), [model]);
  const rigReady = [
    body, chest, head, eyeL, eyeR, arcL, arcR, armL, elbowL, armR, elbowR,
    legL, kneeL, legR, kneeR, footL, footR,
  ].every((node) => node.current);
  const mouth = useMemo(() => ({ current: new THREE.Mesh(
    new THREE.TorusGeometry(0.052, 0.009, 8, 24, Math.PI),
    new THREE.MeshBasicMaterial({ color: "#a85257", transparent: true, opacity: 0, toneMapped: false })
  ) }), []);
  const modelGenerations = useRef(new WeakMap());

  useEffect(() => {
    const generation = (modelGenerations.current.get(model) || 0) + 1;
    modelGenerations.current.set(model, generation);
    return () => {
      // Delay disposal by a microtask: StrictMode immediately re-runs effects
      // for the same model, while a real model swap/unmount leaves it unused.
      const cleanupGeneration = (modelGenerations.current.get(model) || 0) + 1;
      modelGenerations.current.set(model, cleanupGeneration);
      queueMicrotask(() => {
        if (modelGenerations.current.get(model) !== cleanupGeneration) return;
        disposeRobotModel(model);
      });
    };
  }, [model]);

  const mat = useMemo(() => {
    let eye = null;
    model.traverse((object) => {
      if (!object.isMesh) return;
      if (!eye && object.parent?.name === "EyeLeft") eye = object.material;
    });
    eye ||= new THREE.MeshStandardMaterial({ color: "#39251f", roughness: 0.38 });
    // Keep both pupils on one warm, natural material for the blink animation.
    for (const side of ["Left", "Right"]) {
      const group = getNode(`Eye${side}`);
      group?.traverse((object) => { if (object.isMesh) object.material = eye; });
    }
    const arc = eye.clone();
    arc.transparent = true;
    arc.opacity = 0;
    arc.depthWrite = false;
    arc.toneMapped = false;
    for (const side of ["EyeClosedLeft", "EyeClosedRight"]) {
      getNode(side)?.traverse((object) => { if (object.isMesh) object.material = arc; });
    }
    return { eye, arc };
  }, [model]);

  useEffect(() => {
    mouth.current.position.set(0, -0.12, 0.302);
    mouth.current.rotation.z = Math.PI;
    head.current?.add(mouth.current);
    return () => {
      head.current?.remove(mouth.current);
      mouth.current?.geometry?.dispose();
      mouth.current?.material?.dispose();
    };
  }, [model, head, mouth]);

  const cur = useRef({ ...SLEEP, px: 0, py: 0, pz: 0, scale: 0, initialized: false });
  const blink = useRef({ next: 2.5, active: 0 });
  const stepIdx = useRef(0);
  const lastPh = useRef("sleep");
  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const eyeWorldL = useMemo(() => new THREE.Vector3(), []);
  const eyeWorldR = useMemo(() => new THREE.Vector3(), []);

  useFrame((st, dtRaw) => {
    const s = state;
    const L = s.layout;
    if (!L || !root.current || !rigReady) return;
    const dt = Math.min(Math.max(dtRaw, 0), 0.05);
    const clock = st.clock.elapsedTime;
    const t = s.t;
    const e = easeInOut(t);
    const compactScale = L.mascotScale ?? (L.compact ? 0.42 : 0.62);
    const displayScale = L.activeMascotScale ?? (L.compact ? 0.5 : L.mobile ? 0.68 : 0.95);
    // Keep the human guide's shoe soles just above the floor plane.
    // This clearance scales with the guide on compact screens.
    const lift = 0.075 * displayScale;

    /* ---------------- compute target pose per phase ---------------- */
    const T = basePose();
    let px = L.home.x, py = L.cloudTop + 0.18, pz = 0.1;
    let contactFoot = null;
    // gentle shared float — kept in perfect sync with the cloud's own bob
    const motionFactor = s.reduced ? 0.58 : 1;
    const bob = Math.sin(clock * 0.55) * 0.02 * motionFactor;
    const onCloud = ["sleep", "waking", "stretch", "board", "settle"].includes(s.phase);

    /* Place the tilted torso shell directly on the compressed cloud surface.
       Both terms scale with the responsive model/cloud size, so the contact
       stays correct on desktop and compact phone layouts. */
    const sleepAngle = SLEEP.bodyZ;
    const torsoHalfY = Math.sqrt(
      (0.43 * Math.sin(sleepAngle)) ** 2 + (0.54 * Math.cos(sleepAngle)) ** 2
    ) * compactScale;
    const compressedCloudTop = L.home.y + 0.56 * L.cloudR * 0.915;
    const restOffset = torsoHalfY - (L.cloudTop - compressedCloudTop);
    const SLEEP_Y = L.cloudTop - 1.12 * compactScale + restOffset;

    if (s.phase === "sleep") {
      Object.assign(T, SLEEP);
      py = SLEEP_Y + bob;
      px = L.home.x; pz = 0.18;
      // A cozy, visible breathing cycle with small sleepy head/antenna motion.
      // These stay subtle so the crossed-leg resting pose remains readable.
      const sleepBreath = Math.sin(clock * 0.82);
      T.bodyZ += sleepBreath * 0.008 * motionFactor;
      T.headZ += Math.sin(clock * 0.34 + 0.8) * 0.02 * motionFactor;
      T.headX += Math.sin(clock * 0.28) * 0.012 * motionFactor;
      T.antenna += Math.sin(clock * 0.62 + 0.4) * 0.045 * motionFactor;
      T.armLZ += Math.sin(clock * 0.41) * 0.012 * motionFactor;
      T.armRZ -= Math.sin(clock * 0.41 + 0.6) * 0.012 * motionFactor;
      const sleepyFootTwitch = Math.pow(Math.max(0, Math.sin(clock * 0.43 + 1.4)), 20);
      T.kneeRX += sleepyFootTwitch * 0.05 * motionFactor;
      T.elbowLX -= sleepyFootTwitch * 0.025 * motionFactor;
    } else if (s.phase === "waking") {
      Object.assign(T, SLEEP);
      py = SLEEP_Y + bob;
      px = L.home.x; pz = 0.18;
      // sit up a little, eyes open with a curious look around
      const up = easeInOut(seg(t, 0.15, 1));
      T.recline = lerp(SLEEP.recline, -0.2, up);
      T.headX = lerp(SLEEP.headX, 0.05, up);
      // Open the eyes toward the visitor instead of scanning off to the side.
      T.headY = lerp(SLEEP.headY, 0, easeInOut(seg(t, 0.2, 0.78)));
      T.headZ = lerp(SLEEP.headZ, 0, up);
      T.eyeOpen = seg(t, 0.3, 0.72); // slow, cinematic eye opening
      T.eyeGlow = lerp(0.3, 2.0, seg(t, 0.3, 0.9));
      T.hipLX = lerp(SLEEP.hipLX, 1.0, up);
      T.hipRX = lerp(SLEEP.hipRX, 0.85, up);
      T.hipRZ = lerp(SLEEP.hipRZ, -0.2, up);
      T.kneeRX = lerp(SLEEP.kneeRX, -0.5, up);
      T.armRZ = lerp(SLEEP.armRZ, -1.6, up);
      T.elbowRX = lerp(SLEEP.elbowRX, -1.1, up);
      T.antenna = lerp(0.12, 0.7, seg(t, 0.25, 0.9));
    } else if (s.phase === "stretch") {
      const sitUp = easeInOut(seg(t, 0, 0.72));
      py = lerp(SLEEP_Y, L.cloudTop - 0.08, sitUp) + bob + 0.04 * Math.sin(Math.PI * t);
      pz = lerp(0.18, 0.05, e);
      T.recline = lerp(-0.2, 0, e);
      T.yaw = lerp(SLEEP.yaw, 0, e);
      const up = Math.sin(Math.PI * Math.min(t * 1.15, 1)); // arms up & back down
      T.armLZ = lerp(SLEEP.armLZ, 0.16 + 2.6 * up, e);
      T.armRZ = lerp(SLEEP.armRZ, -0.16 - 2.6 * up, e);
      T.elbowLX = lerp(SLEEP.elbowLX, -0.3 * up, e);
      T.elbowRX = lerp(SLEEP.elbowRX, -0.3 * up, e);
      T.headX = 0.22 * up;
      T.hipLX = lerp(1.0, 0.06, e); T.hipRX = lerp(0.85, 0.06, e);
      T.hipRZ = lerp(-0.2, 0, e);
      T.kneeLX = lerp(-0.28, -0.08, e); T.kneeRX = lerp(-0.5, -0.08, e);
      T.eyeOpen = 1; T.eyeGlow = 2.1; T.eyeHappy = 0.4;
      T.antenna = 0.8;
    } else if (s.phase === "transform") {
      // rises off the cloud, legs dangle, then settles to walk height
      const rise = easeInOut(seg(t, 0, 0.54));
      const stand = easeInOut(seg(t, 0.62, 0.98));
      py = lerp(L.cloudTop - 0.08, L.floorY + lift, easeInOut(seg(t, 0, 0.95)));
      px = L.home.x; pz = 0.05;
      T.yaw = 0;
      T.recline = lerp(0, 0.08, stand);
      T.hipLX = lerp(lerp(0.06, 0.42, rise), 0.1 + Math.sin(clock * 1.6) * 0.04, stand);
      T.hipRX = lerp(lerp(0.06, 0.42, rise), 0.1 + Math.sin(clock * 1.6 + 1.7) * 0.04, stand);
      T.kneeLX = lerp(lerp(-0.08, -0.55, rise), -0.12, stand);
      T.kneeRX = lerp(lerp(-0.08, -0.55, rise), -0.12, stand);
      T.armLZ = lerp(lerp(0.16, 0.35, rise), 0.16, stand);
      T.armRZ = lerp(lerp(-0.16, -0.35, rise), -0.16, stand);
      T.eyeGlow = 2.2; T.antenna = 1;
    } else if (s.phase === "walk" || s.phase === "walkback") {
      const homeFloor = { x: L.home.x, y: L.floorY + lift };
      const from = s.phase === "walk" ? homeFloor : { x: L.stage.x, y: L.stage.y + lift };
      const to = s.phase === "walk" ? { x: L.stage.x, y: L.stage.y + lift } : homeFloor;
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      px = lerp(from.x, to.x, e);
      // Round to a whole number of alternating foot contacts so the stride
      // lands cleanly when the travel phase ends.
      // Keep stride length consistent and finish on a balanced pair of steps.
      let halfSteps = Math.max(4, Math.round(dist / 0.56));
      if (halfSteps % 2) halfSteps += 1;
      const cyc = e * halfSteps * Math.PI;
      const gait = s.reduced ? 0.72 : 1;
      // cinematic gait bounce: a smooth double-frequency sine that bottoms
      // out EXACTLY at each foot contact (puffs spawn at the lowest point,
      // feet on the ground) and crests midway through the stride — the old
      // |cos| shape peaked AT contact and had jerk cusps.
      py = lerp(from.y, to.y, e) + (1 - Math.cos(2 * cyc)) * 0.016 * gait;
      pz = 0.05;
      const turnIn = easeInOut(seg(e, 0, 0.14));
      const turnOut = easeInOut(seg(e, 0.84, 1));
      // Turn only as much as the route moves across the screen. On a phone
      // the route is mostly vertical, so the robot keeps its face toward us.
      const turnAngle = clamp(Math.atan2(to.x - from.x, Math.max(Math.abs(to.y - from.y), 0.18)), -1.0, 1.0);
      T.yaw = lerp(turnAngle * turnIn, 0, turnOut);
      T.recline = 0.08;
      T.bodyZ = Math.sin(cyc) * 0.045 * gait; // hip roll — weight shifts over the stance foot
      T.bodyX = Math.sin(cyc) * 0.015 * gait;
      T.hipLX = 0.1 + Math.sin(cyc) * 0.48 * gait;
      T.hipRX = 0.1 + Math.sin(cyc + Math.PI) * 0.48 * gait;
      /* knee phase: the swing-leg bend must happen BETWEEN contacts, not at
         them — L bends during its swing (ph π→2π), R during its own. The old
         shared phase flexed the stance knee at every footfall (crouch-walk). */
      T.kneeLX = -0.12 - Math.max(0, Math.sin(cyc - Math.PI + 1.1)) * 0.7 * gait;
      T.kneeRX = -0.12 - Math.max(0, Math.sin(cyc + 1.1)) * 0.7 * gait;
      T.armLX = Math.sin(cyc + Math.PI) * 0.5 * gait;
      T.armRX = Math.sin(cyc) * 0.5 * gait;
      // elbow pump: the forearm folds on the forward swing
      T.elbowLX = -0.3 - Math.max(0, Math.sin(cyc)) * 0.28;
      T.elbowRX = -0.3 - Math.max(0, Math.sin(cyc + Math.PI)) * 0.28;
      T.headX = 0.06 + (1 - Math.cos(2 * cyc)) * 0.012;
      // head + shoulders counter-rotate against the hip roll, keeping the gaze level
      T.headZ = -Math.sin(cyc) * 0.03;
      T.chestY = -Math.sin(cyc) * 0.11;
      T.eyeGlow = 2.0;
      T.antenna = 0.7 + Math.sin(clock * 6) * 0.15;

      /* landing anticipation & push-off — per-foot stride phase (contact at
         ph ≡ 0): reach forward + straighten + toe-up just before the foot
         plants, then absorb (knee flex) and toe-down push-off right after. */
      const TAU = Math.PI * 2;
      const phL = ((cyc % TAU) + TAU) % TAU;
      const phR = (((cyc - Math.PI) % TAU) + TAU) % TAU;
      const preL = Math.pow(seg(phL, TAU - 0.6, TAU - 0.05), 1.5);
      const preR = Math.pow(seg(phR, TAU - 0.6, TAU - 0.05), 1.5);
      const postL = 1 - seg(phL, 0.05, 0.9);
      const postR = 1 - seg(phR, 0.05, 0.9);
      const pushL = 1 - seg(phL, 0.45, 1.35);
      const pushR = 1 - seg(phR, 0.45, 1.35);
      T.hipLX -= preL * 0.16;
      T.hipRX -= preR * 0.16;
      T.kneeLX += preL * 0.1 - postL * 0.2;
      T.kneeRX += preR * 0.1 - postR * 0.2;
      T.ankleLX = -0.2 * preL + 0.15 * pushL;
      T.ankleRX = -0.2 * preR + 0.15 * pushR;

      /* foot contacts — distance-driven, so puffs can never desync from
         the stride even when time is fast-forwarded */
      const idx = Math.floor(cyc / Math.PI);
      if (s.phase !== lastPh.current) stepIdx.current = 0;
      if (idx !== stepIdx.current) {
        stepIdx.current = idx;
        // At the first half-stride the left foot lands; then alternate.
        contactFoot = idx % 2 === 1 ? footL.current : footR.current;
      }
    } else if (s.phase === "arrive" || s.phase === "project") {
      px = L.stage.x; py = L.stage.y + lift; pz = 0;
      T.yaw = 0;
      T.recline = 0;
      T.eyeGlow = s.phase === "project" ? lerp(2.5, 3.2, e) : lerp(2.0, 2.5, e);
      T.mouth = s.phase === "project" ? 0.7 : 0;
      T.antenna = 1;
      T.headY = clamp((L.beamAnchor.x - px) * 0.5, -0.45, 0.45) * easeInOut(t);
      T.armLZ = lerp(0.16, 0.22, e); T.armRZ = lerp(-0.16, -0.22, e);
    } else if (s.phase === "chat") {
      px = L.stage.x; py = L.stage.y + lift; pz = 0;
      // friendly idle: watches the hologram, glances at the visitor, thinking states
      const lookAtHolo = clamp((L.beamAnchor.x - px) * 0.5, -0.45, 0.45);
      T.headY = s.thinking ? lookAtHolo * 0.4 - 0.06 : lookAtHolo * 0.65 + Math.sin(clock * 0.6) * 0.06;
      T.headX = 0.05 + Math.sin(clock * 0.4) * 0.04 - (s.thinking ? 0.08 : 0);
      T.headZ = s.thinking ? 0.16 : Math.sin(clock * 0.33) * 0.03;
      T.eyeHappy = s.thinking ? 0 : 0.3; // soft friendly face
      T.eyeGlow = s.thinking ? 2.9 + Math.sin(clock * 7) * 0.7 : 2.2 + Math.sin(clock * 2) * 0.25;
      T.mouth = s.thinking ? 0.82 : 0.62;
      T.antenna = s.thinking ? 0.8 + Math.sin(clock * 9) * 0.2 : 0.4 + Math.sin(clock * 2.4) * 0.15;
      T.armLZ = 0.2; T.armRZ = -0.2;
      if (s.thinking) { T.elbowRX = -0.55; T.armRX = -0.25; } // little thinking hand raise
    } else if (s.phase === "goodnight") {
      px = L.stage.x; py = L.stage.y + lift; pz = 0;
      T.eyeHappy = 1; T.mouth = 1; T.eyeOpen = 1;
      T.eyeGlow = 2.6;
      T.headY = 0.1; T.headZ = -0.08;
      // friendly wave
      T.armRZ = -2.35; T.armRX = -0.2;
      T.elbowRZ = -0.35 + Math.sin(clock * 7) * 0.4;
      T.elbowRX = -0.35;
      T.armLZ = 0.2;
      T.antenna = 0.9;
    } else if (s.phase === "dissolve") {
      px = L.stage.x; py = L.stage.y + lift; pz = 0;
      const k = easeInOut(t);
      T.headY = lerp(clamp((L.beamAnchor.x - px) * 0.5, 0, 0.45), 0, k); // watches the hologram dissolve, then faces us
      T.eyeHappy = 1 - k; T.mouth = 1 - k;
      T.eyeGlow = lerp(2.6, 1.2, k);
      T.armRZ = lerp(-2.35, -0.18, k); T.elbowRZ = lerp(-0.35, 0, k);
      T.armLZ = lerp(0.2, 0.16, k);
      T.antenna = lerp(0.9, 0.4, k);
    } else if (s.phase === "board") {
      const k = easeInOut(t);
      // walkback has already brought the robot to the cloud edge; board only
      // performs the short climb-hop and never restarts travel from the stage.
      px = L.home.x;
      py = lerp(L.cloudTop + lift, SLEEP_Y, k) + Math.sin(Math.PI * t) * 0.24;
      pz = lerp(0.05, 0.18, k);
      T.yaw = lerp(0, SLEEP.yaw, easeInOut(seg(t, 0, 0.3)));
      T.recline = 0.08 * (1 - k);
      T.hipLX = lerp(0.06, 1.1, k); T.hipRX = lerp(0.06, 0.95, k);
      T.kneeLX = lerp(-0.08, -0.3, k); T.kneeRX = lerp(-0.08, -0.7, k);
      T.armRZ = lerp(-0.18, -1.8, k); T.elbowRX = lerp(-0.18, -1.4, k);
      T.eyeGlow = lerp(1.2, 0.8, k);
      T.headX = lerp(0, 0.1, k);
    } else if (s.phase === "settle") {
      Object.assign(T, SLEEP);
      const k = e;
      py = SLEEP_Y + bob;
      px = L.home.x; pz = 0.18;
      T.eyeOpen = 1 - seg(t, 0.45, 0.82); // eyes slowly close
      T.eyeGlow = lerp(0.8, 0.3, seg(t, 0.45, 1));
      T.antenna = lerp(0.4, 0.12, k);
      T.headX = lerp(0, SLEEP.headX, k);
      T.recline = lerp(0, SLEEP.recline, k);
    }

    // The lazy canvas can mount after the page is already visible. Put the
    // mascot directly in its current phase pose on frame one instead of
    // sliding it in from the canvas origin.
    const c = cur.current;
    if (!c.initialized) {
      Object.assign(c, T, { px, py, pz, scale: compactScale, initialized: true });
    }

    /* phase-entry events — landing puffs */
    if (s.phase !== lastPh.current) {
      if (s.phase === "settle" && lastPh.current === "board") {
        const v = tmpV;
        (footL.current || root.current).getWorldPosition(v);
        onStep && onStep(v, true); // big landing puff
      }
      lastPh.current = s.phase;
    }

    /* ---------------- blink (only while awake) ---------------- */
    const b = blink.current;
    let blinkCurve = 0;
    if (T.eyeOpen > 0.6) {
      if (clock > b.next) { b.active = 0.0001; b.next = clock + 2.4 + Math.random() * 3.2; }
      if (b.active > 0) {
        b.active += dt;
        if (b.active > 0.22) b.active = 0;
        else blinkCurve = Math.sin((b.active / 0.22) * Math.PI);
      }
    }

    /* ---------------- damp current pose toward target ---------------- */
    const k = 1 - Math.exp(-dt * 14); // pose damping
    const kp = 1 - Math.exp(-dt * 22); // position damping (snappier)
    for (const key of ["yaw", "recline", "bodyZ", "bodyX", "chestY", "headX", "headY", "headZ", "eyeOpen", "eyeHappy", "eyeGlow", "mouth", "antenna", "armLZ", "armLX", "elbowLX", "elbowLZ", "armRZ", "armRX", "elbowRX", "elbowRZ", "hipLX", "kneeLX", "hipLZ", "kneeLZ", "hipRX", "kneeRX", "hipRZ", "kneeRZ", "ankleLX", "ankleRX"]) {
      c[key] = lerp(c[key], T[key], k);
    }
    c.px = lerp(c.px, px, kp);
    c.py = lerp(c.py, py, kp);
    c.pz = lerp(c.pz, pz, kp);
    // self-heal: a NaN/huge transient (tab suspend, HMR…) can never fling
    // the robot away — snap back to the phase target
    if (!Number.isFinite(c.py) || Math.abs(c.py - py) > 40) {
      c.px = px; c.py = py; c.pz = pz;
    }
    // guarantee the final sleep pose is EXACTLY the initial one
    if (s.phase === "settle" && s.t > 0.995) {
      for (const key in SLEEP) c[key] = SLEEP[key];
      c.px = L.home.x; c.py = SLEEP_Y + bob; c.pz = 0.18;
    }

    /* ---------------- apply to the scene graph ---------------- */
    root.current.position.set(c.px, c.py, c.pz);
    root.current.rotation.y = c.yaw;
    let scaleGoal = compactScale;
    if (["transform", "walk", "walkback", "arrive", "project", "chat", "goodnight", "dissolve"].includes(s.phase)) {
      scaleGoal = displayScale;
    } else if (s.phase === "waking" || s.phase === "stretch") {
      scaleGoal = lerp(compactScale, displayScale, easeInOut(t));
    } else if (s.phase === "board" || s.phase === "settle") {
      scaleGoal = lerp(displayScale, compactScale, easeInOut(t));
    }
    c.scale = lerp(c.scale ?? scaleGoal, scaleGoal, 1 - Math.exp(-dt * 5));
    root.current.scale.setScalar(c.scale);
    recline.current.position.set(c.bodyX, 1.12, 0);
    recline.current.rotation.x = c.recline;
    recline.current.rotation.z = c.bodyZ;
    // breathing — calm and cinematic, the robot is alive (slightly deeper asleep)
    const brAmp = (onCloud && c.eyeOpen < 0.3 ? 0.026 : 0.012) * (s.reduced ? 0.68 : 1);
    const breath = Math.sin(clock * (onCloud ? 0.82 : 1.05));
    const br = 1 + brAmp * breath;
    body.current.scale.set(1, br, 1 + 0.45 * brAmp * breath);

    head.current.rotation.set(c.headX, c.headY, c.headZ);

    // Publish the two live, independent eye positions for the projector rig.
    eyeL.current.getWorldPosition(eyeWorldL);
    eyeR.current.getWorldPosition(eyeWorldR);
    Object.assign(s.eyeLeft, eyeWorldL);
    Object.assign(s.eyeRight, eyeWorldR);

    /* eyes: open = glowing capsules; asleep/happy = glowing smile arcs */
    const eyeScaleY = Math.max(0.05, c.eyeOpen * (1 - 0.94 * blinkCurve));
    eyeL.current.visible = c.eyeOpen > 0.05;
    eyeR.current.visible = c.eyeOpen > 0.05;
    eyeL.current.scale.y = eyeScaleY;
    eyeR.current.scale.y = eyeScaleY;
    const arcOp = Math.max(1 - seg(c.eyeOpen, 0.05, 0.55), c.eyeHappy);
    mat.arc.opacity = arcOp * 0.95;
    arcL.current.visible = arcOp > 0.04;
    arcR.current.visible = arcOp > 0.04;
    mouth.current.material.opacity = c.mouth;

    armL.current.rotation.set(c.armLX, 0, c.armLZ);
    armR.current.rotation.set(c.armRX, 0, c.armRZ);
    elbowL.current.rotation.set(c.elbowLX, 0, c.elbowLZ);
    elbowR.current.rotation.set(c.elbowRX, 0, c.elbowRZ);
    chest.current.rotation.y = c.chestY;
    footL.current.rotation.x = c.ankleLX;
    footR.current.rotation.x = c.ankleRX;

    legL.current.rotation.set(c.hipLX, 0, c.hipLZ);
    legR.current.rotation.set(c.hipRX, 0, c.hipRZ);
    kneeL.current.rotation.set(c.kneeLX, 0, c.kneeLZ);
    kneeR.current.rotation.set(c.kneeRX, 0, c.kneeRZ);

    // Authored clips are optional. A compatible GLB crossfades by state while
    // the scene controller keeps ownership of world travel and the fallback
    // procedural joint poses. Missing clip names leave the rigged joints on
    // the same procedural animation so the interaction never freezes.
    if (mixer && riggedAsset?.animations?.length) {
      const clip = findHumanClip(riggedAsset.animations, s.phase);
      const nextName = clip?.name || null;
      if (nextName !== activeClip.current) {
        activeAction.current?.fadeOut(0.22);
        activeAction.current = null;
        activeClip.current = nextName;
        if (clip) {
          const action = mixer.clipAction(clip);
          const loop = ["sleep", "walk", "walkback", "arrive", "chat"].includes(s.phase);
          action.reset();
          action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
          action.clampWhenFinished = !loop;
          action.fadeIn(0.22).play();
          activeAction.current = action;
        }
      }
      mixer.update(dt);
    }

    // Read the contact after this frame's root and joint transforms have been
    // applied. That keeps each puff under the landing boot, even on mobile
    // routes that climb diagonally from the cloud toward the center.
    if (contactFoot) {
      root.current.updateMatrixWorld(true);
      contactFoot.getWorldPosition(tmpV);
      tmpV.y -= 0.04;
      onStep && onStep(tmpV, false);
    }
  });

  return (
    <group ref={root}>
      <group ref={recline} position={[0, 1.12, 0]}>
        <primitive object={model} position={[0, -1.12, 0]} />
      </group>
    </group>
  );
}
