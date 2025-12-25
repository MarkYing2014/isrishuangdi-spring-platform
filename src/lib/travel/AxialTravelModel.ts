// src/lib/travel/AxialTravelModel.ts
// Unified Engineering Axial Travel Model
// - Engineering uses ONLY Δs (used travel / deflection)
// - Visualization/Pose is derived from Δs

export type AxialUnit = "mm" | "in";
export type AxialMode = "wave_spring" | "disk_spring";

/**
 * Engineering travel inputs:
 * - wave spring: Hf (free), Hw (working) -> Δs = Hf - Hw
 * - disk spring: s1 (preload), s2 (working) -> Δs = s2 - s1
 */
export interface AxialInputs {
    mode: AxialMode;

    /** Engineering reference value (e.g., Hf for wave, s1 for disk) */
    refValue: number;

    /** Engineering target value (e.g., Hw for wave, s2 for disk) */
    targetValue: number;

    /**
     * Convention:
     * - wave spring: Δs = ref - target (Hf - Hw)
     * - disk spring: Δs = target - ref (s2 - s1)
     */
    signConvention?: "target_minus_ref" | "ref_minus_target";
}

export interface AxialDerived {
    /** used travel (always non-negative magnitude for engineering) */
    delta: number;

    /** signed travel (for direction audit) */
    deltaSigned: number;

    /** direction classification */
    direction: "compress" | "extend" | "neutral";

    /** human-friendly note for audit */
    directionNoteEn: string;
    directionNoteZh: string;

    /** audit verdict */
    audit: AxialAuditResult;
}

export interface AxialAuditResult {
    ok: boolean;
    severity: "info" | "warn" | "fail";
    code:
    | "OK"
    | "NEGATIVE_TRAVEL"
    | "ZERO_TRAVEL"
    | "NEAR_SOLID"
    | "NEAR_FLAT"
    | "UNUSUAL_TRAVEL"
    | "MISSING_INPUT";
    messageEn: string;
    messageZh: string;
    meta?: Record<string, number | string>;
}

export interface AxialAuditPolicy {
    /** Minimum recommended travel */
    minTravel?: number;
    /** Maximum recommended travel (e.g. 80% of available) */
    maxSafeTravel?: number;
    /** Hard limit (e.g. solid height or free cone height) */
    hardLimit?: number;
    /** Small threshold treated as zero */
    eps?: number;
}

const DEFAULT_POLICY: Record<AxialMode, AxialAuditPolicy> = {
    wave_spring: {
        minTravel: 0.1,
        eps: 1e-6,
    },
    disk_spring: {
        minTravel: 0.05,
        eps: 1e-6,
    },
};

/**
 * Main entry: compute derived travel + audit.
 */
export function computeAxialTravel(
    input: AxialInputs,
    policyOverride?: Partial<AxialAuditPolicy>
): AxialDerived {
    const { mode, refValue, targetValue } = input;

    if (!isFinite(refValue) || !isFinite(targetValue)) {
        return buildMissing(mode);
    }

    const policy = { ...DEFAULT_POLICY[mode], ...(policyOverride ?? {}) };
    const eps = policy.eps ?? 1e-6;

    // Convention
    const conv = input.signConvention ?? (mode === "wave_spring" ? "ref_minus_target" : "target_minus_ref");

    const deltaSigned = conv === "target_minus_ref"
        ? targetValue - refValue
        : refValue - targetValue;

    const delta = Math.abs(deltaSigned);

    const direction =
        deltaSigned > eps ? "compress" : deltaSigned < -eps ? "extend" : "neutral";

    const { directionNoteEn, directionNoteZh } = directionNotes(mode, direction);

    const audit = auditTravel(mode, deltaSigned, delta, policy);

    return {
        delta,
        deltaSigned,
        direction,
        directionNoteEn,
        directionNoteZh,
        audit,
    };
}

/**
 * Helper: Wave spring travel
 * Δs = Hf - Hw
 */
export function waveTravel(Hf: number, Hw: number): AxialInputs {
    return {
        mode: "wave_spring",
        refValue: Hf,
        targetValue: Hw,
        signConvention: "ref_minus_target",
    };
}

/**
 * Helper: Disk spring travel
 * Δs = s2 - s1
 */
export function diskTravel(s1: number, s2: number): AxialInputs {
    return {
        mode: "disk_spring",
        refValue: s1,
        targetValue: s2,
        signConvention: "target_minus_ref",
    };
}

function directionNotes(mode: AxialMode, dir: AxialDerived["direction"]) {
    if (mode === "wave_spring") {
        if (dir === "compress") return { directionNoteEn: "Load in primary (axial) direction.", directionNoteZh: "载荷方向：主方向（轴向）。" };
        if (dir === "extend") return { directionNoteEn: "Extension detected (Hw > Hf). Showing magnitude.", directionNoteZh: "检测到拉伸方向（Hw > Hf），已按幅值显示。" };
        return { directionNoteEn: "No travel (Δs ≈ 0).", directionNoteZh: "无行程（Δs ≈ 0）。" };
    } else {
        if (dir === "compress") return { directionNoteEn: "Deflection increasing.", directionNoteZh: "变形量增加。" };
        if (dir === "extend") return { directionNoteEn: "Deflection decreasing (s2 < s1). Showing magnitude.", directionNoteZh: "变形量减少（s2 < s1），已按幅值显示。" };
        return { directionNoteEn: "No additional travel (Δs ≈ 0).", directionNoteZh: "无额外行程（Δs ≈ 0）。" };
    }
}

function auditTravel(mode: AxialMode, deltaSigned: number, delta: number, p: AxialAuditPolicy): AxialAuditResult {
    const eps = p.eps ?? 1e-6;

    if (delta < eps) {
        return {
            ok: false,
            severity: "warn",
            code: "ZERO_TRAVEL",
            messageEn: "Δs is near zero. Check input values.",
            messageZh: "Δs 接近 0，请检查输入值。",
            meta: { delta },
        };
    }

    if (deltaSigned < -eps) {
        return {
            ok: false,
            severity: "warn",
            code: "NEGATIVE_TRAVEL",
            messageEn: "Reverse travel detected (signed Δs < 0). Engineering uses |Δs|.",
            messageZh: "检测到反向行程（带符号 Δs < 0）。工程计算将使用 |Δs|。",
            meta: { deltaSigned, delta },
        };
    }

    if (p.hardLimit != null && delta > p.hardLimit) {
        const limitName = mode === "wave_spring" ? "Solid" : "Flat";
        const limitNameZh = mode === "wave_spring" ? "并紧" : "压平";
        return {
            ok: false,
            severity: "fail",
            code: mode === "wave_spring" ? "NEAR_SOLID" : "NEAR_FLAT",
            messageEn: `Δs=${delta.toFixed(2)}mm exceeds ${limitName} limit (${p.hardLimit.toFixed(2)}mm).`,
            messageZh: `Δs=${delta.toFixed(2)}mm 超过${limitNameZh}极限（${p.hardLimit.toFixed(2)}mm）。`,
            meta: { delta, hardLimit: p.hardLimit },
        };
    }

    if (p.maxSafeTravel != null && delta > p.maxSafeTravel) {
        return {
            ok: true,
            severity: "warn",
            code: "UNUSUAL_TRAVEL",
            messageEn: `Δs=${delta.toFixed(2)}mm exceeds safe operating range (${p.maxSafeTravel.toFixed(2)}mm).`,
            messageZh: `Δs=${delta.toFixed(2)}mm 超过安全工作范围（${p.maxSafeTravel.toFixed(2)}mm）。`,
            meta: { delta, maxSafeTravel: p.maxSafeTravel },
        };
    }

    return {
        ok: true,
        severity: "info",
        code: "OK",
        messageEn: "Travel inputs are consistent. Engineering uses Δs for all calculations.",
        messageZh: "行程输入一致。工程计算将统一使用 Δs。",
        meta: { delta },
    };
}

function buildMissing(mode: AxialMode): AxialDerived {
    const audit: AxialAuditResult = {
        ok: false,
        severity: "fail",
        code: "MISSING_INPUT",
        messageEn: "Missing/invalid travel input.",
        messageZh: "行程输入缺失或无效。",
    };
    return {
        delta: 0,
        deltaSigned: 0,
        direction: "neutral",
        directionNoteEn: "No travel.",
        directionNoteZh: "无行程。",
        audit,
    };
}
