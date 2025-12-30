"use client";

import React, { useLayoutEffect, useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import * as THREE from "three";
import { AutoFitControls } from "./AutoFitControls";
import { previewTheme } from "@/lib/three/previewTheme";
import {
  validateArcSpringGeometry,
  type ArcSpringGeometryParams,
} from "@/lib/spring3d/arcSpringGeometry";
import { buildArcBackboneFrames, type BackboneFrame } from "@/lib/spring3d/arcBackbone";

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
  // Standard Stroke Model Props
  previewStrokeMm?: number;
  alphaFreeDeg?: number;
  alphaSolidDeg?: number;
  arcRadiusMm?: number;
  
  // Pack / Bow Props
  profile?: "ARC" | "BOW";
  packIndex?: number;      // 0-based index for this specific spring in the pack
  packGapMm?: number;      // Radial gap between springs
  packPhaseDeg?: number;   // Phase offset for nested springs to avoid visual overlap
  bowLeanDeg?: number;
  bowPlaneTiltDeg?: number;
  endCapStyle?: "RING" | "BLOCK";
  spring2?: { d: number; D: number; n: number };
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
  
  // Fit Audit
  fitResult?: { status: "PASS" | "WARN" | "FAIL" };
  forceRender?: boolean;
}

export function ArcSpringMesh({
  d,
  D,
  n,
  r,
  alpha0Deg,
  previewStrokeMm,
  alphaFreeDeg,
  alphaSolidDeg,
  arcRadiusMm,
  profile = 'ARC',
  packIndex = 0,
  packGapMm = 0,
  packPhaseDeg = 0,
  bowLeanDeg = 0,
  bowPlaneTiltDeg = 0,
  spring2,
  deadCoilsStart = 0,
  deadCoilsEnd = 0,
  deadTightnessK = 0,
  deadTightnessSigma = 0,
  colorMode = "solid",
  approxTauMax,
  approxStressBeta = 0.25,
  color = "#6b9bd1",
  metalness = previewTheme.material.spring.metalness,
  roughness = previewTheme.material.spring.roughness,
  wireframe = false,
  showCenterline = false,
}: ArcSpringMeshProps) {
  // 1. Engineering Sweep Angle Mapping (Stroke Model)
  const currentAlphaDeg = useMemo(() => {
    // If no preview stroke, use alpha0Deg (Free Angle)
    if (previewStrokeMm === undefined || previewStrokeMm === null) {
      return alpha0Deg;
    }

    // Terminology alignment
    const alphaFree = alphaFreeDeg ?? alpha0Deg;
    const alphaSolid = alphaSolidDeg ?? 0;
    const radius = arcRadiusMm ?? r;

    // Guard against r=0 or invalid sweep
    if (radius <= 0) return alpha0Deg;

    // Δα = (stroke / radius) * (180 / π)
    const deltaAlphaDeg = (previewStrokeMm / radius) * (180 / Math.PI);

    // Current α = clamp(Free - Δα, Solid, Free)
    return Math.max(alphaSolid, Math.min(alphaFree, alphaFree - deltaAlphaDeg));
  }, [previewStrokeMm, alpha0Deg, alphaFreeDeg, alphaSolidDeg, arcRadiusMm, r]);

  const params: ArcSpringGeometryParams = useMemo(
    () => ({ d, D, n, r, alpha0Deg: currentAlphaDeg }),
    [d, D, n, r, currentAlphaDeg]
  );

  const validation = useMemo(() => validateArcSpringGeometry(params), [params]);

  const { geometry, centerline, endCaps } = useMemo(() => {
    if (!validation.valid) {
      return { geometry: new THREE.BoxGeometry(10, 10, 10), centerline: [] as THREE.Vector3[], endCaps: [] };
    }

    // --- NEW BACKBONE IMPLEMENTATION ---
    const samples = 400; // Increased resolution
    const backboneFrames = buildArcBackboneFrames({
      arcRadiusMm: r,
      alphaDeg: currentAlphaDeg,
      samples,
      profile,
      bowLeanDeg,
      bowPlaneTiltDeg
    });


    const tubePath: THREE.Vector3[] = [];
    const totalCoils = n + (deadCoilsStart ?? 0) + (deadCoilsEnd ?? 0);
    
    let currentD = D;
    let currentd = d;
    
    // Helper to shrink from a base spring
    const shrink = (baseD: number, based: number, gap: number) => {
        const ID_outer = baseD - based;
        const TargetOD_inner = ID_outer - 2 * gap;
        if (TargetOD_inner <= 0.5) return { D: 0.1, d: 0.05 };
        
        const previousOD = baseD + based;
        const scale = TargetOD_inner / previousOD;
        return { D: baseD * scale, d: based * scale };
    };

    // Iteratively compute up to current packIndex
    for (let i = 1; i <= packIndex; i++) {
        // Gap for this layer
        const gap = packGapMm > 0 ? packGapMm : 0.5;
        
        if (i === 1 && spring2 && spring2.D && spring2.d) {
            // Explicit override for 2nd spring
            currentD = spring2.D;
            currentd = spring2.d;
        } else {
            // Auto-shrink from current (which is previous layer at this point in loop)
            const next = shrink(currentD, currentd, gap);
            currentD = next.D;
            currentd = next.d;
        }
    }
    
    const meanCoilRadius = currentD / 2;
    
    // 2. Radial Offset (Centerline shift)
    // For concentric springs, centerline is roughly the same.
    // Previous "radialOffset" moved them apart side-by-side.
    // Now we keep them centered (Offset = 0).
    const radialOffset = 0; 
    
    // 3. Arc Shift (Tangential Jitter)
    // Keep subtle shift or phase shift to avoid z-fighting if they touch
    const arcShiftRatio = 0.0; // Disable arc physical shift for proper nesting look
    
    const arcLength = (currentAlphaDeg * Math.PI / 180) * r;
    const arcShift = 0; // Keep centered
    
    // 4. Phase Offset (Critical for visual separation of nested coils)
    const phaseOffsetRad = (packIndex * (packPhaseDeg ?? 0)) * (Math.PI / 180);

    // --- HIGH-PRECISION BLENDED-ANCHOR ALGORITHM ---
    
    // 1. Calculate physical accumulated arc lengths along the backbone (Essential for BOW profile)
    const cumulativeDistances = new Float32Array(backboneFrames.length);
    let totalLength = 0;
    for (let i = 1; i < backboneFrames.length; i++) {
        totalLength += backboneFrames[i].p.distanceTo(backboneFrames[i-1].p);
        cumulativeDistances[i] = totalLength;
    }
    
    // 2. Define the "Proportion" of turns for each segment
    const propL = totalCoils > 0 ? (deadCoilsStart ?? 0) / totalCoils : 0;
    const propR = totalCoils > 0 ? (deadCoilsEnd ?? 0) / totalCoils : 0;
    const propActive = Math.max(0, 1 - propL - propR);

    // 3. Define the "Spatial Proportion" (s) for each segment
    // Case Solid: Dead coils take minimum space (L = N*d)
    const sL_solid = totalLength > 0 ? ((deadCoilsStart || 0) * d) / totalLength : 0;
    const sR_solid = totalLength > 0 ? ((deadCoilsEnd || 0) * d) / totalLength : 0;
    
    // Case Uniform: Dead coils take their "fair share" of the total arc
    const sL_uniform = propL;
    const sR_uniform = propR;

    // 4. Blend the ANCHORS based on kIntensity
    // k=0 -> sL follows turns proportion (Uniform)
    // k=1 -> sL follows physical wire limit (Solid)
    const kIntensity = Math.max(0, Math.min(1.0, (deadTightnessK ?? 1.0)));
    const anchorSL = sL_uniform * (1 - kIntensity) + sL_solid * kIntensity;
    const anchorSR = sR_uniform * (1 - kIntensity) + sR_solid * kIntensity;

    // Safety: ensure anchors don't cross and leave room for active coils
    const maxAnchorSum = 0.95;
    const currentSum = anchorSL + anchorSR;
    const scaleAnchors = currentSum > maxAnchorSum ? maxAnchorSum / currentSum : 1.0;
    const finalSL = anchorSL * scaleAnchors;
    const finalSR = anchorSR * scaleAnchors;

    const lambdaAt = (s_param: number) => {
        // Find current physical progress along backbone
        if (totalLength <= 0) return s_param;
        const idx = Math.floor(s_param * (cumulativeDistances.length - 1));
        const s_phys = cumulativeDistances[idx] / totalLength;

        // Piecewise mapping of s_phys -> turns_prop
        // This mapping has FIXED ANCHORS: turns(finalSL) is ALWAYS propL
        // This guarantees "No Leakage".
        if (s_phys <= finalSL) {
            return s_phys * (propL / Math.max(1e-6, finalSL));
        } else if (s_phys >= (1 - finalSR)) {
            const u = (s_phys - (1 - finalSR)) / Math.max(1e-6, finalSR);
            return (1 - propR) + propR * u;
        } else {
            const u = (s_phys - finalSL) / Math.max(1e-6, 1 - finalSL - finalSR);
            return propL + propActive * u;
        }
    };

    // Generate Coil Points
    for (let i = 0; i < backboneFrames.length; i++) {
        const frame = backboneFrames[i];
        const s = i / (backboneFrames.length - 1); 
        
        const currentTurns = lambdaAt(s) * totalCoils;
        const phi = (2 * Math.PI * currentTurns) + phaseOffsetRad;

        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        const centerOffset = new THREE.Vector3()
            .addScaledVector(frame.n, -radialOffset) 
            .addScaledVector(frame.t, arcShift);
            
        const coilVector = new THREE.Vector3()
            .addScaledVector(frame.n, cosPhi * meanCoilRadius)
            .addScaledVector(frame.b, sinPhi * meanCoilRadius);
            
        const pFinal = frame.p.clone().add(centerOffset).add(coilVector);
        tubePath.push(pFinal);
    }

    // Build Coil Geometry
    const curve = new THREE.CatmullRomCurve3(tubePath);
    // Increase radialSegments from 8 to 24 for smoother look
    const tubeGeometry = new THREE.TubeGeometry(curve, tubePath.length * 4, currentd/2, 24, false); 
    
    // --- END CAP GEOMETRY ---
    // Rule:
    // ARC -> "RING" (Thin cylinder cap)
    // BOW -> "BLOCK" (Rectangular block) - ONLY for the primary pack (packIndex === 0) to avoid double-vision
    // Unless explicitly overridden (which we don't have explicit prop for yet, so infer from profile)
    
    let endStyle = "RING";
    if (profile === "BOW") {
        endStyle = (packIndex === 0) ? "BLOCK" : "NONE";
    }
    const geometriesToMerge: THREE.BufferGeometry[] = [tubeGeometry];
    
    if (endStyle === "BLOCK") {
        // Create Blocks at Start and End
        // They should align with the FIRST and LAST backbone frame, offset by the same pack amount.
        
        const makeBlock = (isStart: boolean) => {
            const frameIndex = isStart ? 0 : backboneFrames.length - 1;
            const frame = backboneFrames[frameIndex];
            
            // Apply sane offsets
            const centerOffset = new THREE.Vector3()
                .addScaledVector(frame.n, -radialOffset) 
                .addScaledVector(frame.t, arcShift);
                
            const blockCenter = frame.p.clone().add(centerOffset);
            
            // Dimensions
            // Make block LARGER than the spring Outer Diameter (De = D + d) to ensure it's visible as a seat/cap.
            // D = Mean, d = Wire. De = D + d.
            // Let's use D + 1.5d for width/height.
            
            const w = D + d * 1.5;
            const h = D + d * 1.5;
            const len = d * 2.5; // Slightly longer
            
            const boxGeo = new THREE.BoxGeometry(len, w, h);
            
            // Rotate Box to align with Frame
            // Box default is axis-aligned.
            // X axis is length. Align X with Tangent.
            // Y, Z with Normal, Binormal.
            // Matrix construction:
            // Col 0: T
            // Col 1: N
            // Col 2: B
            
            const matrix = new THREE.Matrix4();
            matrix.makeBasis(frame.t, frame.n, frame.b);
            matrix.setPosition(blockCenter);
            
            boxGeo.applyMatrix4(matrix);
            return boxGeo;
        };
        
        geometriesToMerge.push(makeBlock(true));
        geometriesToMerge.push(makeBlock(false));
    }
    
    // Merge if multiple parts
    // Note: use simple merge if supported, or group them. 
    // For single mesh return, merge is best.
    // Three.js mergeBufferGeometries utils... 
    // Since we are inside useMemo returning { geometry }, we might need to import BufferGeometryUtils.
    // But standard THREE doesn't include Utils by default in import * as THREE.
    // For simplicity/safety without extra deps: Just return the TubeGeometry for now 
    // and rely on Group for end caps? 
    // Returning multiple geometries from hook is weird.
    // Let's stick to Group in the Render?
    
    // But hook returns { geometry }.
    // If we want blocks, let's create them as separate meshes in the render loop component.
    // BUT the calculations are heavy here (frames).
    // Let's compute the Block Matrices here and return them?
    
    // Better: Helper function to get end cap transforms.
    
    // Let's modify the return signature of useMemo to include "endCaps" data.
    
    const endCaps = [];
    if (endStyle === "BLOCK") {
         const getMatrix = (idx: number) => {
            const frame = backboneFrames[idx];
            const centerOffset = new THREE.Vector3()
                .addScaledVector(frame.n, -radialOffset) 
                .addScaledVector(frame.t, arcShift);
            const pos = frame.p.clone().add(centerOffset);
            const m = new THREE.Matrix4();
            m.makeBasis(frame.t, frame.n, frame.b);
            m.setPosition(pos);
            return m;
         };
         
         const size: [number, number, number] = [d*2.5, D+d*1.5, D+d*1.5];
         endCaps.push({ matrix: getMatrix(0), size });
         endCaps.push({ matrix: getMatrix(backboneFrames.length - 1), size });
    }

    if (colorMode === "approx_stress") {
      applyApproxStressColors(tubeGeometry, approxStressBeta);
    }
    
    // Extract centerline for visualization from frames
    const centerlinePts = backboneFrames.map(f => {
         // Apply same center offsets to centerline viz
         const centerOffset = new THREE.Vector3()
            .addScaledVector(f.n, -radialOffset) 
            .addScaledVector(f.t, arcShift);
         return f.p.clone().add(centerOffset);
    });

    return { 
        geometry: tubeGeometry, 
        centerline: centerlinePts,
        endCaps // Array of { matrix: Matrix4, size: [l,w,h] }
    };

  }, [
    params,
    validation.valid,
    profile, 
    packIndex, 
    packGapMm, 
    packPhaseDeg, 
    bowLeanDeg, 
    bowPlaneTiltDeg,
    d, D, n, r, 
    deadCoilsStart, deadCoilsEnd,
    deadTightnessK, deadTightnessSigma,
    spring2, colorMode, approxStressBeta,
    profile, packIndex, packGapMm, packPhaseDeg, 
    bowLeanDeg, bowPlaneTiltDeg
  ]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);


  
  // Wait, the previous replace_file_content modified the return of the big useMemo block.
  // But the destructuring at the top of the component:
  // const { geometry, centerline } = useMemo(...)
  // needs to be updated.


  return (
    <group>
      {/* Main Coil */}
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
            color={packIndex === 0 ? (validation.valid ? color : "#ff4444") : "#555555"} // Inner springs dark grey to verify visibility
            metalness={metalness}
            roughness={roughness}
            wireframe={wireframe}
            side={THREE.DoubleSide}
          />
        )}
        <Edges threshold={35} color="#1a365d" />
      </mesh>
      
      {/* End Caps (Blocks) */}
      {(endCaps || []).map((cap, i) => (
         <BlockCap 
            key={`cap-${i}`} 
            matrix={cap.matrix} 
            size={cap.size}
            color={color}
            metalness={metalness}
            roughness={roughness}
         />
      ))}

      {showCenterline && centerline.length > 1 && (
        <Line points={centerline} color="#93c5fd" lineWidth={1} />
      )}
    </group>
  );
}

function BlockCap({ matrix, size, color, metalness, roughness }: {
    matrix: THREE.Matrix4;
    size: [number, number, number];
    color: string;
    metalness: number;
    roughness: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null);

    useLayoutEffect(() => {
        if (meshRef.current) {
            meshRef.current.matrix.copy(matrix);
            // MatrixAutoUpdate is false, so we must manually update world matrix if needed, 
            // though copy() sets local matrix. R3F/Three usually needs updateMatrixWorld() if not auto updating.
            meshRef.current.updateMatrixWorld(); 
        }
    }, [matrix]);

    return (
        <mesh ref={meshRef} matrixAutoUpdate={false} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
            <Edges threshold={35} color="#1a365d" />
        </mesh>
    );
}




export interface ArcSpringVisualizerProps extends ArcSpringMeshProps {
  // Adds pack config to the visualizer container
  packCount?: number;
  autoRotate?: boolean;
}

function ArcSpringScene({
  packCount = 1,
  packGapMm = 3, // Default gap
  packPhaseDeg, 
  bowLeanDeg, 
  bowPlaneTiltDeg,
  spring2,
  fitResult,
  forceRender,
  autoRotate,
  ...meshProps
}: ArcSpringVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create array of indices 0..packCount-1
  const packs = useMemo(() => {
      const count = Math.max(1, Math.round(packCount ?? 1));
      const arr = Array.from({ length: count }, (_, i) => i);
      
      // Defensive Audit Layer: Suppress inner springs if FAIL and !forceRender
      if (fitResult?.status === "FAIL" && !forceRender) {
          return [0];
      }
      return arr;
  }, [packCount, fitResult, forceRender]);

  return (
    <>
      <color attach="background" args={[previewTheme.background]} />
      <ambientLight intensity={previewTheme.lights.ambient} />
      <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} />
      <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
      <pointLight position={previewTheme.lights.point.position} intensity={previewTheme.lights.point.intensity} />

      <group ref={groupRef}>
        {packs.map(i => (
           <ArcSpringMesh
             key={i}
             {...meshProps}
             packIndex={i}
             packGapMm={packGapMm}
             packPhaseDeg={packPhaseDeg}
             bowLeanDeg={bowLeanDeg}
             bowPlaneTiltDeg={bowPlaneTiltDeg}
             spring2={spring2}
           />
        ))}
      </group>

      <AutoFitControls targetRef={groupRef} autoRotate={!!autoRotate} />
    </>
  );
}

export function ArcSpringVisualizer(props: ArcSpringVisualizerProps) {
  return (
    <Canvas camera={{ fov: 45, near: 0.1, far: 5000 }} style={{ width: "100%", height: "100%" }}>
      <ArcSpringScene {...props} />
    </Canvas>
  );
}

export default ArcSpringMesh;
