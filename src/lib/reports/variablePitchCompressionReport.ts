import type {
  VariablePitchSegment,
  VariablePitchSegmentState,
} from "@/lib/springMath";

export type VariablePitchCompressionReportCurvePoint = {
  deflection: number;
  load: number;
  springRate?: number;
  shearStress?: number;
  activeCoils?: number;
};

export type VariablePitchCompressionReportPayload = {
  spring: {
    wireDiameter: number;
    meanDiameter: number;
    freeLength?: number;
    totalCoils: number;
    activeCoils0: number;
    shearModulus: number;
    materialId?: string;
    materialName?: string;
  };

  segments: Array<{
    index: number;
    coils: number;
    pitch: number;
    bindCapacity: number;
  }>;

  segmentStatesAtWorkingPoint?: VariablePitchSegmentState[];

  curves: {
    deflection: number[];
    load: number[];
    springRate: Array<number | null>;
    shearStress: Array<number | null>;
    activeCoils: Array<number | null>;
  };

  summary: {
    springIndex: number;
    wahlFactor: number;
    deltaMax?: number;
    issues: string[];
  };
};

export function mapToVariablePitchCompressionReportPayload(params: {
  spring: {
    wireDiameter: number;
    meanDiameter: number;
    freeLength?: number;
    totalCoils: number;
    activeCoils0: number;
    shearModulus: number;
    materialId?: string;
    materialName?: string;
  };
  segments: VariablePitchSegment[];
  curve: VariablePitchCompressionReportCurvePoint[];
  workingPoint?: {
    segmentStates?: VariablePitchSegmentState[];
    springIndex: number;
    wahlFactor: number;
    deltaMax?: number;
    issues: string[];
  };
}): VariablePitchCompressionReportPayload {
  const { spring, segments, curve, workingPoint } = params;

  return {
    spring,
    segments: segments.map((s, idx) => ({
      index: idx,
      coils: s.coils,
      pitch: s.pitch,
      bindCapacity: Math.max(0, s.coils * Math.max(0, s.pitch - spring.wireDiameter)),
    })),
    segmentStatesAtWorkingPoint: workingPoint?.segmentStates,
    curves: {
      deflection: curve.map((p) => p.deflection),
      load: curve.map((p) => p.load),
      springRate: curve.map((p) => (typeof p.springRate === "number" ? p.springRate : null)),
      shearStress: curve.map((p) => (typeof p.shearStress === "number" ? p.shearStress : null)),
      activeCoils: curve.map((p) => (typeof p.activeCoils === "number" ? p.activeCoils : null)),
    },
    summary: {
      springIndex: workingPoint?.springIndex ?? spring.meanDiameter / spring.wireDiameter,
      wahlFactor: workingPoint?.wahlFactor ?? 1,
      deltaMax: workingPoint?.deltaMax,
      issues: workingPoint?.issues ?? [],
    },
  };
}
