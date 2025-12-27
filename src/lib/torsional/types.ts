
import { DieSpringSpec, DieSpringLifeClass } from "@/lib/dieSpring";

export interface StageGeometry {
    effectiveRadiusMm: number;
    slotTravelMm: number; // allow Infinity explicitly
}

export interface StageSpringPack {
    kind: "die";
    spec: DieSpringSpec;
    count: number;
    lifeClass: DieSpringLifeClass;
    preloadMm?: number;
}

export interface TorsionalStage {
    stageId: string;
    geometry: StageGeometry;
    pack: StageSpringPack;
}

export type GoverningCode =
    | "LIFE_LIMIT"
    | "MAX_STROKE"
    | "SOLID_HEIGHT"
    | "SLOT_TRAVEL";

export interface GoverningLimit {
    code: GoverningCode;
    limitStrokeMm: number;
    limitThetaDeg: number;
}

export interface StageSafeResult {
    stageId: string;
    hardLimitStrokeMm: number;
    thetaSafeDeg: number;
    governing: GoverningLimit;
}

export interface CurvePoint {
    thetaDeg: number;
    torqueNmm: number;
}

export interface StageCurve {
    stageId: string;
    points: Array<{
        thetaDeg: number;
        strokeMm: number;
        torqueNmm: number;
    }>;
}

export interface SystemCurve {
    points: CurvePoint[];
    thetaSafeSystemDeg: number;
    governingStageId: string;
    governing: GoverningLimit;
}
