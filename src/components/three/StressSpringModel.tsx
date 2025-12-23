"use client";

import * as THREE from "three";
import { useMemo } from "react";

/**
 * Estimated Stress Spring Model with Vertex Color Visualization
 * 
 * Calculates stress per segment using beam theory:
 * τ = 8 * F * K * D / (π * d³)
 * 
 * Where:
 * - F = axial force (N)
 * - K = Wahl correction factor
 * - D = mean diameter (mm)
 * - d = wire diameter (mm)
 */

interface StressSpringModelProps {
  wireDiameter: number;      // mm
  meanDiameter: number;      // mm
  activeCoils: number;
  pitch: number;             // mm
  totalCoils?: number;
  axialForce: number;        // N - from FEA reaction force
  maxStress?: number;        // MPa - for color scale max (optional)
  showStress?: boolean;      // Toggle stress visualization
  scale?: number;            // Scene scale factor (default: 50/max(D*1.5, L0))
}

// Color interpolation: blue (low) → green → yellow → red (high)
function stressToColor(stress: number, minStress: number, maxStress: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (stress - minStress) / (maxStress - minStress)));
  
  // 4-color gradient: blue → cyan → yellow → red
  if (t < 0.25) {
    // Blue to Cyan
    const u = t / 0.25;
    return new THREE.Color(0, u, 1);
  } else if (t < 0.5) {
    // Cyan to Green
    const u = (t - 0.25) / 0.25;
    return new THREE.Color(0, 1, 1 - u);
  } else if (t < 0.75) {
    // Green to Yellow
    const u = (t - 0.5) / 0.25;
    return new THREE.Color(u, 1, 0);
  } else {
    // Yellow to Red
    const u = (t - 0.75) / 0.25;
    return new THREE.Color(1, 1 - u, 0);
  }
}

// Generate spring centerline with stress values per point
function generateStressedCenterline(
  radius: number,
  normalPitch: number,
  closedPitch: number,
  activeCoils: number,
  deadCoilsPerEnd: number,
  axialForce: number,
  wireDiameter: number,
  meanDiameter: number
): { points: THREE.Vector3[]; stresses: number[]; minY: number; maxY: number } {
  const totalCoils = activeCoils + 2 * deadCoilsPerEnd;
  const numSamples = 800;
  const totalAngle = 2 * Math.PI * totalCoils;

  // Calculate Wahl correction factor
  const c = meanDiameter / wireDiameter;  // Spring index
  const K = (4 * c - 1) / (4 * c - 4) + 0.615 / c;
  
  // Calculate max shear stress τ = 8 * F * K * D / (π * d³)
  const tauMax = (8 * axialForce * K * meanDiameter) / (Math.PI * Math.pow(wireDiameter, 3));

  const points: THREE.Vector3[] = [];
  const stresses: number[] = [];
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const θ = t * totalAngle;
    const n = θ / (2 * Math.PI);

    // Calculate Y (height) based on segment
    let y: number;
    let stressFactor: number;

    if (n <= deadCoilsPerEnd) {
      // Bottom dead coils - stress tapers to ~20% at ends
      y = n * closedPitch;
      stressFactor = 0.2 + 0.8 * (n / deadCoilsPerEnd);
    } else if (n >= totalCoils - deadCoilsPerEnd) {
      // Top dead coils - stress tapers down
      const bottomDeadHeight = deadCoilsPerEnd * closedPitch;
      const activeHeight = activeCoils * normalPitch;
      const nDeadTop = n - (totalCoils - deadCoilsPerEnd);
      y = bottomDeadHeight + activeHeight + nDeadTop * closedPitch;
      stressFactor = 0.2 + 0.8 * (1 - nDeadTop / deadCoilsPerEnd);
    } else {
      // Active coils - full stress
      const bottomDeadHeight = deadCoilsPerEnd * closedPitch;
      const nActive = n - deadCoilsPerEnd;
      y = bottomDeadHeight + nActive * normalPitch;
      stressFactor = 1.0;
    }

    const x = radius * Math.cos(θ);
    const z = radius * Math.sin(θ);

    points.push(new THREE.Vector3(x, y, z));
    stresses.push(tauMax * stressFactor);

    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return { points, stresses, minY, maxY };
}

export function StressSpringModel({
  wireDiameter,
  meanDiameter,
  activeCoils,
  pitch,
  totalCoils,
  axialForce,
  maxStress,
  showStress = true,
  scale: scaleProp,
}: StressSpringModelProps) {
  // Scale factor: use prop if provided, otherwise calculate from geometry
  const freeLength = pitch * activeCoils + wireDiameter * (totalCoils ?? activeCoils);
  const SCALE = scaleProp ?? 50 / Math.max(meanDiameter * 1.5, freeLength);
  const radius = (meanDiameter / 2) * SCALE;
  const thickness = wireDiameter * SCALE;
  const pitchScaled = pitch * SCALE;
  const wireRadius = thickness / 2;
  const closedPitch = thickness;

  const deadCoilsPerEnd = totalCoils ? Math.max(0.75, (totalCoils - activeCoils) / 2) : 1;

  // Generate spring with stress values
  const springData = useMemo(() => {
    return generateStressedCenterline(
      radius,
      pitchScaled,
      closedPitch,
      activeCoils,
      deadCoilsPerEnd,
      axialForce,
      wireDiameter,
      meanDiameter
    );
  }, [radius, pitchScaled, closedPitch, activeCoils, deadCoilsPerEnd, axialForce, wireDiameter, meanDiameter]);

  // Create tube geometry with vertex colors
  const { geometry, springHeight, colorScale } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(springData.points);
    const tubularSegments = springData.points.length - 1;
    const radialSegments = 16;
    
    const tubeGeometry = new THREE.TubeGeometry(curve, tubularSegments, wireRadius, radialSegments, false);
    
    // Calculate color scale
    const stressMin = Math.min(...springData.stresses);
    const stressMax = maxStress ?? Math.max(...springData.stresses);
    
    if (showStress && axialForce > 0) {
      // Add vertex colors based on stress
      const position = tubeGeometry.getAttribute('position');
      const colors = new Float32Array(position.count * 3);
      
      // For each vertex, find the closest centerline point and get its stress
      const verticesPerRing = radialSegments + 1;
      
      for (let i = 0; i < position.count; i++) {
        // Which ring (axial segment) is this vertex on?
        const ringIndex = Math.floor(i / verticesPerRing);
        const stressIndex = Math.min(ringIndex, springData.stresses.length - 1);
        const stress = springData.stresses[stressIndex] || stressMin;
        
        const color = stressToColor(stress, stressMin, stressMax);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      tubeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    
    const height = springData.maxY - springData.minY;
    
    return { 
      geometry: tubeGeometry, 
      springHeight: height,
      colorScale: { min: stressMin, max: stressMax }
    };
  }, [springData, wireRadius, showStress, axialForce, maxStress]);

  const centerY = (springData.minY + springData.maxY) / 2;

  // Material with vertex colors
  const material = useMemo(() => {
    if (showStress && axialForce > 0) {
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.6,
        roughness: 0.4,
        side: THREE.DoubleSide,
      });
    } else {
      // Default metallic green
      return new THREE.MeshStandardMaterial({
        color: "#22c55e",
        metalness: 0.9,
        roughness: 0.2,
        side: THREE.DoubleSide,
      });
    }
  }, [showStress, axialForce]);

  return (
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <mesh geometry={geometry} material={material} position={[0, -centerY, 0]} />
    </group>
  );
}

// Color legend component
export function StressColorLegend({ 
  minStress, 
  maxStress, 
  isZh = false 
}: { 
  minStress: number; 
  maxStress: number; 
  isZh?: boolean;
}) {
  const gradientStops = [
    { pos: 0, color: 'rgb(0, 0, 255)' },      // Blue
    { pos: 25, color: 'rgb(0, 255, 255)' },   // Cyan
    { pos: 50, color: 'rgb(0, 255, 0)' },     // Green
    { pos: 75, color: 'rgb(255, 255, 0)' },   // Yellow
    { pos: 100, color: 'rgb(255, 0, 0)' },    // Red
  ];
  
  const gradient = `linear-gradient(to right, ${gradientStops.map(s => `${s.color} ${s.pos}%`).join(', ')})`;

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{minStress.toFixed(0)}</span>
        <span>{isZh ? "应力 (MPa)" : "Stress (MPa)"}</span>
        <span>{maxStress.toFixed(0)}</span>
      </div>
      <div 
        className="h-3 rounded-sm"
        style={{ background: gradient }}
      />
      <div className="text-center text-muted-foreground italic">
        {isZh ? "估算应力 (梁理论)" : "Estimated stress (beam theory)"}
      </div>
    </div>
  );
}
