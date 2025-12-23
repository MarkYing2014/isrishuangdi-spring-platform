/**
 * Die Spring Catalog
 * 模具弹簧标准选型表（占位数据，可在后续补充完整）
 */

import type { DieSpringGeometry } from "@/lib/stores/springDesignStore";

export type DieSpringDutyColor = "blue" | "red" | "gold" | "green";

export interface DieSpringCatalogEntry {
  duty: DieSpringDutyColor;
  name: string;
  colorHex: string;
  springRateRange_Nmm: [number, number];
  recommendedDeflectionPercent: {
    highCycle: [number, number];
    absoluteMax: number;
  };
}

export const DIE_SPRING_CATALOG: DieSpringCatalogEntry[] = [
  {
    duty: "blue",
    name: "Light Duty",
    colorHex: "#3B82F6",
    springRateRange_Nmm: [5, 15],
    recommendedDeflectionPercent: {
      highCycle: [0.25, 0.35],
      absoluteMax: 0.5,
    },
  },
  {
    duty: "red",
    name: "Medium Duty",
    colorHex: "#EF4444",
    springRateRange_Nmm: [15, 30],
    recommendedDeflectionPercent: {
      highCycle: [0.2, 0.3],
      absoluteMax: 0.45,
    },
  },
  {
    duty: "gold",
    name: "Heavy Duty",
    colorHex: "#F59E0B",
    springRateRange_Nmm: [30, 50],
    recommendedDeflectionPercent: {
      highCycle: [0.18, 0.28],
      absoluteMax: 0.4,
    },
  },
  {
    duty: "green",
    name: "Extra Heavy Duty",
    colorHex: "#10B981",
    springRateRange_Nmm: [50, 80],
    recommendedDeflectionPercent: {
      highCycle: [0.15, 0.25],
      absoluteMax: 0.35,
    },
  },
];

export interface CatalogMatchInput {
  dutyColor?: DieSpringDutyColor;
  springRate_Nmm?: number;
  geometry?: DieSpringGeometry | null;
}

export interface CatalogMatchResult {
  entry: DieSpringCatalogEntry;
  matchType: "color" | "rate" | "fallback";
  utilizationRatio: number | null;
}

const DEFAULT_ENTRY = DIE_SPRING_CATALOG[0];

export function findCatalogMatch(input: CatalogMatchInput): CatalogMatchResult {
  const { dutyColor, springRate_Nmm } = input;

  if (dutyColor) {
    const colorMatch =
      DIE_SPRING_CATALOG.find((entry) => entry.duty === dutyColor) ?? DEFAULT_ENTRY;
    return { entry: colorMatch, matchType: "color", utilizationRatio: null };
  }

  if (springRate_Nmm !== undefined && Number.isFinite(springRate_Nmm)) {
    const rateMatch =
      DIE_SPRING_CATALOG.find(
        (entry) =>
          springRate_Nmm >= entry.springRateRange_Nmm[0] &&
          springRate_Nmm <= entry.springRateRange_Nmm[1]
      ) ?? DEFAULT_ENTRY;

    const span =
      rateMatch.springRateRange_Nmm[1] - rateMatch.springRateRange_Nmm[0] || 1;
    const ratio =
      (springRate_Nmm - rateMatch.springRateRange_Nmm[0]) / span;

    return { entry: rateMatch, matchType: "rate", utilizationRatio: ratio };
  }

  return { entry: DEFAULT_ENTRY, matchType: "fallback", utilizationRatio: null };
}
