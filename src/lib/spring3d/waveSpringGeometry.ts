/**
 * Wave Spring 3D Geometry Builder
 * 波形弹簧 3D 几何生成器
 * 
 * Generates BufferGeometry for wave springs using rectangular cross-section sweep
 * along a sinusoidal centerline.
 * 
 * Supports:
 * - Single-turn and multi-turn (axial stacking)
 * - Radial pitch (spiral outward for multi-turn)
 * - Nested mode (multiple independent layers at different radii)
 */

import * as THREE from "three";

// ============================================================================
// Types
// ============================================================================

export type WaveSpringStackingMode = "axial" | "radial" | "nested";

export interface WaveSpringGeometryInput {
  /** Mean diameter Dm (mm) */
  meanDiameter: number;
  /** Strip thickness t (mm) - axial direction (thin dimension) */
  thickness: number;
  /** Strip width b (mm) - radial direction (wide dimension, flat ribbon) */
  width: number;
  /** Wave amplitude A (mm) - half of peak-to-valley in axial direction */
  amplitude: number;
  /** Number of waves per turn */
  waves: number;
  /** Number of turns (stacked axially or radially based on stackingMode) */
  turns: number;
  /** Phase offset (radians) */
  phase?: number;
  /** Scale factor for 3D scene */
  scale?: number;
  /** Radial pitch - increment in radius per turn for radial stacking (mm) */
  radialPitch?: number;
  /** Stacking mode: axial (default), radial (spiral outward), or nested (independent layers) */
  stackingMode?: WaveSpringStackingMode;
  /** For nested mode: array of layer configurations (overrides turns) */
  nestedLayers?: WaveSpringNestedLayer[];
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

// ============================================================================
// Validation
// ============================================================================

export interface WaveSpringGeometryValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWaveSpringGeometry(
  input: WaveSpringGeometryInput
): WaveSpringGeometryValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.meanDiameter <= 0) errors.push("Mean diameter must be > 0");
  if (input.thickness <= 0) errors.push("Thickness must be > 0");
  if (input.width <= 0) errors.push("Width must be > 0");
  if (input.amplitude < 0) errors.push("Amplitude must be >= 0");
  if (input.waves < 2) errors.push("Waves must be >= 2");
  if (input.turns < 1) errors.push("Turns must be >= 1");

  if (input.meanDiameter <= input.thickness) {
    errors.push("Mean diameter must be > thickness");
  }

  // Wave peak contact risk: if amplitude * 2 >= width, waves may touch
  if (input.amplitude * 2 >= input.width) {
    warnings.push("Wave amplitude * 2 >= width - wave peaks may contact each other");
  }

  // Large amplitude relative to width
  if (input.amplitude > input.width * 2) {
    warnings.push("Amplitude is large relative to width - may cause interference");
  }

  if (input.waves > 12) {
    warnings.push("High wave count may be difficult to manufacture");
  }

  // Multi-turn specific checks
  if (input.turns > 1) {
    const stackingMode = input.stackingMode ?? "axial";

    if (stackingMode === "axial") {
      // Check if turns might overlap axially
      const turnSpacing = input.amplitude * 2 + input.thickness * 1.5;
      if (turnSpacing < input.thickness * 2) {
        warnings.push("Multi-turn spacing may cause axial overlap between turns");
      }
    } else if (stackingMode === "radial") {
      // Radial pitch validation
      const radialPitch = input.radialPitch ?? (input.thickness + input.width * 0.1);
      if (radialPitch < input.thickness) {
        errors.push("Radial pitch must be >= thickness to avoid radial overlap");
      }
      if (radialPitch < input.width * 0.5) {
        warnings.push("Radial pitch is small - turns may be very close radially");
      }
    }
  }

  // Nested mode validation
  if (input.stackingMode === "nested" && input.nestedLayers) {
    if (input.nestedLayers.length < 1) {
      errors.push("Nested mode requires at least one layer");
    }
    // Check for layer overlap
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
// Centerline Generation
// ============================================================================

interface CenterlinePoint {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  radialDir: THREE.Vector3;
  axialDir: THREE.Vector3;
  theta: number;
}

interface CenterlineOptions {
  /** Override radius (for nested layers) */
  radiusOverride?: number;
  /** Override amplitude (for nested layers) */
  amplitudeOverride?: number;
  /** Override waves (for nested layers) */
  wavesOverride?: number;
  /** Override phase (for nested layers) */
  phaseOverride?: number;
}

function generateCenterline(
  input: WaveSpringGeometryInput,
  segments: number,
  turnIndex: number = 0,
  options: CenterlineOptions = {}
): CenterlinePoint[] {
  const { meanDiameter, thickness, width, radialPitch, stackingMode = "axial" } = input;
  const amplitude = options.amplitudeOverride ?? input.amplitude;
  const waves = options.wavesOverride ?? input.waves;
  const phase = options.phaseOverride ?? input.phase ?? 0;

  // Calculate radius based on stacking mode
  let R = options.radiusOverride ?? (meanDiameter / 2);
  let turnZOffset = 0;

  if (stackingMode === "axial") {
    // Axial stacking: same radius, offset in Z
    turnZOffset = turnIndex * (amplitude * 2 + thickness * 1.5);
  } else if (stackingMode === "radial") {
    // Radial stacking: increasing radius, same Z plane
    const pitch = radialPitch ?? (thickness + width * 0.1);
    R = (meanDiameter / 2) + turnIndex * pitch;
    turnZOffset = 0;
  }
  // For nested mode, radius is set via radiusOverride

  const turnPhase = phase + (turnIndex * Math.PI / waves);
  const points: CenterlinePoint[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = t * 2 * Math.PI;

    // Position on centerline - wave oscillates in Z (axial) direction
    const x = R * Math.cos(theta);
    const y = R * Math.sin(theta);
    const z = amplitude * Math.sin(waves * theta + turnPhase) + turnZOffset;

    const position = new THREE.Vector3(x, y, z);

    // Tangent (derivative of position w.r.t. theta)
    // dx/dθ = -R * sin(θ)
    // dy/dθ = R * cos(θ)
    // dz/dθ = A * waves * cos(waves * θ + phase)
    const dxdt = -R * Math.sin(theta);
    const dydt = R * Math.cos(theta);
    const dzdt = amplitude * waves * Math.cos(waves * theta + turnPhase);
    const tangent = new THREE.Vector3(dxdt, dydt, dzdt).normalize();

    // Radial direction (pointing outward from center axis in XY plane)
    // FIXED: Use constant radial direction, not dependent on tangent
    const radialDir = new THREE.Vector3(Math.cos(theta), Math.sin(theta), 0);

    // Axial direction - FIXED: Always use pure Z axis
    // Wave spring cross-section should NOT rotate with the wave oscillation
    // The strip should maintain constant orientation: width=radial, thickness=axial
    const axialDir = new THREE.Vector3(0, 0, 1);

    points.push({
      position,
      tangent,
      radialDir,
      axialDir,
      theta,
    });
  }

  return points;
}

// ============================================================================
// Rectangular Cross-Section Sweep
// ============================================================================

function buildRectangularSweepGeometry(
  centerline: CenterlinePoint[],
  thickness: number,
  width: number
): THREE.BufferGeometry {
  const numPoints = centerline.length;
  // For wave spring: width is in RADIAL direction (flat ribbon), thickness is in AXIAL direction
  const halfW = width / 2;   // radial half-width
  const halfT = thickness / 2; // axial half-thickness

  // 4 corners per cross-section: ++, +-, --, -+
  // (radial direction for width, axial direction for thickness)
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  // Generate vertices for each cross-section
  for (let i = 0; i < numPoints; i++) {
    const pt = centerline[i];
    const { position, radialDir, axialDir } = pt;

    // 4 corner offsets for flat ribbon cross-section:
    // Width extends in radial direction (inner/outer)
    // Thickness extends in axial direction (top/bottom)
    // Corner 0: +radial (outer), +axial (top)
    // Corner 1: +radial (outer), -axial (bottom)
    // Corner 2: -radial (inner), -axial (bottom)
    // Corner 3: -radial (inner), +axial (top)
    const corners = [
      position.clone().add(radialDir.clone().multiplyScalar(halfW)).add(axialDir.clone().multiplyScalar(halfT)),
      position.clone().add(radialDir.clone().multiplyScalar(halfW)).add(axialDir.clone().multiplyScalar(-halfT)),
      position.clone().add(radialDir.clone().multiplyScalar(-halfW)).add(axialDir.clone().multiplyScalar(-halfT)),
      position.clone().add(radialDir.clone().multiplyScalar(-halfW)).add(axialDir.clone().multiplyScalar(halfT)),
    ];

    for (const corner of corners) {
      vertices.push(corner.x, corner.y, corner.z);
    }

    // Normals for each corner (pointing outward from faces)
    // Top face (corners 0,3): +axialDir
    // Bottom face (corners 1,2): -axialDir
    // Outer face (corners 0,1): +radialDir
    // Inner face (corners 2,3): -radialDir
    normals.push(axialDir.x + radialDir.x, axialDir.y + radialDir.y, axialDir.z + radialDir.z); // corner 0
    normals.push(-axialDir.x + radialDir.x, -axialDir.y + radialDir.y, -axialDir.z + radialDir.z); // corner 1
    normals.push(-axialDir.x - radialDir.x, -axialDir.y - radialDir.y, -axialDir.z - radialDir.z); // corner 2
    normals.push(axialDir.x - radialDir.x, axialDir.y - radialDir.y, axialDir.z - radialDir.z); // corner 3
  }

  // Generate faces between consecutive cross-sections
  for (let i = 0; i < numPoints - 1; i++) {
    const base = i * 4;
    const next = (i + 1) * 4;

    // Outer face (corners 0,1 -> next 0,1) - radial outer
    indices.push(base + 0, next + 0, next + 1);
    indices.push(base + 0, next + 1, base + 1);

    // Bottom face (corners 1,2 -> next 1,2) - axial bottom
    indices.push(base + 1, next + 1, next + 2);
    indices.push(base + 1, next + 2, base + 2);

    // Inner face (corners 2,3 -> next 2,3) - radial inner
    indices.push(base + 2, next + 2, next + 3);
    indices.push(base + 2, next + 3, base + 3);

    // Top face (corners 3,0 -> next 3,0) - axial top
    indices.push(base + 3, next + 3, next + 0);
    indices.push(base + 3, next + 0, base + 0);
  }

  // End caps (optional for V1, but adds visual completeness)
  // Start cap (i=0)
  indices.push(0, 1, 2);
  indices.push(0, 2, 3);

  // End cap (i=numPoints-1)
  const lastBase = (numPoints - 1) * 4;
  indices.push(lastBase + 0, lastBase + 2, lastBase + 1);
  indices.push(lastBase + 0, lastBase + 3, lastBase + 2);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  // Recompute normals for better shading
  geometry.computeVertexNormals();

  return geometry;
}

// ============================================================================
// Main Builder Function
// ============================================================================

export function buildWaveSpringMeshGeometry(
  input: WaveSpringGeometryInput
): WaveSpringGeometryResult {
  const scale = input.scale ?? 1;
  const { meanDiameter, thickness, width, waves, turns, stackingMode = "axial", nestedLayers } = input;

  // Calculate segment count based on geometry complexity
  const minSegmentsPerWave = 32;
  const segmentsPerTurn = Math.max(waves * minSegmentsPerWave, 128);

  // For multi-turn wave springs, generate each turn separately and merge
  const allGeometries: THREE.BufferGeometry[] = [];
  let totalWireLength = 0;

  if (stackingMode === "nested" && nestedLayers && nestedLayers.length > 0) {
    // Nested mode: generate each layer independently
    for (let layerIdx = 0; layerIdx < nestedLayers.length; layerIdx++) {
      const layer = nestedLayers[layerIdx];
      const layerRadius = (meanDiameter / 2) + layer.radiusOffset;

      const centerline = generateCenterline(input, segmentsPerTurn, layerIdx, {
        radiusOverride: layerRadius,
        amplitudeOverride: layer.amplitude,
        wavesOverride: layer.waves,
        phaseOverride: layer.phase,
      });

      const layerGeometry = buildRectangularSweepGeometry(centerline, thickness, width);
      allGeometries.push(layerGeometry);

      for (let i = 1; i < centerline.length; i++) {
        totalWireLength += centerline[i].position.distanceTo(centerline[i - 1].position);
      }
    }
  } else {
    // Axial or Radial stacking mode
    for (let turnIdx = 0; turnIdx < turns; turnIdx++) {
      // Generate centerline for this turn
      const centerline = generateCenterline(input, segmentsPerTurn, turnIdx);

      // Build geometry for this turn
      const turnGeometry = buildRectangularSweepGeometry(centerline, thickness, width);
      allGeometries.push(turnGeometry);

      // Calculate wire length for this turn
      for (let i = 1; i < centerline.length; i++) {
        totalWireLength += centerline[i].position.distanceTo(centerline[i - 1].position);
      }
    }
  }

  // Merge all turn geometries into one
  let geometry: THREE.BufferGeometry;
  if (allGeometries.length === 1) {
    geometry = allGeometries[0];
  } else {
    geometry = mergeBufferGeometries(allGeometries);
  }

  // Apply scale
  if (scale !== 1) {
    geometry.scale(scale, scale, scale);
  }

  // Compute bounding box
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
  const indices: number[] = [];

  let vertexOffset = 0;


  for (const g of geometries) {
    const pos = g.getAttribute("position");
    const norm = g.getAttribute("normal");
    const idx = g.getIndex();

    // Copy positions
    for (let i = 0; i < pos.count * 3; i++) {
      positions[vertexOffset * 3 + i] = (pos.array as Float32Array)[i];
    }

    // Copy normals
    if (norm) {
      for (let i = 0; i < norm.count * 3; i++) {
        normals[vertexOffset * 3 + i] = (norm.array as Float32Array)[i];
      }
    }

    // Copy indices with offset
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push((idx.array as Uint16Array | Uint32Array)[i] + vertexOffset);
      }
    }

    vertexOffset += pos.count;
  }

  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  merged.setIndex(indices);

  return merged;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function estimateWaveSpringWireLength(input: WaveSpringGeometryInput): number {
  const { meanDiameter, amplitude, waves, turns } = input;
  const R = meanDiameter / 2;

  // Approximate arc length using numerical integration
  const segments = turns * waves * 64;
  let length = 0;

  for (let i = 1; i <= segments; i++) {
    const t0 = ((i - 1) / segments) * turns * 2 * Math.PI;
    const t1 = (i / segments) * turns * 2 * Math.PI;

    const x0 = R * Math.cos(t0);
    const y0 = R * Math.sin(t0);
    const z0 = amplitude * Math.sin(waves * t0);

    const x1 = R * Math.cos(t1);
    const y1 = R * Math.sin(t1);
    const z1 = amplitude * Math.sin(waves * t1);

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
  };
}
