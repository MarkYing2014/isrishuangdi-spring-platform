import { ShockSpringInput, PlatformResult, PlatformMaterialModel } from "../types";

export interface DesignRuleResult {
    id: string;
    label: string;
    status: "pass" | "fail" | "warning";
    message: string;
    value?: number | string;
    limit?: number | string;
}

export function checkShockSpringDesignRules(
    input: ShockSpringInput,
    result: PlatformResult,
    material: PlatformMaterialModel
): DesignRuleResult[] {
    const rules: DesignRuleResult[] = [];
    const fmt = (n: number) => n.toFixed(2);

    // 1. Spring Index (C)
    // Range 4 - 12 (preferred)
    const C = result.springIndex;
    if (C < 4) {
        rules.push({
            id: "index", label: "Spring Index C", status: "warning",
            message: "Index too low (< 4), hard to coil.", value: fmt(C), limit: ">= 4"
        });
    } else if (C > 12) {
        rules.push({
            id: "index", label: "Spring Index C", status: "warning",
            message: "Index too high (> 12), prone to buckling.", value: fmt(C), limit: "<= 12"
        });
    } else {
        rules.push({
            id: "index", label: "Spring Index C", status: "pass",
            message: "Optimal manufacturing range.", value: fmt(C), limit: "4-12"
        });
    }

    // 2. Buckling Stability
    // Slenderness Ratio H0 / D
    // If not guided, limit < 2.6 (conservative) or < 5.2 (theoretical fixed ends)
    // Shock springs often guided by damper body (ID guide) or seat (Fixed ends).
    const H0 = result.H0 || 0;
    const D = input.meanDia.mid;
    const slenderness = H0 / D;
    const isGuided = input.installation?.guided ?? false;
    const buckleLimit = isGuided ? 999 : 3.5; // Approx limit for fixed/fixed

    if (slenderness > buckleLimit) {
        rules.push({
            id: "buckling", label: "Buckling Stability", status: "fail",
            message: isGuided ? "Very slender, check guide clearance." : "Buckling risk! Requires guide.",
            value: fmt(slenderness), limit: fmt(buckleLimit)
        });
    } else if (!isGuided && slenderness > 2.6) {
        rules.push({
            id: "buckling", label: "Buckling Stability", status: "warning",
            message: "Potential buckling, ensure fixed seats.",
            value: fmt(slenderness), limit: "2.6"
        });
    } else {
        rules.push({
            id: "buckling", label: "Buckling Stability", status: "pass",
            message: "Stable geometry.",
            value: fmt(slenderness), limit: fmt(buckleLimit)
        });
    }

    // 3. Stress Limit (at Solid)
    // Even if max stroke is less than solid, we should check Solid Stress for overload capability unless block limited.
    // If we have stress at solid?
    // result.curves?.kx could extrapolate, or we calculate roughly.
    // Tau = 8FD/pi d^3 * Kw.
    // F_solid needs P curve.
    // Let's check the highest stress calculated in 'cases' or MaxStroke.
    // ShockSpringEngine calculates maxStroke based on H0-Hb.
    // Let's assume user cares about Max Calculated Stress vs Allowable if cases cover the range.
    // But safely, we should check solid stress.
    // For now, let's check safety factor of the WORST case in result.cases.

    if (result.cases.length > 0) {
        // Find min SF
        let minSF = 999;
        result.cases.forEach(c => {
            if (c.sfMin !== undefined && c.sfMin < minSF) minSF = c.sfMin;
        });

        if (minSF < 1.0) {
            rules.push({
                id: "stress", label: "Static Stress Safety", status: "fail",
                message: "Yielding expected at peak load.", value: fmt(minSF), limit: ">= 1.0"
            });
        } else if (minSF < 1.1) {
            rules.push({
                id: "stress", label: "Static Stress Safety", status: "warning",
                message: "Low safety margin.", value: fmt(minSF), limit: ">= 1.1"
            });
        } else {
            rules.push({
                id: "stress", label: "Static Stress Safety", status: "pass",
                message: "Safe against yielding.", value: fmt(minSF), limit: ">= 1.1"
            });
        }
    }

    // 4. Solid Limit
    // Check if any case exceeds Solid Height
    const maxDeflection = Math.max(...result.cases.map(c =>
        c.inputMode === "deflection" ? c.inputValue : ((result.H0 || 0) - c.inputValue)
    ));
    const maxStroke = result.maxStroke || 0;

    if (maxDeflection > maxStroke) {
        rules.push({
            id: "travel", label: "Travel Limit", status: "fail",
            message: "Exceeds solid height (Coil Bind).", value: fmt(maxDeflection), limit: fmt(maxStroke)
        });
    } else if (maxDeflection > maxStroke * 0.9) {
        rules.push({
            id: "travel", label: "Travel Limit", status: "warning",
            message: "Close to solid height (<10% margin).", value: fmt(maxDeflection), limit: fmt(maxStroke)
        });
    } else {
        rules.push({
            id: "travel", label: "Travel Limit", status: "pass",
            message: "Travel within limits.", value: fmt(maxDeflection), limit: fmt(maxStroke)
        });
    }

    return rules;
}
