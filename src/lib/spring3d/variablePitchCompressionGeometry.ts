import * as THREE from "three";

import {
  calculateVariablePitchCompressionAtDeflection,
  type VariablePitchSegment,
} from "@/lib/springMath";

export type VariablePitchCompressionGeometryParams = {
  wireDiameter: number;
  meanDiameter: number;
  shearModulus: number;
  activeCoils0: number;
  totalCoils: number;
  freeLength?: number;
  segments: VariablePitchSegment[];
  deflection: number;
};

export type VariablePitchCompressionGeometryOptions = {
  pointsPerTurn?: number;
  radialSegments?: number;
  tubeSegmentsPerTurn?: number;
  closingTurns?: number;
  contactGapRatio?: number;
  smoothAnimation?: boolean;
};

export type VariablePitchCompressionCenterline = {
  points: THREE.Vector3[];
  zMin: number;
  zMax: number;
};

function clampFinite(n: number, fallback: number): number {
  return Number.isFinite(n) ? n : fallback;
}

function computeEndDeadTurns(totalCoils: number, activeCoils0: number): { bottom: number; top: number } {
  const dead = Math.max(0, Math.round(totalCoils - activeCoils0));
  const bottom = Math.floor(dead / 2);
  const top = dead - bottom;
  return { bottom, top };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function buildVariablePitchCompressionCenterline(
  params: VariablePitchCompressionGeometryParams,
  opts: VariablePitchCompressionGeometryOptions = {}
): VariablePitchCompressionCenterline {
  const d = clampFinite(params.wireDiameter, 1);
  const dm = clampFinite(params.meanDiameter, 10);
  const R = 0.5 * dm;

  const contactGapRatio = clampFinite(opts.contactGapRatio ?? 0.002, 0.002);
  const solidDz = d * (1 + Math.max(0, contactGapRatio));

  const pointsPerTurn = Math.max(8, Math.round(opts.pointsPerTurn ?? 24));
  const closingTurns = Math.max(0, opts.closingTurns ?? 1.5);

  const res = calculateVariablePitchCompressionAtDeflection({
    wireDiameter: params.wireDiameter,
    meanDiameter: params.meanDiameter,
    shearModulus: params.shearModulus,
    activeCoils0: params.activeCoils0,
    totalCoils: params.totalCoils,
    freeLength: params.freeLength,
    segments: params.segments,
    deflection: params.deflection,
  });

  const segmentStates = res.segmentStates;

  const dxSolid = segmentStates.reduce(
    (acc, st) => acc + Math.max(0, st.spacing) * Math.max(0, st.solidCoils),
    0
  );
  const dxElastic = Math.max(0, params.deflection - dxSolid);
  const dzReduction = dxElastic / Math.max(1e-9, res.activeCoils);

  const { bottom: bottomDead, top: topDead } = computeEndDeadTurns(
    params.totalCoils,
    params.activeCoils0
  );

  const firstActivePitch = clampFinite(segmentStates[0]?.pitch ?? d, d);
  const lastActivePitch = clampFinite(segmentStates[segmentStates.length - 1]?.pitch ?? d, d);

  type TurnBlock =
    | {
      kind: "active";
      turns: number;
      pitch: number;
    }
    | {
      kind: "solid";
      turns: number;
      pitch: number;
    }
    | {
      kind: "partial";
      turns: number;
      pitch: number;
      // 0..1, how much of this partial turn is solid at the end
      solidFraction: number;
    };

  // --- Refactored Deflection Logic: Only Active segments compress ---

  // --- Refactored Deflection Logic: Only Active segments compress ---
  const initialBlocks: TurnBlock[] = [];

  // Helper to generate tapered rigid blocks (prevents interference kinks)
  const addTaperedDeadCoils = (
    numTurns: number,
    pitchAtDeadEnd: number,
    pitchAtActiveEnd: number,
    blocks: TurnBlock[],
    isBottom: boolean
  ) => {
    if (numTurns <= 0) return;

    // Use transition over min(numTurns, closingTurns)
    const transitionTurns = Math.min(numTurns, closingTurns);
    const flatTurns = Math.max(0, numTurns - transitionTurns);

    const segments = Math.ceil(transitionTurns * 4); // 4 steps per turn for smoothness

    if (isBottom) {
      // Bottom: Flat (solid) -> Transition -> Active
      if (flatTurns > 0) {
        blocks.push({ kind: "solid", turns: flatTurns, pitch: solidDz });
      }
      for (let i = 0; i < segments; i++) {
        const t = (i + 0.5) / segments; // 0..1
        // Interpolate pitch from Solid -> Active
        const p = lerp(pitchAtDeadEnd, pitchAtActiveEnd, t);
        blocks.push({ kind: "solid", turns: transitionTurns / segments, pitch: p });
      }
    } else {
      // Top: Active -> Transition -> Flat (solid)
      for (let i = 0; i < segments; i++) {
        const t = (i + 0.5) / segments;
        // Interpolate pitch from Active -> Solid
        const p = lerp(pitchAtActiveEnd, pitchAtDeadEnd, t);
        blocks.push({ kind: "solid", turns: transitionTurns / segments, pitch: p });
      }
      if (flatTurns > 0) {
        blocks.push({ kind: "solid", turns: flatTurns, pitch: solidDz });
      }
    }
  };

  // Bottom Dead Coils
  addTaperedDeadCoils(bottomDead, solidDz, firstActivePitch, initialBlocks, true);

  // Active Segments
  for (const s of params.segments) {
    if (s.coils > 0) {
      initialBlocks.push({ kind: "active", turns: s.coils, pitch: clampFinite(s.pitch, d) });
    }
  }

  // Top Dead Coils
  addTaperedDeadCoils(topDead, solidDz, lastActivePitch, initialBlocks, false);

  // --- Gap-Driven Logic (Discrete Integration) ---

  // 1. Discretize the entire spring into steps
  // e.g. 24 steps per turn
  let totalTurns = 0;
  for (const b of initialBlocks) totalTurns += b.turns;

  const stepsPerTurn = Math.max(12, pointsPerTurn);
  const totalSteps = Math.ceil(totalTurns * stepsPerTurn);

  // Arrays to store per-step properties
  const stepGaps: number[] = new Float64Array(totalSteps) as any;
  const isCompressible: boolean[] = new Array(totalSteps).fill(false);

  // Fill initial gaps based on blocks
  let currentStep = 0;
  const solidDzPerStep = solidDz / stepsPerTurn;

  for (const block of initialBlocks) {
    const blockSteps = Math.round(block.turns * stepsPerTurn);
    const pitch = block.pitch;
    // Gap per step = (Pitch - SolidPitch) / stepsPerTurn
    // Ensure we handle tapered blocks correctly by using average pitch?
    // Actually, tapered blocks have constant pitch *per block*.
    const gapPerStep = Math.max(0, (pitch - solidDz) / stepsPerTurn);

    for (let k = 0; k < blockSteps; k++) {
      if (currentStep >= totalSteps) break;
      stepGaps[currentStep] = gapPerStep;
      // Mark as compressible only if it's an ACTIVE block and has a positive gap
      if (block.kind === "active" && gapPerStep > 1e-9) {
        isCompressible[currentStep] = true;
      }
      currentStep++;
    }
  }

  // 2. Distribute Deflection (Proportional Distribution)
  // Recommended by user logic: distribute stroke proportional to gap size.
  // This preserves the "shape" of the pitch profile while compressing.

  // Calculate total compressible gap
  let totalCompressibleGap = 0;
  for (let i = 0; i < totalSteps; i++) {
    if (isCompressible[i]) {
      totalCompressibleGap += stepGaps[i];
    }
  }

  // Calculate scaling factor
  // If total gap is 100mm and deflection is 10mm, new gap = old gap * (90/100) = 0.9
  // ratio = deflection / total
  // Clamp ratio to 1.0 to avoid inverting gaps
  const ratio = totalCompressibleGap > 1e-9
    ? Math.min(1, params.deflection / totalCompressibleGap)
    : 0;

  // Apply compression
  for (let i = 0; i < totalSteps; i++) {
    if (isCompressible[i]) {
      stepGaps[i] = Math.max(0, stepGaps[i] * (1 - ratio));
    }
  }

  // 3. Integrate Centerline
  const pts: THREE.Vector3[] = [];
  let z = 0;

  // Push start point
  pts.push(new THREE.Vector3(R, 0, 0)); // theta=0

  for (let i = 0; i < totalSteps; i++) {
    const currentGap = stepGaps[i];
    const dz = solidDzPerStep + currentGap; // Reconstruct visible height
    z += dz;

    const turnPos = (i + 1) / stepsPerTurn;
    const theta = 2 * Math.PI * turnPos;

    pts.push(new THREE.Vector3(R * Math.cos(theta), R * Math.sin(theta), z));
  }

  const zMin = pts.reduce((acc, p) => Math.min(acc, p.z), Number.POSITIVE_INFINITY);
  const zMax = pts.reduce((acc, p) => Math.max(acc, p.z), Number.NEGATIVE_INFINITY);

  return {
    points: pts,
    zMin: Number.isFinite(zMin) ? zMin : 0,
    zMax: Number.isFinite(zMax) ? zMax : z,
  };
}

export function createVariablePitchCompressionSpringGeometry(
  params: VariablePitchCompressionGeometryParams,
  opts: VariablePitchCompressionGeometryOptions = {}
): { geometry: THREE.BufferGeometry; zMin: number; zMax: number } {
  const radialSegments = Math.max(6, Math.round(opts.radialSegments ?? 18));
  const tubeSegmentsPerTurn = Math.max(6, Math.round(opts.tubeSegmentsPerTurn ?? 24));

  const centerline = buildVariablePitchCompressionCenterline(params, opts);

  const curve = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < centerline.points.length; i++) {
    const a = centerline.points[i - 1];
    const b = centerline.points[i];
    curve.add(new THREE.LineCurve3(a, b));
  }

  const approxTurns = Math.max(1, Math.round(params.totalCoils));
  const tubularSegments = approxTurns * tubeSegmentsPerTurn;

  const radius = Math.max(0.01, params.wireDiameter / 2);
  const geom = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);

  return {
    geometry: geom,
    zMin: centerline.zMin,
    zMax: centerline.zMax,
  };
}
