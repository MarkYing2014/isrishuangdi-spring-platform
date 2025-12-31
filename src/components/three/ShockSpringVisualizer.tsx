"use client";

/**
 * Shock Absorber Spring Visualizer
 * 减震器弹簧 3D 可视化组件
 * 
 * This component renders a shock absorber spring using Three.js with:
 * - Custom BufferGeometry (NOT TubeGeometry) to avoid Frenet frame flipping
 * - Parallel Transport Frames for stable tube orientation
 * - Debug overlays: centerline, PTF frames, section circles
 */

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Center } from "@react-three/drei";
import * as THREE from "three";

import {
  type ShockSpringParams,
  DEFAULT_SHOCK_SPRING_PARAMS,
  buildShockSpringCenterline,
  computeParallelTransportFrames,
  getTrimmedCenterline,
} from "@/lib/spring3d/shock";

import { previewTheme } from "@/lib/three/previewTheme";

// ============================================================================
// Types
// ============================================================================

interface ShockSpringVisualizerProps {
  params: ShockSpringParams;
  className?: string;
}

// ============================================================================
// Custom Tube Geometry Builder (PTF-based, NOT TubeGeometry)
// ============================================================================

/**
 * Build a tube mesh using PTF frames (no Frenet flipping)
 * 
 * Algorithm:
 * 1. For each centerline point, create a circle of vertices
 * 2. Position: point + normal*cos(angle)*radius + binormal*sin(angle)*radius
 * 3. Normal: normalized(normal*cos + binormal*sin)
 * 4. Connect rings with triangle indices
 * 5. Add end caps (flat circular faces)
 */
function buildPTFTubeGeometry(
  points: THREE.Vector3[],
  radii: number[],
  tangents: THREE.Vector3[],
  normals: THREE.Vector3[],
  binormals: THREE.Vector3[],
  circleSegments: number = 16,
  addEndCaps: boolean = true
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  const positions: number[] = [];
  const normalsArray: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  const n = points.length;
  
  // Generate vertices for each ring
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const r = radii[i];
    const normal = normals[i];
    const binormal = binormals[i];
    
    // U coordinate for texture mapping (along length)
    const u = i / (n - 1);
    
    for (let j = 0; j <= circleSegments; j++) {
      // Angle around the tube
      const angle = (j / circleSegments) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      // Position: point + normal*cos*r + binormal*sin*r
      const vx = p.x + normal.x * cosA * r + binormal.x * sinA * r;
      const vy = p.y + normal.y * cosA * r + binormal.y * sinA * r;
      const vz = p.z + normal.z * cosA * r + binormal.z * sinA * r;
      
      positions.push(vx, vy, vz);
      
      // Normal: normalized(normal*cos + binormal*sin)
      const nx = normal.x * cosA + binormal.x * sinA;
      const ny = normal.y * cosA + binormal.y * sinA;
      const nz = normal.z * cosA + binormal.z * sinA;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      
      normalsArray.push(nx / len, ny / len, nz / len);
      
      // UV coordinates
      const v = j / circleSegments;
      uvs.push(u, v);
    }
  }
  
  // Generate indices (connect rings)
  const ringSize = circleSegments + 1;
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < circleSegments; j++) {
      const a = i * ringSize + j;
      const b = i * ringSize + j + 1;
      const c = (i + 1) * ringSize + j;
      const d = (i + 1) * ringSize + j + 1;
      
      // Two triangles per quad
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  
  // Add horizontal end caps (flat grinding - facing up/down)
  // Unlike tangent-aligned caps, these face +Z and -Z for true industrial grinding
  if (addEndCaps && n >= 2) {
    const currentVertexCount = positions.length / 3;
    
    // ============ Bottom Cap (horizontal, facing -Z) ============
    const startP = points[0];
    const startR = radii[0];
    
    // Center vertex for bottom cap - at the first point but on horizontal plane
    const bottomCenterIdx = currentVertexCount;
    positions.push(startP.x, startP.y, startP.z);
    // Normal points straight down (-Z) for horizontal grinding
    normalsArray.push(0, 0, -1);
    uvs.push(0.5, 0.5);
    
    // Ring vertices for bottom cap - horizontal circle
    const bottomRingStartIdx = bottomCenterIdx + 1;
    for (let j = 0; j <= circleSegments; j++) {
      const angle = (j / circleSegments) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      // Horizontal circle at the start point's z-level
      const vx = startP.x + cosA * startR;
      const vy = startP.y + sinA * startR;
      const vz = startP.z; // Same z as start point
      
      positions.push(vx, vy, vz);
      normalsArray.push(0, 0, -1);
      uvs.push(0.5 + 0.5 * cosA, 0.5 + 0.5 * sinA);
    }
    
    // Triangles for bottom cap (winding for -Z facing)
    for (let j = 0; j < circleSegments; j++) {
      indices.push(bottomCenterIdx, bottomRingStartIdx + j + 1, bottomRingStartIdx + j);
    }
    
    // ============ Top Cap (horizontal, facing +Z) ============
    const endP = points[n - 1];
    const endR = radii[n - 1];
    
    // Center vertex for top cap
    const topCenterIdx = positions.length / 3;
    positions.push(endP.x, endP.y, endP.z);
    // Normal points straight up (+Z) for horizontal grinding
    normalsArray.push(0, 0, 1);
    uvs.push(0.5, 0.5);
    
    // Ring vertices for top cap - horizontal circle
    const topRingStartIdx = topCenterIdx + 1;
    for (let j = 0; j <= circleSegments; j++) {
      const angle = (j / circleSegments) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      // Horizontal circle at the end point's z-level
      const vx = endP.x + cosA * endR;
      const vy = endP.y + sinA * endR;
      const vz = endP.z; // Same z as end point
      
      positions.push(vx, vy, vz);
      normalsArray.push(0, 0, 1);
      uvs.push(0.5 + 0.5 * cosA, 0.5 + 0.5 * sinA);
    }
    
    // Triangles for top cap (winding for +Z facing)
    for (let j = 0; j < circleSegments; j++) {
      indices.push(topCenterIdx, topRingStartIdx + j, topRingStartIdx + j + 1);
    }
  }
  
  // Set attributes
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normalsArray, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  
  return geometry;
}

// ============================================================================
// Compute scale factor for consistent sizing
// ============================================================================

function useSpringScale(params: ShockSpringParams): number {
  return useMemo(() => {
    const fullCenterline = buildShockSpringCenterline(params);
    const centerline = (params.grind.bottom || params.grind.top)
      ? getTrimmedCenterline(params, fullCenterline)
      : fullCenterline;
    
    if (centerline.points.length < 2) return 1;
    
    // Compute bounding box
    const bbox = new THREE.Box3().setFromPoints(centerline.points);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Add wire radius to size
    const maxRadius = centerline.radii.length > 0 ? Math.max(...centerline.radii) : 0;
    const maxDim = Math.max(size.x + maxRadius * 2, size.y + maxRadius * 2, size.z);
    
    // Target size ~30 units
    const targetSize = 30;
    return maxDim > 0 ? targetSize / maxDim : 1;
  }, [params]);
}

// ============================================================================
// Spring Mesh Component (no internal scale)
// ============================================================================

function ShockSpringMesh({ params }: { params: ShockSpringParams }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Build geometry using memoization
  const geometry = useMemo(() => {
    // Generate centerline
    const fullCenterline = buildShockSpringCenterline(params);
    
    // Apply trimming if grinding is enabled
    const centerline = (params.grind.bottom || params.grind.top)
      ? getTrimmedCenterline(params, fullCenterline)
      : fullCenterline;
    
    if (centerline.points.length < 2) {
      return new THREE.BufferGeometry();
    }
    
    // Compute PTF frames
    const frames = computeParallelTransportFrames(centerline.points);
    
    // Build custom tube geometry WITHOUT horizontal caps
    // Caps will be handled separately at the correct z-planes
    const geo = buildPTFTubeGeometry(
      centerline.points,
      centerline.radii,
      frames.tangents,
      frames.normals,
      frames.binormals,
      16, // circle segments
      false // NO end caps - grinding creates flat ends via geometry clipping
    );
    
    return geo;
  }, [params]);
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#4a90d9"
        metalness={previewTheme.material.spring.metalness}
        roughness={previewTheme.material.spring.roughness}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// Debug Overlays
// ============================================================================

function CenterlineOverlay({ params }: { params: ShockSpringParams }) {
  const lineObj = useMemo(() => {
    const centerline = buildShockSpringCenterline(params);
    const geo = new THREE.BufferGeometry();
    const positions = centerline.points.flatMap(p => [p.x, p.y, p.z]);
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    return new THREE.Line(geo, material);
  }, [params]);
  
  return <primitive object={lineObj} />;
}

function FramesOverlay({ params }: { params: ShockSpringParams }) {
  const { tangentGeo, normalGeo, binormalGeo } = useMemo(() => {
    const centerline = buildShockSpringCenterline(params);
    const frames = computeParallelTransportFrames(centerline.points);
    
    const step = Math.max(1, Math.floor(centerline.points.length / 20));
    const axisLength = Math.min(...centerline.radii) * 3;
    
    const tangentPositions: number[] = [];
    const normalPositions: number[] = [];
    const binormalPositions: number[] = [];
    
    for (let i = 0; i < centerline.points.length; i += step) {
      const p = centerline.points[i];
      const t = frames.tangents[i];
      const n = frames.normals[i];
      const b = frames.binormals[i];
      
      // Tangent (red)
      tangentPositions.push(p.x, p.y, p.z);
      tangentPositions.push(p.x + t.x * axisLength, p.y + t.y * axisLength, p.z + t.z * axisLength);
      
      // Normal (green)
      normalPositions.push(p.x, p.y, p.z);
      normalPositions.push(p.x + n.x * axisLength, p.y + n.y * axisLength, p.z + n.z * axisLength);
      
      // Binormal (blue)
      binormalPositions.push(p.x, p.y, p.z);
      binormalPositions.push(p.x + b.x * axisLength, p.y + b.y * axisLength, p.z + b.z * axisLength);
    }
    
    const tangentGeo = new THREE.BufferGeometry();
    tangentGeo.setAttribute("position", new THREE.Float32BufferAttribute(tangentPositions, 3));
    
    const normalGeo = new THREE.BufferGeometry();
    normalGeo.setAttribute("position", new THREE.Float32BufferAttribute(normalPositions, 3));
    
    const binormalGeo = new THREE.BufferGeometry();
    binormalGeo.setAttribute("position", new THREE.Float32BufferAttribute(binormalPositions, 3));
    
    return { tangentGeo, normalGeo, binormalGeo };
  }, [params]);
  
  return (
    <group>
      <lineSegments geometry={tangentGeo}>
        <lineBasicMaterial color="#ff0000" />
      </lineSegments>
      <lineSegments geometry={normalGeo}>
        <lineBasicMaterial color="#00ff00" />
      </lineSegments>
      <lineSegments geometry={binormalGeo}>
        <lineBasicMaterial color="#0000ff" />
      </lineSegments>
    </group>
  );
}

function SectionsOverlay({ params }: { params: ShockSpringParams }) {
  const lineObj = useMemo(() => {
    const centerline = buildShockSpringCenterline(params);
    const frames = computeParallelTransportFrames(centerline.points);
    
    const step = Math.max(1, Math.floor(centerline.points.length / 15));
    const circleSegments = 24;
    
    const positions: number[] = [];
    
    for (let i = 0; i < centerline.points.length; i += step) {
      const p = centerline.points[i];
      const r = centerline.radii[i];
      const n = frames.normals[i];
      const b = frames.binormals[i];
      
      // Draw circle
      for (let j = 0; j <= circleSegments; j++) {
        const angle = (j / circleSegments) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        
        const vx = p.x + n.x * cosA * r + b.x * sinA * r;
        const vy = p.y + n.y * cosA * r + b.y * sinA * r;
        const vz = p.z + n.z * cosA * r + b.z * sinA * r;
        
        positions.push(vx, vy, vz);
      }
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xffaa00 });
    return new THREE.Line(geo, material);
  }, [params]);
  
  return <primitive object={lineObj} />;
}

// ============================================================================
// Grinding Planes Helper and Overlay
// ============================================================================

/**
 * Compute z-coordinates for grinding cut planes based on centerline points
 */
function computeGrindingPlanesZFromCenterline(
  points: THREE.Vector3[],
  totalTurns: number,
  offsetTurns: number
) {
  const n = points.length;
  if (n < 2) return { zBot: 0, zTop: 0, iBot: 0, iTop: n - 1 };

  // normalized cut fraction (clamp to avoid crossing mid)
  const sCut = THREE.MathUtils.clamp(offsetTurns / Math.max(totalTurns, 1e-6), 0, 0.4999);

  const iBot = THREE.MathUtils.clamp(Math.round(sCut * (n - 1)), 0, n - 1);
  const iTop = THREE.MathUtils.clamp(Math.round((1 - sCut) * (n - 1)), 0, n - 1);

  let zBot = points[iBot].z;
  let zTop = points[iTop].z;
  if (zTop < zBot) [zBot, zTop] = [zTop, zBot];

  return { zBot, zTop, iBot, iTop };
}

function GrindingPlanesOverlay({ params }: { params: ShockSpringParams }) {
  const { planeSize, zBot, zTop, botPoint, topPoint } = useMemo(() => {
    const centerline = buildShockSpringCenterline(params); // full, untrimmed
    const pts = centerline.points;

    const { zBot, zTop, iBot, iTop } = computeGrindingPlanesZFromCenterline(
      pts,
      params.totalTurns,
      params.grind.offsetTurns
    );

    // plane size: based on centerline XY bbox (in spring local coordinates)
    const bbox = new THREE.Box3().setFromPoints(pts);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // XY coverage; add margin (diameter + extra)
    const rMax = centerline.radii.length ? Math.max(...centerline.radii) : 0;
    const margin = Math.max(rMax * 6, 5);
    const planeW = Math.max(size.x + margin, 5);
    const planeH = Math.max(size.y + margin, 5);
    const planeSizeVal = Math.max(planeW, planeH);

    return {
      planeSize: planeSizeVal,
      zBot,
      zTop,
      botPoint: pts[iBot] ?? new THREE.Vector3(),
      topPoint: pts[iTop] ?? new THREE.Vector3(),
    };
  }, [params]);

  // These planes are XY planes at z=const in spring-local coordinates.
  // They are inside the same rotated group, so they match spring orientation.
  return (
    <group>
      {/* Bottom plane */}
      {params.grind.bottom && (
        <mesh position={[0, 0, zBot]}>
          <planeGeometry args={[planeSize, planeSize]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Top plane */}
      {params.grind.top && (
        <mesh position={[0, 0, zTop]}>
          <planeGeometry args={[planeSize, planeSize]} />
          <meshBasicMaterial color="#44ff44" transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Cut points as spheres */}
      {params.grind.bottom && (
        <mesh position={[botPoint.x, botPoint.y, botPoint.z]}>
          <sphereGeometry args={[Math.max(0.3, params.wireDia.start * 0.15), 12, 12]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
      )}
      {params.grind.top && (
        <mesh position={[topPoint.x, topPoint.y, topPoint.z]}>
          <sphereGeometry args={[Math.max(0.3, params.wireDia.end * 0.15), 12, 12]} />
          <meshBasicMaterial color="#44ff44" />
        </mesh>
      )}
    </group>
  );
}

// ============================================================================
// Scene Setup (no auto-rotation to avoid confusion)
// ============================================================================

function SceneSetup() {
  return null;
}

// ============================================================================
// Scaled Spring Group (applies uniform scale to mesh + overlays)
// ============================================================================

function ScaledSpringGroup({ params }: { params: ShockSpringParams }) {
  const scale = useSpringScale(params);
  
  return (
    <group scale={[scale, scale, scale]}>
      <ShockSpringMesh params={params} />
      
      {/* Debug overlays - now at same scale as mesh */}
      {params.debug.showCenterline && <CenterlineOverlay params={params} />}
      {params.debug.showFrames && <FramesOverlay params={params} />}
      {params.debug.showSections && <SectionsOverlay params={params} />}
      {params.debug.showGrindingPlanes && <GrindingPlanesOverlay params={params} />}
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ShockSpringVisualizer({
  params = DEFAULT_SHOCK_SPRING_PARAMS,
  className = "",
}: ShockSpringVisualizerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: [50, 30, 50], fov: 50 }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <color attach="background" args={[previewTheme.background]} />
        
        {/* Lighting */}
        <ambientLight intensity={previewTheme.lights.ambient} />
        <directionalLight
          position={previewTheme.lights.key.position}
          intensity={previewTheme.lights.key.intensity}
          castShadow
        />
        <directionalLight
          position={previewTheme.lights.fill.position}
          intensity={previewTheme.lights.fill.intensity}
        />
        
        <Environment preset="studio" />
        
        {/* Spring with shared scale */}
        <Center>
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <ScaledSpringGroup params={params} />
          </group>
        </Center>
        
        <SceneSetup />
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={20}
          maxDistance={200}
        />
        
        {/* Grid */}
        <gridHelper
          args={[100, 20, previewTheme.grid.major, previewTheme.grid.minor]}
          position={[0, -20, 0]}
        />
      </Canvas>
    </div>
  );
}

export default ShockSpringVisualizer;
