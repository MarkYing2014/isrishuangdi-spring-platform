/**
 * Shock Spring Module - Design Rules
 * 
 * Rules for manufacturing feasibility, safety, and fitment.
 * 
 * 1. Active Coils check
 * 2. Spring Index check
 * 3. Buckling check (with guide)
 * 4. Pitch Clearance
 * 5. Grinding Plane Validity (Local Space)
 */

import * as THREE from "three";
import type { ShockSpringInput, ShockSpringResult } from "./types";
import { checkBucklingStability } from "./math";

export type RuleFinding = {
    id: string;
    message: string;
    severity: "ok" | "warning" | "error";
    value: number;
    limit: number;
};

export function checkShockSpringDesignRules(input: ShockSpringInput, result: ShockSpringResult): RuleFinding[] {
    const findings: RuleFinding[] = [];
    const { derived } = result;

    // 1. Spring Index (min C)
    // We check min index across the spring (using min mean dia and max wire dia if variable)
    // But typically meaningful is C at center vs C at ends.
    // Let's iterate all segments to find worst case.
    let minC = 999;
    let maxC = 0;

    // Check segments for local C
    derived.segments.forEach(s => {
        const C = s.meanDia / s.wireDia;
        if (C < minC) minC = C;
        if (C > maxC) maxC = C;
    });

    if (minC < 4.0) {
        findings.push({
            id: "index_low",
            message: `Minimum Spring Index C=${minC.toFixed(1)} < 4.0. Difficult to coil, high stress.`,
            severity: minC < 3.0 ? "error" : "warning",
            value: minC,
            limit: 4.0
        });
    } else {
        findings.push({ id: "index", message: `Spring Index OK (${minC.toFixed(1)} - ${maxC.toFixed(1)})`, severity: "ok", value: minC, limit: 4.0 });
    }

    // 2. Buckling Stability
    // L0 / D_mean
    // Use average mean diameter
    const avgDm = (input.meanDia.start + input.meanDia.mid + input.meanDia.end) / 3; // Approx
    const stability = checkBucklingStability(derived.freeLength, avgDm, input.installation.guided);
    const slenderness = derived.freeLength / avgDm;

    if (stability === "buckle_risk") {
        findings.push({
            id: "buckling",
            message: `Buckling Risk! Slenderness ${slenderness.toFixed(1)} > 4.0 (Unguided). Use a guide rod or reduce length.`,
            severity: "error",
            value: slenderness,
            limit: 4.0
        });
    } else {
        findings.push({
            id: "buckling_ok",
            message: `Stability OK (Slenderness ${slenderness.toFixed(1)}, ${input.installation.guided ? "Guided" : "Unguided"})`,
            severity: "ok",
            value: slenderness,
            limit: 4.0
        });
    }

    // 3. Coil Bind Safety
    // Check bump point margin
    const bumpMargin = result.derived.freeLength - (input.loadCase.bumpHeight ?? 0) - result.derived.solidHeight;
    const requiredMargin = input.loadCase.solidMargin;

    if (input.loadCase.bumpHeight && bumpMargin < requiredMargin) {
        findings.push({
            id: "solid_margin",
            message: `Insufficient Solid Margin at Bump. CLEARANCE: ${bumpMargin.toFixed(1)}mm < REQ: ${requiredMargin}mm`,
            severity: "error",
            value: bumpMargin,
            limit: requiredMargin
        });
    } else {
        findings.push({ id: "solid_margin_ok", message: `Solid Margin OK (${bumpMargin.toFixed(1)}mm)`, "severity": "ok", value: bumpMargin, limit: requiredMargin });
    }

    // 4. Grinding Plane Validity (Local Space)
    // We check if the Z-cut planes actually intersect the active coil body or are "floating" in air.
    // Bounding Box of Centerline in Local Z
    let minZ = 9999;
    let maxZ = -9999;
    derived.centerline.forEach(p => {
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
    });

    const { startZ, endZ } = derived.grindingPlanes;

    if (input.grinding.grindStart) {
        if (startZ === null || startZ > maxZ || startZ < minZ) {
            findings.push({
                id: "grind_start_miss",
                message: `Bottom Grind Plane (Z=${startZ?.toFixed(1)}) misses the coil body [${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]. Check offset.`,
                severity: "warning",
                value: startZ ?? 0,
                limit: minZ
            });
        }
    }

    if (input.grinding.grindEnd) {
        if (endZ === null || endZ < minZ || endZ > maxZ) {
            findings.push({
                id: "grind_end_miss",
                message: `Top Grind Plane (Z=${endZ?.toFixed(1)}) misses the coil body. Check offset.`,
                severity: "warning",
                value: endZ ?? 0,
                limit: maxZ
            });
        }
    }


    return findings;
}
