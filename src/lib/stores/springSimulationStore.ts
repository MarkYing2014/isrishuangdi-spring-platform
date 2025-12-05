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

export type SpringDesignMeta = ConicalDesignMeta | CompressionDesignMeta | ExtensionDesignMeta;

export interface LinearCurvePoint {
  deflection: number;
  load: number;
}

interface SpringSimulationState {
  mode: "idle" | "conical-nonlinear" | "compression-linear" | "extension-linear";
  springType: "compression" | "extension" | "conical" | null;
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

    const point = findNearestCurvePoint(curve, x);
    set({
      currentDeflection: point.x,
      collapsedCoils: point.collapsedCoils,
      activeCoils: point.activeCoils,
      currentStiffness: point.k,
      currentLoad: point.load,
    });
  },

  setLinearDeflection: (x: number) => {
    const { linearCurve, design } = get();
    if (!linearCurve || !design || linearCurve.length === 0) return;

    const point = findNearestLinearPoint(linearCurve, x);
    if (!point) return;

    // For linear springs, stiffness is constant
    const springRate = design.type === "compression" 
      ? (design as CompressionDesignMeta).springRate 
      : design.type === "extension" 
        ? (design as ExtensionDesignMeta).springRate 
        : 0;

    set({
      currentDeflection: point.deflection,
      currentStiffness: springRate,
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
