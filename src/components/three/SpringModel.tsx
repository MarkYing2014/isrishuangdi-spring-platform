"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { TubeGeometry, MeshStandardMaterial } from "three";

/**
 * Engineering-accurate compression spring geometry generator
 * 
 * Features:
 * - Dead coils at both ends (ground & closed)
 * - Segmented pitch: dead coils use pitch = wire diameter
 * - Active coils use normal pitch
 * - Clipping planes for ground flat ends
 * - End cap discs for visual reinforcement
 * 
 * Structure (from bottom to top):
 * - Bottom dead coils: Nc/2 coils with pitch = d (wire diameter)
 * - Active coils: Na coils with pitch = normalPitch
 * - Top dead coils: Nc/2 coils with pitch = d (wire diameter)
 */
function generateSpringCenterline(
  radius: number,
  normalPitch: number,
  closedPitch: number,
  activeCoils: number,
  deadCoilsPerEnd: number,
): { points: THREE.Vector3[]; minY: number; maxY: number } {
  const totalCoils = activeCoils + 2 * deadCoilsPerEnd;
  const numSamples = 800;
  const totalAngle = 2 * Math.PI * totalCoils;

  const points: THREE.Vector3[] = [];
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const θ = t * totalAngle;
    const n = θ / (2 * Math.PI); // Current coil number

    // Calculate Y (height) based on which segment we're in
    let y: number;

    if (n <= deadCoilsPerEnd) {
      // Bottom dead coils region - pitch = closedPitch (wire diameter)
      y = n * closedPitch;
    } else if (n >= totalCoils - deadCoilsPerEnd) {
      // Top dead coils region
      const bottomDeadHeight = deadCoilsPerEnd * closedPitch;
      const activeHeight = activeCoils * normalPitch;
      const nDeadTop = n - (totalCoils - deadCoilsPerEnd);
      y = bottomDeadHeight + activeHeight + nDeadTop * closedPitch;
    } else {
      // Active coils region
      const bottomDeadHeight = deadCoilsPerEnd * closedPitch;
      const nActive = n - deadCoilsPerEnd;
      y = bottomDeadHeight + nActive * normalPitch;
    }

    const x = radius * Math.cos(θ);
    const z = radius * Math.sin(θ);

    points.push(new THREE.Vector3(x, y, z));

    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return { points, minY, maxY };
}

export function SpringModel({
  wireDiameter,
  meanDiameter,
  activeCoils,
  pitch,
  totalCoils,
  topGround = true,
  bottomGround = true,
}: {
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  pitch: number;
  totalCoils?: number;
  topGround?: boolean;
  bottomGround?: boolean;
}) {
  // Scale factor: 1 mm = 0.02 scene units (makes 24mm spring ~0.48 units wide)
  const SCALE = 0.02;
  const radius = (meanDiameter / 2) * SCALE;
  const thickness = wireDiameter * SCALE;
  const pitchScaled = pitch * SCALE;
  const wireRadius = thickness / 2;

  // Closed end coil pitch: wire diameter (coils touching each other)
  const closedPitch = thickness;

  // Dead coils per end (for ground ends)
  const deadCoilsPerEnd = totalCoils ? Math.max(0.75, (totalCoils - activeCoils) / 2) : 1;

  // Generate spring centerline using segmented pitch model
  const springData = useMemo(() => {
    return generateSpringCenterline(
      radius,
      pitchScaled,
      closedPitch,
      activeCoils,
      deadCoilsPerEnd
    );
  }, [radius, pitchScaled, closedPitch, activeCoils, deadCoilsPerEnd]);

  // Create curve and geometry from centerline points
  const { springGeometry, springHeight, grindDepth } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(springData.points);
    const geometry = new TubeGeometry(curve, springData.points.length - 1, wireRadius, 16, false);
    const height = springData.maxY - springData.minY;
    const grind = wireRadius * 0.7; // Grind depth for flat ends (0.35 × wire diameter)
    return { springGeometry: geometry, springHeight: height, grindDepth: grind };
  }, [springData, wireRadius]);

  // Calculate cut positions in local Y coordinates
  const bottomCutLocalY = springData.minY + grindDepth;
  const topCutLocalY = springData.maxY - grindDepth;
  
  // Center offset to position spring centered at origin
  const centerY = (springData.minY + springData.maxY) / 2;

  // After rotation [Math.PI/2, 0, 0], local Y becomes world -Z
  // So we need to clip in Z direction in world space
  // bottomCutLocalY in local Y → -(bottomCutLocalY - centerY) in world Z
  // topCutLocalY in local Y → -(topCutLocalY - centerY) in world Z
  const bottomCutWorldZ = -(bottomCutLocalY - centerY);
  const topCutWorldZ = -(topCutLocalY - centerY);

  // Material with clipping planes for ground ends
  // Clipping planes work in WORLD coordinates
  const clippedMaterial = useMemo(() => {
    const mat = new MeshStandardMaterial({
      color: "#c0c5cc",
      metalness: 0.9,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });

    const planes: THREE.Plane[] = [];
    if (bottomGround) {
      // After rotation, bottom is at positive Z in world space
      // Clip everything with Z > bottomCutWorldZ (plane normal points -Z)
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), bottomCutWorldZ));
    }
    if (topGround) {
      // After rotation, top is at negative Z in world space  
      // Clip everything with Z < topCutWorldZ (plane normal points +Z)
      planes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), -topCutWorldZ));
    }
    mat.clippingPlanes = planes;
    mat.clipShadows = true;

    return mat;
  }, [bottomCutWorldZ, topCutWorldZ, bottomGround, topGround]);

  // End cap geometry for ground surfaces (ring shape)
  const endCapGeometry = useMemo(() => {
    const outerRadius = radius + wireRadius;
    const innerRadius = Math.max(0, radius - wireRadius);
    return new THREE.RingGeometry(innerRadius, outerRadius, 32);
  }, [radius, wireRadius]);

  return (
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      {/* Complete spring with clipping for ground ends */}
      <mesh geometry={springGeometry} material={clippedMaterial} position={[0, -centerY, 0]} />

      {/* Bottom end cap (ground surface) - at local Y = bottomCutLocalY */}
      {bottomGround && (
        <mesh position={[0, bottomCutLocalY - centerY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <primitive object={endCapGeometry} attach="geometry" />
          <meshStandardMaterial color="#a0a5ac" metalness={0.95} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Top end cap (ground surface) - at local Y = topCutLocalY */}
      {topGround && (
        <mesh position={[0, topCutLocalY - centerY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <primitive object={endCapGeometry} attach="geometry" />
          <meshStandardMaterial color="#a0a5ac" metalness={0.95} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}
