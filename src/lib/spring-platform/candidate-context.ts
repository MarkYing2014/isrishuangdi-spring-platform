import { ISpringEngine, PlatformMaterialModel } from "./types";
import { DesignSpace } from "./design-space-types";

/**
 * CandidateContext provides the necessary environment for the Generator to run.
 * It abstracts the specific spring engine away.
 */
export interface CandidateContext {
    engine: ISpringEngine;
    material: PlatformMaterialModel;
    designSpace: DesignSpace;
}

/**
 * Helper to build a context for solving
 */
export function createCandidateContext(
    engine: ISpringEngine,
    material: PlatformMaterialModel,
    designSpace: DesignSpace
): CandidateContext {
    return {
        engine,
        material,
        designSpace
    };
}
