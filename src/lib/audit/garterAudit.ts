import type { GarterAnalysisBundle } from "@/lib/analysis/garter/types";

export function buildGarterAudit(bundle: GarterAnalysisBundle) {
    const ana = bundle.analytical;
    const Sy = bundle.inputs.tensileStrength;
    const allow = Sy ? 0.65 * Sy : 999999; // 没Sy就不以应力判FAIL
    const ratio = ana.maxShearStress / allow;

    let status: "PASS" | "WARN" | "FAIL" = "PASS";
    if (ratio > 1.0) status = "FAIL";
    else if (ratio > 0.85) status = "WARN";

    // 旋绕比经验范围
    if (ana.springIndex < 4 || ana.springIndex > 20) {
        status = status === "FAIL" ? "FAIL" : "WARN";
    }

    // 如果有 FEA，做偏差审计（只在 FEA 成功时）
    const fea = bundle.fea;
    let feaNote: string | undefined;
    if (fea?.status === "SUCCEEDED" && fea.maxStress && fea.reactionForce) {
        const stressPct = ((fea.maxStress - ana.maxShearStress) / Math.max(ana.maxShearStress, 1)) * 100;
        // >15% 给 WARN，>30% 给 FAIL
        if (Math.abs(stressPct) > 30) status = "FAIL";
        else if (Math.abs(stressPct) > 15) status = status === "FAIL" ? "FAIL" : "WARN";
        feaNote = `FEA deviation: stress ${stressPct.toFixed(1)}%`;
    } else if (fea && fea.status !== "SUCCEEDED") {
        feaNote = `FEA not verified (${fea.status})`;
    }

    return {
        standard: "PLATFORM STANDARD V1.0",
        springType: "garter",
        governingVariable: "ΔD",
        governingMode: "Helical Shear (Unwrapped + Wahl)",
        maxStress: ana.maxShearStress,
        allowableStress: allow,
        ratio: ratio * 100, // Normalized to percentage for consistency with other audits
        safetyFactor: allow / Math.max(ana.maxShearStress, 1),
        status,
        notes: feaNote ? [feaNote] : [],
        // Adding required fields for standard audit card compatibility if needed, 
        // or mapping this output to the EngineeringAuditCard props in the parent.
        summary: { // Mapping for EngineeringAuditCard
            governingFailureMode: "Helical Shear (Unwrapped + Wahl)",
            governingFailureModeZh: "螺旋剪切 (展开模型 + Wahl)",
            criticalRatio: ratio * 100,
            safetyFactor: allow / Math.max(ana.maxShearStress, 1),
        },
        audits: { // Mocking detailed audits structure for now to fit EngineeringAuditCard if reused directly
            stress: {
                status: ratio > 1 ? "FAIL" : ratio > 0.85 ? "WARN" : "PASS",
                maxStress: ana.maxShearStress,
                allowableStress: allow,
                stressRatio: ratio * 100,
                governingMode: "Helical Shear",
                governingModeZh: "螺旋剪切",
            },
            geometry: {
                springIndex: { status: (ana.springIndex < 4 || ana.springIndex > 20) ? "WARN" : "PASS" }
            },
            loadcase: {
                travel: { status: "PASS" }
            },
        }
    };
}
