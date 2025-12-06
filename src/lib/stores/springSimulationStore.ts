import { create } from "zustand";
import type { ConicalNonlinearCurvePoint } from "@/lib/springMath";

export interface ConicalDesignMeta {
  type: "conical";
  wireDiameter: number;
  largeOuterDiameter: number;
  smallOuterDiameter: number;
  activeCoils: number;
  freeLength: number;
  solidHeight: number;
  totalDeflectionCapacity: number;
}

export interface CompressionDesignMeta {
  type: "compression";
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  freeLength: number;
  shearModulus: number;
  springRate: number;
}

export interface ExtensionDesignMeta {
  type: "extension";
  wireDiameter: number;
  outerDiameter: number;
  activeCoils: number;
  bodyLength: number;
  freeLengthInsideHooks: number;
  shearModulus: number;
  springRate: number;
  initialTension: number;
}

export interface TorsionDesignMeta {
  type: "torsion";
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  bodyLength: number;
  pitch: number; // Pitch between coils (mm)
  legLength1: number;
  legLength2: number;
  freeAngle: number;
  shearModulus: number;
  springRate: number; // N·mm per degree
  windingDirection: "left" | "right";
}

export type SpringDesignMeta = ConicalDesignMeta | CompressionDesignMeta | ExtensionDesignMeta | TorsionDesignMeta;

export interface LinearCurvePoint {
  deflection: number;
  load: number;
}

interface SpringSimulationState {
  mode: "idle" | "conical-nonlinear" | "compression-linear" | "extension-linear" | "torsion-linear";
  springType: "compression" | "extension" | "conical" | "torsion" | null;
  currentDeflection: number;
  maxDeflection: number;
  collapsedCoils: number;
  activeCoils: number;
  currentStiffness: number;
  currentLoad: number;
  initialTension: number;
  design: SpringDesignMeta | null;
  curve: ConicalNonlinearCurvePoint[] | null;
  linearCurve: LinearCurvePoint[] | null;

  setDeflection: (x: number) => void;
  setLinearDeflection: (x: number) => void;
  setStateFromCurvePoint: (point: ConicalNonlinearCurvePoint) => void;
  initializeConical: (
    curve: ConicalNonlinearCurvePoint[],
    designMeta: ConicalDesignMeta,
    maxDeflection: number
  ) => void;
  initializeCompression: (
    curve: LinearCurvePoint[],
    designMeta: CompressionDesignMeta,
    maxDeflection: number
  ) => void;
  initializeExtension: (
    curve: LinearCurvePoint[],
    designMeta: ExtensionDesignMeta,
    maxDeflection: number
  ) => void;
  initializeTorsion: (
    curve: LinearCurvePoint[],
    designMeta: TorsionDesignMeta,
    maxDeflection: number
  ) => void;
  reset: () => void;
}

/**
 * Find the curve point nearest to a given deflection value.
 */
export function findNearestCurvePoint(
  curve: ConicalNonlinearCurvePoint[],
  targetX: number
): ConicalNonlinearCurvePoint {
  if (curve.length === 0) {
    throw new Error("Curve is empty");
  }
  
  let nearest = curve[0];
  let minDiff = Math.abs(curve[0].x - targetX);
  
  for (const point of curve) {
    const diff = Math.abs(point.x - targetX);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = point;
    }
  }
  
  return nearest;
}

/**
 * Interpolate curve point at a given deflection value.
 * 在给定变形值处插值曲线点，用于平滑动画
 */
export function interpolateCurvePoint(
  curve: ConicalNonlinearCurvePoint[],
  targetX: number
): ConicalNonlinearCurvePoint {
  if (curve.length === 0) {
    throw new Error("Curve is empty");
  }
  
  if (curve.length === 1) {
    return curve[0];
  }
  
  // 找到 targetX 所在的区间
  let lower = curve[0];
  let upper = curve[curve.length - 1];
  
  for (let i = 0; i < curve.length - 1; i++) {
    if (curve[i].x <= targetX && curve[i + 1].x >= targetX) {
      lower = curve[i];
      upper = curve[i + 1];
      break;
    }
  }
  
  // 边界情况
  if (targetX <= curve[0].x) {
    return curve[0];
  }
  if (targetX >= curve[curve.length - 1].x) {
    return curve[curve.length - 1];
  }
  
  // 线性插值
  const range = upper.x - lower.x;
  const t = range > 0 ? (targetX - lower.x) / range : 0;
  
  return {
    x: targetX,
    load: lower.load + t * (upper.load - lower.load),
    k: lower.k + t * (upper.k - lower.k),
    collapsedCoils: Math.round(lower.collapsedCoils + t * (upper.collapsedCoils - lower.collapsedCoils)),
    activeCoils: Math.round(lower.activeCoils + t * (upper.activeCoils - lower.activeCoils)),
  };
}

/**
 * Find the nearest point in a linear curve.
 */
export function findNearestLinearPoint(
  curve: LinearCurvePoint[],
  targetX: number
): LinearCurvePoint | null {
  if (curve.length === 0) return null;

  let nearest = curve[0];
  let minDiff = Math.abs(curve[0].deflection - targetX);

  for (const point of curve) {
    const diff = Math.abs(point.deflection - targetX);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = point;
    }
  }

  return nearest;
}

export const useSpringSimulationStore = create<SpringSimulationState>((set, get) => ({
  mode: "idle",
  springType: null,
  currentDeflection: 0,
  maxDeflection: 0,
  collapsedCoils: 0,
  activeCoils: 0,
  currentStiffness: 0,
  currentLoad: 0,
  initialTension: 0,
  design: null,
  curve: null,
  linearCurve: null,

  setDeflection: (x: number) => {
    const { curve, design } = get();
    if (!curve || !design || curve.length === 0) return;

    // 使用插值而不是最近点，以支持平滑动画
    const point = interpolateCurvePoint(curve, x);
    set({
      currentDeflection: point.x,
      collapsedCoils: point.collapsedCoils,
      activeCoils: point.activeCoils,
      currentStiffness: point.k,
      currentLoad: point.load,
    });
  },

  setLinearDeflection: (x: number) => {
    const { design, maxDeflection, linearCurve } = get();
    if (!design) return;

    const clamped = Math.min(Math.max(0, x), maxDeflection || x);

    if (design.type === "compression") {
      const springRate = (design as CompressionDesignMeta).springRate;
      set({
        currentDeflection: clamped,
        currentStiffness: springRate,
        currentLoad: springRate * clamped,
      });
      return;
    }

    if (design.type === "extension") {
      const { springRate, initialTension } = design as ExtensionDesignMeta;
      set({
        currentDeflection: clamped,
        currentStiffness: springRate,
        currentLoad: initialTension + springRate * clamped,
      });
      return;
    }

    if (design.type === "torsion") {
      const { springRate } = design as TorsionDesignMeta;
      set({
        currentDeflection: clamped,
        currentStiffness: springRate,
        currentLoad: springRate * clamped, // Torque = k × θ
      });
      return;
    }

    // Fallback to nearest point for other types if any
    if (!linearCurve || linearCurve.length === 0) return;
    const point = findNearestLinearPoint(linearCurve, clamped);
    if (!point) return;

    set({
      currentDeflection: point.deflection,
      currentStiffness: 0,
      currentLoad: point.load,
    });
  },

  setStateFromCurvePoint: (point: ConicalNonlinearCurvePoint) => {
    set({
      currentDeflection: point.x,
      collapsedCoils: point.collapsedCoils,
      activeCoils: point.activeCoils,
      currentStiffness: point.k,
      currentLoad: point.load,
    });
  },

  initializeConical: (
    curve: ConicalNonlinearCurvePoint[],
    designMeta: ConicalDesignMeta,
    maxDeflection: number
  ) => {
    const initialPoint = curve[0];
    set({
      mode: "conical-nonlinear",
      springType: "conical",
      curve,
      linearCurve: null,
      design: designMeta,
      maxDeflection,
      currentDeflection: initialPoint?.x ?? 0,
      collapsedCoils: initialPoint?.collapsedCoils ?? 0,
      activeCoils: initialPoint?.activeCoils ?? designMeta.activeCoils,
      currentStiffness: initialPoint?.k ?? 0,
      currentLoad: initialPoint?.load ?? 0,
      initialTension: 0,
    });
  },

  initializeCompression: (
    curve: LinearCurvePoint[],
    designMeta: CompressionDesignMeta,
    maxDeflection: number
  ) => {
    // Start at 50% of max deflection for better visualization
    const midIndex = Math.floor(curve.length / 2);
    const initialPoint = curve[midIndex] ?? curve[0];
    set({
      mode: "compression-linear",
      springType: "compression",
      curve: null,
      linearCurve: curve,
      design: designMeta,
      maxDeflection,
      currentDeflection: initialPoint?.deflection ?? maxDeflection / 2,
      collapsedCoils: 0,
      activeCoils: designMeta.activeCoils,
      currentStiffness: designMeta.springRate,
      currentLoad: initialPoint?.load ?? 0,
      initialTension: 0,
    });
  },

  initializeExtension: (
    curve: LinearCurvePoint[],
    designMeta: ExtensionDesignMeta,
    maxDeflection: number
  ) => {
    // Start at 50% of max deflection for better visualization
    const midIndex = Math.floor(curve.length / 2);
    const initialPoint = curve[midIndex] ?? curve[0];
    set({
      mode: "extension-linear",
      springType: "extension",
      curve: null,
      linearCurve: curve,
      design: designMeta,
      maxDeflection,
      currentDeflection: initialPoint?.deflection ?? maxDeflection / 2,
      collapsedCoils: 0,
      activeCoils: designMeta.activeCoils,
      currentStiffness: designMeta.springRate,
      currentLoad: initialPoint?.load ?? 0,
      initialTension: designMeta.initialTension,
    });
  },

  initializeTorsion: (
    curve: LinearCurvePoint[],
    designMeta: TorsionDesignMeta,
    maxDeflection: number
  ) => {
    // Start at 50% of max deflection (working angle) for better visualization
    const midIndex = Math.floor(curve.length / 2);
    const initialPoint = curve[midIndex] ?? curve[0];
    set({
      mode: "torsion-linear",
      springType: "torsion",
      curve: null,
      linearCurve: curve,
      design: designMeta,
      maxDeflection,
      currentDeflection: initialPoint?.deflection ?? maxDeflection / 2,
      collapsedCoils: 0,
      activeCoils: designMeta.activeCoils,
      currentStiffness: designMeta.springRate,
      currentLoad: initialPoint?.load ?? 0,
      initialTension: 0,
    });
  },

  reset: () => {
    set({
      mode: "idle",
      springType: null,
      currentDeflection: 0,
      maxDeflection: 0,
      collapsedCoils: 0,
      activeCoils: 0,
      currentStiffness: 0,
      currentLoad: 0,
      initialTension: 0,
      design: null,
      curve: null,
      linearCurve: null,
    });
  },
}));
