"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  createArcSpringTubeGeometry,
  validateArcSpringGeometry,
  type ArcSpringGeometryParams,
} from "@/lib/spring3d/arcSpringGeometry";

type ArcSpringColorMode = "solid" | "approx_stress";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function colorRampGyr(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  if (x <= 0.5) {
    const u = x / 0.5;
    return [lerp(0.1, 1.0, u), lerp(0.8, 0.85, u), lerp(0.2, 0.05, u)];
  }
  const u = (x - 0.5) / 0.5;
  return [lerp(1.0, 1.0, u), lerp(0.85, 0.15, u), lerp(0.05, 0.05, u)];
}

function applyApproxStressColors(geometry: THREE.BufferGeometry, beta: number) {
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  const normalAttr = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!posAttr || !normalAttr) return;

  const count = posAttr.count;
  const colors = new Float32Array(count * 3);
  const b = Math.max(0, Math.min(0.9, beta));
  const denom = b > 0 ? 2 * b : 1;

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const nx = normalAttr.getX(i);
    const ny = normalAttr.getY(i);

    const invLen = 1 / Math.max(1e-9, Math.hypot(px, py));
    const dx = -px * invLen;
    const dy = -py * invLen;

    const nLen = 1 / Math.max(1e-9, Math.hypot(nx, ny));
    const nnx = nx * nLen;
    const nny = ny * nLen;

    const dot = nnx * dx + nny * dy;
    const factor = 1 + b * dot;
    const t = b > 0 ? (factor - (1 - b)) / denom : 0.5;

    const [r, g, bl] = colorRampGyr(t);
    colors[i * 3 + 0] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = bl;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

export interface ArcSpringMeshProps {
  d: number;
  D: number;
  n: number;
  r: number;
  alpha0Deg: number;
  deadCoilsStart?: number;
  deadCoilsEnd?: number;
  deadTightnessK?: number;
  deadTightnessSigma?: number;
  colorMode?: ArcSpringColorMode;
  approxTauMax?: number;
  approxStressBeta?: number;
  color?: string;
  metalness?: number;
  roughness?: number;
  wireframe?: boolean;
  showCenterline?: boolean;
}

export function ArcSpringMesh({
  d,
  D,
  n,
  r,
  alpha0Deg,
  deadCoilsStart = 0,
  deadCoilsEnd = 0,
  deadTightnessK = 0,
  deadTightnessSigma = 0,
  colorMode = "solid",
  approxTauMax,
  approxStressBeta = 0.25,
  color = "#6b9bd1",
  metalness = 0.05,
  roughness = 0.45,
  wireframe = false,
  showCenterline = false,
}: ArcSpringMeshProps) {
  const params: ArcSpringGeometryParams = useMemo(
    () => ({ d, D, n, r, alpha0Deg }),
    [d, D, n, r, alpha0Deg]
  );

  const validation = useMemo(() => validateArcSpringGeometry(params), [params]);

  const { geometry, centerline } = useMemo(() => {
    if (!validation.valid) {
      return { geometry: new THREE.BoxGeometry(10, 10, 10), centerline: [] as THREE.Vector3[] };
    }

    const res = createArcSpringTubeGeometry(params, {
      centerArc: true,
      radialSegments: 16,
      deadCoilsStart,
      deadCoilsEnd,
      deadDensityFactor: 4,
      tightnessK: deadTightnessK,
      tightnessSigma: deadTightnessSigma,
    });
    if (colorMode === "approx_stress") {
      applyApproxStressColors(res.geometry, approxStressBeta);
    }
    return res;
  }, [
    params,
    validation.valid,
    deadCoilsStart,
    deadCoilsEnd,
    deadTightnessK,
    deadTightnessSigma,
    colorMode,
    approxStressBeta,
  ]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        {colorMode === "approx_stress" ? (
          <meshBasicMaterial
            color={validation.valid ? "#ffffff" : "#ff4444"}
            wireframe={wireframe}
            side={THREE.DoubleSide}
            vertexColors
          />
        ) : (
          <meshStandardMaterial
            color={validation.valid ? color : "#ff4444"}
            metalness={metalness}
            roughness={roughness}
            wireframe={wireframe}
            side={THREE.DoubleSide}
          />
        )}
        <Edges threshold={35} color="#1a365d" />
      </mesh>
      {showCenterline && centerline.length > 1 && (
        <Line points={centerline} color="#93c5fd" lineWidth={1} />
      )}
    </group>
  );
}

function FitToObject({ groupRef, autoRotate }: { groupRef: React.RefObject<THREE.Group | null>; autoRotate: boolean }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const obj = groupRef.current;
    if (!obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 2.0;

    camera.position.set(center.x + dist * 0.8, center.y - dist * 0.6, center.z + dist * 0.8);
    camera.near = Math.max(0.1, maxDim / 100);
    camera.far = Math.max(5000, maxDim * 100);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [camera, groupRef]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      autoRotate={autoRotate}
      autoRotateSpeed={0.8}
    />
  );
}

export interface ArcSpringVisualizerProps {
  d?: number;
  D?: number;
  n?: number;
  r?: number;
  alpha0Deg?: number;
  useDeadCoils?: boolean;
  deadCoilsPerEnd?: number;
  deadTightnessK?: number;
  deadTightnessSigma?: number;
  colorMode?: ArcSpringColorMode;
  approxTauMax?: number;
  approxStressBeta?: number;
  autoRotate?: boolean;
  wireframe?: boolean;
  showCenterline?: boolean;
}

type ArcSpringSceneProps = {
  d: number;
  D: number;
  n: number;
  r: number;
  alpha0Deg: number;
  useDeadCoils: boolean;
  deadCoilsPerEnd: number;
  deadTightnessK: number;
  deadTightnessSigma: number;
  colorMode: ArcSpringColorMode;
  approxTauMax?: number;
  approxStressBeta: number;
  autoRotate: boolean;
  wireframe: boolean;
  showCenterline: boolean;
};

function ArcSpringScene({
  d,
  D,
  n,
  r,
  alpha0Deg,
  useDeadCoils,
  deadCoilsPerEnd,
  deadTightnessK,
  deadTightnessSigma,
  colorMode,
  approxTauMax,
  approxStressBeta,
  autoRotate,
  wireframe,
  showCenterline,
}: ArcSpringSceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      <color attach="background" args={["#0b1220"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[200, -200, 300]} intensity={1.2} />
      <directionalLight position={[-200, 150, 120]} intensity={0.6} />
      <pointLight position={[0, 100, 50]} intensity={0.5} />

      <group ref={groupRef}>
        <ArcSpringMesh
          d={d}
          D={D}
          n={n}
          r={r}
          alpha0Deg={alpha0Deg}
          deadCoilsStart={useDeadCoils ? deadCoilsPerEnd : 0}
          deadCoilsEnd={useDeadCoils ? deadCoilsPerEnd : 0}
          deadTightnessK={useDeadCoils ? deadTightnessK : 0}
          deadTightnessSigma={useDeadCoils ? deadTightnessSigma : 0}
          colorMode={colorMode}
          approxTauMax={approxTauMax}
          approxStressBeta={approxStressBeta}
          wireframe={wireframe}
          showCenterline={showCenterline}
        />
      </group>

      <FitToObject groupRef={groupRef} autoRotate={autoRotate} />
    </>
  );
}

export function ArcSpringVisualizer({
  d = 3,
  D = 30,
  n = 6,
  r = 80,
  alpha0Deg = 120,
  useDeadCoils = false,
  deadCoilsPerEnd = 1,
  deadTightnessK = 0,
  deadTightnessSigma = 0,
  colorMode = "solid",
  approxTauMax,
  approxStressBeta = 0.25,
  autoRotate = false,
  wireframe = false,
  showCenterline = false,
}: ArcSpringVisualizerProps) {
  return (
    <Canvas camera={{ fov: 45, near: 0.1, far: 5000 }} style={{ width: "100%", height: "100%" }}>
      <ArcSpringScene
        d={d}
        D={D}
        n={n}
        r={r}
        alpha0Deg={alpha0Deg}
        useDeadCoils={useDeadCoils}
        deadCoilsPerEnd={Math.max(0, Math.round(deadCoilsPerEnd))}
        deadTightnessK={Math.max(0, deadTightnessK)}
        deadTightnessSigma={Math.max(0, deadTightnessSigma)}
        colorMode={colorMode}
        approxTauMax={approxTauMax}
        approxStressBeta={approxStressBeta}
        autoRotate={autoRotate}
        wireframe={wireframe}
        showCenterline={showCenterline}
      />
    </Canvas>
  );
}

export default ArcSpringMesh;
