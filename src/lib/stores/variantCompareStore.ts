import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SpringType } from "@/lib/springTypes";
import type {
    SpringGeometry,
    MaterialInfo,
    AnalysisResult
} from "@/lib/stores/springDesignStore";
import type { SpringAuditResult as EngineeringAuditResult } from "@/lib/audit/types";

export type VariantId = string;

export interface VariantEntry {
    id: VariantId;
    springType: SpringType;
    geometry: SpringGeometry;
    material: MaterialInfo;
    analysis: AnalysisResult;
    audit: EngineeringAuditResult;
    createdAt: number;
}

export interface VariantCompareState {
    variants: VariantEntry[];

    addVariant: (v: VariantEntry) => void;
    removeVariant: (id: VariantId) => void;
    clear: () => void;

    getByType: (type: SpringType) => VariantEntry[];
}

export const useVariantCompareStore = create<VariantCompareState>()(
    persist(
        (set, get) => ({
            variants: [],

            addVariant: (v) => set((state) => ({
                variants: [v, ...state.variants]
            })),

            removeVariant: (id) => set((state) => ({
                variants: state.variants.filter((v) => v.id !== id)
            })),

            clear: () => set({ variants: [] }),

            getByType: (type) => get().variants.filter((v) => v.springType === type),
        }),
        {
            name: "variant-compare-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
