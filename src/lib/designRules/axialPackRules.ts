import { AxialPackResult } from "@/lib/spring-platform/types";

export interface DesignRuleFinding {
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    message: string;
    value?: string;
    limit?: string;
}

export function checkAxialPackRules(result: Partial<AxialPackResult>): DesignRuleFinding[] {
    const findings: DesignRuleFinding[] = [];

    if (!result.pack || !result.pack.clearance) return findings;

    const { ssMin, boundaryMin, seatPocketMin } = result.pack.clearance;
    const maxStroke = result.pack.maxStroke ?? 0;

    // 1. Spring-to-Spring Clearance
    // Rule: Must be positive. Ideally > 0.5mm
    if (ssMin < 0) {
        findings.push({
            id: "CLR_SS",
            label: "Spring-to-Spring Clearance",
            status: "fail",
            message: "Interference between springs",
            value: ssMin.toFixed(2),
            limit: "0"
        });
    } else if (ssMin < 0.5) {
        findings.push({
            id: "CLR_SS",
            label: "Spring-to-Spring Clearance",
            status: "warning",
            message: "Low clearance (<0.5mm)",
            value: ssMin.toFixed(2),
            limit: "0.5"
        });
    } else {
        findings.push({
            id: "CLR_SS",
            label: "Spring-to-Spring Clearance",
            status: "pass",
            message: "Clearance OK",
            value: ssMin.toFixed(2),
            limit: "0.5"
        });
    }

    // 2. Boundary Clearance
    if (boundaryMin < 999) {
        if (boundaryMin < 0) {
            findings.push({
                id: "CLR_BND",
                label: "Boundary Clearance",
                status: "fail",
                message: "Interference with Housing Ring",
                value: boundaryMin.toFixed(2),
                limit: "0"
            });
        } else if (boundaryMin < 0.5) {
            findings.push({
                id: "CLR_BND",
                label: "Boundary Clearance",
                status: "warning",
                message: "Low boundary clearance",
                value: boundaryMin.toFixed(2),
                limit: "0.5"
            });
        } else {
            findings.push({
                id: "CLR_BND",
                label: "Boundary Clearance",
                status: "pass",
                message: "Boundary OK",
                value: boundaryMin.toFixed(2),
                limit: "0.5"
            });
        }
    }

    // 3. Seat Pocket Clearance
    if (seatPocketMin < 999) {
        if (seatPocketMin <= 0) {
            findings.push({
                id: "CLR_POCKET",
                label: "Seat Pocket Fit",
                status: "fail",
                message: "Spring larger than pocket",
                value: seatPocketMin.toFixed(2),
                limit: "0"
            });
        } else if (seatPocketMin < 0.5) {
            findings.push({
                id: "CLR_POCKET",
                label: "Seat Pocket Fit",
                status: "warning",
                message: "Tight fit in pocket",
                value: seatPocketMin.toFixed(2),
                limit: "0.5"
            });
        }
    }

    // 4. Stroke Limit (Optional runtime check, although Engine handles maxStroke)
    // Sometimes helpful to warn if stroke is very close to solid
    // Not critical for GEN-1 if we already have maxStroke.

    return findings;
}
