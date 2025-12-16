import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { VariablePitchSegment } from "@/lib/springMath";
import type { SpringMaterialId } from "@/lib/materials/springMaterials";

export type VariablePitchWorkingMode = "deflection" | "load";

export type VariablePitchCurveMode =
  | "force"
  | "stiffness"
  | "stress"
  | "overlay_force_stress"
  | "overlay_force_stiffness";

export interface VariablePitchCompressionState {
  wireDiameter: number;
  meanDiameter: number;
  shearModulus: number;
  activeCoils0: number;
  totalCoils: number;
  freeLength?: number;

  materialId: SpringMaterialId;

  segments: VariablePitchSegment[];

  mode: VariablePitchWorkingMode;
  deflection: number;
  load: number;

  chartMode: VariablePitchCurveMode;

  workingPoints: number[];

  setWireDiameter: (v: number) => void;
  setMeanDiameter: (v: number) => void;
  setShearModulus: (v: number) => void;
  setActiveCoils0: (v: number) => void;
  setTotalCoils: (v: number) => void;
  setFreeLength: (v: number | undefined) => void;

  setMaterialId: (id: SpringMaterialId) => void;

  setMode: (mode: VariablePitchWorkingMode) => void;
  setDeflection: (v: number) => void;
  setLoad: (v: number) => void;
  setChartMode: (mode: VariablePitchCurveMode) => void;

  setSegmentValue: (index: number, patch: Partial<VariablePitchSegment>) => void;
  addSegment: () => void;
  removeSegment: (index: number) => void;

  addWorkingPoint: (suggested?: number) => void;
  setWorkingPoint: (index: number, v: number) => void;
  removeWorkingPoint: (index: number) => void;

  reset: () => void;
}

const initialState: Omit<
  VariablePitchCompressionState,
  | "setWireDiameter"
  | "setMeanDiameter"
  | "setShearModulus"
  | "setActiveCoils0"
  | "setTotalCoils"
  | "setFreeLength"
  | "setMaterialId"
  | "setMode"
  | "setDeflection"
  | "setLoad"
  | "setChartMode"
  | "setSegmentValue"
  | "addSegment"
  | "removeSegment"
  | "addWorkingPoint"
  | "setWorkingPoint"
  | "removeWorkingPoint"
  | "reset"
> = {
  wireDiameter: 3.2,
  meanDiameter: 24,
  shearModulus: 79300,
  activeCoils0: 8,
  totalCoils: 10,
  freeLength: 50,

  materialId: "music_wire_a228",

  segments: [
    { coils: 2, pitch: 6 },
    { coils: 6, pitch: 8 },
  ],

  mode: "deflection",
  deflection: 10,
  load: 0,

  chartMode: "force",

  workingPoints: [5, 10, 15],
};

export const useVariablePitchCompressionStore = create<VariablePitchCompressionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setWireDiameter: (wireDiameter) => set({ wireDiameter }),
      setMeanDiameter: (meanDiameter) => set({ meanDiameter }),
      setShearModulus: (shearModulus) => set({ shearModulus }),
      setActiveCoils0: (activeCoils0) => set({ activeCoils0 }),
      setTotalCoils: (totalCoils) => set({ totalCoils }),
      setFreeLength: (freeLength) => set({ freeLength }),

      setMaterialId: (materialId) => set({ materialId }),

      setMode: (mode) => set({ mode }),
      setDeflection: (deflection) => set({ deflection }),
      setLoad: (load) => set({ load }),
      setChartMode: (chartMode) => set({ chartMode }),

      setSegmentValue: (index, patch) =>
        set((state) => {
          const next = state.segments.slice();
          const cur = next[index];
          if (!cur) return state;
          next[index] = {
            coils: patch.coils ?? cur.coils,
            pitch: patch.pitch ?? cur.pitch,
          };
          return { segments: next };
        }),

      addSegment: () =>
        set((state) => ({
          segments: state.segments.concat({ coils: 1, pitch: Math.max(0, state.wireDiameter + 1) }),
        })),

      removeSegment: (index) =>
        set((state) => ({
          segments: state.segments.filter((_, i) => i !== index),
        })),

      addWorkingPoint: (suggested) =>
        set((state) => {
          const next = state.workingPoints.slice();
          const candidate = typeof suggested === "number" && isFinite(suggested) ? suggested : state.deflection;
          next.push(Number(candidate.toFixed(2)));
          return { workingPoints: next };
        }),

      setWorkingPoint: (index, v) =>
        set((state) => {
          const next = state.workingPoints.slice();
          next[index] = v;
          return { workingPoints: next };
        }),

      removeWorkingPoint: (index) =>
        set((state) => ({
          workingPoints: state.workingPoints.filter((_, i) => i !== index),
        })),

      reset: () => set({ ...initialState }),
    }),
    {
      name: "variable-pitch-compression-storage",
      partialize: (state) => ({
        wireDiameter: state.wireDiameter,
        meanDiameter: state.meanDiameter,
        shearModulus: state.shearModulus,
        activeCoils0: state.activeCoils0,
        totalCoils: state.totalCoils,
        freeLength: state.freeLength,
        materialId: state.materialId,
        segments: state.segments,
        mode: state.mode,
        deflection: state.deflection,
        load: state.load,
        chartMode: state.chartMode,
        workingPoints: state.workingPoints,
      }),
    }
  )
);
