import { DesignSnapshot, SnapshotPayload, SnapshotSummary } from "./types";

/**
 * Structured diff item
 */
export interface DiffItem {
    path: string;           // "input.d"
    oldValue: any;
    newValue: any;
    group: "geometry" | "material" | "ends" | "loadcase" | "modules" | "other";
}

/**
 * Semantic engineering insight
 */
export interface EvolutionInsight {
    type: "geometryChange" | "riskReduction" | "targetMatch" | "tradeoff" | "other";
    severity: "info" | "warning";
    textEn: string;
    textZh: string;
    evidence?: Record<string, number | string>;
}

/**
 * Compare two payloads to find geometric/material changes
 */
export function diffSnapshots(a: DesignSnapshot, b: DesignSnapshot): DiffItem[] {
    const diffs: DiffItem[] = [];
    const pA = a.payload.input;
    const pB = b.payload.input;

    // Check Geometry
    const geoKeys = new Set([...Object.keys(pA || {}), ...Object.keys(pB || {})]);
    for (const key of geoKeys) {
        if (pA[key] !== pB[key] && typeof pA[key] !== "object") {
            diffs.push({
                path: `input.${key}`,
                oldValue: pA[key],
                newValue: pB[key],
                group: "geometry"
            });
        }
    }

    return diffs;
}

/**
 * Build semantic insights from diffs and summaries
 */
export function buildInsights(a: DesignSnapshot, b: DesignSnapshot): EvolutionInsight[] {
    const insights: EvolutionInsight[] = [];
    const diffs = diffSnapshots(a, b);
    const sumA = a.summary;
    const sumB = b.summary;

    const findDiff = (key: string) => diffs.find(d => d.path === `input.${key}`);

    // Rule 1: Stress & Wire Diameter Correlation
    const dDiff = findDiff('d');
    if (dDiff && dDiff.newValue > dDiff.oldValue) {
        const stressA = sumA.kpi.maxStress || 0;
        const stressB = sumB.kpi.maxStress || 0;
        if (stressB < stressA) {
            insights.push({
                type: "riskReduction",
                severity: "info",
                textEn: `Increased wire diameter to ${dDiff.newValue}mm to reduce operating stress.`,
                textZh: `增加线径至 ${dDiff.newValue}mm 以降低工作应力。`,
                evidence: { stressReduction: `${(stressA - stressB).toFixed(1)} MPa` }
            });
        }
    }

    // Rule 2: Coils & Rate Correlation
    const nDiff = findDiff('n') || findDiff('activeCoils') || findDiff('Nt');
    if (nDiff) {
        const kA = sumA.kpi.springRate || 0;
        const kB = sumB.kpi.springRate || 0;
        if (nDiff.newValue > nDiff.oldValue && kB < kA) {
            insights.push({
                type: "geometryChange",
                severity: "info",
                textEn: `Increased active coils to soften spring rate.`,
                textZh: `增加有效圈数以降低弹簧刚度。`,
                evidence: { rateReduction: `${(kA - kB).toFixed(2)} N/mm` }
            });
        }
    }

    // Rule 3: Mass vs Stress Tradeoff
    const massA = sumA.kpi.mass || sumA.kpi.weight || 0;
    const massB = sumB.kpi.mass || sumB.kpi.weight || 0;
    if (massB < massA && massA > 0) {
        const reduction = ((massA - massB) / massA) * 100;
        if (reduction > 5) {
            insights.push({
                type: "tradeoff",
                severity: "info",
                textEn: `Lightweight optimization achieved: ${reduction.toFixed(1)}% weight reduction.`,
                textZh: `实现轻量化优化：重量降低 ${reduction.toFixed(1)}%。`
            });
        }
    }

    // Rule 4: Status Fix
    if (sumA.status === "fail" && sumB.status === "pass") {
        insights.push({
            type: "riskReduction",
            severity: "info",
            textEn: "Design converged: Resolved critical engineering rule violations.",
            textZh: "设计收敛：解决了关键工程准则超限问题。"
        });
    }

    return insights;
}
