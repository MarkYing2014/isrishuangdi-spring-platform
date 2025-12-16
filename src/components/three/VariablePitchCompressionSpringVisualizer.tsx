"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import type { VariablePitchSegment } from "@/lib/springMath";
import {
  createVariablePitchCompressionSpringGeometry,
} from "@/lib/spring3d/variablePitchCompressionGeometry";

export type VariablePitchCompressionSpringVisualizerProps = {
  wireDiameter: number;
  meanDiameter: number;
  shearModulus: number;
  activeCoils0: number;
  totalCoils: number;
  freeLength?: number;
  segments: VariablePitchSegment[];
  deflection: number;
  autoRotate?: boolean;
  showStressColors?: boolean;
  stressUtilization?: number;
  stressBeta?: number;
};

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

function mapUtilizationToRampT(utilization: number): number {
  // Make the ramp more conservative so moderate utilization stays greener.
  const u = Number.isFinite(utilization) ? Math.max(0, utilization) : 0;
  const scaled = Math.max(0, Math.min(1, u / 1.25));
  return Math.max(0, Math.min(1, Math.pow(scaled, 1.2)));
}

function applyStressColors(geometry: THREE.BufferGeometry, utilization: number, beta: number) {
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  const normalAttr = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!posAttr || !normalAttr) return;

  const count = posAttr.count;
  const colors = new Float32Array(count * 3);
  const b = Math.max(0, Math.min(0.9, beta));
  const u0 = mapUtilizationToRampT(utilization);

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
    const t = Math.max(0, Math.min(1, u0 * factor));

    const [r, g, bl] = colorRampGyr(t);
    colors[i * 3 + 0] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = bl;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function FitToObject({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const obj = groupRef.current;
    if (!obj) return;

    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 2.2;

    // Put camera in a diagonal side-top view so pitch differences are visible.
    camera.position.set(center.x + dist * 1.0, center.y + dist * 0.6, center.z + dist * 0.9);
    camera.near = Math.max(0.1, maxDim / 200);
    camera.far = Math.max(1000, maxDim * 50);
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
    />
  );
}

function SpringMesh(props: VariablePitchCompressionSpringVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);

  const utilization = useMemo(() => {
    const u = props.stressUtilization;
    return Number.isFinite(u) ? Math.max(0, Math.min(2, u as number)) : 0;
  }, [props.stressUtilization]);

  const stressBeta = useMemo(() => {
    const b = props.stressBeta;
    return Number.isFinite(b) ? Math.max(0, Math.min(0.9, b as number)) : 0.25;
  }, [props.stressBeta]);

  const { geometry, zMin, zMax } = useMemo(() => {
    const res = createVariablePitchCompressionSpringGeometry(
      {
        wireDiameter: props.wireDiameter,
        meanDiameter: props.meanDiameter,
        shearModulus: props.shearModulus,
        activeCoils0: props.activeCoils0,
        totalCoils: props.totalCoils,
        freeLength: props.freeLength,
        segments: props.segments,
        deflection: props.deflection,
      },
      {
        pointsPerTurn: 24,
        radialSegments: 20,
        tubeSegmentsPerTurn: 28,
        closingTurns: 1.5,
        contactGapRatio: 0.01,
      }
    );
    if (props.showStressColors) {
      applyStressColors(res.geometry, utilization, stressBeta);
    }
    return res;
  }, [
    props.wireDiameter,
    props.meanDiameter,
    props.shearModulus,
    props.activeCoils0,
    props.totalCoils,
    props.freeLength,
    props.segments,
    props.deflection,
    props.showStressColors,
    utilization,
    stressBeta,
  ]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const d = Math.max(0.01, props.wireDiameter);
  const zBottom = zMin + d * 0.5;
  const zTop = zMax - d * 0.5;

  const clippingPlanes = useMemo(() => {
    const bottom = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, zBottom)
    );
    const top = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, zTop)
    );
    return [bottom, top];
  }, [zBottom, zTop]);

  const material = useMemo(() => {
    if (props.showStressColors) {
      return new THREE.MeshBasicMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        vertexColors: true,
        clippingPlanes,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: "#6b9bd1",
      metalness: 0.15,
      roughness: 0.55,
      side: THREE.DoubleSide,
      clippingPlanes,
    });
  }, [clippingPlanes, props.showStressColors]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const capMaterial = useMemo(() => {
    if (props.showStressColors) {
      const [r, g, bl] = colorRampGyr(mapUtilizationToRampT(utilization));
      return new THREE.MeshBasicMaterial({
        color: new THREE.Color(r, g, bl),
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: "#6b9bd1",
      metalness: 0.15,
      roughness: 0.6,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }, [props.showStressColors, utilization]);

  const capGeom = useMemo(() => {
    const R = props.meanDiameter / 2;
    const rInner = Math.max(0.01, R - props.wireDiameter / 2);
    const rOuter = Math.max(rInner + 0.01, R + props.wireDiameter / 2);
    return new THREE.RingGeometry(rInner, rOuter, 96, 1);
  }, [props.meanDiameter, props.wireDiameter]);

  useEffect(() => {
    return () => {
      capGeom.dispose();
      capMaterial.dispose();
    };
  }, [capGeom, capMaterial]);

  const capEps = Math.max(0.001, d * 0.002);
  const bottomCapZ = zBottom + capEps;
  const topCapZ = zTop - capEps;

  return (
    <>
      <group ref={groupRef} rotation={[0, 0, 0]}>
        <mesh geometry={geometry} material={material} castShadow receiveShadow />
        <mesh
          geometry={capGeom}
          material={capMaterial}
          position={[0, 0, bottomCapZ]}
          rotation={[0, 0, 0]}
          receiveShadow
        />
        <mesh
          geometry={capGeom}
          material={capMaterial}
          position={[0, 0, topCapZ]}
          rotation={[Math.PI, 0, 0]}
          receiveShadow
        />
      </group>
      <FitToObject groupRef={groupRef} />
    </>
  );
}

export function VariablePitchCompressionSpringVisualizer(
  props: VariablePitchCompressionSpringVisualizerProps
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 5000 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ localClippingEnabled: true, antialias: true }}
    >
      <color attach="background" args={["#0b1220"]} />

      <ambientLight intensity={0.9} />
      <directionalLight position={[200, -200, 300]} intensity={1.2} castShadow />
      <directionalLight position={[-200, 150, 120]} intensity={0.6} />
      <pointLight position={[0, 100, 50]} intensity={0.5} />

      <SpringMesh {...props} />

      <gridHelper args={[80, 16, "#94a3b8", "#334155"]} position={[0, 0, 0]} rotation={[0, 0, 0]} />
    </Canvas>
  );
}

export default VariablePitchCompressionSpringVisualizer;
