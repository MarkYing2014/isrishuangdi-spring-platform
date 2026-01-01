/**
 * Report Builder
 * Phase 9: Professional PDF Report Generation
 * 
 * Converts Spring Platform engine outputs into SpringDesignReport format.
 */

import type {
    SpringDesignReport,
    ReportMeta,
    ReportParameter,
    ReportLoadCase,
    ReportCurve,
    ReportReview,
    ReportIssue,
    ReportOptions,
} from "./report-types";
import { DEFAULT_REPORT_OPTIONS } from "./report-types";
import type { PlatformResult, PlatformSpringType, LoadCaseResult } from "../types";

// =============================================================================
// Spring Type Labels
// =============================================================================

const SPRING_TYPE_LABELS: Record<PlatformSpringType, { en: string; zh: string }> = {
    compression: { en: "Compression Spring", zh: "压缩弹簧" },
    extension: { en: "Extension Spring", zh: "拉伸弹簧" },
    torsion: { en: "Torsion Spring", zh: "扭转弹簧" },
    conical: { en: "Conical Spring", zh: "圆锥弹簧" },
    disc: { en: "Disc Spring", zh: "碟形弹簧" },
    arc: { en: "Arc Spring", zh: "弧形弹簧" },
    spiral: { en: "Spiral Spring", zh: "涡卷弹簧" },
    wave: { en: "Wave Spring", zh: "波形弹簧" },
    variablePitch: { en: "Variable Pitch Spring", zh: "变节距弹簧" },
    shock: { en: "Shock Absorber Spring", zh: "减震弹簧" },
};

// =============================================================================
// Version Hash Generation
// =============================================================================

/**
 * Generate a SHA256 hash of the inputs for traceability
 */
function generateVersionHash(inputs: Record<string, any>): string {
    // Sort keys for deterministic output
    const sortedKeys = Object.keys(inputs).sort();
    const normalized: Record<string, any> = {};

    for (const key of sortedKeys) {
        const value = inputs[key];
        // Round numbers to 6 decimal places for consistency
        if (typeof value === "number") {
            normalized[key] = Math.round(value * 1000000) / 1000000;
        } else {
            normalized[key] = value;
        }
    }

    const jsonStr = JSON.stringify(normalized);

    // Use simple deterministic hash for browser compatibility
    return hashSync(jsonStr);
}

/**
 * Simple sync hash for browser (not cryptographically secure, but deterministic)
 */
function hashSync(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0") +
        Math.abs(hash * 31).toString(16).padStart(8, "0");
}

// =============================================================================
// Parameter Extraction
// =============================================================================

/**
 * Extract parameters from geometry object
 */
function extractGeometryParams(
    springType: PlatformSpringType,
    geometry: Record<string, any>
): ReportParameter[] {
    const params: ReportParameter[] = [];

    // Common parameters
    if (geometry.d !== undefined) {
        params.push({
            key: "d",
            labelEn: "Wire Diameter",
            labelZh: "线径",
            value: geometry.d,
            unit: "mm",
            category: "geometry",
        });
    }

    if (geometry.D !== undefined || geometry.Dm !== undefined) {
        params.push({
            key: "D",
            labelEn: "Mean Diameter",
            labelZh: "中径",
            value: geometry.D ?? geometry.Dm,
            unit: "mm",
            category: "geometry",
        });
    }

    if (geometry.n !== undefined) {
        params.push({
            key: "n",
            labelEn: "Active Coils",
            labelZh: "有效圈数",
            value: geometry.n,
            category: "geometry",
        });
    }

    if (geometry.L0 !== undefined || geometry.freeLength !== undefined) {
        params.push({
            key: "L0",
            labelEn: "Free Length",
            labelZh: "自由长度",
            value: geometry.L0 ?? geometry.freeLength,
            unit: "mm",
            category: "geometry",
        });
    }

    // Arc spring specific
    if (springType === "arc") {
        if (geometry.R !== undefined) {
            params.push({
                key: "R",
                labelEn: "Arc Radius",
                labelZh: "弧形半径",
                value: geometry.R,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.arcSpanDeg !== undefined) {
            params.push({
                key: "arcSpanDeg",
                labelEn: "Arc Span",
                labelZh: "弧形张角",
                value: geometry.arcSpanDeg,
                unit: "°",
                category: "geometry",
            });
        }
        if (geometry.packGroups && Array.isArray(geometry.packGroups)) {
            geometry.packGroups.forEach((group: any, index: number) => {
                const groupName = group.name || `Group ${index + 1}`;
                params.push({
                    key: `group_${index}_count`,
                    labelEn: `${groupName} Count`,
                    labelZh: `${groupName} 数量`,
                    value: group.count,
                    unit: "pcs",
                    category: "geometry"
                });

                if (group.kStages) {
                    params.push({
                        key: `group_${index}_stiffness`,
                        labelEn: `${groupName} Stiffness (k1/k2/k3)`,
                        labelZh: `${groupName} 刚度 (k1/k2/k3)`,
                        value: group.kStages.map((k: number) => k.toFixed(2)).join(" / "),
                        unit: "N/mm", // or Nmm/deg, strictly it matches engine output
                        category: "geometry"
                    });
                }

                if (group.phiBreaksDeg) {
                    params.push({
                        key: `group_${index}_breaks`,
                        labelEn: `${groupName} Break Points`,
                        labelZh: `${groupName} 转折点`,
                        value: group.phiBreaksDeg.map((b: number) => b.toFixed(1)).join("° / ") + "°",
                        category: "geometry"
                    });
                }
            });
        }
    }

    // Disc spring specific
    if (springType === "disc") {
        if (geometry.De !== undefined) {
            params.push({
                key: "De",
                labelEn: "Outer Diameter",
                labelZh: "外径",
                value: geometry.De,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.Di !== undefined) {
            params.push({
                key: "Di",
                labelEn: "Inner Diameter",
                labelZh: "内径",
                value: geometry.Di,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.t !== undefined) {
            params.push({
                key: "t",
                labelEn: "Thickness",
                labelZh: "厚度",
                value: geometry.t,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.h0 !== undefined) {
            params.push({
                key: "h0",
                labelEn: "Cone Height",
                labelZh: "锥高",
                value: geometry.h0,
                unit: "mm",
                category: "geometry",
            });
        }
    }

    // Spiral spring specific
    if (springType === "spiral") {
        if (geometry.b !== undefined) {
            params.push({
                key: "b",
                labelEn: "Strip Width",
                labelZh: "带宽",
                value: geometry.b,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.t !== undefined) {
            params.push({
                key: "t",
                labelEn: "Strip Thickness",
                labelZh: "带厚",
                value: geometry.t,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.L !== undefined) {
            params.push({
                key: "L",
                labelEn: "Active Length",
                labelZh: "有效长度",
                value: geometry.L,
                unit: "mm",
                category: "geometry",
            });
        }
    }

    // Wave spring specific
    if (springType === "wave") {
        if (geometry.OD !== undefined) {
            params.push({
                key: "OD",
                labelEn: "Outer Diameter",
                labelZh: "外径",
                value: geometry.OD,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.waves !== undefined) {
            params.push({
                key: "waves",
                labelEn: "Waves per Turn",
                labelZh: "每圈波数",
                value: geometry.waves,
                category: "geometry",
            });
        }
        if (geometry.turns !== undefined) {
            params.push({
                key: "turns",
                labelEn: "Number of Turns",
                labelZh: "圈数",
                value: geometry.turns,
                category: "geometry",
            });
        }
    }

    // Variable Pitch specific
    if (springType === "variablePitch") {
        // ...Existing variablePitch logic...
        if (geometry.segments !== undefined && Array.isArray(geometry.segments)) {
            params.push({
                key: "segments",
                labelEn: "Pitch Segments",
                labelZh: "节距分段",
                value: `${geometry.segments.length} segments`,
                category: "geometry",
            });
        }
        if (geometry.activeCoils0 !== undefined) {
            params.push({
                key: "activeCoils0",
                labelEn: "Initial Active Coils",
                labelZh: "初始有效圈",
                value: geometry.activeCoils0,
                category: "geometry",
            });
        }
    }

    // Shock spring specific
    if (springType === "shock") {
        if (geometry.totalTurns !== undefined) {
            params.push({
                key: "totalTurns",
                labelEn: "Total Turns",
                labelZh: "总圈数",
                value: geometry.totalTurns,
                category: "geometry",
            });
        }
        if (geometry.meanDia?.mid !== undefined) {
            params.push({
                key: "meanDiaMid",
                labelEn: "Mean Diameter (Mid)",
                labelZh: "中径 (中间)",
                value: geometry.meanDia.mid,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.wireDia?.mid !== undefined) {
            params.push({
                key: "wireDiaMid",
                labelEn: "Wire Diameter (Mid)",
                labelZh: "线径 (中间)",
                value: geometry.wireDia.mid,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.pitch?.workingMax !== undefined) {
            params.push({
                key: "pitchMax",
                labelEn: "Working Pitch (Max)",
                labelZh: "工作节距 (最大)",
                value: geometry.pitch.workingMax,
                unit: "mm",
                category: "geometry",
            });
        }
        if (geometry.pitch?.closedTurns !== undefined) {
            const ct = geometry.pitch.closedTurns;
            const val = typeof ct === "number" ? ct : (ct.start + ct.end) / 2;
            params.push({
                key: "closedTurns",
                labelEn: "Closed Turns",
                labelZh: "并圈数",
                value: val,
                category: "geometry",
            });
        }
    }

    return params;
}

/**
 * Extract material parameters
 */
function extractMaterialParams(material: Record<string, any>): ReportParameter[] {
    const params: ReportParameter[] = [];

    if (material.G !== undefined) {
        params.push({
            key: "G",
            labelEn: "Shear Modulus",
            labelZh: "剪切模量",
            value: material.G,
            unit: "MPa",
            category: "material",
        });
    }

    if (material.E !== undefined) {
        params.push({
            key: "E",
            labelEn: "Elastic Modulus",
            labelZh: "弹性模量",
            value: material.E,
            unit: "MPa",
            category: "material",
        });
    }

    if (material.tauAllow !== undefined) {
        params.push({
            key: "tauAllow",
            labelEn: "Allowable Shear Stress",
            labelZh: "许用剪应力",
            value: material.tauAllow,
            unit: "MPa",
            category: "material",
        });
    }

    return params;
}

// =============================================================================
// Load Case Conversion
// =============================================================================

/**
 * Convert PlatformResult cases to ReportLoadCase format
 */
function convertLoadCases(
    cases: LoadCaseResult[],
    springType: PlatformSpringType
): ReportLoadCase[] {
    // Determine axis labels based on spring type
    const isRotational = ["arc", "spiral", "torsion"].includes(springType);
    const xLabel = isRotational ? "Angle θ (°)" : "Height H (mm)";
    const yLabel = isRotational ? "Torque M (N·mm)" : "Load P (N)";

    return cases.map((c) => ({
        id: c.id,
        x: c.inputValue,
        xLabel,
        y: c.load ?? 0,
        yLabel,
        stress: c.stress,
        stage: (c as any).stage,
        status: c.status === "ok" ? "ok" :
            c.status === "warning" ? "warning" :
                c.status === "danger" ? "danger" : "invalid",
        message: c.messageEn,
    }));
}

// =============================================================================
// Review Conversion
// =============================================================================

/**
 * Convert platform result to review summary
 */
function buildReview(
    result: PlatformResult,
    designRuleIssues?: { severity: string; messageEn: string; messageZh: string }[]
): ReportReview {
    // Determine overall status
    let overallStatus: "PASS" | "MARGINAL" | "FAIL" = "PASS";

    const hasWarning = result.cases.some(c => c.status === "warning");
    const hasDanger = result.cases.some(c => c.status === "danger");

    if (hasDanger || !result.isValid) {
        overallStatus = "FAIL";
    } else if (hasWarning) {
        overallStatus = "MARGINAL";
    }

    // Build issues list
    const issues: ReportIssue[] = [];

    // Add case-level issues
    for (const c of result.cases) {
        if (c.status !== "ok" && c.messageEn) {
            issues.push({
                severity: c.status === "danger" ? "error" : "warning",
                category: "LoadCase",
                messageEn: `${c.id}: ${c.messageEn}`,
                messageZh: `${c.id}: ${c.messageZh ?? c.messageEn}`,
            });
        }
    }

    // Add design rule issues
    if (designRuleIssues) {
        for (const issue of designRuleIssues) {
            issues.push({
                severity: issue.severity === "error" ? "error" :
                    issue.severity === "warning" ? "warning" : "info",
                category: "DesignRule",
                messageEn: issue.messageEn,
                messageZh: issue.messageZh,
            });
        }
    }

    // Generate summary
    const summaryEn = overallStatus === "PASS"
        ? "All design criteria are satisfied. The spring design is approved for production."
        : overallStatus === "MARGINAL"
            ? "Some parameters are approaching limits. Review recommended before production."
            : "Critical design issues detected. Design modifications required.";

    const summaryZh = overallStatus === "PASS"
        ? "所有设计标准均已满足。弹簧设计已批准生产。"
        : overallStatus === "MARGINAL"
            ? "部分参数接近极限。建议在生产前进行审核。"
            : "检测到关键设计问题。需要进行设计修改。";

    return {
        overallStatus,
        summaryEn,
        summaryZh,
        issues,
    };
}

// =============================================================================
// Main Builder Function
// =============================================================================

export interface ReportBuilderInput {
    /** Spring type */
    springType: PlatformSpringType;
    /** Geometry parameters */
    geometry: Record<string, any>;
    /** Material info */
    material: { id: string; name?: string; G?: number; E?: number; tauAllow?: number };
    /** Platform calculation result */
    result: PlatformResult;
    /** Optional curve data */
    curveData?: { x: number; y: number }[];
    /** Optional design rule issues */
    designRuleIssues?: { severity: string; messageEn: string; messageZh: string }[];
    /** Optional Pareto results */
    paretoResults?: any;
    /** Report options */
    options?: Partial<ReportOptions>;
}

/**
 * Build a SpringDesignReport from platform outputs
 */
export function buildSpringDesignReport(input: ReportBuilderInput): SpringDesignReport {
    const {
        springType,
        geometry,
        material,
        result,
        curveData,
        designRuleIssues,
        paretoResults,
        options,
    } = input;

    const opts = { ...DEFAULT_REPORT_OPTIONS, ...options };
    const typeLabels = SPRING_TYPE_LABELS[springType] ?? { en: springType, zh: springType };

    // Build inputs for hash
    const inputsForHash = { ...geometry, materialId: material.id };

    // Build meta
    const meta: ReportMeta = {
        projectName: opts.projectName ?? "Spring Design",
        springType: typeLabels.en,
        springTypeZh: typeLabels.zh,
        material: material.name ?? material.id,
        materialId: material.id,
        date: new Date().toISOString().split("T")[0],
        versionHash: generateVersionHash(inputsForHash),
        companyName: opts.companyName,
        language: opts.language,
    };

    // Build parameters
    const geometryParams = extractGeometryParams(springType, geometry);
    const materialParams = extractMaterialParams(material);
    const inputs = [...geometryParams, ...materialParams];

    // Build load cases
    const loadCases = convertLoadCases(result.cases, springType);

    // Build curves
    const isRotational = ["arc", "spiral", "torsion"].includes(springType);
    let primaryPoints = result.cases.map(c => ({ x: c.inputValue, y: c.load ?? 0 }));

    // Prefer high-fidelity curve from engine if available
    if (result.curves?.px) {
        primaryPoints = result.curves.px;
    } else if (curveData) {
        primaryPoints = curveData;
    }

    const curves = {
        primary: {
            name: isRotational ? "Torque" : "Load",
            color: "#2563eb",
            points: primaryPoints,
        },
        xAxisLabel: isRotational ? "θ (°)" : "H (mm)",
        yAxisLabel: isRotational ? "M (N·mm)" : "P (N)",
    };

    // Build key results
    const keyResults = {
        springRate: {
            value: result.springRate,
            unit: isRotational ? "N·mm/°" : "N/mm",
        },
        maxStress: result.cases.length > 0 ? {
            value: Math.max(...result.cases.map(c => c.stress ?? 0)),
            unit: "MPa",
        } : undefined,
        safetyFactor: result.cases.length > 0 && material.tauAllow ? {
            value: material.tauAllow / Math.max(...result.cases.map(c => c.stress ?? 1)),
        } : undefined,
        energy: result.totalEnergy ? {
            value: result.totalEnergy,
            unit: "J",
        } : undefined,
    };

    // Build review
    const review = buildReview(result, designRuleIssues);

    // Build report
    const report: SpringDesignReport = {
        meta,
        inputs,
        loadCases,
        curves,
        keyResults,
        review,
    };

    // Add Pareto results if available
    if (paretoResults && opts.includePareto) {
        report.pareto = paretoResults;
    }

    return report;
}
