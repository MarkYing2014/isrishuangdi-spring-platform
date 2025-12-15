export type RYG = "GREEN" | "YELLOW" | "RED";

export interface SpiralEngineeringReview {
  staticRYG: RYG;
  fatigueRYG: RYG;
  closeoutRYG: RYG;
  geometryRYG: RYG;
  overall: RYG;
  messages: string[];

  staticSF: number | null;
  fatigueSF: number | null;
  closeoutRatio: number | null;
  btRatio: number | null;
}

function worstRYG(values: RYG[]): RYG {
  if (values.includes("RED")) return "RED";
  if (values.includes("YELLOW")) return "YELLOW";
  return "GREEN";
}

function bi(en: string, zh: string): string {
  return `${en} / ${zh}`;
}

export function evaluateStaticSF(staticSF: number | null): RYG {
  if (staticSF === null || !isFinite(staticSF)) return "YELLOW";
  if (staticSF >= 1.2) return "GREEN";
  if (staticSF >= 1.0) return "YELLOW";
  return "RED";
}

export function evaluateFatigueSF(fatigueSF: number | null): RYG {
  if (fatigueSF === null || !isFinite(fatigueSF)) return "YELLOW";
  if (fatigueSF >= 1.5) return "GREEN";
  if (fatigueSF >= 1.2) return "YELLOW";
  return "RED";
}

export function evaluateCloseoutRatio(closeoutRatio: number | null): RYG {
  if (closeoutRatio === null || !isFinite(closeoutRatio)) return "YELLOW";
  if (closeoutRatio <= 0.6) return "GREEN";
  if (closeoutRatio <= 0.8) return "YELLOW";
  return "RED";
}

export function evaluateBtRatio(btRatio: number | null): RYG {
  if (btRatio === null || !isFinite(btRatio)) return "YELLOW";
  if (btRatio >= 8 && btRatio <= 40) return "GREEN";
  if ((btRatio >= 6 && btRatio < 8) || (btRatio > 40 && btRatio <= 60)) return "YELLOW";
  return "RED";
}

export function reviewSpiralDesign(params: {
  sigmaMax_MPa: number;
  Sy_MPa: number | null;
  fatigueSF: number | null;
  thetaMax_deg: number;
  thetaCo_deg: number;
  stripWidth_mm: number;
  stripThickness_mm: number;
}): SpiralEngineeringReview {
  const messages: string[] = [];

  const staticSF =
    params.Sy_MPa && isFinite(params.Sy_MPa) && params.Sy_MPa > 0 && isFinite(params.sigmaMax_MPa) && params.sigmaMax_MPa > 0
      ? params.Sy_MPa / params.sigmaMax_MPa
      : null;

  const fatigueSF = params.fatigueSF;

  const closeoutRatio =
    isFinite(params.thetaCo_deg) && params.thetaCo_deg > 0 && isFinite(params.thetaMax_deg)
      ? params.thetaMax_deg / params.thetaCo_deg
      : null;

  const btRatio =
    isFinite(params.stripThickness_mm) && params.stripThickness_mm > 0 && isFinite(params.stripWidth_mm)
      ? params.stripWidth_mm / params.stripThickness_mm
      : null;

  const staticRYG = evaluateStaticSF(staticSF);
  const fatigueRYG = evaluateFatigueSF(fatigueSF);
  const closeoutRYG = evaluateCloseoutRatio(closeoutRatio);
  const geometryRYG = evaluateBtRatio(btRatio);
  const overall = worstRYG([staticRYG, fatigueRYG, closeoutRYG, geometryRYG]);

  if (staticSF === null)
    messages.push(bi("Static SF unavailable (missing Sy or σ_max)", "静强度安全系数不可用（缺少 Sy 或 σ_max）"));
  if (fatigueSF === null)
    messages.push(bi("Fatigue SF unavailable (missing Su/Se)", "疲劳安全系数不可用（缺少 Su 或 Se）"));
  if (closeoutRatio === null)
    messages.push(bi("Close-out ratio unavailable (missing θ_co)", "贴合比不可用（缺少 θ_co）"));
  if (btRatio === null) messages.push(bi("Geometry ratio b/t unavailable", "几何比 b/t 不可用"));

  if (staticSF !== null) {
    const targetStaticGreen = 1.2;
    if (staticSF < 1.0) {
      const need = targetStaticGreen / staticSF;
      const tFactor = Math.sqrt(need);
      messages.push(
        bi(
          `Static: SF < 1.0 (Sy/σmax = ${staticSF.toFixed(2)})`,
          `静强度：安全系数 < 1.0 (Sy/σmax = ${staticSF.toFixed(2)})`
        )
      );
      messages.push(
        bi(
          `Action: reduce peak stress by ~${((need - 1) * 100).toFixed(0)}% to reach SF≈${targetStaticGreen.toFixed(1)}.`,
          `建议：将峰值应力降低约 ${((need - 1) * 100).toFixed(0)}%，以达到 SF≈${targetStaticGreen.toFixed(1)}。`
        )
      );
      messages.push(
        bi(
          `Action: increase thickness t by ~${((tFactor - 1) * 100).toFixed(0)}% (σ ∝ 1/t²) and/or increase width b by ~${((need - 1) * 100).toFixed(0)}% (σ ∝ 1/b).`,
          `建议：增大厚度 t 约 ${((tFactor - 1) * 100).toFixed(0)}%（σ ∝ 1/t²）和/或增大宽度 b 约 ${((need - 1) * 100).toFixed(0)}%（σ ∝ 1/b）。`
        )
      );
      messages.push(
        bi(
          "Action: reduce max torque/angle range, choose higher Sy material, or reduce end stress concentration (Kt) via end geometry/fillet.",
          "建议：降低最大扭矩/工作角范围、选用更高 Sy 材料，或通过端部几何/圆角降低应力集中（Kt）。"
        )
      );
    } else if (staticSF < targetStaticGreen) {
      const need = targetStaticGreen / staticSF;
      const tFactor = Math.sqrt(need);
      messages.push(
        bi(
          `Static: SF marginal (Sy/σmax = ${staticSF.toFixed(2)})`,
          `静强度：安全系数偏低 (Sy/σmax = ${staticSF.toFixed(2)})`
        )
      );
      messages.push(
        bi(
          `Action: target SF≈${targetStaticGreen.toFixed(1)}; reduce σmax by ~${((need - 1) * 100).toFixed(0)}% (e.g., t +${((tFactor - 1) * 100).toFixed(0)}% or b +${((need - 1) * 100).toFixed(0)}%, or lower Tmax).`,
          `建议：目标 SF≈${targetStaticGreen.toFixed(1)}；将 σmax 降低约 ${((need - 1) * 100).toFixed(0)}%（例如：t 增加 ${((tFactor - 1) * 100).toFixed(0)}% 或 b 增加 ${((need - 1) * 100).toFixed(0)}%，或降低 Tmax）。`
        )
      );
    }
  }

  if (fatigueSF !== null) {
    const targetFatigueGreen = 1.5;
    if (fatigueSF < 1.2) {
      const need = targetFatigueGreen / fatigueSF;
      const tFactor = Math.sqrt(need);
      messages.push(
        bi(
          `Fatigue: SF < 1.2 (Goodman = ${fatigueSF.toFixed(2)})`,
          `疲劳：安全系数 < 1.2 (Goodman = ${fatigueSF.toFixed(2)})`
        )
      );
      messages.push(
        bi(
          `Action: target SF≈${targetFatigueGreen.toFixed(1)}; reduce stress range by ~${((need - 1) * 100).toFixed(0)}% (approx).`,
          `建议：目标 SF≈${targetFatigueGreen.toFixed(1)}；将应力幅/应力范围降低约 ${((need - 1) * 100).toFixed(0)}%（近似）。`
        )
      );
      messages.push(
        bi(
          `Action: increase t by ~${((tFactor - 1) * 100).toFixed(0)}% and/or b by ~${((need - 1) * 100).toFixed(0)}%; also reduce Δθ (torque range) if possible.`,
          `建议：t 增加约 ${((tFactor - 1) * 100).toFixed(0)}% 和/或 b 增加约 ${((need - 1) * 100).toFixed(0)}%；同时尽量降低 Δθ（扭矩范围）。`
        )
      );
      messages.push(
        bi(
          "Action: improve Se via better surface finish, enable shot peening, or select material with higher Se'/Su; reduce Kt at ends.",
          "建议：通过更好表面、启用喷丸或选更高 Se'/Su 材料提高 Se；并降低端部应力集中（Kt）。"
        )
      );
    } else if (fatigueSF < targetFatigueGreen) {
      const need = targetFatigueGreen / fatigueSF;
      messages.push(
        bi(
          `Fatigue: SF marginal (Goodman = ${fatigueSF.toFixed(2)})`,
          `疲劳：安全系数偏低 (Goodman = ${fatigueSF.toFixed(2)})`
        )
      );
      messages.push(
        bi(
          `Action: target SF≈${targetFatigueGreen.toFixed(1)}; reduce stress range by ~${((need - 1) * 100).toFixed(0)}% (e.g., lower Δθ/T range, improve surface, shot peen, or increase b/t).`,
          `建议：目标 SF≈${targetFatigueGreen.toFixed(1)}；将应力范围降低约 ${((need - 1) * 100).toFixed(0)}%（例如降低 Δθ/扭矩范围、改善表面、喷丸或提高 b/t）。`
        )
      );
    }
  }

  if (closeoutRatio !== null) {
    const targetCloseoutGreen = 0.6;
    const targetCloseoutYellow = 0.8;
    if (closeoutRatio > targetCloseoutYellow) {
      const thetaCoTarget = params.thetaMax_deg / targetCloseoutYellow;
      const deltaCo = params.thetaCo_deg > 0 ? thetaCoTarget - params.thetaCo_deg : null;
      messages.push(
        bi(
          `Close-out: ratio > ${targetCloseoutYellow.toFixed(1)} (θmax/θco = ${closeoutRatio.toFixed(2)})`,
          `贴合：比例 > ${targetCloseoutYellow.toFixed(1)} (θmax/θco = ${closeoutRatio.toFixed(2)})`
        )
      );
      messages.push(
        bi(
          `Action: keep θmax ≤ ${targetCloseoutYellow.toFixed(1)}·θco; target θco ≥ ${thetaCoTarget.toFixed(1)}°${deltaCo !== null && isFinite(deltaCo) ? ` (Δθco≈+${deltaCo.toFixed(1)}°)` : ""}.`,
          `建议：保持 θmax ≤ ${targetCloseoutYellow.toFixed(1)}·θco；目标 θco ≥ ${thetaCoTarget.toFixed(1)}°${deltaCo !== null && isFinite(deltaCo) ? `（需增加约 Δθco≈+${deltaCo.toFixed(1)}°）` : ""}。`
        )
      );
      messages.push(
        bi(
          "Action: reduce max working angle / preload, or increase close-out angle by increasing available wrap/clearance (e.g., longer strip L, smaller thickness t, larger package diameter) and validate with manufacturing.",
          "建议：降低最大工作角/预载，或通过增加可用卷绕/间隙提高 θco（例如增大带材长度 L、减小厚度 t、增大包络直径），并与制造工艺确认。"
        )
      );
    } else if (closeoutRatio > targetCloseoutGreen) {
      const thetaCoTarget = params.thetaMax_deg / targetCloseoutGreen;
      const deltaCo = params.thetaCo_deg > 0 ? thetaCoTarget - params.thetaCo_deg : null;
      messages.push(
        bi(
          `Close-out: approaching (θmax/θco = ${closeoutRatio.toFixed(2)})`,
          `贴合：接近贴合区 (θmax/θco = ${closeoutRatio.toFixed(2)})`
        )
      );
      messages.push(
        bi(
          `Action: for a robust margin, target θmax ≤ ${targetCloseoutGreen.toFixed(1)}·θco; target θco ≥ ${thetaCoTarget.toFixed(1)}°${deltaCo !== null && isFinite(deltaCo) ? ` (Δθco≈+${deltaCo.toFixed(1)}°)` : ""}.`,
          `建议：为获得更稳健裕度，目标 θmax ≤ ${targetCloseoutGreen.toFixed(1)}·θco；目标 θco ≥ ${thetaCoTarget.toFixed(1)}°${deltaCo !== null && isFinite(deltaCo) ? `（需增加约 Δθco≈+${deltaCo.toFixed(1)}°）` : ""}。`
        )
      );
    }
  }

  if (btRatio !== null) {
    const b = params.stripWidth_mm;
    const t = params.stripThickness_mm;
    if (btRatio < 6 || btRatio > 60) {
      messages.push(
        bi(
          `Geometry: b/t out of recommended range (b/t = ${btRatio.toFixed(1)})`,
          `几何：b/t 超出推荐范围 (b/t = ${btRatio.toFixed(1)})`
        )
      );
    } else if (btRatio < 8 || btRatio > 40) {
      messages.push(
        bi(
          `Geometry: b/t marginal (b/t = ${btRatio.toFixed(1)})`,
          `几何：b/t 边界/偏离 (b/t = ${btRatio.toFixed(1)})`
        )
      );
    }

    if (btRatio < 8) {
      const bTarget = t > 0 ? 8 * t : null;
      messages.push(
        bi(
          `Action: increase b or reduce t to bring b/t toward 8–40${bTarget !== null && isFinite(bTarget) ? ` (e.g., b≥${bTarget.toFixed(2)} mm at current t)` : ""}.`,
          `建议：增大 b 或减小 t，使 b/t 接近 8–40${bTarget !== null && isFinite(bTarget) ? `（例如当前 t 下 b≥${bTarget.toFixed(2)} mm）` : ""}。`
        )
      );
    } else if (btRatio > 40) {
      const tTarget = b > 0 ? b / 40 : null;
      messages.push(
        bi(
          `Action: increase t or reduce b to bring b/t toward 8–40${tTarget !== null && isFinite(tTarget) ? ` (e.g., t≥${tTarget.toFixed(2)} mm at current b)` : ""}.`,
          `建议：增大 t 或减小 b，使 b/t 接近 8–40${tTarget !== null && isFinite(tTarget) ? `（例如当前 b 下 t≥${tTarget.toFixed(2)} mm）` : ""}。`
        )
      );
    }
  }

  return {
    staticRYG,
    fatigueRYG,
    closeoutRYG,
    geometryRYG,
    overall,
    messages,
    staticSF,
    fatigueSF,
    closeoutRatio,
    btRatio,
  };
}
