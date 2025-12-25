// src/lib/angle/AngleModel.ts
// Unified Engineering Angle Model
// - Engineering uses ONLY Δθ (used travel / deflection angle)
// - Visualization angles are derived and NEVER used in stress/torque calculations

export type AngleUnit = "deg" | "rad";
export type RotationMode = "torsion_spring" | "arc_spring";

/**
 * Engineering angle inputs:
 * - torsion spring: theta_di (install), theta_do (working)
 * - arc spring: theta_free, theta_work
 *
 * Keep the names mode-specific at the UI layer; normalize here.
 */
export interface AngleInputs {
    mode: RotationMode;

    /** Engineering reference angle at "installed/no-working-load" */
    thetaRefDeg: number;

    /** Engineering target angle at "working/loadcase" */
    thetaTargetDeg: number;

    /**
     * Optional: interpretation hint for arc spring
     * - arc spring typically uses: Δθ = theta_free - theta_work
     * - torsion spring uses:      Δθ = theta_do   - theta_di
     */
    signConvention?: "target_minus_ref" | "ref_minus_target";
}

export interface AngleDerived {
    /** used travel (always non-negative magnitude for engineering) */
    deltaDeg: number;

    /** signed travel (for direction audit only; not used in engineering formulas) */
    deltaSignedDeg: number;

    /** direction classification for UI badges only */
    direction: "compress" | "extend" | "neutral";

    /** human-friendly note for audit */
    directionNoteEn: string;
    directionNoteZh: string;

    /** for charts/FEA: radians too */
    deltaRad: number;

    /** visualization-only range (centered), in degrees */
    visual: {
        /** -delta/2 */
        minDeg: number;
        /** +delta/2 */
        maxDeg: number;
        /** suggested current pose for preview (0 = centered) */
        neutralDeg: number;
    };

    /** audit verdict */
    audit: AngleAuditResult;
}

export interface AngleAuditResult {
    ok: boolean;
    severity: "info" | "warn" | "fail";
    code:
    | "OK"
    | "NEGATIVE_TRAVEL"
    | "ZERO_TRAVEL"
    | "UNUSUAL_TRAVEL"
    | "MISSING_INPUT";
    messageEn: string;
    messageZh: string;
    meta?: Record<string, number | string>;
}

export interface AngleAuditPolicy {
    /**
     * Typical travel window (engineering). If outside, warn (not fail).
     */
    typicalMinDeg: number;
    typicalMaxDeg: number;

    /** If delta exceeds this, mark as FAIL (safety / unreasonable input) */
    hardMaxDeg?: number;

    /** small threshold treated as zero */
    epsDeg?: number;
}

const DEFAULT_POLICY: Record<RotationMode, AngleAuditPolicy> = {
    torsion_spring: {
        typicalMinDeg: 1,
        typicalMaxDeg: 180,
        hardMaxDeg: 270,
        epsDeg: 1e-6,
    },
    arc_spring: {
        typicalMinDeg: 1,
        typicalMaxDeg: 60,
        hardMaxDeg: 120,
        epsDeg: 1e-6,
    },
};

export function degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
}

/**
 * Main entry: compute derived angles + audit.
 * Engineering formulas MUST use derived.deltaDeg (magnitude).
 */
export function computeAngles(
    input: AngleInputs,
    policyOverride?: Partial<AngleAuditPolicy>
): AngleDerived {
    const { mode, thetaRefDeg, thetaTargetDeg } = input;

    if (!isFinite(thetaRefDeg) || !isFinite(thetaTargetDeg)) {
        return buildMissing(mode);
    }

    const policy = { ...DEFAULT_POLICY[mode], ...(policyOverride ?? {}) };
    const eps = policy.epsDeg ?? 1e-6;

    // Convention:
    // torsion: Δθ = target - ref
    // arc:    Δθ = ref - target  (usually free - work)
    const conv = input.signConvention ?? (mode === "arc_spring" ? "ref_minus_target" : "target_minus_ref");

    const deltaSignedDeg =
        conv === "target_minus_ref"
            ? thetaTargetDeg - thetaRefDeg
            : thetaRefDeg - thetaTargetDeg;

    const deltaDeg = Math.abs(deltaSignedDeg);
    const deltaRad = degToRad(deltaDeg);

    const direction =
        deltaSignedDeg > eps ? "compress" : deltaSignedDeg < -eps ? "extend" : "neutral";

    const { directionNoteEn, directionNoteZh } = directionNotes(mode, direction);

    const audit = auditDelta(mode, deltaSignedDeg, deltaDeg, policy);

    return {
        deltaDeg,
        deltaSignedDeg,
        deltaRad,
        direction,
        directionNoteEn,
        directionNoteZh,
        visual: {
            minDeg: -deltaDeg / 2,
            maxDeg: +deltaDeg / 2,
            neutralDeg: 0,
        },
        audit,
    };
}

/**
 * Helper: torsion spring normalize
 * Δθ = θdo - θdi
 */
export function torsionAngles(thetaInstallDeg: number, thetaWorkDeg: number): AngleInputs {
    return {
        mode: "torsion_spring",
        thetaRefDeg: thetaInstallDeg,  // θdi
        thetaTargetDeg: thetaWorkDeg,  // θdo
        signConvention: "target_minus_ref",
    };
}

/**
 * Helper: arc spring normalize (factory common)
 * Δθ = θfree - θwork
 */
export function arcAngles(thetaFreeDeg: number, thetaWorkDeg: number): AngleInputs {
    return {
        mode: "arc_spring",
        thetaRefDeg: thetaFreeDeg,     // θfree
        thetaTargetDeg: thetaWorkDeg,  // θwork
        signConvention: "ref_minus_target",
    };
}

function directionNotes(mode: RotationMode, dir: AngleDerived["direction"]) {
    if (mode === "arc_spring") {
        if (dir === "compress") return { directionNoteEn: "Load in primary (compress) direction.", directionNoteZh: "载荷方向：主方向（压缩）。" };
        if (dir === "extend") return { directionNoteEn: "Reverse/extend direction detected (Work > Free). Showing magnitude.", directionNoteZh: "检测到反向/拉伸方向（Work > Free），已按幅值显示。" };
        return { directionNoteEn: "No travel (Δθ ≈ 0).", directionNoteZh: "无行程（Δθ ≈ 0）。" };
    } else {
        if (dir === "compress") return { directionNoteEn: "Load in primary (winding) direction.", directionNoteZh: "载荷方向：主方向（加扭）。" };
        if (dir === "extend") return { directionNoteEn: "Reverse/unwind direction detected. Showing magnitude.", directionNoteZh: "检测到反向/退扭方向，已按幅值显示。" };
        return { directionNoteEn: "No travel (Δθ ≈ 0).", directionNoteZh: "无行程（Δθ ≈ 0）。" };
    }
}

function auditDelta(mode: RotationMode, deltaSignedDeg: number, deltaDeg: number, p: AngleAuditPolicy): AngleAuditResult {
    const eps = p.epsDeg ?? 1e-6;

    if (deltaDeg < eps) {
        return {
            ok: false,
            severity: "warn",
            code: "ZERO_TRAVEL",
            messageEn: "Δθ is near zero. Check install/work angles.",
            messageZh: "Δθ 接近 0，请检查安装角/工作角输入。",
            meta: { deltaDeg },
        };
    }

    if (deltaSignedDeg < -eps) {
        return {
            ok: false,
            severity: "warn",
            code: "NEGATIVE_TRAVEL",
            messageEn: "Reverse direction detected (signed Δθ < 0). Engineering uses |Δθ| for calculations.",
            messageZh: "检测到反向输入（带符号 Δθ < 0）。工程计算将使用 |Δθ|。",
            meta: { deltaSignedDeg, deltaDeg },
        };
    }

    if (p.hardMaxDeg != null && deltaDeg > p.hardMaxDeg) {
        return {
            ok: false,
            severity: "fail",
            code: "UNUSUAL_TRAVEL",
            messageEn: `Δθ=${deltaDeg.toFixed(2)}° exceeds hard limit (${p.hardMaxDeg}°). Likely unrealistic / unsafe loadcase.`,
            messageZh: `Δθ=${deltaDeg.toFixed(2)}° 超过硬上限（${p.hardMaxDeg}°），工况可能不现实/不安全。`,
            meta: { deltaDeg, hardMaxDeg: p.hardMaxDeg },
        };
    }

    if (deltaDeg < p.typicalMinDeg || deltaDeg > p.typicalMaxDeg) {
        return {
            ok: true,
            severity: "info",
            code: "UNUSUAL_TRAVEL",
            messageEn: `Δθ=${deltaDeg.toFixed(2)}° is outside typical range (${p.typicalMinDeg}°–${p.typicalMaxDeg}°).`,
            messageZh: `Δθ=${deltaDeg.toFixed(2)}° 超出常见范围（${p.typicalMinDeg}°–${p.typicalMaxDeg}°）。`,
            meta: { deltaDeg, typicalMinDeg: p.typicalMinDeg, typicalMaxDeg: p.typicalMaxDeg },
        };
    }

    return {
        ok: true,
        severity: "info",
        code: "OK",
        messageEn: "Angle inputs are consistent. Engineering uses Δθ for all calculations.",
        messageZh: "角度输入一致。工程计算将统一使用 Δθ。",
        meta: { deltaDeg },
    };
}

function buildMissing(mode: RotationMode): AngleDerived {
    const audit: AngleAuditResult = {
        ok: false,
        severity: "fail",
        code: "MISSING_INPUT",
        messageEn: "Missing/invalid angle input.",
        messageZh: "角度输入缺失或无效。",
    };
    return {
        deltaDeg: 0,
        deltaSignedDeg: 0,
        deltaRad: 0,
        direction: "neutral",
        directionNoteEn: mode === "arc_spring" ? "No travel." : "No travel.",
        directionNoteZh: "无行程。",
        visual: { minDeg: 0, maxDeg: 0, neutralDeg: 0 },
        audit,
    };
}
