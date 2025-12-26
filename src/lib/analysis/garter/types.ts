export type GarterJointType = "hook" | "screw" | "loop";

export interface GarterV2Inputs {
    d: number;      // mm
    Dm: number;     // mm
    N: number;      // turns around ring
    D_free: number; // mm
    D_inst: number; // mm
    G: number;      // MPa
    jointType: GarterJointType;
    jointFactor: number;
    tensileStrength?: number; // Sy MPa (for allowable = 0.65*Sy)
}

export type XY = { x: number; y: number };

export interface GarterAnalyticalResult {
    model: "unwrapped-v2";
    k_ax: number;       // N/mm
    deltaD_signed: number;
    deltaD: number;     // |...|
    deltaL: number;     // mm
    forceTension: number;
    forceEffective: number;
    maxShearStress: number; // MPa
    springIndex: number;
    wahlFactor: number;
    curves: {
        force: XY[];  // x=ΔD(mm)
        stress: XY[]; // x=ΔD(mm)
    };
}

export interface GarterFeaResult {
    jobId: string;
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
    message?: string;

    // single-point verification (at installed diameter)
    reactionForce?: number;  // N (hoop tension equivalent)
    maxStress?: number;      // MPa
    deformation?: number;    // mm or deg (optional)

    // optional sweep curves later
    curves?: {
        force?: XY[];
        stress?: XY[];
    };

    deviation?: {
        forcePct?: number;   // (FEA-ANA)/ANA
        stressPct?: number;
    };
}

export interface GarterAnalysisBundle {
    type: "garter";
    inputs: GarterV2Inputs;
    analytical: GarterAnalyticalResult;
    fea?: GarterFeaResult;
}
