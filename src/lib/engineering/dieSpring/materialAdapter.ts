import { SPRING_MATERIALS, type SpringMaterialId } from "@/lib/materials/springMaterials";
import type { MaterialInfo } from "@/lib/stores/springDesignStore";
import type { DieSpringMaterialType } from "@/lib/dieSpring/types";

const DIE_TO_SPRING_ID: Record<DieSpringMaterialType, SpringMaterialId> = {
  OIL_TEMPERED: "oil_tempered",
  CHROME_ALLOY: "chrome_vanadium",
  CHROME_SILICON: "chrome_silicon",
};

const FALLBACK_ID: SpringMaterialId = "chrome_silicon";

function resolveSpringMaterialId(input?: string | null): SpringMaterialId {
  if (!input) return FALLBACK_ID;

  const normalized = input.toUpperCase() as DieSpringMaterialType;
  return DIE_TO_SPRING_ID[normalized] ?? FALLBACK_ID;
}

export function mapDieMaterialToStoreMaterial(input?: string | null): MaterialInfo {
  const springMaterialId = resolveSpringMaterialId(input);
  const base = SPRING_MATERIALS.find((m) => m.id === springMaterialId);

  return {
    id: base?.id ?? FALLBACK_ID,
    name: base?.nameEn ?? "Chrome Silicon",
    shearModulus: base?.shearModulus ?? 79000,
    elasticModulus: base?.elasticModulus ?? 207000,
    density: base?.density ?? 7850,
  };
}

export function normalizeDutyColor(value: string | null): "blue" | "red" | "gold" | "green" | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "blue" || normalized === "red" || normalized === "gold" || normalized === "green") {
    return normalized;
  }
  return null;
}

export function normalizeDieMaterialType(
  value: string | null
): DieSpringMaterialType | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (
    normalized === "OIL_TEMPERED" ||
    normalized === "CHROME_ALLOY" ||
    normalized === "CHROME_SILICON"
  ) {
    return normalized as DieSpringMaterialType;
  }
  return null;
}
