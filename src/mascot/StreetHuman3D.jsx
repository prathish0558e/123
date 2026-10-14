import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createProceduralHumanCharacter } from "./Robot.jsx";

function WalkingGuide() {
  const model = useMemo(() => createProceduralHumanCharacter(), []);
  const phase = useRef(0);
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

  useFrame((state, dt) => {
    if (reduced.current) return;
    phase.current += Math.min(dt, 0.05) * 5.1;
    const p = phase.current;
    const swing = Math.sin(p);
    const leftSwing = Math.sin(p + Math.PI);
    const kneeBendL = Math.max(0, swing);
    const kneeBendR = Math.max(0, leftSwing);

    // Alternating footfalls with opposite arm swing and a quiet body bounce.
    joints.legL.rotation.x = 0.1 + swing * 0.43;
    joints.legR.rotation.x = 0.1 + leftSwing * 0.43;
    joints.kneeL.rotation.x = -0.1 - kneeBendL * 0.55;
    joints.kneeR.rotation.x = -0.1 - kneeBendR * 0.55;
    joints.footL.rotation.x = Math.max(0, -swing) * 0.16;
    joints.footR.rotation.x = Math.max(0, -leftSwing) * 0.16;
    joints.armL.rotation.x = -swing * 0.22;
    joints.armR.rotation.x = -leftSwing * 0.22;
    joints.elbowL.rotation.x = -0.22 - kneeBendR * 0.14;
    joints.elbowR.rotation.x = -0.22 - kneeBendL * 0.14;
    joints.body.rotation.z = swing * 0.018;
    joints.body.position.y = 1.12 + Math.abs(Math.sin(p * 2)) * 0.014;
    joints.head.rotation.x = 0.018 + Math.sin(p * 2) * 0.012;
    joints.head.rotation.z = -swing * 0.012;
    state.invalidate?.();
  });

  return (
    <>
      <ambientLight intensity={1.65} color="#fff3ec" />
      <directionalLight position={[-2.5, 4, 4]} intensity={2.4} color="#fff7f0" />
      <directionalLight position={[2.2, 2, -2]} intensity={1.1} color="#91caff" />
      <primitive object={model} position={[0, 0.08, 0]} />
      <mesh position={[0, 0.012, -0.05]} scale={[0.44, 0.018, 0.18]}>
        <sphereGeometry args={[1, 28, 18]} />
        <meshBasicMaterial color="#162238" transparent opacity={0.17} depthWrite={false} />
      </mesh>
    </>
  );
}

export default function StreetHuman3D() {
  return (
    <Canvas
      className="tct-human-canvas"
      camera={{ position: [0, 1.22, 5.2], fov: 29 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ camera }) => camera.lookAt(0, 1.22, 0)}
    >
      <WalkingGuide />
    </Canvas>
  );
}
