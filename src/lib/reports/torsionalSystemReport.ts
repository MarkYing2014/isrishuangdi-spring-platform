
import {
    TorsionalStage,
    generateSystemCurve,
    buildTorsionalExplanationSection,
    computeStageSafe
} from "@/lib/torsional";

export interface TorsionalSystemReport {
    header: {
        title: string;
        generatedAt: string;
    };
    system: {
        stages: {
            id: string;
            springId: string;
            count: number;
            radius: number;
        }[];
        maxAngle: number;
        governingLimit: string;
    };
    explanation: string[];
}

export function generateTorsionalSystemReport(stages: TorsionalStage[]): TorsionalSystemReport {
    const systemCurve = generateSystemCurve(stages);
    const stageSafes = stages.map(s => computeStageSafe(s));
    // Pass strictly 3 arguments as per report.ts signature
    const explanation = buildTorsionalExplanationSection(stages, systemCurve, stageSafes);

    return {
        header: {
            title: "Torsional Damper System Report (OEM)",
            generatedAt: new Date().toISOString()
        },
        system: {
            stages: stages.map(s => ({
                id: s.stageId,
                springId: s.pack.spec.id,
                count: s.pack.count,
                radius: s.geometry.effectiveRadiusMm
            })),
            maxAngle: systemCurve.thetaSafeSystemDeg,
            governingLimit: `${systemCurve.governing.code} @ Stage ${systemCurve.governingStageId}`
        },
        explanation
    };
}
