
import { SpringMaterial } from "../materials/springMaterials";

export type StressMode = "shear" | "bending" | "tensile";

/**
 * Engineering Policy for Standardized Limit Derivation
 * 
 * Centralizes logic for converting material properties (tensile strength) 
 * into allowable working stresses for different loading modes.
 */
export const EngineeringPolicy = {
    /**
     * Get Allowable Stress for a specific mode.
     * Hierarchy:
     * 1. Direct property (e.g. allowShearStatic)
     * 2. Policy derivation from Tensile Strength
     * 3. Fallback (with warning implication, though this function just returns value)
     */
    getAllowableStress(material: SpringMaterial, mode: StressMode): number {
        // 1. Explicit Properties
        if (mode === "shear" && material.allowShearStatic) return material.allowShearStatic;
        // if (mode === "bending" && material.allowBendingStatic) return material.allowBendingStatic; (Future)

        // 2. Policy Derivations from Tensile Strength
        // If tensile strength is known, derive limits.
        const Rm = material.tensileStrength ?? 0;
        if (Rm > 0) {
            switch (mode) {
                case "shear":
                    // Standard approximation: 0.50 ~ 0.60 * Rm. 
                    // SMI/DIN often uses 0.56 or similar. Let's strictly use provided allowShear if possible, 
                    // else 0.50 * Rm as safe fallback.
                    return 0.50 * Rm;
                case "bending":
                case "tensile":
                    // Bending allowable is typically 75% - 100% of Tensile Strength depending on cycle.
                    // For static "Yield" proxy: ~0.80 * Rm or higher.
                    // Torsion legs are bending. 
                    // SMI Handbook: Bending stress allowable ~ 75% min tensile.
                    return 0.75 * Rm;
                default:
                    return Rm;
            }
        }

        // 3. Last Resort Fallbacks (Legacy/Unknown Material)
        // These should trigger "Limits Missing" warnings in AuditEngine
        if (mode === "shear") return 0;
        return 0;
    }
};
