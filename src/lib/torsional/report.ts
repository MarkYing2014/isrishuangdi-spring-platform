
import { TorsionalStage, SystemCurve, StageSafeResult } from "./types";
import { computeStageKthetaNmmPerDeg } from "./stiffness";

export function buildTorsionalExplanationSection(
    stages: TorsionalStage[],
    systemCurve: SystemCurve,
    stageSafes: StageSafeResult[]
) {
    // Must include:
    // 1. Modeling basis: stroke = θ(rad) × R
    // 2. Stiffness explanation: Kθ = n × k × R²

    // Add a per-stage table: StageId, R, n, k, Kθ, Applied stroke cap, θ_safe, Governing code

    const stageRows = stages.map(s => {
        const safe = stageSafes.find(r => r.stageId === s.stageId)!;
        const k = s.pack.spec.springRate;
        const R = s.geometry.effectiveRadiusMm;
        const n = s.pack.count;
        const Ktheta = computeStageKthetaNmmPerDeg(k, R, n);

        return `Stage ${s.stageId}: R=${R}mm, n=${n}, k=${k}N/mm, Kθ=${Ktheta.toFixed(1)} Nmm/deg. Cap=${safe.hardLimitStrokeMm.toFixed(2)}mm, Safe=${safe.thetaSafeDeg.toFixed(2)} deg (${safe.governing.code})`;
    }).join("\n");

    const lines = [
        `### Torsional System Summary`,
        `**Modeling Basis**: Torsional moment is derived from linear spring force acting at effective radius R: Stroke = θ(rad) × R.`,
        `**Stiffness**: Rotational stiffness differentiates heavily by radius: Kθ = n × k × R².`,
        `**Governing Limits**:`,
        `- System Safe Angle: **${systemCurve.thetaSafeSystemDeg.toFixed(2)}°**`,
        `- Governed by: **${systemCurve.governing.code}** @ Stage ${systemCurve.governingStageId} (Limit stroke: ${systemCurve.governing.limitStrokeMm.toFixed(2)}mm)`,
        ``,
        `#### Stage Details`,
        stageRows
    ];

    // If series = ISO_D_LINE, include the D-profile visualization disclaimer.
    const hasDLine = stages.some(s => s.pack.spec.series === "ISO_D_LINE");
    if (hasDLine) {
        lines.push("");
        lines.push("> **Note**: ISO D-Line springs are modeled with rectangular wire approximation.");
    }

    return lines;
}
