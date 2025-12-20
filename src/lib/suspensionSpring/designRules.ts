/**
 * Suspension Spring Design Rules
 * 减震器弹簧设计规则检查
 */

import type { SuspensionSpringInput, SuspensionSpringResult } from "./types";

export type RuleSeverity = "error" | "warning" | "ok";

export interface DesignRuleFinding {
  id: string;
  name: string;
  severity: RuleSeverity;
  message: string;
  value?: number;
  limit?: number;
}

export function checkSuspensionSpringDesignRules(
  input: SuspensionSpringInput,
  result: SuspensionSpringResult
): DesignRuleFinding[] {
  const findings: DesignRuleFinding[] = [];

  // 1. Spring Index C
  const C = result.derived.springIndex_C;
  if (C < 4) {
    findings.push({
      id: "spring_index_low",
      name: "Spring Index",
      severity: "warning",
      message: `C = ${C.toFixed(1)} < 4: High stress concentration, difficult to manufacture`,
      value: C,
      limit: 4,
    });
  } else if (C > 20) {
    findings.push({
      id: "spring_index_high",
      name: "Spring Index",
      severity: "warning",
      message: `C = ${C.toFixed(1)} > 20: Prone to buckling and tangling`,
      value: C,
      limit: 20,
    });
  } else {
    findings.push({
      id: "spring_index",
      name: "Spring Index",
      severity: "ok",
      message: `C = ${C.toFixed(1)} (4~20 recommended)`,
      value: C,
    });
  }

  // 2. Stress Ratio at Bump
  const stressRatio = result.stress.stressRatio_bump;
  if (stressRatio >= 1.0) {
    findings.push({
      id: "stress_ratio_critical",
      name: "Stress Ratio (Bump)",
      severity: "error",
      message: `τ/τallow = ${(stressRatio * 100).toFixed(0)}% ≥ 100%: Will yield`,
      value: stressRatio,
      limit: 1.0,
    });
  } else if (stressRatio >= 0.8) {
    findings.push({
      id: "stress_ratio_high",
      name: "Stress Ratio (Bump)",
      severity: "warning",
      message: `τ/τallow = ${(stressRatio * 100).toFixed(0)}% ≥ 80%: Low safety margin`,
      value: stressRatio,
      limit: 0.8,
    });
  } else {
    findings.push({
      id: "stress_ratio",
      name: "Stress Ratio (Bump)",
      severity: "ok",
      message: `τ/τallow = ${(stressRatio * 100).toFixed(0)}%`,
      value: stressRatio,
    });
  }

  // 3. Coil Bind Check
  const Hs = result.derived.solidHeight_Hs_mm;
  const Hb = result.bumpHeight_mm;
  const margin = input.loadcase.solidMargin_mm ?? 3;
  const clearance = Hb - Hs;

  if (clearance <= 0) {
    findings.push({
      id: "coil_bind_critical",
      name: "Coil Bind",
      severity: "error",
      message: `Bump height (${Hb.toFixed(1)}mm) ≤ solid height (${Hs.toFixed(1)}mm): Will bind`,
      value: clearance,
      limit: margin,
    });
  } else if (clearance <= margin) {
    findings.push({
      id: "coil_bind_warning",
      name: "Coil Bind",
      severity: "warning",
      message: `Clearance ${clearance.toFixed(1)}mm ≤ margin ${margin}mm: Risk of binding`,
      value: clearance,
      limit: margin,
    });
  } else {
    findings.push({
      id: "coil_bind",
      name: "Coil Bind",
      severity: "ok",
      message: `Clearance ${clearance.toFixed(1)}mm > margin ${margin}mm`,
      value: clearance,
    });
  }

  // 4. Guide Hole Clearance
  const od = result.derived.od_mm;
  const hole = input.geometry.guide.holeDiameter_mm;
  if (hole) {
    const holeClearance = hole - od;
    if (holeClearance <= 0) {
      findings.push({
        id: "hole_clearance_critical",
        name: "Hole Clearance",
        severity: "error",
        message: `Hole ${hole}mm ≤ OD ${od.toFixed(1)}mm: Interference`,
        value: holeClearance,
        limit: 0.5,
      });
    } else if (holeClearance < 0.5) {
      findings.push({
        id: "hole_clearance_warning",
        name: "Hole Clearance",
        severity: "warning",
        message: `Hole clearance ${holeClearance.toFixed(2)}mm < 0.5mm: Friction risk`,
        value: holeClearance,
        limit: 0.5,
      });
    } else {
      findings.push({
        id: "hole_clearance",
        name: "Hole Clearance",
        severity: "ok",
        message: `Hole clearance ${holeClearance.toFixed(2)}mm`,
        value: holeClearance,
      });
    }
  }

  // 5. Rod Clearance
  const id = result.derived.id_mm;
  const rod = input.geometry.guide.rodDiameter_mm;
  if (rod) {
    const rodClearance = id - rod;
    if (rodClearance <= 0) {
      findings.push({
        id: "rod_clearance_critical",
        name: "Rod Clearance",
        severity: "error",
        message: `ID ${id.toFixed(1)}mm ≤ Rod ${rod}mm: Interference`,
        value: rodClearance,
        limit: 0.5,
      });
    } else if (rodClearance < 0.5) {
      findings.push({
        id: "rod_clearance_warning",
        name: "Rod Clearance",
        severity: "warning",
        message: `Rod clearance ${rodClearance.toFixed(2)}mm < 0.5mm: Friction risk`,
        value: rodClearance,
        limit: 0.5,
      });
    } else {
      findings.push({
        id: "rod_clearance",
        name: "Rod Clearance",
        severity: "ok",
        message: `Rod clearance ${rodClearance.toFixed(2)}mm`,
        value: rodClearance,
      });
    }
  }

  // 6. Buckling Check
  const Hf = input.geometry.freeLength_Hf_mm;
  const Dm = result.derived.meanDiameter_mm;
  const slenderness = Hf / Dm;
  const hasGuide = hole || rod;

  if (slenderness > 5.2 && !hasGuide) {
    findings.push({
      id: "buckling_critical",
      name: "Buckling",
      severity: "error",
      message: `Slenderness ${slenderness.toFixed(1)} > 5.2 without guide: Will buckle`,
      value: slenderness,
      limit: 5.2,
    });
  } else if (slenderness > 4 && !hasGuide) {
    findings.push({
      id: "buckling_warning",
      name: "Buckling",
      severity: "warning",
      message: `Slenderness ${slenderness.toFixed(1)} > 4 without guide: Buckling risk`,
      value: slenderness,
      limit: 4,
    });
  } else {
    findings.push({
      id: "buckling",
      name: "Buckling",
      severity: "ok",
      message: hasGuide
        ? `Slenderness ${slenderness.toFixed(1)} with guide`
        : `Slenderness ${slenderness.toFixed(1)} < 4`,
      value: slenderness,
    });
  }

  // 7. Natural Frequency (if dynamics provided)
  if (result.dynamics) {
    const fn = result.dynamics.naturalFreq_Hz;
    const target = input.loadcase.targetFreq_Hz;
    if (target) {
      const diff = Math.abs(fn - target);
      if (diff > 1) {
        findings.push({
          id: "frequency_mismatch",
          name: "Natural Frequency",
          severity: "warning",
          message: `fn = ${fn.toFixed(2)} Hz differs from target ${target} Hz by ${diff.toFixed(2)} Hz`,
          value: fn,
          limit: target,
        });
      } else {
        findings.push({
          id: "frequency",
          name: "Natural Frequency",
          severity: "ok",
          message: `fn = ${fn.toFixed(2)} Hz (target: ${target} Hz)`,
          value: fn,
        });
      }
    } else {
      findings.push({
        id: "frequency",
        name: "Natural Frequency",
        severity: "ok",
        message: `fn = ${fn.toFixed(2)} Hz`,
        value: fn,
      });
    }
  }

  return findings;
}

/**
 * Get overall status from findings
 */
export function getOverallStatus(findings: DesignRuleFinding[]): RuleSeverity {
  if (findings.some((f) => f.severity === "error")) return "error";
  if (findings.some((f) => f.severity === "warning")) return "warning";
  return "ok";
}
