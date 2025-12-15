export type EndKtType = "clamped" | "slot" | "hole" | "rivet" | "hook" | "custom";

export const END_KT_DEFAULTS: Record<EndKtType, number> = {
  clamped: 1.2,
  slot: 1.8,
  hole: 2.2,
  rivet: 2.0,
  hook: 2.5,
  custom: 1.0,
};

export const END_KT_LABELS: Record<EndKtType, { en: string; zh: string }> = {
  clamped: { en: "Clamped", zh: "夹持" },
  slot: { en: "Slot", zh: "开槽" },
  hole: { en: "Hole", zh: "孔" },
  rivet: { en: "Rivet", zh: "铆接" },
  hook: { en: "Hook/Bend", zh: "挂钩/折弯" },
  custom: { en: "Custom", zh: "自定义" },
};

export function clampPositive(x: number): number {
  return Math.max(1e-9, x);
}

export function nominalStressAtTorque_MPa(torque_Nmm: number, b_mm: number, t_mm: number): number {
  const b = clampPositive(b_mm);
  const t = clampPositive(t_mm);
  return (6 * torque_Nmm) / (b * t * t);
}

export function computeEndKt(params: {
  innerEndKtType: EndKtType;
  outerEndKtType: EndKtType;
  innerKtOverride?: number | null;
  outerKtOverride?: number | null;
}): { innerKt: number; outerKt: number; governingKt: number } {
  const innerKt = Math.max(1, params.innerKtOverride ?? END_KT_DEFAULTS[params.innerEndKtType]);
  const outerKt = Math.max(1, params.outerKtOverride ?? END_KT_DEFAULTS[params.outerEndKtType]);
  return { innerKt, outerKt, governingKt: Math.max(innerKt, outerKt) };
}
