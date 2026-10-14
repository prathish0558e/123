import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createProceduralHumanCharacter } from "./Robot.jsx";

function WalkingGuide({ phase, facing, bagOpacity }) {
  const model = useMemo(() => createProceduralHumanCharacter(), []);
  const gait = useRef(0);
  const bagFade = useRef(0);
  const bagGroup = useMemo(() => model.getObjectByName("TCT shopping bag"), [model]);
  const bagMaterials = useMemo(() => {
    const materials = new Set();
    bagGroup?.traverse((object) => {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => material && materials.add(material));
    });
    return [...materials];
  }, [bagGroup]);
  const joints = useMemo(() => ({
    body: model.getObjectByName("Torso shell"),
    head: model.getObjectByName("HeadPivot"),
    armL: model.getObjectByName("Arm_L"), elbowL: model.getObjectByName("Elbow_L"),
    armR: model.getObjectByName("Arm_R"), elbowR: model.getObjectByName("Elbow_R"),
    legL: model.getObjectByName("Leg_L"), kneeL: model.getObjectByName("Knee_L"), footL: model.getObjectByName("Foot_L"),
    legR: model.getObjectByName("Leg_R"), kneeR: model.getObjectByName("Knee_R"), footR: model.getObjectByName("Foot_R"),
  }), [model]);
  const reduced = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = query.matches;
    const onChange = (event) => { reduced.current = event.matches; };
    query.addEventListener?.("change", onChange);
    return () => {
      query.removeEventListener?.("change", onChange);
      model.traverse((object) => {
        object.geometry?.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!material) return;
          Object.values(material).forEach((value) => value?.isTexture && value.dispose());
          material.dispose();
        });
      });
    };
  }, [model]);

  useFrame((_state, dt) => {
    const running = phase === "runningIn" || phase === "runningOut";
    const active = phase === "walking" || running;
    if (!reduced.current && active) gait.current += Math.min(dt, 0.05) * (running ? 9.2 : 5.1);
    const p = gait.current;
    const swing = Math.sin(p);
    const leftSwing = Math.sin(p + Math.PI);
    const kneeBendL = Math.max(0, swing);
    const kneeBendR = Math.max(0, leftSwing);
    const legAmount = running ? 0.68 : 0.43;
    const kneeAmount = running ? 0.78 : 0.55;

    // Alternating footfalls with opposite arm swing and a quiet body bounce.
    joints.legL.rotation.x = 0.1 + swing * legAmount;
    joints.legR.rotation.x = 0.1 + leftSwing * legAmount;
    joints.kneeL.rotation.x = -0.1 - kneeBendL * kneeAmount;
    joints.kneeR.rotation.x = -0.1 - kneeBendR * kneeAmount;
    joints.footL.rotation.x = Math.max(0, -swing) * (running ? 0.23 : 0.16);
    joints.footR.rotation.x = Math.max(0, -leftSwing) * (running ? 0.23 : 0.16);
    joints.armL.rotation.x = -swing * (running ? 0.52 : 0.22);
    joints.armR.rotation.x = bagOpacity > 0.05 ? 0.06 - leftSwing * 0.07 : -leftSwing * (running ? 0.52 : 0.22);
    joints.elbowL.rotation.x = -0.22 - kneeBendR * (running ? 0.26 : 0.14);
    joints.elbowR.rotation.x = bagOpacity > 0.05 ? -0.08 : -0.22 - kneeBendL * (running ? 0.26 : 0.14);
    joints.body.rotation.z = running ? -0.075 : swing * 0.018;
    joints.body.position.y = 1.12 + Math.abs(Math.sin(p * 2)) * (running ? 0.035 : 0.014);
    joints.head.rotation.x = (running ? -0.08 : 0.018) + Math.sin(p * 2) * 0.012;
    joints.head.rotation.z = -swing * 0.012;
    model.rotation.y = THREE.MathUtils.damp(model.rotation.y, running ? (phase === "runningIn" ? 0.92 : -0.92) : facing * 0.28, 5, dt);

    bagFade.current = THREE.MathUtils.damp(bagFade.current, bagOpacity, bagOpacity > bagFade.current ? 5.5 : 2.8, dt);
    if (bagGroup) bagGroup.visible = bagFade.current > 0.01 || bagOpacity > 0;
    bagMaterials.forEach((material) => { material.opacity = bagFade.current; });
  });

  return (
    <>
      <hemisphereLight args={["#fff4ed", "#72809a", 1.05]} />
      <directionalLight position={[-2.5, 4, 4]} intensity={2.15} color="#fff7f0" />
      <directionalLight position={[2.2, 2, -2]} intensity={1.25} color="#91caff" />
      <pointLight position={[0.2, 2.8, 2.4]} intensity={0.48} color="#ffd3b3" distance={5} />
      <primitive object={model} position={[0, 0.08, 0]} />
      <mesh position={[0, 0.012, -0.05]} scale={[0.44, 0.018, 0.18]}>
        <sphereGeometry args={[1, 28, 18]} />
        <meshBasicMaterial color="#162238" transparent opacity={0.17} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function StreetHuman3D({ phase = "walking", facing = 1, bagOpacity = 0 }) {
  return (
    <Canvas
      className="tct-human-canvas"
      camera={{ position: [0, 1.22, 5.2], fov: 29 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => camera.lookAt(0, 1.22, 0)}
    >
      <WalkingGuide phase={phase} facing={facing} bagOpacity={bagOpacity} />
    </Canvas>
  );
}
