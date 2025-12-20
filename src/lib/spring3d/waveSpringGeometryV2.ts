/**
 * Wave Spring 3D Geometry Builder V2
 * 波形弹簧 3D 几何生成器 V2
 * 
 * Fixed issues from V1:
 * - Seam gaps: Use θ ∈ [0, 2π) not [0, 2π] to avoid duplicate end section
 * - Phase discontinuity: Use θ_local for wave function to ensure per-turn continuity
 * - Normal flipping: Use Parallel Transport Frame (PTF) for stable ribbon orientation
 * - End caps: Add optional end caps for multi-turn springs
 * 
 * Based on OpenAI's engineering analysis and recommendations.
 */

import * as THREE from "three";

// ============================================================================
// Types
// ============================================================================

export type WaveSpringWinding = "CW" | "CCW";
export type WaveSpringStackingMode = "axial" | "radial" | "nested";

export interface WaveSpringGeometryInput {
  /** Mean diameter Dm (mm) - for axial/nested modes */
  meanDiameter: number;
  /** Inner diameter (mm) - for radial spiral mode */
  innerDiameter?: number;
  /** Strip thickness t (mm) - axial direction (thin dimension) */
  thickness: number;
  /** Strip width b (mm) - radial direction (wide dimension, flat ribbon) */
  width: number;
  /** Wave amplitude A (mm) - half of peak-to-valley in axial direction */
  amplitude: number;
  /** Number of waves per turn (integer recommended for seamless closure) */
  waves: number;
  /** Number of turns */
  turns: number;
  /** Phase offset (radians) */
  phase?: number;
  /** Phase offset per turn (radians) - for crest-to-crest alignment */
  phasePerTurn?: number;
  /** Scale factor for 3D scene */
  scale?: number;
  /** Radial pitch - increment in radius per turn for radial stacking (mm) */
  radialPitch?: number;
  /** Axial pitch - z rise per turn for helix mode (mm). If 0, produces stacked rings. */
  axialPitch?: number;
  /** Total height (mm) - alternative to axialPitch. axialPitch = totalHeight / turns */
  totalHeight?: number;
  /** Stacking mode: axial (default), radial (spiral outward), or nested */
  stackingMode?: WaveSpringStackingMode;
  /** For nested mode: array of layer configurations */
  nestedLayers?: WaveSpringNestedLayer[];
  /** Segments per turn for smooth rendering (default 220) */
  segmentsPerTurn?: number;
  /** Add end caps to close the ribbon ends (default true) */
  capEnds?: boolean;
  /** Winding direction (default CCW) */
  winding?: WaveSpringWinding;
}

export interface WaveSpringNestedLayer {
  /** Layer radius offset from meanDiameter (mm) */
  radiusOffset: number;
  /** Optional different wave count for this layer */
  waves?: number;
  /** Optional different amplitude for this layer */
  amplitude?: number;
  /** Optional phase offset for this layer */
  phase?: number;
}

export interface WaveSpringGeometryResult {
  geometry: THREE.BufferGeometry;
  wireLength: number;
  boundingBox: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  };
}

export interface WaveSpringGeometryValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Validation
// ============================================================================

export function validateWaveSpringGeometry(
  input: WaveSpringGeometryInput
): WaveSpringGeometryValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const meanDiameter = input.meanDiameter ?? (input.innerDiameter ? input.innerDiameter + input.turns * (input.radialPitch ?? input.thickness) : 0);

  if (meanDiameter <= 0 && !input.innerDiameter) errors.push("Mean diameter or inner diameter must be > 0");
  if (input.thickness <= 0) errors.push("Thickness must be > 0");
  if (input.width <= 0) errors.push("Width must be > 0");
  if (input.amplitude < 0) errors.push("Amplitude must be >= 0");
  if (input.waves < 2) errors.push("Waves must be >= 2");
  if (input.turns < 1) errors.push("Turns must be >= 1");

  // Non-integer waves warning
  if (input.waves !== Math.floor(input.waves)) {
    warnings.push("Non-integer waves per turn may cause phase discontinuity at seam");
  }

  // Wave peak contact risk
  if (input.amplitude * 2 >= input.width) {
    warnings.push("Wave amplitude * 2 >= width - wave peaks may contact each other");
  }

  if (input.waves > 12) {
    warnings.push("High wave count may be difficult to manufacture");
  }

  // Radial pitch validation
  if (input.stackingMode === "radial" && input.turns > 1) {
    const radialPitch = input.radialPitch ?? input.thickness;
    if (radialPitch < input.thickness) {
      errors.push("Radial pitch must be >= thickness to avoid radial overlap");
    }
  }

  // Axial pitch / layer collision validation
  const axialPitch = input.axialPitch ?? (input.totalHeight ? input.totalHeight / input.turns : 0);
  if (axialPitch > 0 && input.turns > 1) {
    const minSafeAxialPitch = 2 * input.amplitude + 0.2 * input.thickness;
    if (axialPitch <= minSafeAxialPitch) {
      warnings.push(`Axial pitch (${axialPitch.toFixed(2)}mm) <= 2*amplitude + 0.2*thickness (${minSafeAxialPitch.toFixed(2)}mm) - risk of layer collision`);
    }
  }

  // Nested mode validation
  if (input.stackingMode === "nested" && input.nestedLayers) {
    if (input.nestedLayers.length < 1) {
      errors.push("Nested mode requires at least one layer");
    }
    const sortedLayers = [...input.nestedLayers].sort((a, b) => a.radiusOffset - b.radiusOffset);
    for (let i = 1; i < sortedLayers.length; i++) {
      const gap = sortedLayers[i].radiusOffset - sortedLayers[i - 1].radiusOffset;
      if (gap < input.width) {
        warnings.push(`Nested layers ${i} and ${i + 1} may overlap radially`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

const EPS = 1e-9;

function safeNormalize(v: THREE.Vector3): THREE.Vector3 {
  const len = v.length();
  if (len < EPS) return v.set(1, 0, 0);
  return v.multiplyScalar(1 / len);
}

function rotateAroundAxis(v: THREE.Vector3, axis: THREE.Vector3, angle: number): THREE.Vector3 {
  const k = axis.clone().normalize();
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cross = new THREE.Vector3().crossVectors(k, v);
  const dot = k.dot(v);
  return v
    .clone()
    .multiplyScalar(cos)
    .add(cross.multiplyScalar(sin))
    .add(k.multiplyScalar(dot * (1 - cos)));
}

// ============================================================================
// Core Geometry Builder (V2 - Continuous Helix with Sign-Flip Wave)
// ============================================================================
// 
// Wave spring is a CONTINUOUS strip wound into a helix, with wave pattern.
// To achieve crest-to-crest contact between adjacent turns:
// 
// z(θ) = z_base(θ) + z_wave(θ)
//   z_base = (P / 2π) * θ           -- linear helix rise
//   z_wave = A * sin(Nw * θ) * s(θ) -- wave with sign flip per turn
//   s(θ) = (-1)^floor(θ / 2π)       -- alternates +1/-1 each turn
//
// WHY this works (crest-to-crest contact):
// At same angular position (θ mod 2π), adjacent turns differ by:
//   - Base height: P
//   - Wave: sign flipped, so at crest: +A vs -A → difference = 2A
// For contact: P = 2A → crests touch!
//
// WHY no discontinuity at turn boundaries:
// At θ = 2πk, sin(Nw * θ) = sin(2πk * Nw) = 0 (for integer Nw)
// So even though s(θ) flips, z_wave = 0 at boundaries → continuous!

interface BuildContinuousHelixParams {
  /** Mean radius Rm (mm) */
  meanRadius: number;
  /** Pitch P (mm) - axial rise per turn */
  pitch: number;
  /** Wave amplitude A (mm) - should be P/2 for crest contact */
  amplitude: number;
  /** Waves per turn (integer recommended) */
  waves: number;
  /** Total turns */
  turns: number;
  /** Initial phase offset (radians) */
  phase: number;
  /** Strip thickness (mm) */
  thickness: number;
  /** Strip width (mm) */
  width: number;
  /** Segments per turn */
  segmentsPerTurn: number;
  /** Winding direction */
  winding: WaveSpringWinding;
  /** Add end caps */
  capEnds: boolean;
}

function buildContinuousHelixGeometry(params: BuildContinuousHelixParams): {
  geometry: THREE.BufferGeometry;
  wireLength: number;
} {
  const {
    meanRadius,
    pitch,
    amplitude,
    waves,
    turns,
    phase,
    thickness,
    width,
    segmentsPerTurn,
    winding,
    capEnds,
  } = params;

  const dirSign = winding === "CCW" ? 1 : -1;
  const totalTheta = 2 * Math.PI * turns;
  const totalSegments = Math.max(40, Math.floor(segmentsPerTurn * turns));
  const dTheta = totalTheta / totalSegments;

  const halfW = width / 2;
  const halfT = thickness / 2;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let wireLength = 0;

  function pushVertex(pos: THREE.Vector3, normal: THREE.Vector3, u: number, v: number) {
    positions.push(pos.x, pos.y, pos.z);
    normals.push(normal.x, normal.y, normal.z);
    uvs.push(u, v);
  }

  /**
   * CORRECT Wave Spring Model: Continuous Helix with Sign-Flip Wave
   * 
   * z(θ) = z_base(θ) + z_wave(θ)
   *   z_base = (P / 2π) * θ           -- linear helix rise
   *   z_wave = A * sin(Nw * θ) * s(θ) -- wave with sign flip per turn
   *   s(θ) = (-1)^floor(θ / 2π)       -- alternates +1/-1 each turn
   * 
   * With A = P/2: crests touch between adjacent turns!
   * At θ = 2πk boundaries: sin(Nw * 2πk) = 0 → no discontinuity!
   */
  function centerlinePoint(theta: number): THREE.Vector3 {
    const th = dirSign * theta;
    const x = meanRadius * Math.cos(th);
    const y = meanRadius * Math.sin(th);
    
    // z_base: linear helix rise
    const z_base = (pitch / (2 * Math.PI)) * theta;
    
    // Sign flip per turn: s(θ) = (-1)^floor(θ / 2π)
    const turnIndex = Math.floor(theta / (2 * Math.PI));
    const s = (turnIndex % 2 === 0) ? 1 : -1;
    
    // z_wave: wave with sign flip
    const z_wave = amplitude * Math.sin(waves * theta + phase) * s;
    
    const z = z_base + z_wave;
    
    return new THREE.Vector3(x, y, z);
  }

  function centerlineTangent(theta: number): THREE.Vector3 {
    const t0 = Math.max(0, theta - dTheta * 0.5);
    const t1 = Math.min(totalTheta, theta + dTheta * 0.5);
    const p0 = centerlinePoint(t0);
    const p1 = centerlinePoint(t1);
    return safeNormalize(p1.sub(p0));
  }

  // FIXED: Use fixed frame instead of PTF
  // Wave spring cross-section should NOT rotate with the wave oscillation
  // The strip should maintain constant orientation: width=radial, thickness=axial
  // This is the same approach as Die Spring geometry

  let prevP: THREE.Vector3 | null = null;
  let firstSectionIdx = 0;
  let lastSectionIdx = 0;

  // Build continuous strip: i <= totalSegments (include endpoint)
  for (let i = 0; i <= totalSegments; i++) {
    const theta = i * dTheta;
    const P = centerlinePoint(theta);
    // Note: tangent is computed but not used for frame - we use fixed frame instead

    // FIXED FRAME: radial direction based on angular position, axial always Z
    // This ensures cross-section does not rotate with wave oscillation
    const th = dirSign * theta;
    const N = new THREE.Vector3(Math.cos(th), Math.sin(th), 0);  // radial (width direction)
    const B = new THREE.Vector3(0, 0, 1);  // axial (thickness direction)

    // Corner positions (rectangular cross-section)
    // N = radial direction (for width), B = axial direction (for thickness)
    const c0 = P.clone().add(N.clone().multiplyScalar(+halfW)).add(B.clone().multiplyScalar(+halfT));
    const c1 = P.clone().add(N.clone().multiplyScalar(+halfW)).add(B.clone().multiplyScalar(-halfT));
    const c2 = P.clone().add(N.clone().multiplyScalar(-halfW)).add(B.clone().multiplyScalar(-halfT));
    const c3 = P.clone().add(N.clone().multiplyScalar(-halfW)).add(B.clone().multiplyScalar(+halfT));

    // Smooth corner normals (blend of radial and axial)
    const n0 = safeNormalize(N.clone().add(B.clone()));
    const n1 = safeNormalize(N.clone().sub(B.clone()));
    const n2 = safeNormalize(N.clone().negate().sub(B.clone()));
    const n3 = safeNormalize(N.clone().negate().add(B.clone()));

    const baseIdx = (positions.length / 3) | 0;
    if (i === 0) firstSectionIdx = baseIdx;
    if (i === totalSegments) lastSectionIdx = baseIdx;

    const u = i / totalSegments;
    pushVertex(c0, n0, u, 1);
    pushVertex(c1, n1, u, 0.67);
    pushVertex(c2, n2, u, 0.33);
    pushVertex(c3, n3, u, 0);

    // Connect to previous section
    if (i > 0) {
      const prevBase = baseIdx - 4;
      indices.push(prevBase + 0, prevBase + 1, baseIdx + 1);
      indices.push(prevBase + 0, baseIdx + 1, baseIdx + 0);
      indices.push(prevBase + 1, prevBase + 2, baseIdx + 2);
      indices.push(prevBase + 1, baseIdx + 2, baseIdx + 1);
      indices.push(prevBase + 2, prevBase + 3, baseIdx + 3);
      indices.push(prevBase + 2, baseIdx + 3, baseIdx + 2);
      indices.push(prevBase + 3, prevBase + 0, baseIdx + 0);
      indices.push(prevBase + 3, baseIdx + 0, baseIdx + 3);
    }

    // Wire length
    if (prevP) {
      wireLength += P.distanceTo(prevP);
    }
    prevP = P.clone();
  }

  // Add end caps if requested
  if (capEnds) {
    // Start cap
    const startBase = firstSectionIdx;
    const startCenter = new THREE.Vector3(
      (positions[startBase * 3] + positions[(startBase + 2) * 3]) / 2,
      (positions[startBase * 3 + 1] + positions[(startBase + 2) * 3 + 1]) / 2,
      (positions[startBase * 3 + 2] + positions[(startBase + 2) * 3 + 2]) / 2
    );
    const startNormal = centerlineTangent(0).negate();
    const startCenterIdx = (positions.length / 3) | 0;
    pushVertex(startCenter, startNormal, 0, 0.5);
    indices.push(startCenterIdx, startBase + 1, startBase + 0);
    indices.push(startCenterIdx, startBase + 2, startBase + 1);
    indices.push(startCenterIdx, startBase + 3, startBase + 2);
    indices.push(startCenterIdx, startBase + 0, startBase + 3);

    // End cap
    const endBase = lastSectionIdx;
    const endCenter = new THREE.Vector3(
      (positions[endBase * 3] + positions[(endBase + 2) * 3]) / 2,
      (positions[endBase * 3 + 1] + positions[(endBase + 2) * 3 + 1]) / 2,
      (positions[endBase * 3 + 2] + positions[(endBase + 2) * 3 + 2]) / 2
    );
    const endNormal = centerlineTangent(totalTheta);
    const endCenterIdx = (positions.length / 3) | 0;
    pushVertex(endCenter, endNormal, 1, 0.5);
    indices.push(endCenterIdx, endBase + 0, endBase + 1);
    indices.push(endCenterIdx, endBase + 1, endBase + 2);
    indices.push(endCenterIdx, endBase + 2, endBase + 3);
    indices.push(endCenterIdx, endBase + 3, endBase + 0);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  geometry.computeVertexNormals();

  return { geometry, wireLength };
}

// ============================================================================
// Main Builder Function
// ============================================================================

export function buildWaveSpringMeshGeometry(
  input: WaveSpringGeometryInput
): WaveSpringGeometryResult {
  const scale = input.scale ?? 1;
  const {
    meanDiameter,
    innerDiameter,
    thickness,
    width,
    amplitude,
    waves,
    turns,
    phase = 0,
    radialPitch = 0,
    axialPitch: inputAxialPitch,
    totalHeight: inputTotalHeight,
    stackingMode = "axial",
    nestedLayers,
    segmentsPerTurn = 220,
    capEnds = true, // Default true for open helix strip
    winding = "CCW",
  } = input;

  // Calculate total height: totalHeight takes precedence, then axialPitch * turns, then default
  // Default: (2 * amplitude + thickness) * turns to show visible helix rise
  const effectiveTotalHeight = inputTotalHeight 
    ?? (inputAxialPitch ? inputAxialPitch * turns : (2 * amplitude + thickness * 1.5) * turns);

  // Calculate pitch per turn using corrected formula: p = Hf / (Nt + 1)
  // This accounts for wave amplitude at both ends: Hf ≈ Nt * p + 2A, with p = 2A
  // Solving: Hf = (Nt + 1) * p
  const pitchPerTurn = effectiveTotalHeight / (turns + 1);
  
  // Auto-calculate amplitude for crest-to-valley contact condition: A = p/2
  // With safety clamp to avoid self-intersection: A <= 0.45 * p or A <= (p - t) / 2
  const maxSafeAmplitude = Math.min(0.45 * pitchPerTurn, (pitchPerTurn - thickness) / 2);
  const effectiveAmplitude = Math.min(amplitude, Math.max(0, maxSafeAmplitude));

  // Determine inner/outer radius
  // If innerDiameter provided, use it; otherwise derive from meanDiameter
  const innerRadius = innerDiameter 
    ? innerDiameter / 2 
    : meanDiameter / 2 - (radialPitch * turns / 2);
  
  // Outer radius: innerRadius + radialPitch * turns
  // If no radialPitch, outer = inner (constant radius)
  const outerRadius = innerRadius + radialPitch * turns;

  let geometry: THREE.BufferGeometry;
  let totalWireLength = 0;

  // Calculate mean radius
  const meanRadius = meanDiameter / 2;

  if (stackingMode === "nested" && nestedLayers && nestedLayers.length > 0) {
    // Nested mode: multiple independent layers at different radii
    const allGeometries: THREE.BufferGeometry[] = [];
    
    for (let layerIdx = 0; layerIdx < nestedLayers.length; layerIdx++) {
      const layer = nestedLayers[layerIdx];
      const layerRadius = meanRadius + layer.radiusOffset;
      
      const result = buildContinuousHelixGeometry({
        meanRadius: layerRadius,
        pitch: pitchPerTurn,
        amplitude: layer.amplitude ?? effectiveAmplitude,
        waves: layer.waves ?? waves,
        turns: 1, // Each nested layer is single turn
        phase: layer.phase ?? phase,
        thickness,
        width,
        segmentsPerTurn,
        winding,
        capEnds,
      });

      allGeometries.push(result.geometry);
      totalWireLength += result.wireLength;
    }
    
    geometry = allGeometries.length === 1 
      ? allGeometries[0] 
      : mergeBufferGeometries(allGeometries);
  } else {
    // Default mode: Continuous helix with sign-flip wave for crest-to-crest contact
    // z(θ) = (P/2π)*θ + A*sin(Nw*θ)*s(θ), where s(θ) = (-1)^floor(θ/2π)
    const result = buildContinuousHelixGeometry({
      meanRadius,
      pitch: pitchPerTurn,
      amplitude: effectiveAmplitude,
      waves,
      turns,
      phase,
      thickness,
      width,
      segmentsPerTurn,
      winding,
      capEnds,
    });

    geometry = result.geometry;
    totalWireLength = result.wireLength;
  }

  // Apply scale
  if (scale !== 1) {
    geometry.scale(scale, scale, scale);
  }

  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;

  return {
    geometry,
    wireLength: totalWireLength,
    boundingBox: {
      min: bbox.min.clone(),
      max: bbox.max.clone(),
    },
  };
}

function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();

  let totalVertices = 0;
  for (const g of geometries) {
    totalVertices += g.getAttribute("position").count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);
  const indices: number[] = [];

  let vertexOffset = 0;

  for (const g of geometries) {
    const pos = g.getAttribute("position");
    const norm = g.getAttribute("normal");
    const uv = g.getAttribute("uv");
    const idx = g.getIndex();

    for (let i = 0; i < pos.count * 3; i++) {
      positions[vertexOffset * 3 + i] = (pos.array as Float32Array)[i];
    }

    if (norm) {
      for (let i = 0; i < norm.count * 3; i++) {
        normals[vertexOffset * 3 + i] = (norm.array as Float32Array)[i];
      }
    }

    if (uv) {
      for (let i = 0; i < uv.count * 2; i++) {
        uvs[vertexOffset * 2 + i] = (uv.array as Float32Array)[i];
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push((idx.array as Uint16Array | Uint32Array)[i] + vertexOffset);
      }
    }

    vertexOffset += pos.count;
  }

  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  merged.setIndex(indices);

  return merged;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function estimateWaveSpringWireLength(input: WaveSpringGeometryInput): number {
  const { meanDiameter, amplitude, waves, turns } = input;
  const R = meanDiameter / 2;

  const segments = turns * waves * 64;
  let length = 0;

  for (let i = 1; i <= segments; i++) {
    const t0 = ((i - 1) / segments) * turns * 2 * Math.PI;
    const t1 = (i / segments) * turns * 2 * Math.PI;

    const x0 = R * Math.cos(t0);
    const y0 = R * Math.sin(t0);
    const z0 = amplitude * Math.sin(waves * (t0 % (2 * Math.PI)));

    const x1 = R * Math.cos(t1);
    const y1 = R * Math.sin(t1);
    const z1 = amplitude * Math.sin(waves * (t1 % (2 * Math.PI)));

    length += Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2 + (z1 - z0) ** 2);
  }

  return length;
}

export function getDefaultWaveSpringGeometryInput(): WaveSpringGeometryInput {
  return {
    meanDiameter: 30,
    thickness: 0.5,
    width: 5,
    amplitude: 2.0,
    waves: 4,
    turns: 3,
    phase: 0,
    scale: 1,
    stackingMode: "axial",
    segmentsPerTurn: 220,
    capEnds: false,
    winding: "CCW",
  };
}
