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

  const blocks: TurnBlock[] = [];

  for (let i = 0; i < bottomDead; i++) {
    const t = closingTurns > 0 ? Math.min(1, (bottomDead - i) / closingTurns) : 1;
    const pitch = lerp(firstActivePitch, d, t);
    // End turns are typically squared/closed; treat as solid for geometry.
    blocks.push({ kind: "solid", turns: 1, pitch });
  }

  for (const st of segmentStates) {
    const turns = Math.max(0, st.coils);
    const pitch = clampFinite(st.pitch, d);
    const solidCoils = Math.max(0, Math.min(turns, st.solidCoils));
    const solidTurns = Math.floor(solidCoils + 1e-9);
    const partial = solidCoils - solidTurns;
    const activeTurns = Math.max(0, turns - solidTurns - partial);

    if (solidTurns > 0) {
      blocks.push({ kind: "solid", turns: solidTurns, pitch });
    }
    if (partial > 1e-9) {
      // A fractional solid coil: transition within this portion from active spacing to solid.
      blocks.push({ kind: "partial", turns: partial, pitch, solidFraction: partial });
    }
    if (activeTurns > 1e-9) {
      blocks.push({ kind: "active", turns: activeTurns, pitch });
    }
  }

  for (let i = 0; i < topDead; i++) {
    const t = closingTurns > 0 ? Math.min(1, (i + 1) / closingTurns) : 1;
    const pitch = lerp(lastActivePitch, d, t);
    blocks.push({ kind: "solid", turns: 1, pitch });
  }

  let globalTurn = 0;
  let z = 0;
  const pts: THREE.Vector3[] = [];

  const pushPoint = (theta: number, zVal: number) => {
    pts.push(new THREE.Vector3(R * Math.cos(theta), R * Math.sin(theta), zVal));
  };

  pushPoint(0, 0);

  for (const block of blocks) {
    const turns = block.turns;
    if (!(turns > 0)) continue;

    const nSteps = Math.max(1, Math.round(turns * pointsPerTurn));

    for (let step = 1; step <= nSteps; step++) {
      const u = step / nSteps;
      const turnPos = globalTurn + u * turns;

      const pitchEff = block.pitch;

      const activeDz = Math.max(d, pitchEff - dzReduction);
      let dz = activeDz;
      if (block.kind === "solid") {
        dz = solidDz;
      } else if (block.kind === "partial") {
        // Transition from activeDz to d within the partial portion
        dz = lerp(Math.max(solidDz, activeDz), solidDz, Math.max(0, Math.min(1, u)));
      } else {
        dz = Math.max(solidDz, activeDz);
      }

      z += dz / nSteps;

      const theta = 2 * Math.PI * turnPos;
      pushPoint(theta, z);
    }

    globalTurn += turns;
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
